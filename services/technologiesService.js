

// services/technologiesService.js (versión COMPLETA y MODIFICADA)
const Technology = require("../models/technologies");
const AppError = require("../utils/AppError");

class TechnologiesService {
  async getAllTechnologies() {
    // No necesita cambios, pero ahora la salida estará transformada por el Schema.
    return Technology.find().sort({ name: 1 }); // Es bueno ordenar la salida.
  }

  async addTechnology(data) {
    // La validación ahora debe ser por nombre para evitar duplicados.
    const existingTech = await Technology.findOne({ name: data.name });
    if (existingTech) {
      throw new AppError("TECH_NAME_ALREADY_EXISTS", 409, "Ya existe una tecnología con ese nombre.");
    }
    // Creamos la tecnología solo con el nombre. El _id se genera automáticamente.
    return Technology.create({ name: data.name });
  }

  async editTechnology(id, name) {
    // Usamos findByIdAndUpdate, que es el método idiomático de Mongoose para buscar por _id.
    const tech = await Technology.findByIdAndUpdate(
      id,
      { name: name },
      { new: true, runValidators: true } // runValidators es bueno para futuras validaciones.
    );
    if (!tech) {
      throw new AppError("TECH_NOT_FOUND");
    }
    return tech;
  }

  async deleteTechnology(id) {
    // Usamos findByIdAndDelete para buscar y eliminar por _id.
    const tech = await Technology.findByIdAndDelete(id);
    if (!tech) {
      throw new AppError("TECH_NOT_FOUND");
    }
    // No se devuelve nada en el borrado exitoso.
    return;
  }
}

module.exports = new TechnologiesService();