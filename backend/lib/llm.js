// Thin network wrapper around the Gemini API. Deliberately minimal: its only
// job is "send a prompt, return raw text". All fragile parsing lives in parse.js
// (which is testable without tokens); all prompt assembly lives in prompt.js.
// Keeping this layer thin means the untestable network part has almost no logic.
import { GoogleGenAI } from '@google/genai';

// Model name comes from env so it can be updated without code changes as Gemini
// versions move. Falls back to a current flash model.
const MODEL = process.env.LLM_MODEL || 'gemini-2.5-flash';

let client; // lazily created so importing this file doesn't require a key

function getClient() {
  const apiKey = process.env.LLM_API_KEY;
  if (!apiKey) {
    throw new Error('LLM_API_KEY is not set (add it to backend/.env)');
  }
  client ??= new GoogleGenAI({ apiKey });
  return client;
}

/**
 * Send a prompt to Gemini and return the raw text response.
 * @param {string} prompt  The full prompt (from buildGenerationPrompt).
 * @returns {Promise<string>} the model's raw text output.
 */
export async function callLlm(prompt) {
  if (!prompt) throw new Error('callLlm: prompt is required');

  const response = await getClient().models.generateContent({
    model: MODEL,
    contents: prompt,
    config: {
      // Ask the API itself to return JSON — reduces markdown-fence noise.
      responseMimeType: 'application/json',
      // Low temperature: we want reliable, balanced drinks, not wild variance.
      temperature: 0.7,
    },
  });

  const text = response.text;
  if (!text) throw new Error('callLlm: empty response from model');
  return text;
}

export { MODEL };