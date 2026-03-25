// routes/personRoutes.js
const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/personnelController');
const auth = require('../middlewares/auth');

router.post('/',[auth.ensureAuth, auth.hasRole(['administrador'])], ctrl.create);           // POST   /api/person
router.get('/',[auth.ensureAuth, auth.hasRole(['administrador'])], ctrl.getAll);            // GET    /api/person?page=1&limit=20
router.get('/:id',[auth.ensureAuth, auth.hasRole(['administrador'])], ctrl.getById);        // GET    /api/person/606d...
router.put('/:id',[auth.ensureAuth, auth.hasRole(['administrador'])], ctrl.update);         // PUT    /api/person/606d...
router.delete('/:id',[auth.ensureAuth, auth.hasRole(['administrador'])], ctrl.remove);      // DELETE /api/person/606d...

module.exports = router;
