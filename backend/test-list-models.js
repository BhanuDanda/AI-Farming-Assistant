const { GoogleGenerativeAI } = require('@google/generative-ai');
require('dotenv').config();

const key = process.env.GOOGLE_AI_API_KEY;
if (!key) { console.error('No API key'); process.exit(1); }

const genAI = new GoogleGenerativeAI(key);

(async () => {
  try {
    console.log('Listing available models...\n');
    const models = await genAI.listModels();
    
    let count = 0;
    for await (const model of models) {
      console.log(`Model: ${model.name}`);
      console.log(`Display Name: ${model.displayName}`);
      console.log(`Supported Methods:`, model.supportedGenerationMethods);
      console.log('---');
      count++;
      if (count >= 15) break;  // Just show first 15
    }
  } catch (err) {
    console.error('Error listing models:', err.message);
  }
})();
