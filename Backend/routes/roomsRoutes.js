const express = require('express');
const app = express.Router();
const isAuthenticated = require('../middlewares/isAuthenticated');

const assigningUserToLink = require('../controllers/assigningUserToLink');
const joinRoom = require('../controllers/joinRoom');
const saveRoom = require('../controllers/saveRoom');
const leaveRoom = require('../controllers/leaveRoom');

app.post('/createRoom', isAuthenticated, assigningUserToLink);
app.post('/:id/join', isAuthenticated, joinRoom);   // enter a room, load its code
app.put('/:id', isAuthenticated, saveRoom);          // save code to a room
app.post('/:id/leave', isAuthenticated, leaveRoom);  // free up your slot

module.exports = app;