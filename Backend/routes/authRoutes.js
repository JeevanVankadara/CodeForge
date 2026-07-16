import express from "express";

const router = express.Router();
const {login} = require ("../controllers/User/login.js");
const {signup} = require("../controllers/User/signup.js");

router.post("/login", login);
router.post("/signup", signup);

module.exports = router;