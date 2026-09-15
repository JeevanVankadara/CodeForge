// Rate limits for the endpoints that are worth abusing.

const { rateLimit, ipKeyGenerator } = require('express-rate-limit');

const minutes = (n) => n * 60 * 1000;

// ipKeyGenerator buckets IPv6 by /64 rather than by exact address. A raw req.ip
// would let anyone with an IPv6 allocation get a fresh limit per address.
const byUser = (req) => (req.user?.id ? `u:${req.user.id}` : ipKeyGenerator(req.ip));

const runLimiter = rateLimit({
  windowMs: minutes(1),
  limit: 10,
  keyGenerator: byUser,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { error: 'Too many runs - please slow down' },
});

const loginLimiter = rateLimit({
  windowMs: minutes(15),
  limit: 10,
  skipSuccessfulRequests: true,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { message: 'Too many login attempts - try again later' },
});

const signupLimiter = rateLimit({
  windowMs: minutes(60),
  limit: 5,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { message: 'Too many accounts created - try again later' },
});

module.exports = { runLimiter, loginLimiter, signupLimiter };
