const express = require('express');
const router = express.Router();
const bizneo = require("../controllers/bizneoSync.controller");
const auth = require("../middlewares/auth");


// FULL sync (colaboradores + proyectos)
router.post('/full',[auth.ensureAuth, auth.hasRole(['administrador'])], bizneo.triggerFullSync);

// Solo colaboradores (con opciones en body)
router.post('/collaborators',[auth.ensureAuth, auth.hasRole(['administrador'])], bizneo.triggerCollaborators);

// Un colaborador por id de Bizneo
router.post('/collaborators/:bizneoId',[auth.ensureAuth, auth.hasRole(['administrador','manager'])], bizneo.triggerOneCollaborator);

// Activar un colaborador inactivo en Rubik por id de Bizneo
router.post('/collaborators/activate/:bizneoId',[auth.ensureAuth, auth.hasRole(['administrador','manager'])], bizneo.activateOneInactiveInRubik);

// Activar un colaborador inactivo en Rubik por _id de MongoDB
router.post('/collaborators/:id/activate',[auth.ensureAuth, auth.hasRole(['administrador','manager'])], bizneo.activateOneInactiveInRubik);

module.exports = router;
