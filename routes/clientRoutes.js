const express = require('express');
const router = express.Router();
const clientController = require('../controllers/clientController');
const auth=require('../middlewares/auth');


router.post('/',[auth.ensureAuth, auth.hasRole(['administrador'])], clientController.createClient);
router.get('/', [auth.ensureAuth, auth.hasRole(['administrador','manager'])],clientController.getAllClients);
router.put('/:id',[auth.ensureAuth, auth.hasRole(['administrador'])], clientController.updateClient);
router.delete('/:id',[auth.ensureAuth, auth.hasRole(['administrador'])], clientController.deleteClient);

module.exports = router;