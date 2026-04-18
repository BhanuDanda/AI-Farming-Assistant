const { GoogleGenerativeAI } = require('@google/generative-ai');
require('dotenv').config();

const key = process.env.GOOGLE_AI_API_KEY;
if (!key) { console.error('No API key'); process.exit(1); }

const genAI = new GoogleGenerativeAI(key);

const testModels = [
  'gemini-1.5-flash',
  'gemini-1.5-pro', 
  'gemini-2.0-flash',
  'gemini-2.5-flash'
];

(async () => {
  for (const modelName of testModels) {
    try {
      console.log(`\nTesting ${modelName}...`);
      const model = genAI.getGenerativeModel({ model: modelName });
      
      const result = await model.generateContent('What are the best crops for Punjab in Rabi season?');
      const text = result.response.text();
      console.log(`✅ ${modelName} SUCCESS`);
      console.log('Response length:', text.length);
      console.log('First 200 chars:', text.substring(0, 200));
    } catch (err) {
      console.error(`❌ ${modelName} FAILED:`, err.message);
    }
  }
})();
