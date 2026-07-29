const express = require('express');
const runController = require('../controllers/runControllers.js');
const isAuthenticated = require('../middlewares/isAuthenticated.js');
const { runLimiter } = require('../middlewares/rateLimits.js');
const router = express.Router();

router.post('/', isAuthenticated, runLimiter, runController);

module.exports = router;
