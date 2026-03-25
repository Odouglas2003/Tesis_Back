

// services/rolesService.js (versión COMPLETA y MODIFICADA)
const Roles = require('../models/roles');
const AppError = require('../utils/AppError');

class RolesService {

    async createRole(roleData) {
        try {
            const newRole = new Roles(roleData);
            await newRole.save();
            return newRole;
        } catch (error) {
            // Captura el error de índice único de MongoDB
            if (error.code === 11000) {
                throw new AppError('ROLE_NAME_ALREADY_EXISTS');
            }
            // Lanza cualquier otro error para que lo capture el manejador global
            throw error;
        }
    }

    async getAllRoles() {
        return Roles.find();
    }

    async updateRole(id, updates) {
        if (!updates.name && !updates.description && typeof updates.status === 'undefined') {
            throw new AppError('ROLE_NO_UPDATE_DATA');
        }

        try {
            const updatedRole = await Roles.findByIdAndUpdate(
                id,
                { $set: updates },
                { new: true, runValidators: true }
            );

            if (!updatedRole) {
                throw new AppError('ROLE_NOT_FOUND');
            }
            return updatedRole;

        } catch (error) {
            if (error.code === 11000) {
                throw new AppError('ROLE_NAME_ALREADY_EXISTS');
            }
            throw error;
        }
    }

    async deleteRole(id) {
        const deletedRole = await Roles.findByIdAndDelete(id);
        if (!deletedRole) {
            throw new AppError('ROLE_NOT_FOUND');
        }
        return deletedRole;
    }
}

module.exports = new RolesService();