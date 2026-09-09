const Groq = require("groq-sdk");

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY
});

const SYSTEM_PROMPT = `
You are CALLER AI, a warm, intelligent, and highly natural-sounding AI phone agent. You work for Company Name and your job is to help callers with their queries.

LANGUAGE BEHAVIOR:
- The caller may speak in Hindi, English, or a mix of both (Hinglish).
- Always use a natural Hinglish mix (a blend of English and Hindi) so it sounds like a real Indian person speaking. For example: "Main Hindi and English dono mein baat kar sakti hoon."
- Use natural, spoken Indian English or Hindi. Use contractions, soften your tone, be conversational.
- In Hindi, use Devanagari script internally but output in Roman transliteration for TTS compatibility.
- IMPORTANT: If the user transcript is empty, undefined, or says very little nonsense (like just background noise), respond naturally with: "Hello? I can't hear you." or "Mujhe aapki aawaz nahi aa rahi hai, kya aap wahan hain?"
- Add punctuation like commas (,), ellipses (...), and question marks (?) to create natural pauses and intonation in the speech.

PERSONALITY:
- You are patient, empathetic, and professional.
- You never say "I am an AI" unless directly asked. Even then, acknowledge briefly and redirect.
- STRICT BREVITY RULE: Speak in 1 to 2 short sentences ONLY (maximum 25-30 words). Never recite long paragraphs, encyclopedic overviews, or long lists. Speak concisely and conversationally like a person on a telephone.
- Use natural fillers like "Bilkul", "Sure", "Haan", "Umm...", "Accha", "Samajh gayi" to sound human.
- Add brief acknowledgment before answering: "Haan, bilkul..." or "Haa, batati hoon..."

CONTEXT AWARENESS:
- You have access to the full conversation history. Reference it naturally.
- If the caller repeats something, acknowledge you already have that info: "Haan, aapne bataya tha..."
- Track and use the caller's name once you learn it.

RESPONSE FORMAT:
Respond with a JSON object in this exact structure:
{
  "spoken": "The exact text to speak aloud to the caller",
  "intent": "primary intent label",
  "entities": ["list", "of", "key", "entities"],
  "sentiment": "positive | neutral | negative | frustrated | satisfied",
  "action_item": "optional string if a follow-up action is needed, else null",
  "language": "hi | en | hinglish"
}
`;

