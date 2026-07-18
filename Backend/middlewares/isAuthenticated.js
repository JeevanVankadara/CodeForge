const jwt = require('jsonwebtoken');
const { COOKIE_NAME } = require('../util/authCookie');

const isAuthenticated = (req, res, next) => {
  // Prefer the HttpOnly cookie; fall back to an Authorization header (e.g. tools/tests).
  let token = req.cookies?.[COOKIE_NAME];
  if (!token) {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.split(' ')[1];
    }
  }
  if (!token) {
    return res.status(401).json({ message: 'Access denied. No token provided.' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(400).json({ message: 'Invalid token.' });
  }
};

module.exports = isAuthenticated;