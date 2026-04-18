const { GoogleGenerativeAI } = require('@google/generative-ai');
require('dotenv').config();
const key = process.env.GOOGLE_AI_API_KEY;
console.log('KEY SET:', !!key);
const genAI = new GoogleGenerativeAI(key);
const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
(async () => {
  try {
    console.log('--- generateContent with string ---');
    const result = await model.generateContent('Hello from KrishiAI.');
    console.log('generateContent response text:', (await result.response).text());
  } catch (e) {
    console.error('generateContent ERROR:', e.message || e);
  }
  try {
    console.log('--- startChat and sendMessage ---');
    const chat = model.startChat({ history: [{ role: 'user', parts: [{ text: 'Hello' }] }] });
    const result = await chat.sendMessage('Continue the conversation.');
    console.log('chat response text:', result.response.text());
  } catch (e) {
    console.error('startChat ERROR:', e.message || e);
  }
})();