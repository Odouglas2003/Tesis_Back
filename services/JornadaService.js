// services/JornadaService.js
const Jornada = require("../models/jornada");
const logger = require("../config/logger");

class JornadaService {

  async getAllJornadas() {
    logger.info("Obteniendo todas las jornadas laborales.");
    return Jornada.find().sort({ name: 1 });
  }

  async getJornadaById(id) {
    const jornada = await Jornada.findById(id);
    if (!jornada) {
      const error = new Error(`Jornada con ID ${id} no encontrada.`);
      error.statusCode = 404;
      throw error;
    }
    return jornada;
  }

  async createJornada(jornadaData) {
    const { name, hours, description } = jornadaData;
    
    const existingJornada = await Jornada.findOne({ name });
    if (existingJornada) {
        const error = new Error(`La jornada con el nombre '${name}' ya existe.`);
        error.statusCode = 409; // Conflict
        throw error;
    }

    const nuevaJornada = new Jornada({ name, hours, description });
    await nuevaJornada.save();
    logger.info(`Nueva jornada creada: ${name} (${hours} hs)`);
    return nuevaJornada;
  }

  async updateJornada(id, updates) {
    // Evitar que se cambie el nombre si no se desea, ya que es un identificador
    // delete updates.name; 
    
    const jornadaActualizada = await Jornada.findByIdAndUpdate(
      id,
      { $set: updates },
      { new: true, runValidators: true }
    );

    if (!jornadaActualizada) {
      const error = new Error(`Jornada con ID ${id} no encontrada para actualizar.`);
      error.statusCode = 404;
      throw error;
    }
    logger.info(`Jornada actualizada: ${jornadaActualizada.name}`);
    return jornadaActualizada;
  }

  async deleteJornada(id) {
    const jornadaEliminada = await Jornada.findByIdAndDelete(id);

    if (!jornadaEliminada) {
      const error = new Error(`Jornada con ID ${id} no encontrada para eliminar.`);
      error.statusCode = 404;
      throw error;
    }
    logger.info(`Jornada eliminada: ${jornadaEliminada.name}`);
    return { message: "Jornada eliminada correctamente", id };
  }
}

module.exports = new JornadaService();