const { GoogleGenerativeAI } = require('@google/generative-ai');
require('dotenv').config();
const key = process.env.GOOGLE_AI_API_KEY;
console.log('KEY SET:', !!key);
const genAI = new GoogleGenerativeAI(key);
const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
(async () => {
  try {
    const result = await model.generateContent({
      temperature: 0.2,
      maxOutputTokens: 100,
      prompt: 'Say hello world in one sentence.'
    });
    const response = await result.response;
    console.log('RESPONSE TEXT:', response.text());
  } catch (e) {
    console.error('ERROR:', e.message || e);
    if (e && e.response && typeof e.response.text === 'function') {
      try {
        const body = await e.response.text();
        console.error('RESPONSE BODY:', body);
      } catch (err) {
        console.error('RESPONSE BODY ERROR:', err);
      }
    }
  }
})();