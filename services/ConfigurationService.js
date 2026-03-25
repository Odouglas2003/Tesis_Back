// services/ConfigurationService.js
const TableConfig = require('../models/configuration'); // Ajustar la ruta si es necesario
const logger = require('../config/logger');           // Importar tu logger Winston

class ConfigurationService {
  async getTableConfiguration(section) {
    if (!section || typeof section !== 'string' || String(section).trim() === '') {
      const error = new Error('La sección es requerida y debe ser un string no vacío.');
      error.statusCode = 400;
      error.isOperational = true;
      throw error;
    }

    const sectionTrimmed = String(section).trim();
    // logger.debug(`Servicio: Buscando configuración para la sección: '${sectionTrimmed}'`);
    const config = await TableConfig.findOne({ section: sectionTrimmed });

    if (!config) {
      // Considerar si se quiere devolver un array de columnas por defecto si no se encuentra,
      // o si siempre debe existir una configuración.
      // Por ahora, mantenemos el error 404.
      const error = new Error(`Configuración no encontrada para la sección: ${sectionTrimmed}`);
      error.statusCode = 404;
      error.isOperational = true;
      throw error;
    }
    return config; // Devuelve el documento completo de configuración
  }

  async updateTableConfiguration(section, newColumns) {
    if (!section || typeof section !== 'string' || String(section).trim() === '') {
      const error = new Error('La sección (tableType) es requerida y debe ser un string no vacío.');
      error.statusCode = 400;
      error.isOperational = true;
      throw error;
    }
    if (!Array.isArray(newColumns)) {
      const error = new Error('El formato de las columnas es inválido; se esperaba un array.');
      error.statusCode = 400;
      error.isOperational = true;
      throw error;
    }

    const normalizedColumns = newColumns.map((col, index) => {
      if (
        typeof col !== 'object' ||
        col === null ||
        !col.field ||
        typeof col.field !== 'string' ||
        !col.displayName ||
        typeof col.displayName !== 'string'
      ) {
        const error = new Error('Cada columna en el array debe ser un objeto con propiedades "field" (string) y "displayName" (string).');
        error.statusCode = 400;
        error.isOperational = true;
        error.invalidColumnData = col; // Opcional: para loguear qué columna falló
        throw error;
      }

      if (col.order !== undefined && typeof col.order !== 'number') {
        const error = new Error('La propiedad "order" debe ser numérica cuando está presente.');
        error.statusCode = 400;
        error.isOperational = true;
        error.invalidColumnData = col;
        throw error;
      }

      return {
        displayName: String(col.displayName).trim(),
        field: String(col.field).trim(),
        order: typeof col.order === 'number' ? col.order : index,
      };
    });

    const sectionTrimmed = String(section).trim();
    // logger.debug(`Servicio: Actualizando/creando configuración para sección: '${sectionTrimmed}' con ${newColumns.length} columnas.`);

    try {
        const updatedConfig = await TableConfig.findOneAndUpdate(
          { section: sectionTrimmed },
          { $set: { columns: normalizedColumns } }, // $set reemplazará el array 'columns' completo
          { new: true, upsert: true, runValidators: true }
        );

       

        logger.info(`Configuración de tabla para sección '${sectionTrimmed}' actualizada/creada.`);
        return updatedConfig;
    } catch (dbError) {
        logger.error("Error de base de datos al actualizar/crear configuración de tabla:", { message: dbError.message, stack: dbError.stack, section: sectionTrimmed });
        if (dbError.name === 'ValidationError') {
            const error = new Error(`Error de validación: ${dbError.message}`);
            error.statusCode = 400; error.isOperational = true; error.details = dbError.errors; throw error;
        }
        // Otro error de base de datos
        const error = new Error("Error interno al actualizar o crear la configuración de la tabla.");
        error.statusCode = 500;
        throw error; // No es operacional porque el mensaje es genérico y el problema es de DB
    }
  }
}

module.exports = new ConfigurationService();
