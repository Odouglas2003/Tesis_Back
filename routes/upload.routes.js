

// Archivo: routes/upload.routes.js

const express = require('express');
const router = express.Router();
const multer = require('multer');
const auth = require('../middlewares/auth');

// <-- CAMBIO: Importamos 'getPublicUrl' en lugar de 'getSignedFileUrl'
const { uploadFile, getPublicUrl } = require('../services/s3.service.js');

// La configuración de Multer no cambia.
const storage = multer.memoryStorage();
const upload = multer({
    storage: storage,
    limits: { fileSize: 10 * 1024 * 1024 } // Límite de 10MB
});

// La ruta POST para subir la imagen no cambia. Sigue funcionando igual.
router.post('/image',[auth.ensureAuth, auth.hasRole(['administrador'])], upload.single('image'), async (req, res, next) => {
    if (!req.file) {
        return res.status(400).json({ message: 'No se ha subido ningún archivo.' });
    }
    try {
        const result = await uploadFile(req.file.buffer, req.file.originalname, req.file.mimetype);
        res.status(201).json({
            message: 'Archivo subido con éxito.',
            imageKey: result.key,
        });
    } catch (error) {
        next(error);
    }
});

// --- ENDPOINT GET MODIFICADO ---
router.get('/image/:key',[auth.ensureAuth, auth.hasRole(['administrador'])], async (req, res, next) => {
    try {
        const imageKey = req.params.key;
   
        // <-- CAMBIO: Llamamos a la nueva función que construye la URL pública.
        // Nota: ya no es una operación 'await' porque es síncrona.
        const publicUrl = getPublicUrl(imageKey);

        // <-- CAMBIO: Respondemos con la URL pública permanente.
        res.status(200).json({
            message: 'URL pública generada con éxito.',
            url: publicUrl,
        });
    } catch (error) {
        // Pasamos cualquier error inesperado al manejador global.
        next(error);
    }
});

module.exports = router;