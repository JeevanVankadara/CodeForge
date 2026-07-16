const express = require('express');
const app = express.Router();
const isAuthenticated = require('../middlewares/isAuthenticated');

const assigningUserToLink = require('../middlewares/assigningUserToLink');

app.post('/createRoom', isAuthenticated, assigningUserToLink);

module.exports = app;