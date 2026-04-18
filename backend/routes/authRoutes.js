const express = require('express');
const router = express.Router();
const { loginUser, verifyToken } = require('../controllers/authController');

router.post('/login', loginUser);
router.post('/register', loginUser); // Use the same flow for simplicity
router.get('/verify', verifyToken);

module.exports = router;
