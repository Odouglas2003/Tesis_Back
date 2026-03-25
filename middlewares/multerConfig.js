

// middlewares/multerConfig.js (versión COMPLETA y MODIFICADA)
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const logger = require('../config/logger');
const AppError = require('../utils/AppError'); // <-- NUEVA IMPORTACIÓN

const uploadDir = path.join(__dirname, '../public/uploads/');

if (!fs.existsSync(uploadDir)){
    fs.mkdirSync(uploadDir, { recursive: true });
    logger.info(`Directorio de subida creado en: ${uploadDir}`);
}

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const fileFilter = (req, file, cb) => {
  if (file.mimetype === 'image/jpeg' || file.mimetype === 'image/png' || file.mimetype === 'image/gif') {
    cb(null, true);
  } else {
    logger.warn(`Intento de subir archivo no permitido: ${file.originalname} (${file.mimetype})`);
    // Usamos nuestra clase de error personalizada
    cb(new AppError('INVALID_FILE_TYPE'), false);
  }
};

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 1024 * 1024 * 5
  },
  fileFilter: fileFilter
});

module.exports = upload;