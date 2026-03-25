// /utils/AppError.js

const messages = require('./messages');

/**
 * Clase de Error Personalizada para la Aplicación.
 * Permite centralizar los mensajes y códigos de error.
 * @param {string} key - La clave del mensaje de error definida en /config/messages.js
 */
class AppError extends Error {
  constructor(key) {
    const errorInfo = messages.error[key] || messages.error.INTERNAL_SERVER_ERROR;

    super(errorInfo.message);

    this.statusCode = errorInfo.statusCode;
    this.isOperational = true; // Todos los errores lanzados con AppError son operacionales/esperados
    this.key = key; // Guardamos la clave original por si es útil para logging

    Error.captureStackTrace(this, this.constructor);
  }
}

module.exports = AppError;