// Use native fetch and FormData

// Send 16kHz PCM WAV buffer to Groq's Whisper model
async function getGroqSTT(pcm16WavBuffer) {
  const url = 'https://api.groq.com/openai/v1/audio/transcriptions';
  
  const form = new FormData();
  const blob = new Blob([pcm16WavBuffer], { type: 'audio/wav' });
  form.append('file', blob, 'audio.wav');
  form.append('model', 'whisper-large-v3-turbo');
  form.append('response_format', 'json');

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.GROQ_API_KEY}`
      },
      body: form
    });
    
    const data = await response.json();
    if (!response.ok) {
      console.error(`[Groq STT] HTTP Error ${response.status}:`, data);
      throw new Error(`Groq STT Failed: ${response.status}`);
    }
    
    console.log(`[Groq STT] Response received successfully. Transcript: "${data.text}"`);
    return { transcript: data.text || '', language_code: 'en' };
  } catch (err) {
    console.error("Groq STT Error:", err);
    return null;
  }
}

const googleTTS = require('google-tts-api');

// Generate MP3 audio buffer from Free Google TTS
async function getGoogleTTS(text, language = 'hi') {
  try {
    // Generate multiple audio URLs if text is long (> 200 chars)
    const parts = googleTTS.getAllAudioUrls(text, {
      lang: language.includes('en') ? 'en-IN' : 'hi-IN',
      slow: false,
      host: 'https://translate.google.com',
      splitPunct: ',.?'
    });

    const buffers = [];
    for (const part of parts) {
      const response = await fetch(part.url);
      if (!response.ok) {
        throw new Error(`Google TTS Failed: ${response.status}`);
      }
      buffers.push(Buffer.from(await response.arrayBuffer()));
    }
    
    const finalBuffer = Buffer.concat(buffers);
    console.log(`[Google TTS] Audio received successfully. Total Bytes Length: ${finalBuffer.length}`);
    return finalBuffer; // Returns concatenated MP3 buffer
  } catch (err) {
    console.error("Google TTS Error:", err);
    return null;
  }
}

module.exports = {
  getGroqSTT,
  getGoogleTTS
};
