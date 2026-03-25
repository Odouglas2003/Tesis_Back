// controllers/tecnology.js

const TecnologyService = require("../services/TecnologyService");
//const logger = require('../config/logger'); // Para logging específico si se necesita

// Obtener todas las tecnologias
const pruebatecno = async (req, res) => { // Añadido next
  
    const tecnos = await TecnologyService.getAllTechnologies();
    return res.status(200).json(tecnos);
  
};

// Registrar una nueva tecnologia
const register = async (req, res) => { // Añadido next
  
    const params = req.body;

    // Validación básica de entrada en el controlador
    // El servicio hará una validación más profunda si es necesario y la de existencia.
    if (!params.tecnologias || String(params.tecnologias).trim() === "") {
      const error = new Error("Falta el campo 'tecnologias' o está vacío.");
      error.statusCode = 400;
      error.isOperational = true; // Es un error de validación del cliente
      throw error; // express-async-errors lo pasará a next(error)
    }

    const tecnologyData = {
        tecnologias: params.tecnologias, // El servicio se encargará de normalizar
        first_name: params.first_name,   // Pasa estos campos si los usas
        last_name: params.last_name,
    };

    
    const savedTecno = await TecnologyService.registerTechnology(tecnologyData);
   
    return res.status(201).json({
      status: "success",
      message: "tecnologia registrada correctamente",
      tecno: savedTecno,
    });
 
};

// Obtener tecnologia por ID
const getTecnoByID = async (req, res) => { // Añadido next
  const { id } = req.params;

  if (!id) {
    const error = new Error("El ID de la tecnologia es requerido en la URL.");
    error.statusCode = 400;
    error.isOperational = true; // Es un error de validación del cliente
    throw error; // express-async-errors lo pasará a next(error)
  }

  // Validar si 'id' es un número antes de pasarlo al servicio
  if (isNaN(parseInt(id,10))) {
    const error = new Error("El ID de la tecnologia debe ser un número.");
    error.statusCode = 400;
    error.isOperational = true; // Es un error de validación del cliente
    throw error; // express-async-errors lo pasará a next(error)
  }

  const tecnology = await TecnologyService.getTechnologyById(id);

  if (!tecnology) {
    const error = new Error("tecnologia no encontrada.");
    error.statusCode = 404;
    error.isOperational = true; // Es un error de validación del cliente
    throw error; // express-async-errors lo pasará a next(error)
  }

  return res.status(200).json({
    status: "success",
    tecno: tecnology,
  });
};

// --- FUNCIONES COMENTADAS ADAPTADAS (FUTURO) ---

const edittecno = async (req, res) => {
    const { id } = req.params;
    const updates = req.body;

    if (!id) {
        const error = new Error("El ID de la tecnologia es requerido en la URL.");
        error.statusCode = 400;
        error.isOperational = true;
        throw error;
    }
    if (Object.keys(updates).length === 0) {
        const error = new Error("No se enviaron datos para actualizar.");
        error.statusCode = 400;
        error.isOperational = true;
        throw error;
    }
    // Validar si 'id' es un número antes de pasarlo al servicio
    if (isNaN(parseInt(id,10))) {
        const error = new Error("El ID de la tecnologia debe ser un número.");
        error.statusCode = 400;
        error.isOperational = true;
        throw error;
    }


    const updatedTechnology = await TecnologyService.updateTechnology(id, updates);

    return res.status(200).json({
        status: "success",
        message: "tecnologia actualizada correctamente",
        tecno: updatedTechnology,
    });
};

const Eliminar = async (req, res) => { // Soft delete
    const { id } = req.params;

    if (!id) {
        const error = new Error("El ID de la tecnologia es requerido en la URL.");
        error.statusCode = 400;
        error.isOperational = true;
        throw error;
    }
    if (isNaN(parseInt(id,10))) {
        const error = new Error("El ID de la tecnologia debe ser un número.");
        error.statusCode = 400;
        error.isOperational = true;
        throw error;
    }

    const result = await TecnologyService.softDeleteTechnology(id);

    return res.status(200).json({
        status: "success",
        message: result.message,
        id: result.id,
        deleted_at: result.deleted_at
    });
};


// Exportar acciones
module.exports = {
  pruebatecno,
  register,
  edittecno,
  Eliminar,
  getTecnoByID
};