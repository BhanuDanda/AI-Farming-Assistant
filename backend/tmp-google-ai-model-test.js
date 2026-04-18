const { GoogleGenerativeAI } = require('@google/generative-ai');
require('dotenv').config();
const key = process.env.GOOGLE_AI_API_KEY;
const models = [
  'models/gemini-2.5-flash',
  'models/gemini-2.0-flash',
  'models/gemini-flash-latest',
  'models/gemini-flash-lite-latest',
  'models/gemini-2.5-flash-lite',
  'models/gemini-2.0-flash-lite',
];
(async () => {
  for (const name of models) {
    try {
      const genAI = new GoogleGenerativeAI(key);
      const model = genAI.getGenerativeModel({ model: name });
      const result = await model.generateContent('Hello from KrishiAI.');
      const response = await result.response;
      console.log(name, 'OK', response.text());
    } catch (e) {
      console.error(name, 'ERROR', e.message || e);
    }
  }
})();