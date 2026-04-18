const { GoogleGenerativeAI } = require('@google/generative-ai');
require('dotenv').config();
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY);

async function listModels() {
  try {
    const list = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${process.env.GOOGLE_AI_API_KEY}`);
    const data = await list.json();
    console.log(data.models.filter(m => m.name.includes('flash')).map(m => m.name));
  } catch (error) {
    console.error('Error:', error);
  }
}
listModels();
