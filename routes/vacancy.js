


// module.exports = router;

// routes/vacancie.js
const express = require("express");
const router = express.Router();
const VacanController = require("../controllers/vacancie");
const auth = require("../middlewares/auth");

// Rutas ajustadas para ser más estándar:
// --- CAMBIO: Se llama a getAllVacancies en lugar de prueVacan ---
router.get("/", [auth.ensureAuth, auth.hasRole(['administrador','manager'])],VacanController.getAllVacancies); // Ruta para listar y filtrar vacantes
router.post("/",[auth.ensureAuth, auth.hasRole(['administrador','manager'])], VacanController.register);      // Ruta para registrar una nueva vacante

// Rutas con ID como parámetro (sin cambios)
router.get("/:id", [auth.ensureAuth, auth.hasRole(['administrador','manager'])],VacanController.getVacancieById);
router.put("/:id",[auth.ensureAuth, auth.hasRole(['administrador','manager'])], VacanController.editVacan);
router.delete("/:id",[auth.ensureAuth, auth.hasRole(['administrador'])], VacanController.Eliminar);

module.exports = router;