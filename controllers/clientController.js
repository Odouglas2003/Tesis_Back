const ClientService = require('../services/clientService');
const AppError = require('../utils/AppError');
const messages = require('../utils/messages');

const createClient = async (req, res, next) => {
  try {
    const { name, cuit, razonSocial, description, status } = req.body;
    if (!name || !description) {
      throw new AppError('CLIENT_MISSING_FIELDS');
    }
    const newClient = await ClientService.createClient({ name, cuit, razonSocial, description, status });
    return res.status(201).json({
      status: 'success',
      message: messages.success.CLIENT_CREATED,
      client: newClient,
    });
  } catch (err) {
    next(err);
  }
};

const getAllClients = async (req, res, next) => {
  try {
    const clients = await ClientService.getAllClients();
    return res.status(200).json(clients);
  } catch (err) {
    next(err);
  }
};

const updateClient = async (req, res, next) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    const updatedClient = await ClientService.updateClient(id, updates);
    return res.status(200).json({
      status: 'success',
      message: messages.success.CLIENT_UPDATED,
      client: updatedClient,
    });
  } catch (err) {
    next(err);
  }
};

const deleteClient = async (req, res, next) => {
  try {
    const { id } = req.params;
    await ClientService.deleteClient(id);
    return res.status(200).json({
      status: 'success',
      message: messages.success.CLIENT_DELETED,
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  createClient,
  getAllClients,
  updateClient,
  deleteClient,
};
