const { GoogleGenerativeAI } = require('@google/generative-ai');
require('dotenv').config();
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY);

async function testModel(modelName) {
  try {
    const model = genAI.getGenerativeModel({ model: modelName });
    const result = await model.generateContent('Say hello world');
    console.log(`Success with ${modelName}:`, await result.response.text());
  } catch (err) {
    console.error(`Failed with ${modelName}:`, err.status, err.message);
  }
}

async function run() {
  await testModel('gemini-2.0-flash');
  await testModel('gemini-flash-latest');
  await testModel('gemini-2.0-flash-lite');
}

run();
