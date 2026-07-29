const express = require('express');
const { iceServers } = require('../controllers/iceServers.js');
const isAuthenticated = require('../middlewares/isAuthenticated.js');
const router = express.Router();

// Authentication is what stops this becoming an open relay: every call here
// mints TURN credentials, and TURN credentials cost bandwidth to honour.
router.get('/ice', isAuthenticated, iceServers);

module.exports = router;
