const express = require("express");

const router = express.Router();
const login = require("../controllers/User/login.js");
const signup = require("../controllers/User/signup.js");
const me = require("../controllers/User/me.js");
const logout = require("../controllers/User/logout.js");
const isAuthenticated = require("../middlewares/isAuthenticated.js");
const { loginLimiter, signupLimiter } = require("../middlewares/rateLimits.js");

router.post("/login", loginLimiter, login);       // throttled: password guessing
router.post("/signup", signupLimiter, signup);    // throttled: bulk account creation
router.get("/me", isAuthenticated, me);   // who am I? (reads the auth cookie)
router.post("/logout", logout);           // clear the auth cookie

module.exports = router;
