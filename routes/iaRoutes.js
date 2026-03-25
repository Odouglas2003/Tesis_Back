
const express = require('express');
const router = express.Router();
const iaController = require('../controllers/iaController');

const axios = require('axios');
const logger = require('../config/logger');
const auth = require('../middlewares/auth');


require("dotenv").config();


router.post('/recommend-team',[auth.ensureAuth, auth.hasRole(['administrador','manager'])], iaController.recommendTeam);


router.post('/chat',async (req, res) => {
  
  const { message } = req.body;

  if (!message) {
    return res.status(400).json({ error: 'Falta el campo "message" en el cuerpo de la petición.' });
  }

  logger.info(`(HTTP Chat) Mensaje para la IA: "${message}"`);

  const AI_ENGINE_BASE_URL = process.env.AI_ENGINE_BASE_URL;
  
  if (!AI_ENGINE_BASE_URL) {
    logger.error("FATAL: La variable de entorno AI_ENGINE_BASE_URL no está definida.");
    return res.status(500).json({ error: "Error de configuración del servidor: no se encontró la URL del motor de IA." });
  }

  try {
    
    logger.info(`(HTTP Chat) Enviando a la IA en: ${AI_ENGINE_BASE_URL}`);
    const aiResponse = await axios.post(`${AI_ENGINE_BASE_URL}/chat/`, {
      query: message,
      chat_history: []
    });

    const respuestaDeIA = aiResponse.data; 
    logger.info(`(HTTP Chat) Respuesta recibida de la IA: ${JSON.stringify(respuestaDeIA)}`);

  
    return res.status(200).json(respuestaDeIA);

  } catch (error) {
    
    if (error.response) {
      logger.error(`Error del Motor de IA: ${error.response.status} - ${JSON.stringify(error.response.data)}`);
      return res.status(error.response.status).json(error.response.data);
    } else {
      logger.error(`Error de red al conectar con la IA: ${error.message}`);
      return res.status(503).json({ error: "No se pudo conectar con el servicio de IA." });
    }
  }
});


router.post(
  '/analytics/query',
  iaController.analyticsQuery
);


router.post(
  '/faiss/update',
  iaController.triggerFaissUpdate
);

router.post(
  '/analytics/export',
  iaController.exportAnalyticsReport
);





module.exports = router;