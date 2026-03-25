// services/TecnologyService.js
const Tecnology = require("../models/tecnology"); // Ajustar la ruta si es necesario
const logger = require('../config/logger'); // Importar el logger Winston

class TecnologyService {
  async getAllTechnologies() {
   
    return Tecnology.find(); // Tu lógica actual
  }

  async registerTechnology(tecnologyData) {
    const { tecnologias, first_name, last_name } = tecnologyData;

    if (!tecnologias || String(tecnologias).trim() === "") {
        const error = new Error("El nombre de la tecnologia es requerido.");
        error.statusCode = 400;
        error.isOperational = true;
        throw error;
    }

    // El campo en el modelo es 'tecnologias' (con tilde)
    // Asumimos que 'tecnologias' (sin tilde) es lo que viene del body
    const nombreTecnologiaNormalizado = String(tecnologias).trim();

   
    const existingTecno = await Tecnology.findOne({ tecnologias: nombreTecnologiaNormalizado });
    if (existingTecno) {
      const error = new Error(`La tecnologia "${nombreTecnologiaNormalizado}" ya existe.`);
      error.statusCode = 409; // Conflict
      error.isOperational = true;
      throw error;
    }

    // Generación de ID aleatorio (mantenemos la lógica, pero con la advertencia sobre colisiones)
    let randomId;
    let idExists = true;
    let attempts = 0;
    const maxAttempts = 20; // Aumentar un poco para reducir aún más la probabilidad teórica de fallo

    while (idExists && attempts < maxAttempts) {
        randomId = Math.floor(Math.random() * 1000000);
        const checkId = await Tecnology.findOne({ id: randomId });
        if (!checkId) {
            idExists = false;
        }
        attempts++;
    }

    if (idExists) {
        logger.error("Fallo al generar ID único para tecnologia después de varios intentos.");
        const error = new Error("No se pudo generar un ID único para la tecnologia en este momento. Por favor, intente de nuevo.");
        error.statusCode = 500; // Error del servidor, no del cliente
        // No marcar como isOperational porque el mensaje es genérico y el problema es interno.
        throw error;
    }

    const newTecno = new Tecnology({
      id: randomId,
      first_name: first_name || null,
      last_name: last_name || null,
      tecnologias: nombreTecnologiaNormalizado, // Guardar el nombre normalizado
      // created_at se establece por defecto en el modelo
    });

    logger.info(`Registrando nueva tecnologia: ${nombreTecnologiaNormalizado} con ID: ${randomId}`);
    return newTecno.save();
  }

    async getTechnologyById(id) {
    const numericId = parseInt(id, 10);
    if (isNaN(numericId)) {
        const error = new Error("El ID proporcionado no es un número válido.");
        error.statusCode = 400;
        error.isOperational = true;
        throw error;
    }
    const technology = await Tecnology.findOne({ id: numericId, delete_at: null }); // Asumiendo borrado lógico
    if (!technology) {
        const error = new Error(`tecnologia con ID ${numericId} no encontrada.`);
        error.statusCode = 404;
        error.isOperational = true;
        throw error;
    }
    logger.info(`tecnologia encontrada: ID ${numericId}`);
    return technology;
  }

  // --- FUNCIONES COMENTADAS ADAPTADAS (SI se necesitan EN EL FUTURO) ---
  
  async updateTechnology(id, updates) {
    const numericId = parseInt(id, 10);
    if (isNaN(numericId)) {
        const error = new Error("El ID proporcionado para actualizar no es un número válido.");
        error.statusCode = 400;
        error.isOperational = true;
        throw error;
    }

    const allowedUpdates = { ...updates };
    delete allowedUpdates.id;
    delete allowedUpdates.created_at;
    // Si 'tecnologias' es el campo en el modelo y 'tecnologias' viene del request:
    if (Object.prototype.hasOwnProperty.call(allowedUpdates, 'tecnologias') && String(allowedUpdates.tecnologias).trim()) {
        allowedUpdates.tecnologias = String(allowedUpdates.tecnologias).trim();
        delete allowedUpdates.tecnologias;
    } else if (Object.prototype.hasOwnProperty.call(allowedUpdates, 'tecnologias')) { // si viene vacío, quitarlo para no guardar string vacío
        delete allowedUpdates.tecnologias;
    }


    if (Object.keys(allowedUpdates).length === 0) {
        const error = new Error("No se proporcionaron datos válidos para actualizar.");
        error.statusCode = 400;
        error.isOperational = true;
        throw error;
    }
    
    // Opcional: verificar si el nuevo nombre de tecnologia ya existe (si se está cambiando)
    if (allowedUpdates.tecnologias) {
        const existingTecno = await Tecnology.findOne({ 
            tecnologias: allowedUpdates.tecnologias,
            id: { $ne: numericId } // Excluir el documento actual de la búsqueda de duplicados
        });
        if (existingTecno) {
            const error = new Error(`La tecnologia "${allowedUpdates.tecnologias}" ya existe.`);
            error.statusCode = 409; // Conflict
            error.isOperational = true;
            throw error;
        }
    }


    const updatedTechnology = await Tecnology.findOneAndUpdate(
        { id: numericId, delete_at: null }, // Asumiendo borrado lógico
        allowedUpdates,
        { new: true, runValidators: true }
    );

    if (!updatedTechnology) {
        const error = new Error(`tecnologia con ID ${numericId} no encontrada o no se pudo actualizar.`);
        error.statusCode = 404;
        error.isOperational = true;
        throw error;
    }
    logger.info(`tecnologia actualizada: ID ${numericId}`);
    return updatedTechnology;
  }

  async softDeleteTechnology(id) {
    const numericId = parseInt(id, 10);
    if (isNaN(numericId)) {
        const error = new Error("El ID proporcionado para eliminar no es un número válido.");
        error.statusCode = 400;
        error.isOperational = true;
        throw error;
    }

    const technology = await Tecnology.findOne({ id: numericId });
    if (!technology) {
        const error = new Error(`tecnologia con ID ${numericId} no encontrada.`);
        error.statusCode = 404;
        error.isOperational = true;
        throw error;
    }

    if (technology.delete_at) {
        const error = new Error(`La tecnologia con ID ${numericId} ya está marcada como eliminada.`);
        error.statusCode = 400;
        error.isOperational = true;
        error.delete_at = technology.delete_at;
        throw error;
    }

    technology.delete_at = new Date();
    await technology.save();
    logger.info(`tecnologia marcada como eliminada: ID ${numericId}`);
    return { message: "tecnologia marcada como eliminada correctamente", id: numericId, deleted_at: technology.delete_at };
  }
  
}

module.exports = new TecnologyService();