const { getCallSession, addTurn, createCallSession, updateCallSession } = require('../state/calls');
const { getGroqSTT, getGoogleTTS } = require('../services/speech');
const { getLLMResponse, summarizeCall } = require('../services/llm');
const { getCallMemory, saveCall, getKnowledge } = require('../services/mongodb');
const entityService = require('../services/entity');
const leadService = require('../services/lead');
const { spawn } = require('child_process');

// Twilio → CALLER AI: raw mulaw 8kHz chunks → PCM WAV 16kHz Buffer
function mulawToWavBuffer(mulawBase64Chunks) {
  return new Promise((resolve, reject) => {
    const inputBuffer = Buffer.concat(
      mulawBase64Chunks.map(c => Buffer.from(c, 'base64'))
    );

    const ffmpeg = spawn('ffmpeg', [
      '-f', 'mulaw',
      '-ar', '8000',
      '-ac', '1',
      '-i', 'pipe:0',
      '-ar', '16000',
      '-ac', '1',
      '-f', 'wav',
      '-acodec', 'pcm_s16le',
      'pipe:1',
    ]);

    const chunks = [];
    ffmpeg.stdout.on('data', d => chunks.push(d));
    ffmpeg.stdout.on('end', () => resolve(Buffer.concat(chunks)));
    ffmpeg.stderr.on('data', () => {});
    ffmpeg.on('error', reject);

    ffmpeg.stdin.write(inputBuffer);
    ffmpeg.stdin.end();
  });
}

// CALLER AI → Twilio: WAV Buffer → mulaw 8kHz buffer
function wavToMulawBuffer(wavBuffer) {
  return new Promise((resolve, reject) => {
    const ffmpeg = spawn('ffmpeg', [
      '-i', 'pipe:0',
      '-ar', '8000',
      '-ac', '1',
      '-f', 'mulaw',
      '-acodec', 'pcm_mulaw',
      'pipe:1',
    ]);

    const chunks = [];
    ffmpeg.stdout.on('data', d => chunks.push(d));
    // Returning a raw Buffer, so the existing chunkSize splitting logic below stays exactly the same
    ffmpeg.stdout.on('end', () => resolve(Buffer.concat(chunks)));
    ffmpeg.stderr.on('data', () => {});
    ffmpeg.on('error', reject);

    ffmpeg.stdin.write(wavBuffer);
    ffmpeg.stdin.end();
  });
}

