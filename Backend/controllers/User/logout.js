const { clearAuthCookie } = require('../../util/authCookie');

// Clears the auth cookie so the browser is no longer logged in.
const logout = (req, res) => {
  clearAuthCookie(res);
  return res.status(200).json({ message: 'Logged out' });
};

module.exports = logout;
