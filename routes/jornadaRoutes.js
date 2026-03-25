// routes/jornadaRoutes.js
const express = require("express");
const router = express.Router();
const JornadaController = require("../controllers/jornadaController");
const auth = require("../middlewares/auth");
// --- RUTAS PARA EL CRUD DE JORNADAS ---

// GET /api/jornadas -> Obtener todas las jornadas
router.get("/", [auth.ensureAuth, auth.hasRole(['administrador','manager'])], JornadaController.getAll);

// POST /api/jornadas -> Crear una nueva jornada
router.post("/",[auth.ensureAuth, auth.hasRole(['administrador'])], JornadaController.create);

// GET /api/jornadas/:id -> Obtener una jornada por su ID
router.get("/:id",[auth.ensureAuth, auth.hasRole(['administrador','manager'])], JornadaController.getById);

// PUT /api/jornadas/:id -> Actualizar una jornada por su ID
router.put("/:id",[auth.ensureAuth, auth.hasRole(['administrador'])], JornadaController.update);

// DELETE /api/jornadas/:id -> Eliminar una jornada por su ID
router.delete("/:id",[auth.ensureAuth, auth.hasRole(['administrador'])], JornadaController.remove);

module.exports = router;