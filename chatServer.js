// chatServer.js
'use strict'

const http = require('http');
const { Server } = require("socket.io");
const axios = require('axios');
require('dotenv').config();
const logger = require('./config/logger'); // Asegúrate de que la ruta sea correcta

// --- CONFIGURACIÓN ---
const CHAT_PORT = process.env.CHAT_PORT || 3901; // <<< Puerto dedicado para el chat
const AI_ENGINE_BASE_URL = process.env.AI_ENGINE_BASE_URL;
const FRONTEND_BASE_URL = process.env.FRONTEND_BASE_URL;

// --- CREACIÓN DEL SERVIDOR HTTP Y SOCKET.IO ---
const httpServer = http.createServer();
const io = new Server(httpServer, {
    cors: {
        origin: FRONTEND_BASE_URL,
        methods: ["GET", "POST"]
    }
});

// --- LÓGICA DE CONEXIÓN DE SOCKET.IO PARA RUBIKO ---
io.on('connection', (socket) => {
    logger.info(`🤖 Un usuario se ha conectado al chat de Rubiko: ${socket.id}`);

    socket.on('rubiko:message', async (message) => {
        logger.info(`Mensaje para la IA: "${message}"`);
        try {
            logger.info(`Enviando a la IA en: ${AI_ENGINE_BASE_URL}`);
            const aiResponse = await axios.post(`${AI_ENGINE_BASE_URL}/chat`, {
                query: message,
                chat_history: [] // Puedes expandir esto en el futuro
            });

            const responseObject = aiResponse.data;
            logger.info(`Respuesta recibida de la IA: ${JSON.stringify(responseObject)}`);
            socket.emit('rubiko:response', responseObject);

        } catch (error) {
            let errorMessage = "Lo siento, estoy teniendo algunos problemas técnicos para pensar. Por favor, inténtalo de nuevo más tarde.";
            if (error.response) {
                logger.error(`Error del Motor de IA: ${error.response.status} - ${JSON.stringify(error.response.data)}`);
                // Si la IA nos da un mensaje de error, lo reenviamos
                if (error.response.data && error.response.data.answer) {
                    errorMessage = error.response.data.answer;
                }
            } else if (error.request) {
                logger.error(`No se recibió respuesta del Motor de IA. ¿Está el servicio de Python corriendo? Error: ${error.message}`);
            } else {
                logger.error(`Error al configurar la petición a la IA: ${error.message}`);
            }

            socket.emit('rubiko:response', {
                answer: errorMessage,
                source: "error_conexion_ia"
            });
        }
    });

    socket.on('disconnect', () => {
        logger.info(`👋 Un usuario se ha desconectado del chat: ${socket.id}`);
    });
});

// --- ARRANQUE DEL SERVIDOR DE CHAT ---
httpServer.listen(CHAT_PORT, () => {
    logger.info(`🚀 Servidor de Chat de Rubiko escuchando en el puerto: ${CHAT_PORT}`);
});