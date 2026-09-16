const express = require('express');
const getProblem = require('../controllers/getProblem');
const isAuthenticated = require('../middlewares/isAuthenticated');
const { problemLimiter } = require('../middlewares/rateLimits');
const router = express.Router();

router.get('/:id', isAuthenticated, problemLimiter, getProblem);

module.exports = router;
