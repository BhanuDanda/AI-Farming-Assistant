const mongoose = require('mongoose');

const cropQuerySchema = new mongoose.Schema({
  state: { type: String, required: true },
  soilType: { type: String, required: true },
  soilPh: { type: Number, default: 6.5 },
  landArea: Number,
  season: { type: String, enum: ['Kharif', 'Rabi', 'Zaid', 'All Year'] },
  irrigation: String,
  temperature: Number,
  rainfall: Number,
  prevCrop: String,
  queryType: { type: String, required: true, enum: ['crop', 'disease', 'fertilizer'] },
  symptoms: String,
  targetCrop: String,
  aiResponse: String,
  model: { type: String, default: 'gemini-2.5-flash' },
  helpful: { type: Boolean, default: null },
}, { timestamps: true, collection: 'crop_queries' });

module.exports = mongoose.model('CropQuery', cropQuerySchema);