const express = require("express");
const router = express.Router();
const techController = require("../controllers/technologies");
const auth = require("../middlewares/auth");

router.get("/", [auth.ensureAuth, auth.hasRole(['administrador', 'manager'])],techController.getAllTechnologies);
router.post("/", [auth.ensureAuth, auth.hasRole(['administrador'])],techController.addTechnology);
router.put("/:id",[auth.ensureAuth, auth.hasRole(['administrador'])], techController.editTechnology);
router.delete("/:id",[auth.ensureAuth, auth.hasRole(['administrador'])], techController.deleteTechnology);

module.exports = router;