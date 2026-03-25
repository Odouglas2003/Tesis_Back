const express = require('express');
const router = express.Router();
const skillController = require('../controllers/skillsController');
const auth = require('../middlewares/auth');

router.post('/',[auth.ensureAuth, auth.hasRole(['administrador'])], skillController.createSkill);
router.get('/', [auth.ensureAuth, auth.hasRole(['administrador', 'manager'])],skillController.getAllSkill);
router.put('/:id',[auth.ensureAuth, auth.hasRole(['administrador'])], skillController.updateSkill);
router.delete('/:id',[auth.ensureAuth, auth.hasRole(['administrador'])], skillController.deleteSkill);

module.exports = router;