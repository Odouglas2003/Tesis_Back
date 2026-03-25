






// Archivo: src/services/s3.service.js (Versión para Bucket PÚBLICO)

require('dotenv').config();
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const crypto = require('crypto');

// --- Configuración ---
const bucketName =  process.env.AWS_BUCKET_NAME  
const region =  process.env.AWS_REGION 
const accessKeyId = process.env.AWS_ACCESS_KEY_ID 
const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY  

// El cliente S3 sigue siendo necesario para SUBIR archivos
const s3Client = new S3Client({
  region,
  credentials: {
    accessKeyId,
    secretAccessKey,
  },
});

/**
 * Sube un archivo a S3. La lógica no cambia.
 */
async function uploadFile(fileBuffer, originalname, mimetype) {
  const randomImageName = (bytes = 16) => crypto.randomBytes(bytes).toString('hex');
  const fileName = randomImageName() + '-' + originalname.replace(/\s/g, '_');

  const uploadParams = {
    Bucket: bucketName,
    Body: fileBuffer,
    Key: fileName,
    ContentType: mimetype,  
  };

  await s3Client.send(new PutObjectCommand(uploadParams));
  return { key: fileName };
}

/**
 * Genera la URL pública y permanente de un archivo.
 * NO es asíncrona y NO necesita hablar con AWS.
 * @param {string} key - La clave del objeto en S3.
 * @returns {string} - La URL pública y permanente.
 */
function getPublicUrl(key) {
  if (!key) return null; // Devuelve null si no hay clave
  // Este es el formato estándar de las URLs públicas de S3.
  return `https://${bucketName}.s3.${region}.amazonaws.com/${key}`;
}

// Exportamos las funciones necesarias
module.exports = { uploadFile, getPublicUrl };