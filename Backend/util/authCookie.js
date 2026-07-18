// One place for the auth cookie name + options so every route agrees.
const COOKIE_NAME = 'token';

const cookieOptions = {
  httpOnly: true,          // JS can't read it -> safer against XSS
  sameSite: 'lax',
  secure: false,           // set true when served over HTTPS in production
  maxAge: 60 * 60 * 1000,  // 1 hour, matches the JWT expiry
};

const setAuthCookie = (res, token) => res.cookie(COOKIE_NAME, token, cookieOptions);
const clearAuthCookie = (res) => res.clearCookie(COOKIE_NAME, cookieOptions);

module.exports = { COOKIE_NAME, setAuthCookie, clearAuthCookie };
