// routes/projects.js
const express = require("express");
const router = express.Router();
const ProjecController = require("../controllers/projects");
const auth = require("../middlewares/auth");


// router.get("/all", ProjecController.mostrarTodosProyectos); 
router.get("/",[auth.ensureAuth, auth.hasRole(['administrador','manager'])], ProjecController.pruebaProjec);       // Antes era /proyecto
router.post("/register",[auth.ensureAuth, auth.hasRole(['administrador'])], ProjecController.register);        // Antes era /register
router.post("/register-relations",[auth.ensureAuth, auth.hasRole(['administrador','manager'])], ProjecController.registerWithRelations);

router.get("/:id",[auth.ensureAuth, auth.hasRole(['administrador','manager'])], ProjecController.getProjectByID); // Antes era /buscar/:taxonId
router.put("/:id",[auth.ensureAuth, auth.hasRole(['administrador','manager'])], ProjecController.editProject);  // Antes era /editar/:taxonId
router.post("/:id",[auth.ensureAuth, auth.hasRole(['administrador'])], ProjecController.eliminar);  // Antes era POST /eliminar/:taxonId

router.post("/:id/assigned-persons",[auth.ensureAuth, auth.hasRole(['administrador','manager'])], ProjecController.addAssignedPerson); // Añadir persona asignada a un proyecto
router.delete("/:id/assigned-persons",[auth.ensureAuth, auth.hasRole(['administrador','manager'])], ProjecController.removeAssignedPerson); // Eliminar persona asignada de un proyecto
router.put("/:id/assignedPersons/:personId",[auth.ensureAuth, auth.hasRole(['administrador','manager'])], ProjecController.updateAssignedPerson); // Editar persona asignada a un proyecto


module.exports = router; 