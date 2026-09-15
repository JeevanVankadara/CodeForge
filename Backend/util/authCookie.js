// One place for the auth cookie name + options so every route agrees.
const COOKIE_NAME = 'token';

// Cross-site in production (separate domains + HTTPS), same-site in dev.
// Browsers only accept sameSite:'none' together with secure:true.
const isProduction = process.env.NODE_ENV === 'production';

const cookieOptions = {
  httpOnly: true,
  sameSite: isProduction ? 'none' : 'lax',
  secure: isProduction,
  maxAge: 60 * 60 * 1000,
};

const setAuthCookie = (res, token) => res.cookie(COOKIE_NAME, token, cookieOptions);
const clearAuthCookie = (res) => res.clearCookie(COOKIE_NAME, cookieOptions);

module.exports = { COOKIE_NAME, setAuthCookie, clearAuthCookie, cookieOptions };
