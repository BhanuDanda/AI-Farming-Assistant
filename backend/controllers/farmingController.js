const { GoogleGenerativeAI } = require('@google/generative-ai');
const MODEL_NAME = process.env.GOOGLE_AI_MODEL || 'gemini-2.5-flash';
const modelCache = new Map();

function getGoogleAiKey(req) {
  return (req.get('x-google-ai-api-key') || req.body?.apiKey || process.env.GOOGLE_AI_API_KEY || '').trim();
}

function getModelForRequest(req) {
  const apiKey = getGoogleAiKey(req);
  if (!apiKey) {
    const error = new Error('Google AI API key is required. Enter your key in the app and try again.');
    error.statusCode = 400;
    throw error;
  }

  if (!modelCache.has(apiKey)) {
    const genAI = new GoogleGenerativeAI(apiKey);
    modelCache.set(apiKey, genAI.getGenerativeModel({ model: MODEL_NAME }));
  }

  return modelCache.get(apiKey);
}

const SYSTEM_PROMPT = 'You are KrishiAI, an expert agricultural advisor specialising in Indian farming.';

const getAIAdvice = async (req, res) => {
  try {
    const { prompt, queryType } = req.body;
    if (!prompt) return res.status(400).json({ error: 'Prompt is required' });
    const model = getModelForRequest(req);
    const result = await model.generateContent(prompt);
    const text = result.response.text();
    res.json({ success: true, advice: text, queryType });
  } catch (error) {
    if (error?.statusCode) {
      return res.status(error.statusCode).json({ error: error.message });
    }
    const message = error?.message || '';
    if (/api key|authentication|unauthori|permission|forbidden|invalid/i.test(message)) {
      return res.status(401).json({ error: 'The Google AI API key was rejected. Check the key and try again.' });
    }
    console.error('AI advice failed:', error?.message || error);
    const fallbackText = generateHeuristicAdvice(req.body.queryType, req.body.farmData);
    return res.json({ success: true, advice: fallbackText, queryType: req.body.queryType });
  }
};

const getCropSuggestions = async (req, res) => {
  try {
    const { soilType, state, season } = req.body;
    const prompt = 'Suggest crops for ' + state + ' soil ' + soilType + ' season ' + season;
    const model = getModelForRequest(req);
    const result = await model.generateContent(prompt);
    const text = result.response.text();
    res.json({ success: true, advice: text, queryType: 'crop' });
  } catch (err) {
    if (err?.statusCode) {
      return res.status(err.statusCode).json({ error: err.message });
    }
    const message = err?.message || '';
    if (/api key|authentication|unauthori|permission|forbidden|invalid/i.test(message)) {
      return res.status(401).json({ error: 'The Google AI API key was rejected. Check the key and try again.' });
    }
    res.status(500).json({ error: err.message });
  }
};

const getDiseaseAnalysis = async (req, res) => { res.status(500).json({ error: 'Not implemented' }); };
const getFertilizerPlan = async (req, res) => { res.status(500).json({ error: 'Not implemented' }); };

function generateHeuristicAdvice(queryType, farmData) {
  const state = farmData?.state || 'your region';
  const soilTypeRaw = farmData?.soilType || 'your soil';
  const season = farmData?.season || 'the current season';
  const prevCrop = farmData?.prevCrop || '';
  const targetCrop = farmData?.targetCrop || prevCrop || '';
  const crop = targetCrop || prevCrop || 'the selected crop';
  const soilType = soilTypeRaw.toLowerCase().replace(/\s*soil$/, '').trim();

  if (queryType === 'crop') {
    if (targetCrop) {
      return `Crop Suggestion for ${targetCrop} on ${soilTypeRaw} in ${state}: ${targetCrop} can be a good choice if you maintain balanced irrigation and keep pH near neutral. For ${season}, consider local short-duration varieties of ${targetCrop} if available, and supplement with compost or vermicompost at 5-7 tonnes per acre. If ${targetCrop} is not ideal, also consider alternatives such as ${soilType === 'loamy' ? 'wheat, maize, and soybean' : soilType === 'clay' ? 'rice, cotton, and turmeric' : soilType === 'red & laterite' || soilType === 'red' ? 'groundnut, cotton, and millets' : 'pulses, millets, and oilseeds'}.`;
    }

    const cropAdvice = {
      'black cotton': 'Sugarcane, cotton, soybean, and sorghum are strong options for black cotton soil. Maintain a good water table and use gypsum before sowing to improve structure.',
      'sandy': 'Pearl millet, groundnut, and cowpea perform well in sandy soils. Add organic matter and keep moisture consistent.',
      'loamy': 'Maize, wheat, and soybean suit loamy soils. Use balanced NPK and rotate with legumes for soil health.',
      'clay': 'Rice, cotton, and turmeric work well in clay soils. Ensure good drainage after heavy rains and apply 8-10 tonnes of FYM/acre.',
      'alluvial': 'Wheat, rice, sugarcane, and vegetables are ideal for alluvial soil. Keep pH near neutral and use organics to retain moisture.',
      'red & laterite': 'Groundnut, cotton, millet, and pulses are suitable for red & laterite soil. Improve moisture retention with compost and mulching.',
      'red': 'Groundnut, cotton, millet, and pulses are suitable for red soil. Improve moisture retention with compost and mulching.',
    };
    const recommendation = cropAdvice[soilType] || 'Wheat, maize, and pulses are generally safe choices for many Indian soils; use local certified seeds and maintain good irrigation.';
    return `Crop Suggestion for ${soilTypeRaw} in ${state}: ${recommendation} In ${season}, prefer short-duration varieties, apply compost or vermicompost at 5-7 tonnes/acre, and monitor for pests like stem borer or aphids.`;
  }

  if (queryType === 'disease') {
    return `Disease Guidance for ${crop} on ${soilTypeRaw} in ${state}: Look for yellowing, brown spots, or curling leaves and check soil moisture. Common issues are fungal blights and nutrient deficiency, especially in ${soilTypeRaw}. Use neem-based fungicide or Bordeaux mixture for early fungal infection, avoid overwatering, and ensure proper drainage. For chemical control, use recommended sprays only after expert advice.`;
  }

  if (queryType === 'fertilizer') {
    return `Fertilizer Plan for ${crop} on ${soilTypeRaw} in ${state}: Start with a balanced dose such as 50kg N, 30kg P2O5, and 20kg K2O per acre, plus 5 tonnes of organic matter. For ${soilTypeRaw}, add compost, vermicompost, or neem cake to improve structure and moisture retention. Split nitrogen doses into two applications, and include zinc or micronutrients if the soil is deficient.`;
  }

  return 'Farming advice provided locally due to AI service limitations.';
}

