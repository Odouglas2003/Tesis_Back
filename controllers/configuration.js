// controllers/configuration.js
const ConfigurationService = require('../services/ConfigurationService');
//const logger = require('../config/logger'); // Para logging específico si se necesita

// Obtener columnas de la tabla
const getTableColumns = async (req, res) => { // Añadido next
  // try { // express-async-errors maneja esto
    const { section } = req.params;

    // El servicio validará si 'section' es un string válido y no vacío.
    // logger.info(`Controlador: Solicitando columnas para la sección: '${section}'`);
    const config = await ConfigurationService.getTableConfiguration(section);

    return res.status(200).json({
      status: 'success',
      section: config.section,
      columns: config.columns,
      message: `Columnas obtenidas correctamente para la sección: ${config.section}`,
    });
  // } catch (error) {
  //   next(error); // Pasar al middleware de error global
  // }
};

// Editar columnas de la tabla
const updateTableColumns = async (req, res) => { // Añadido next
  // try {
    const { columns, tableType } = req.body;
    const section = tableType; // Usar tableType como section

    // Validación básica en el controlador
    if (!section || String(section).trim() === '') {
      const error = new Error('La sección (tableType) es requerida y no puede estar vacía.');
      error.statusCode = 400;
      error.isOperational = true;
      throw error;
    }
    if (!Array.isArray(columns)) {
      const error = new Error('El campo "columns" debe ser un array.');
      error.statusCode = 400;
      error.isOperational = true;
      throw error;
    }
   


    // logger.debug(`Controlador: Actualizando columnas para sección '${section}':`, columns);
    const updatedConfig = await ConfigurationService.updateTableConfiguration(section, columns);
    // logger.info(`Controlador: Configuración de tabla para sección '${updatedConfig.section}' actualizada/creada.`);

    return res.status(200).json({
      status: 'success',
      section: updatedConfig.section,
      columns: updatedConfig.columns,
      message: `Columnas actualizadas/creadas correctamente para la sección: ${updatedConfig.section}`,
    });
  
};

module.exports = {
  getTableColumns,
  updateTableColumns,
};