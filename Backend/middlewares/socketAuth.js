//This middleware acts as a security checkpoint: 
//it looks for a JWT in the client's cookies (or the Socket.IO auth field), 
//verifies that the token is genuine, stores the authenticated user's details on the socket, 
//and only then allows the Socket.IO connection to be established.

const jwt = require('jsonwebtoken');
// cookie v2 renamed the old `parse` export to `parseCookie`.
const { parseCookie } = require('cookie');
const { COOKIE_NAME } = require('../util/authCookie');


const socketAuth = (socket, next) => {
  try {
    const cookies = parseCookie(socket.handshake.headers.cookie || '');
    let token = cookies[COOKIE_NAME];

    if (!token) token = socket.handshake.auth?.token;

    if (!token) return next(new Error('UNAUTHORIZED'));

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    socket.data.user = { id: Number(decoded.id), email: decoded.email };

    return next();
  } catch (err) {
    return next(new Error('UNAUTHORIZED'));
  }
};

module.exports = socketAuth;