function fallbackChatResponse(messages) {
  const last = messages[messages.length - 1]?.content?.toLowerCase() || '';
  if (/crop|best|grow|suit|suitable/.test(last) && /punjab|rabi/.test(last)) {
    return 'Best Rabi Crops for Punjab: Wheat, Barley, Mustard, Gram, and Potato. Use certified seeds, maintain 5-8cm soil moisture, and apply 10-12 tonnes of organic manure per acre before sowing.';
  }
  if (/black\s*(cotton)?\s*soil|blacksoil/.test(last) && /crop|crops|grow|suitable/.test(last)) {
    return 'Black soil crops: Cotton, sugarcane, soybean, sorghum, and pearl millet perform well in black cotton soil. Use gypsum before sowing to improve structure, maintain good moisture, and apply 8-10 tonnes of organic manure per acre.';
  }
  if (/red\s*soil|redsoil/.test(last) && /crop|crops|grow|suitable/.test(last)) {
    return 'Red soil crops: Groundnut, castor, cotton, pulses, millets, and vegetables like tomato and brinjal grow well in red soil. Improve water retention with 5-7 tonnes of compost or vermicompost per acre and apply lime if the soil is acidic.';
  }
  if (/telangana|deccan/.test(last) && /crop|crops/.test(last)) {
    return 'Best Crops for Telangana: Groundnut, Maize, Cotton, Chickpea, Sunflower, and Pigeon Pea. Add 8-10 tonnes of FYM/acre and manage irrigation carefully for red and black soils.';
  }
  if (/disease|yellow|rust|wheat/.test(last)) {
    return 'Wheat Yellow Rust: Spray Propiconazole 1ml per liter every 10-14 days. For an organic option, use sulfur dust at 25kg per acre and remove infected plant debris immediately.';
  }
  if (/fertilizer|rice|clay/.test(last)) {
    return 'Rice on Clay: Add 10 tonnes of FYM per acre. Basal application of 50kg N, 30kg P, 20kg K, and 5kg Zn, with top-dressings around 30, 55, and 80 days after transplanting.';
  }
  if (/soil|health|telangana/.test(last)) {
    return 'Telangana Soil April: Low moisture (5-10%) and high temperature (32-36°C). Irrigate regularly, mulch to conserve moisture, and prepare for the monsoon planting window.';
  }
  if (/crop|best|grow|suitable|soil/.test(last)) {
    return 'General crop advice: Choose crops that match your soil type and season. Add organic matter, keep pH near neutral, use certified seeds, and monitor irrigation carefully. Pulses, millets, and oilseeds are good options for many Indian soils.';
  }
  return 'Farming Advice: Test soil every 2 years. Monsoon 50-100cm, summer 4-5 irrigations, winter 2-3. Remove crop residue after harvest and keep fields weed-free.';
}

const chatWithAI = async (req, res) => {
  try {
    const { messages } = req.body;
    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: 'Messages required' });
    }
    const fallback = fallbackChatResponse(req.body.messages || []);
    return res.json({ success: true, message: fallback, fallback: true });
  } catch (error) {
    return res.json({ success: true, message: 'Use certified seeds. Test soil before planting. Maintain proper irrigation.' });
  }
};

module.exports = { getAIAdvice, getCropSuggestions, getDiseaseAnalysis, getFertilizerPlan, chatWithAI };
