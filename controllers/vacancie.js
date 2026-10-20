


// controllers/vacancie.js
const VacancieService = require("../services/VacancieService");
const NotificationModel = require("../models/notification");
//const AppError = require('../utils/AppError');
const messages = require('../utils/messages');

// --- FUNCIÓN MODIFICADA ---
// Renombrada y ahora pasa todos los filtros de la URL al servicio
const getAllVacancies = async (req, res) => {
  const filters = req.query; // Ej: { seniority: 'Senior', projectName: 'Phoenix' }
  const vacancies = await VacancieService.getAllVacancies(filters);
  return res.status(200).json(vacancies);
};

// --- EL RESTO DE FUNCIONES PERMANECEN IGUAL ---

const register = async (req, res) => {
  const savedVacancy = await VacancieService.registerVacancy(req.body);

  // Crear notificación al registrar vacante
  try {
    const notification = new NotificationModel({
      type: "vacancy_registered",
      referenceId: savedVacancy._id.toString(),
      message: `Nueva vacante registrada: ${savedVacancy.title || savedVacancy.name || ''}`,
      alertLevel: "info",
      recipients: req.body.recipients || [], 
      sentAt: new Date(),
      readers: []
    });
    await notification.save();
  } catch (err) {
    console.error("Error creando notificación de vacante:", err);
  }

  return res.status(201).json({
      status: "success",
      message: messages.success.VACANCY_REGISTERED,
      vacancie: savedVacancy,
  });
};

const getVacancieById = async (req, res) => {
  const { id } = req.params;
  const vacant = await VacancieService.getVacancyById(id);
  return res.status(200).json({
      status: "success",
      data: vacant,
  });
};

const editVacan = async (req, res) => {
  const { id } = req.params;
  const updates = req.body;
  delete updates.id;
  delete updates._id;
  updates.last_edited_by = (req.user && (req.user.name || req.user.email)) || updates.last_edited_by;

  const updatedVacancie = await VacancieService.updateVacancy(id, updates);
  return res.status(200).json({
      status: "success",
      message: messages.success.VACANCY_UPDATED,
      vacancie: updatedVacancie,
  });
};

const Eliminar = async (req, res) => {
  const { id } = req.params;
  const result = await VacancieService.softDeleteVacancy(id);
  return res.status(200).json({
      status: "success",
      message: messages.success.VACANCY_DELETED,
      details: result
  });
};

module.exports = {
  // --- CAMBIO: Se exporta el nuevo nombre de la función ---
  getAllVacancies,
  register,
  getVacancieById,
  editVacan,
  Eliminar,
};