async function getLLMResponse(historyTurns, newTranscript, memory = [], knowledge = [], instructions = '') {
  let contextSection = "";
  let groundingMessages = [];
  
  if (instructions) {
    contextSection += `### CORE AGENT INSTRUCTIONS ###\n${instructions}\n##############################\n\n`;
  }
  
  if (knowledge && knowledge.length > 0) {
    const knowledgeString = knowledge.map(k => `[DOCUMENT: ${k.title}]\n${k.content}`).join('\n\n');
    contextSection += `### MANDATORY DATA ROOM KNOWLEDGE ###
The following documents are the ONLY verified source of truth for answering caller queries:

${knowledgeString}

STRICT ANSWERING BOUNDARIES:
1. You MUST answer the user's questions ONLY from the information explicitly contained in the above DATA ROOM documents.
2. If the answer to the caller's question is NOT found in the documents above, you MUST answer: "I'm sorry, that information is not available in my current records."
3. Never guess, assume, speculate, or introduce external facts not present in these documents.
4. Keep the answer concise (1 to 2 sentences maximum, natural conversation).
5. Do NOT say "Thank you" or goodbye unless the caller has explicitly thanked you or asked to end the conversation.
#######################################\n\n`;

    groundingMessages.push({ 
        role: "user", 
        content: `System Instructions: Use the following verified institutional document facts to answer all questions: \n${knowledgeString.substring(0, 4000)}` 
    });
    groundingMessages.push({ 
        role: "assistant", 
        content: "Understood. I will answer questions strictly and solely using these verified document records. If any detail is not in these documents, I will state that the information is not available in my current records and will never guess or invent facts." 
    });
  } else {
    contextSection += `### (Notice: No uploaded knowledge documents available. State that information is not available in records.) ###\n\n`;
  }

  if (memory && memory.length > 0) {
    const memoryString = memory.map(m => `- [${m.timestamp}] ${m.text} (Intent: ${m.intent})`).join('\n');
    contextSection += `### PREVIOUS INTERACTION MEMORY ###\nHistory of past calls with this user:\n${memoryString}\n\nNOTE: If the current DATA ROOM knowledge contradicts this history, strictly use the DATA ROOM facts.\n#######################################\n\n`;
  }

  const { getVedPrompt } = require('../state/ved');
  const activePromptTemplate = instructions || getVedPrompt() || SYSTEM_PROMPT.replace('Company Name', 'the organization');

  const jsonFormatRequirement = `
MANDATORY RESPONSE FORMAT:
You MUST respond with a valid JSON object matching this exact structure:
{
  "spoken": "The exact text to speak aloud to the caller (1-2 sentences maximum, natural conversation)",
  "intent": "primary intent label",
  "entities": ["list", "of", "key", "entities"],
  "sentiment": "positive | neutral | negative | frustrated | satisfied",
  "action_item": null,
  "language": "hi | en | hinglish"
}
Do not include markdown code block ticks (\`\`\`json). Output raw JSON only.
`;

  const dynamicSystemPrompt = `${contextSection}### VED SYSTEM BEHAVIOR ###\n${activePromptTemplate}\n\n${jsonFormatRequirement}`;

  // Build the message payload starting with Grounding Turn if available
  const messages = [
    { role: "system", content: dynamicSystemPrompt },
    ...groundingMessages
  ];

  const recentTurns = historyTurns.slice(-10);
  for (const turn of recentTurns) {
    if (turn.speaker === 'user') {
      messages.push({ role: 'user', content: turn.text });
    } else if (turn.speaker === 'ai') {
      messages.push({ role: 'assistant', content: turn.text });
    }
  }

  messages.push({ role: 'user', content: newTranscript });

  // ENHANCED LOGGING
  console.log(`\n[LLM] NUCLEAR PROMPT READY (Knowledge: ${knowledge.length} fragments)`);
  if (knowledge.length > 0) {
    console.log(`[LLM] Grounding turn injected into chat history.`);
  }

  const candidateModels = [
    "qwen/qwen3.8-27b",
    "groq/compound-mini",
    "openai/gpt-oss-120b"
  ];

  for (const model of candidateModels) {
    try {
      const completion = await groq.chat.completions.create({
        messages,
        model,
        response_format: { type: "json_object" },
        temperature: 0.2,
        max_completion_tokens: 120
      }, { timeout: 3500 });

      const responseContent = completion.choices[0]?.message?.content;
      console.log(`[LLM] Raw Response from ${model}: "${responseContent?.substring(0, 60)}..."`);
      
      if (!responseContent) {
        console.warn(`[LLM] Empty response from ${model}`);
        continue;
      }

      try {
        const parsed = JSON.parse(responseContent);
        if (parsed.spoken) {
          return parsed;
        }
      } catch (e) {
        console.error(`[LLM] JSON Parse Error on ${model}:`, e.message);
      }
    } catch (error) {
      console.warn(`[CALLER AI] Model ${model} failed:`, error.message);
    }
  }

  // Fallback if all API attempts failed
  return {
    spoken: "Main samajh nahi paayi, kya aap dobara bol sakte hain?",
    intent: "unknown",
    entities: [],
    sentiment: "neutral",
    action_item: null,
    language: "hinglish"
  };
}

async function summarizeCall(fullTranscript) {
  const SYS_PROMPT = `
You are a call analysis AI for CALLER AI. Given the following call transcript between an AI agent and a human caller, produce a structured summary.
Return a JSON object:
{
  "summary": "2-3 sentence paragraph summarizing the call",
  "key_intent": "Single clear label for the primary intent",
  "important_details": { "topic": "detail", ... },
  "key_topics": ["topic1", "topic2"],
  "resolution": "resolved | unresolved | escalated",
  "language_used": "hindi | english | mixed"
}
`;
  try {
    const completion = await groq.chat.completions.create({
      messages: [
        { role: "system", content: SYS_PROMPT },
        { role: "user", content: "Transcript:\n" + JSON.stringify(fullTranscript, null, 2) }
      ],
      model: "qwen/qwen3.8-27b",
      response_format: { type: "json_object" },
      temperature: 0.2
    });
    return JSON.parse(completion.choices[0]?.message?.content || "{}");
  } catch(e) {
    console.error("[CALLER AI] Summary Error:", e);
    return null;
  }
}

module.exports = {
  getLLMResponse,
  summarizeCall
};
