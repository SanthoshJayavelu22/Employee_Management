// routes/authRoutes.js
const express = require('express');
const {
  register,
  login
} = require('../controllers/authController');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();



router.post('/register', protect, authorize('admin'), register);
router.post('/login', login);


module.exports = router;