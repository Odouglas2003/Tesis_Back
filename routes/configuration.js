// routes/configuration.js
const express = require('express');
const router = express.Router();
const tableConfigController = require('../controllers/configuration');
const auth=require('../middlewares/auth');
// GET /api/configuration/columns/:section
router.get('/columns/:section',[auth.ensureAuth, auth.hasRole(['administrador','manager'])], tableConfigController.getTableColumns);

// PUT /api/configuration/updateColumns  (Considerar cambiar a /columns o /columns/:section con PUT)
router.put('/updateColumns', [auth.ensureAuth, auth.hasRole(['administrador'])],tableConfigController.updateTableColumns);


module.exports = router;