// routes/history.block.routes.js
const express = require("express");
const router = express.Router();
const ctrl = require("../controllers/collaborator.history.controller");
const auth = require("../middlewares/auth");

// Upsert de bloque diario (arrays previous/next completos)
router.post(
  "/:id/history/blocks",
  [auth.ensureAuth, auth.hasRole(["administrador", "manager"])],
  ctrl.recordDailyHistory
);

// Obtener bloques
router.get(
  "/:id/history/blocks",
  [auth.ensureAuth, auth.hasRole(["administrador", "manager"])],
  ctrl.getAssignmentHistoryBlocks
);

module.exports = router;
