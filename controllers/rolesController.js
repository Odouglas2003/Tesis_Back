


// controllers/rolesController.js (versión COMPLETA y MODIFICADA)
const RolesService = require('../services/rolesService');
const AppError = require('../utils/AppError');
const messages = require('../utils/messages');

const createRole = async (req, res) => {
    const { name, description, status } = req.body;
    if (!name || !description) {
        throw new AppError('ROLE_MISSING_FIELDS');
    }
    const newRole = await RolesService.createRole({ name, description, status });
    return res.status(201).json({ 
        status: "success",
        message: messages.success.ROLE_CREATED, 
        role: newRole 
    });
};

const getAllRoles = async (req, res) => {
    const roles = await RolesService.getAllRoles();
    return res.status(200).json(roles);
};

const updateRole = async (req, res) => {
    const { id } = req.params;
    const updates = req.body;
    const updatedRole = await RolesService.updateRole(id, updates);
    return res.status(200).json({ 
        status: "success",
        message: messages.success.ROLE_UPDATED, 
        role: updatedRole 
    });
};

const deleteRole = async (req, res) => {
    const { id } = req.params;
    await RolesService.deleteRole(id);
    return res.status(200).json({ 
        status: "success",
        message: messages.success.ROLE_DELETED 
    });
};

module.exports = {
    createRole,
    getAllRoles,
    updateRole,
    deleteRole
};