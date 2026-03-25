const StateProject = require("../models/stateprojects");
const logger = require("../config/logger");

// ✅ Obtener todos los estados
const getAllStates = async () => {
  logger.info("Buscando todos los estados de proyecto");
  return await StateProject.find().sort({ createdAt: -1 });
};



module.exports = {
  getAllStates,

};
