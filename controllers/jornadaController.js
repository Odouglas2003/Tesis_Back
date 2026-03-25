// controllers/jornadaController.js
const JornadaService = require("../services/JornadaService");

const getAll = async (req, res, next) => {
  try {
    const jornadas = await JornadaService.getAllJornadas();
    res.status(200).json(jornadas);
  } catch (error) {
    next(error);
  }
};

const getById = async (req, res, next) => {
  try {
    const jornada = await JornadaService.getJornadaById(req.params.id);
    res.status(200).json(jornada);
  } catch (error) {
    next(error);
  }
};

const create = async (req, res, next) => {
  try {
    const nuevaJornada = await JornadaService.createJornada(req.body);
    res.status(201).json({ status: "success", jornada: nuevaJornada });
  } catch (error) {
    next(error);
  }
};

const update = async (req, res, next) => {
  try {
    const jornadaActualizada = await JornadaService.updateJornada(req.params.id, req.body);
    res.status(200).json({ status: "success", jornada: jornadaActualizada });
  } catch (error) {
    next(error);
  }
};

const remove = async (req, res, next) => {
  try {
    const result = await JornadaService.deleteJornada(req.params.id);
    res.status(200).json({ status: "success", ...result });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAll,
  getById,
  create,
  update,
  remove,
};