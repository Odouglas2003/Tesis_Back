

const axios = require('axios');
const logger = require('../config/logger');
require("dotenv").config();
const AI_ENGINE_BASE_URL =  process.env.AI_ENGINE_BASE_URL;

if (!AI_ENGINE_BASE_URL) {
    logger.error("La variable de entorno AI_ENGINE_BASE_URL no está definida. El servicio de IA no funcionará.");
}

class IaService {
    async recommendProjectTeam(recommendationRequest) {
        if (!AI_ENGINE_BASE_URL) {
            const error = new Error("El servicio de recomendación de equipos de IA no está configurado en el servidor.");
            error.statusCode = 503;
            throw error;
        }

        logger.info(`Enviando petición de recomendación de equipo a: ${AI_ENGINE_BASE_URL}/recommend_team`);
        logger.info(`Payload: ${JSON.stringify(recommendationRequest)}`);

        try {
            
            const response = await axios.post(
                `${AI_ENGINE_BASE_URL}/api/teams/recommend_positions`,
                recommendationRequest, 
                {
                    headers: {
                        'Content-Type': 'application/json',
                        'Accept': 'application/json'
                    },
                    timeout: 60000
                }
            );
            
            logger.info('Respuesta de recomendación recibida exitosamente del servicio de IA.');
            return response.data;

        } catch (error) {
            logger.error(`Error en IaService: ${error.message}`);
            
            if (error.response) {
                logger.error(`Error response from AI: ${JSON.stringify(error.response.data)}`);
                logger.error(`Status: ${error.response.status}`);
                
                
                const errorMessage = error.response.data.detail || 
                                   error.response.data.message || 
                                   JSON.stringify(error.response.data);
                
                const customError = new Error(`Error del servicio de IA: ${errorMessage}`);
                customError.statusCode = error.response.status;
                throw customError;
                
            } else if (error.request) {
                logger.error('No se recibió respuesta del servicio de IA');
                const customError = new Error('El servicio de IA no respondió. Por favor, intenta nuevamente.');
                customError.statusCode = 503;
                throw customError;
            } else {
                logger.error(`Error de configuración: ${error.message}`);
                throw error;
            }
        }
    }

    async triggerFaissUpdate(itemId) {
    
       try {
           const response = await axios.post(
                `${AI_ENGINE_BASE_URL}/api/faiss/update`,
                { item_id: itemId },
                { headers: { "Content-Type": "application/json" } }
            );
            logger.info(`FAISS actualizado para proyecto ${itemId}`);
            return response.data;
        } catch (error) {
          logger.error(`Error actualizando FAISS: ${error.message}`);
          throw error;
       }
   }

   async analyticsQuery(payload) {
  if (!AI_ENGINE_BASE_URL) {
    const error = new Error(
      "El servicio de IA (AI_ENGINE_BASE_URL) no está configurado."
    );
    error.statusCode = 503;
    throw error;
  }

  logger.info(
    `Enviando consulta analítica a: ${AI_ENGINE_BASE_URL}/analytics/query`
  );
  logger.info(`Payload: ${JSON.stringify(payload)}`);

  try {
   

    const res = await axios.post(
      `${AI_ENGINE_BASE_URL}/analytics/query`,
      payload,
      {
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        timeout: 60000,
      }
    );

    logger.info("Respuesta de analytics recibida exitosamente.");
    return res.data;
  } catch (error) {
    logger.error(`Error en IaService.analyticsQuery: ${error.message}`);

    if (error.response) {
      const msg =
        error.response.data?.detail ||
        error.response.data?.message ||
        JSON.stringify(error.response.data);
      const custom = new Error(`Error del servicio de IA: ${msg}`);
      custom.statusCode = error.response.status;
      throw custom;
    }
    if (error.request) {
      const custom = new Error(
        "El servicio de IA no respondió. Por favor, intenta nuevamente."
      );
      custom.statusCode = 503;
      throw custom;
    }
    throw error;
  }
}


}

module.exports = new IaService();