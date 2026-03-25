
// /backend/index.js
'use strict'

const http = require("http");

const app = require('./app');
const connection = require("./database/connection");
const logger = require('./config/logger');

const puerto = process.env.PORT;

const server = http.createServer(app);



// --- Arranque del Servidor ---
connection()
    .then(() => {
        logger.info("✅ Conectado correctamente a la base de datos MongoDB!");
        server.listen(puerto, () => {
            logger.info(`🚀 Servidor API y Chat de Rubik arrancados en el puerto: ${puerto}`);
        });
    })
    .catch(err => {
        logger.error("❌ Fallo fatal al conectar a la base de datos:", err);
        process.exit(1);
    });