// One place for the auth cookie name + options so every route agrees.
const COOKIE_NAME = 'token';

const cookieOptions = {
  httpOnly: true,         
  sameSite: 'lax',
  secure: false,          
  maxAge: 60 * 60 * 1000, 
};

const setAuthCookie = (res, token) => res.cookie(COOKIE_NAME, token, cookieOptions);
const clearAuthCookie = (res) => res.clearCookie(COOKIE_NAME, cookieOptions);

module.exports = { COOKIE_NAME, setAuthCookie, clearAuthCookie };
