// routes/tecnology.js
const express = require("express");
const router = express.Router();
const tecnoController = require("../controllers/tecnology")
const auth = require("../middlewares/auth");

//definir rutas
router.get("/tecnology",[auth.ensureAuth, auth.hasRole(['administrador'])],tecnoController.pruebatecno); // GET para obtener recursos es más estándar

//buscar tecnologia por id
router.get("/:id",[auth.ensureAuth, auth.hasRole(['administrador'])], tecnoController.getTecnoByID); // GET para obtener un recurso específico por ID
router.post("/register",[auth.ensureAuth, auth.hasRole(['administrador'])], tecnoController.register);

//  implementar editar y eliminar:
router.put("/:id",[auth.ensureAuth, auth.hasRole(['administrador'])], tecnoController.edittecno);
router.delete("/:id",[auth.ensureAuth, auth.hasRole(['administrador'])], tecnoController.Eliminar); // DELETE para eliminar recursos


//exportar ruter
module.exports = router;