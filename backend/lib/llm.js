// Anthropic (Claude) version of the LLM wrapper. Drop-in replacement for llm.js:
// exports the SAME callLlm(prompt, responseSchema) signature, so generate.js and
// everything else works unchanged. Swap by pointing generate.js's import here,
// or by renaming this file to llm.js.
//
// Difference from the Gemini version: Anthropic doesn't take a `responseSchema`
// enum the same way, so we lean on the prompt (which already specifies the exact
// JSON contract) plus the parser's validation. The `responseSchema` arg is
// accepted but only used to nudge the system prompt — the parser is the real
// guard (same 3-layer defense, just the middle layer is softer here).
import Anthropic from '@anthropic-ai/sdk';

// Model from env so it can change without code edits. Falls back to a current
// fast Claude model.
const MODEL = process.env.LLM_MODEL || 'claude-haiku-4-5';

let client; // lazily created so importing this file doesn't require a key
function getClient() {
  const apiKey = process.env.LLM_API_KEY;
  if (!apiKey) throw new Error('LLM_API_KEY is not set (add it to backend/.env)');
  client ??= new Anthropic({ apiKey });
  return client;
}

/**
 * Send a prompt to Claude and return the raw text response.
 * @param {string} prompt            The full prompt (from buildGenerationPrompt).
 * @param {object} [responseSchema]  Accepted for signature-compatibility with the
 *                                   Gemini version; used only to reinforce "JSON only".
 * @returns {Promise<string>} the model's raw text output.
 */
export async function callLlm(prompt, responseSchema = undefined) {
  if (!prompt) throw new Error('callLlm: prompt is required');

  const response = await withTimeout(
    getClient().messages.create({
      model: MODEL,
      max_tokens: 1024,
      temperature: 0.7,
      // A short system prompt reinforcing JSON-only output. The user prompt
      // already carries the full contract; this just tightens compliance.
      system: 'You are a precise API. Respond with ONLY a single valid JSON object — no prose, no markdown fences, no commentary.',
      messages: [{ role: 'user', content: prompt }],
    }),
    LLM_TIMEOUT_MS,
    'callLlm: model request timed out'
  );

  // Claude returns content as an array of blocks; join the text blocks.
  const text = (response.content || [])
    .filter((b) => b.type === 'text')
    .map((b) => b.text)
    .join('')
    .trim();

  if (!text) throw new Error('callLlm: empty response from model');
  return text;
}

// How long to wait for a single model call before giving up (ms).
const LLM_TIMEOUT_MS = Number(process.env.LLM_TIMEOUT_MS) || 120000; // 2 min for testing

// Reject `promise` if it doesn't settle within `ms`. Timer cleared on settle.
function withTimeout(promise, ms, message) {
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error(message)), ms);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

export { MODEL };