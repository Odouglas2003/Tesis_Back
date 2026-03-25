const express = require("express");
const router = express.Router();
const stateprojectsController = require("../controllers/stateprojects");
const auth = require("../middlewares/auth");



router.get("/",[auth.ensureAuth, auth.hasRole(['administrador','manager' ])], stateprojectsController.getAllStates);

module.exports = router;
