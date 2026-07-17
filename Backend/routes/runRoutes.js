const express = require('express');
const runController = require('../controllers/runControllers.js');
//const isAuthenticated = require('../middlewares/isAuthenticated.js');
const router = express.Router();

router.post("/", runController);

module.exports = router;