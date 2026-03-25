


// controllers/technologies.js (versión COMPLETA y MODIFICADA)
const technologiesService = require("../services/technologiesService");
const AppError = require("../utils/AppError");
const messages = require("../utils/messages");

const getAllTechnologies = async (req, res) => {
  const techs = await technologiesService.getAllTechnologies();
  // El frontend ahora recibe un array de objetos con 'id' y 'name'
  return res.status(200).json(techs); 
};

const addTechnology = async (req, res) => {
  // Ya no esperamos 'id' en el body. Solo 'name'.
  const { name } = req.body;
  if (!name) {
    // Actualizamos el error para reflejar que solo falta el nombre.
    throw new AppError("TECH_MISSING_NAME", 400, "El campo 'name' es requerido.");
  }
  // Pasamos solo el nombre al servicio.
  const tech = await technologiesService.addTechnology({ name });
  return res.status(201).json({ 
    status: "success", 
    message: messages.success.TECH_ADDED,
    data: tech 
  });
};

const editTechnology = async (req, res) => {
  const { id } = req.params; // Este 'id' es el _id de la tecnología.
  const { name } = req.body;
  if (!name) {
    throw new AppError("TECH_MISSING_NAME");
  }
  const tech = await technologiesService.editTechnology(id, name);
  return res.status(200).json({ 
    status: "success",
    message: messages.success.TECH_UPDATED,
    data: tech
  });
};

const deleteTechnology = async (req, res) => {
  const { id } = req.params; // Este 'id' es el _id de la tecnología.
  await technologiesService.deleteTechnology(id);
  return res.status(200).json({ 
    status: "success", 
    message: messages.success.TECH_DELETED 
  });
};

module.exports = {
  getAllTechnologies,
  addTechnology,
  editTechnology,
  deleteTechnology,
};