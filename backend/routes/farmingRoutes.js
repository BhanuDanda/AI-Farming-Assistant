const express = require('express');
const router  = express.Router();
const { getAIAdvice, getCropSuggestions, getDiseaseAnalysis, getFertilizerPlan, chatWithAI } = require('../controllers/farmingController');

router.post('/advice',      getAIAdvice);
router.post('/crops',       getCropSuggestions);
router.post('/disease',     getDiseaseAnalysis);
router.post('/fertilizer',  getFertilizerPlan);
router.post('/chat',        chatWithAI);

router.get('/', (req, res) => res.json({ service: 'KrishiAI Farming API' }));

module.exports = router;