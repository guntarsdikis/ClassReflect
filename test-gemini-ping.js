// Quick sanity check for Gemini API using SDK directly (no DB).
// Usage: node test-gemini-ping.js
require('dotenv').config({ path: './backend/.env' });

async function main() {
  const key = process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY;
  if (!key) {
    console.error('Missing GOOGLE_API_KEY or GEMINI_API_KEY in backend/.env');
    process.exit(1);
  }
  let GoogleGenerativeAI;
  try {
    ({ GoogleGenerativeAI } = require('@google/generative-ai'));
  } catch {
    try {
      ({ GoogleGenerativeAI } = require('./backend/node_modules/@google/generative-ai'));
    } catch (e2) {
      console.error('Cannot load @google/generative-ai. Run `npm i` in backend/ first.');
      process.exit(2);
    }
  }
  const genAI = new GoogleGenerativeAI(key);
  const modelName = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
  const model = genAI.getGenerativeModel({ model: modelName });

  const generationConfig = {
    // Keep small to guarantee return for sanity test
    maxOutputTokens: 256,
  };
  try {
    const res = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: 'Return JSON: {"ping":"pong","now":"<YYYY-MM-DD>"} exactly.' }] }],
      generationConfig,
    });
    const text = typeof res?.response?.text === 'function' ? res.response.text() : (res?.response?.text || '');
    console.log('Gemini ping OK. Response text snippet:\n', String(text).slice(0, 300));
  } catch (e) {
    console.error('Gemini ping failed:', e?.message || e);
    process.exit(2);
  }
}

main();
