const express = require('express');
const router = express.Router();
const rolesController = require('../controllers/rolesController');
const auth = require('../middlewares/auth');

router.post('/',[auth.ensureAuth, auth.hasRole(['administrador'])], rolesController.createRole);
router.get('/',[auth.ensureAuth, auth.hasRole(['administrador', 'manager'])], rolesController.getAllRoles);
router.put('/:id',[auth.ensureAuth, auth.hasRole(['administrador'])], rolesController.updateRole);
router.delete('/:id',[auth.ensureAuth, auth.hasRole(['administrador'])], rolesController.deleteRole);

module.exports = router;