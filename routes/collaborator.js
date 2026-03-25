

// routes/collaborator.js
const express = require("express");
const router = express.Router();
const ColaController = require("../controllers/collaborator");
const auth=require("../middlewares/auth");
// --- RUTAS MÁS ESPECÍFICAS PRIMERO ---
router.get("/contracts/expirations",[auth.ensureAuth, auth.hasRole(['administrador','manager'])], ColaController.checkContractExpiration);
router.get("/soft-deleted",[auth.ensureAuth, auth.hasRole(['administrador','manager'])], ColaController.getSoftDeletedCollaborators);
router.post("/restore/:id",[auth.ensureAuth, auth.hasRole(['administrador','manager'])], ColaController.restoreCollaborator);

// --- RUTAS GENERALES DESPUÉS ---
router.get("/",[auth.ensureAuth, auth.hasRole(['administrador','manager'])],ColaController.pruebaColab);
router.post("/",[auth.ensureAuth, auth.hasRole(['administrador'])], ColaController.register);
router.get(
  "/collaborators",
  [auth.ensureAuth, auth.hasRole(["administrador", "manager"])],
  ColaController.getCollaborators // ahora soporta search + estadoAsignacion
);

// --- RUTAS CON PARÁMETRO ':id' ---
router.put("/:id",[auth.ensureAuth, auth.hasRole(['administrador','manager'])], ColaController.editColab);
router.delete("/:id", [auth.ensureAuth, auth.hasRole(['administrador'])],ColaController.Eliminar);
router.put("/:id/asignar",[auth.ensureAuth, auth.hasRole(['administrador','manager'])], ColaController.updateCollaborator); 
router.get("/:id",[auth.ensureAuth, auth.hasRole(['administrador','manager'])], ColaController.getCollaboratorById);
router.delete("/:id/proyectos",[auth.ensureAuth, auth.hasRole(['administrador'])], ColaController.removeProyecto);

module.exports = router;