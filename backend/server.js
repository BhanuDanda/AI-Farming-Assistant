const express = require('express');
const cors    = require('cors');
const path    = require('path');
require('dotenv').config();

const farmingRoutes = require('./routes/farmingRoutes');
const authRoutes = require('./routes/authRoutes');
const app  = express();
const PORT = process.env.PORT || 3000;

const corsOptions = { 
  origin: '*', 
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Google-AI-API-Key']
};

app.use(cors(corsOptions));

// Explicitly handle Private Network Access
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Private-Network', 'true');
  next();
});

app.use(express.json());
app.use(express.static(path.join(__dirname, '../frontend')));
app.use('/api/farming', farmingRoutes);
app.use('/api/auth', authRoutes);

app.get('/api/health', (req, res) => res.json({ status: 'ok', service: 'KrishiAI' }));
app.get('*', (req, res) => res.sendFile(path.join(__dirname, '../frontend', 'index.html')));

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Internal server error' });
});

const server = app.listen(PORT, () => {
  console.log(`🌾 KrishiAI running on http://localhost:${PORT}`);
});

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`Port ${PORT} is already in use. Set a different PORT in your .env file or stop the process using port ${PORT}.`);
    process.exit(1);
  }
  console.error(err);
  process.exit(1);
});

module.exports = app;