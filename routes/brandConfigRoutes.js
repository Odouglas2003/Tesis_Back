const express = require('express');
const router = express.Router();
const controller = require('../controllers/brandConfigController');
const auth = require('../middlewares/auth');
const multer = require('multer');

const upload = multer({ storage: multer.memoryStorage() });

// Alta
router.post('/', [auth.ensureAuth, auth.hasRole(['administrador']), upload.fields([
    { name: 'logo', maxCount: 1 },
    { name: 'favicon', maxCount: 1 }
])], controller.createBrandConfig);

// Consulta todas
router.get('/',[auth.ensureAuth, auth.hasRole(['administrador'])], controller.getAllBrandConfigs);

// Buscar por empresaId (todas las configs de una empresa)
router.get('/empresa/:empresaId', [auth.ensureAuth, auth.hasRole(['administrador'])], controller.getBrandConfigsByEmpresa);


// Consulta por id
router.get('/:id', [auth.ensureAuth, auth.hasRole(['administrador'])],controller.getBrandConfigById);

// Modificación
router.put('/:id', [auth.ensureAuth, auth.hasRole(['administrador']), upload.fields([
    { name: 'logo', maxCount: 1 },
    { name: 'favicon', maxCount: 1 }
])], controller.updateBrandConfig);

// Baja
router.delete('/:id',[auth.ensureAuth, auth.hasRole(['administrador'])], controller.deleteBrandConfig);

module.exports = router;