function handleStreamConnection(ws) {
  let streamSid = null;
  let callSid = null;
  let audioBuffer = [];
  let isAIProcessing = false;
  let silenceTimer = null;
  const SILENCE_THRESHOLD_MS = 550; // Optimized for snappy 0.55s turn-taking without awkward pauses
  let safetyUnlockTimeout = null;

  const resetAIState = (reason = '') => {
    if (reason) console.log(`[Stream] Resetting AI state: ${reason}`);
    isAIProcessing = false;
    audioBuffer = [];
    if (safetyUnlockTimeout) {
      clearTimeout(safetyUnlockTimeout);
      safetyUnlockTimeout = null;
    }
  };

  ws.on('error', (err) => {
    console.error(`[Stream Error - ${callSid || 'unregistered'}]:`, err.message);
  });

  ws.on('close', (code, reason) => {
    console.log(`[Stream Closed - ${callSid || 'unregistered'}]: code=${code}, reason=${reason?.toString() || 'none'}`);
    resetAIState('WebSocket closed');
  });

  ws.on('message', async (message) => {
    const msg = JSON.parse(message);
    
    if (msg.event === 'start') {
      streamSid = msg.start.streamSid;
      callSid = msg.start.callSid;
      console.log(`Stream started: ${streamSid} for call: ${callSid}`);
      
      // Initialize state if not already done by outbound
      let session = getCallSession(callSid);
      if (!session) {
        session = createCallSession(callSid);
      }

      // Notify frontend that the call is now live (picked up by recipient)
      if (global.broadcastEvent) {
        global.broadcastEvent('call_started', { callSid });
      }

      // FETCH MEMORY from MongoDB
      if (session.phoneNumber && session.phoneNumber !== 'unknown') {
        console.log(`[MongoDB] Fetching previous summaries for ${session.phoneNumber}...`);
        try {
          const memory = await getCallMemory(session.phoneNumber);
          if (memory && memory.length > 0) {
            console.log(`[MongoDB] Found ${memory.length} previous interactions for ${session.phoneNumber}`);
            updateCallSession(callSid, { memory });
          }
        } catch (err) {
          console.error(`[MongoDB] Error fetching memory:`, err.message);
        }
      }

      // FETCH KNOWLEDGE & INSTRUCTIONS from MongoDB
      console.log(`[MongoDB] Fetching profile for entity: ${session.entity || 'unknown'}...`);
      try {
        const entityProfile = await entityService.getEntityByName(session.entity);
        if (entityProfile) {
          console.log(`[MongoDB] Loaded profile for ${entityProfile.name}. Instructions length: ${entityProfile.instructions?.length || 0}`);
          updateCallSession(callSid, { 
            entity_id: entityProfile.id,
            instructions: entityProfile.instructions || '' 
          });
        }

        const knowledge = await getKnowledge(session.entity);
        if (knowledge && knowledge.length > 0) {
          console.log(`[MongoDB] Found ${knowledge.length} knowledge fragments for ${session.entity || 'unknown'}`);
          updateCallSession(callSid, { knowledge });
        }
      } catch (err) {
        console.error(`[MongoDB] Error fetching entity data:`, err.message);
      }

    } else if (msg.event === 'media') {
      if (isAIProcessing) {
        // Half-duplex MVP: do not collect audio or trigger STT while the AI is listening/speaking
        return;
      }

      const payloadBuffer = Buffer.from(msg.media.payload, 'base64');

      // VAD heuristic for mulaw
      let loudCount = 0;
      for (let i = 0; i < payloadBuffer.length; i++) {
        let val = payloadBuffer[i];
        let amp = val < 128 ? 127 - val : 255 - val;
        if (amp > 22) loudCount++;
      }

      // Only reset timer if active loud speech is detected
      if (loudCount > 18) {
        audioBuffer.push(msg.media.payload);
        clearTimeout(silenceTimer);
        silenceTimer = setTimeout(() => {
          if (audioBuffer.length >= 6) { // Ensure at least ~120ms of actual voice audio
            processUtterance();
          } else {
            audioBuffer = [];
          }
        }, SILENCE_THRESHOLD_MS);
      } else if (audioBuffer.length > 0) {
        // Add trailing silence to the utterance, but let timer naturally expire
        audioBuffer.push(msg.media.payload);
      }
      
    } else if (msg.event === 'mark') {
      console.log(`[${callSid}] AI finished speaking, unlocking audio capture`);
      resetAIState('mark event');
    } else if (msg.event === 'stop') {
      console.log(`Stream stopped: ${streamSid}`);
      if (global.broadcastEvent) {
        global.broadcastEvent('call_ended', { callSid });
      }
      processPostCallSummary(callSid);
    }
  });

  async function processUtterance() {
    if (audioBuffer.length === 0 || isAIProcessing) return;
    
    isAIProcessing = true;
    const currentAudio = [...audioBuffer];
    audioBuffer = []; // Clear for next utterance

    // Safety timeout: if AI doesn't finish in 12s, unlock
    safetyUnlockTimeout = setTimeout(() => {
        resetAIState('Safety timeout reached (12s)');
    }, 12000);
    
    try {
      // 1. Decode & Resample asynchronously
      const pcm16Wav = await mulawToWavBuffer(currentAudio);
      
      // 2. STT (Groq Whisper)
      console.log(`\n--- [${callSid}] AUDIO CHUNK RECEIVED ---`);
      console.log(`[${callSid}] Sending ${pcm16Wav.length} bytes of audio to Groq Whisper STT...`);
      const sttResult = await getGroqSTT(pcm16Wav);
      
      if (!sttResult || !sttResult.transcript || sttResult.transcript.trim() === '') {
        resetAIState('Empty STT result');
        return;
      }
      
      const cleanTranscript = sttResult.transcript.trim().toLowerCase().replace(/[^\w\s]/g, '');
      const hallucinations = [
        "thanks for watching", "thank you for watching", "please subscribe", 
        "thank you", "thanks", "thank you very much", "bye", "you", "so", "oh"
      ];

      // If audio chunk is short / silent and Whisper outputs a typical isolated phantom token, ignore it
      if (hallucinations.includes(cleanTranscript) || cleanTranscript === '') {
         console.log(`[${callSid}] Ignoring known Whisper hallucination or background artifact: "${sttResult.transcript}"`);
         resetAIState('Whisper hallucination/background noise detected');
         return;
      }
      
      console.log(`[${callSid}] User said: ${sttResult.transcript}`);
      addTurn(callSid, {
        timestamp: new Date().toISOString(),
        speaker: 'user',
        text: sttResult.transcript,
        language: sttResult.language_code || 'hi' // fallback
      });

      // Broadcast to Frontend
      if (global.broadcastEvent) {
        console.log(`[Stream] Broadcasting user transcript: ${sttResult.transcript}`);
        global.broadcastEvent('transcript', {
          speaker: 'user',
          text: sttResult.transcript,
          id: Date.now()
        });
      }

      const session = getCallSession(callSid);

      // Ensure fresh VED knowledge from database is always available
      let activeKnowledge = (session && session.knowledge && session.knowledge.length > 0) 
        ? session.knowledge 
        : await getKnowledge(session?.entity || 'VED');
      
      if (!activeKnowledge || activeKnowledge.length === 0) {
        activeKnowledge = await getKnowledge();
      }

      // 3. LLM (CALLER AI)
      console.log(`\n--- [${callSid}] LLM PROCESSING ---`);
      console.log(`[${callSid}] Querying CALLER AI LLM (Active knowledge fragments: ${activeKnowledge.length})...`);
      const aiResponse = await getLLMResponse(
        session.turns, 
        sttResult.transcript, 
        session.memory || [],
        activeKnowledge,
        session.instructions || ''
      );
      console.log(`[${callSid}] LLM Answer Object:`, JSON.stringify(aiResponse, null, 2));
      console.log(`[${callSid}] AI will say: "${aiResponse.spoken}" (Language: ${aiResponse.language})`);
      
      addTurn(callSid, {
        timestamp: new Date().toISOString(),
        speaker: 'ai',
        text: aiResponse.spoken,
        intent: aiResponse.intent,
        entities: aiResponse.entities,
        sentiment: aiResponse.sentiment,
        language: aiResponse.language
      });

      // Broadcast to Frontend
      if (global.broadcastEvent) {
        console.log(`[Stream] Broadcasting AI transcript: ${aiResponse.spoken}`);
        global.broadcastEvent('transcript', {
          speaker: 'ai',
          text: aiResponse.spoken,
          id: Date.now()
        });
      }

      // 4. TTS (Google TTS)
      console.log(`\n--- [${callSid}] TTS GENERATION ---`);
      console.log(`[${callSid}] Requesting TTS from Google for text: "${aiResponse.spoken}"...`);
      const ttsBuffer = await getGoogleTTS(aiResponse.spoken, aiResponse.language);
      if (ttsBuffer) {
        // 5. Encode back to mulaw and send to Twilio
        const rawMulaw = await wavToMulawBuffer(ttsBuffer);
        
        const audioDurationMs = Math.round((rawMulaw.length / 8000) * 1000);
        console.log(`[${callSid}] Sending ${rawMulaw.length} bytes of mulaw audio (~${(audioDurationMs / 1000).toFixed(1)}s) to Twilio...`);

        // Dynamically adjust safety timeout to duration of speech + 5 seconds buffer
        if (safetyUnlockTimeout) clearTimeout(safetyUnlockTimeout);
        safetyUnlockTimeout = setTimeout(() => {
          resetAIState('Safety timeout reached after playback');
        }, audioDurationMs + 5000);

        // Send paced audio chunks (640 bytes = 80ms) with 25ms delay
        // Prevents socket congestion, eliminates Twilio buffer drops, and avoids disconnects
        const chunkSize = 640;
        const pacingDelayMs = 25;
        for (let i = 0; i < rawMulaw.length; i += chunkSize) {
          if (ws.readyState !== 1) {
            console.warn(`[${callSid}] WebSocket disconnected during audio stream (state: ${ws.readyState})`);
            break;
          }
          const chunk = rawMulaw.slice(i, i + chunkSize);
          ws.send(JSON.stringify({
            event: 'media',
            streamSid: streamSid,
            media: {
              payload: chunk.toString('base64')
            }
          }));

          if (i + chunkSize < rawMulaw.length) {
            await new Promise(resolve => setTimeout(resolve, pacingDelayMs));
          }
        }

        if (ws.readyState === 1) {
          // Send Mark to release half-duplex lock when Twilio finishes playing
          ws.send(JSON.stringify({
            event: 'mark',
            streamSid: streamSid,
            mark: { name: 'ai_done' }
          }));
        }
      } else {
         resetAIState('TTS result empty');
      }

    } catch (e) {
      console.error(`[${callSid}] Error in audio pipeline:`, e);
      resetAIState('Catch block error');
    }
  }
}

async function processPostCallSummary(callSid) {
  const session = getCallSession(callSid);
  if (!session) {
    console.error(`[${callSid}] Error: No session found for summary generation.`);
    return;
  }
  
  if (session.turns.length === 0) {
    console.log(`[${callSid}] No conversation turns detected. Skipping summary.`);
    return;
  }
  
  console.log(`[${callSid}] Generating post-call summary and intent for ${session.turns.length} turns...`);
  const summary = await summarizeCall(session.turns);
  
  if (summary) {
    updateCallSession(callSid, {
      summary: summary,
      resolution_status: summary.resolution || 'pending'
    });
    console.log(`[${callSid}] Summary generated: "${summary.summary.substring(0, 50)}..."`);
    
    // SAVE TO MongoDB (New Calls Collection)
    const callData = {
      phone: session.phoneNumber,
      entity_id: session.entity_id,
      transcript: session.turns,
      summary: summary.summary,
      intent: summary.key_intent,
      resolution: summary.resolution,
      meta: summary.important_details
    };

    console.log(`[MongoDB] Attempting to save call record for ${session.phoneNumber}...`);
    try {
      await saveCall(callData);
      console.log(`[MongoDB] Call record saved successfully.`);

      // 3. AUTO-LEAD GENERATION
      const positiveIntents = ['interest', 'admission', 'sales', 'positive', 'high_interest'];
      if (positiveIntents.includes(summary.key_intent?.toLowerCase()) || summary.resolution === 'resolved') {
        console.log(`[LeadService] High interest detected. Generating lead...`);
        await leadService.createLead({
          phone: session.phoneNumber,
          name: 'Anonymous Caller', // Would ideally extract from transcript entities
          interest: summary.key_intent,
          entity_id: session.entity_id,
          meta: summary.important_details
        });
      }
    } catch (err) {
      console.error(`[MongoDB] Error in post-call data flow:`, err.message);
    }
  } else {
    console.error(`[${callSid}] Failed to generate summary from LLM.`);
  }
}

module.exports = {
  handleStreamConnection
};
