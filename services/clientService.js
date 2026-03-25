const Client = require('../models/client');
const AppError = require('../utils/AppError');

class ClientService {

    async createClient(clientData) {
        try {
            const newClient = new Client(clientData);
            await newClient.save();
            return newClient;
        } catch (error) {
            // Captura el error de índice único de MongoDB
            if (error.code === 11000) {
                throw new AppError('CLIENT_NAME_ALREADY_EXISTS');
            }
            // Lanza cualquier otro error para que lo capture el manejador global
            throw error;
        }
    }

    async getAllClients() {
        return Client.find();
    }

    async updateClient(id, updates) {
        if (!updates.name && !updates.description && typeof updates.status === 'undefined') {
            throw new AppError('CLIENT_NO_UPDATE_DATA');
        }

        try {
            const updatedClient = await Client.findByIdAndUpdate(
                id,
                { $set: updates },
                { new: true, runValidators: true }
            );

            if (!updatedClient) {
                throw new AppError('CLIENT_NOT_FOUND');
            }
            return updatedClient;

        } catch (error) {
            if (error.code === 11000) {
                throw new AppError('CLIENT_NAME_ALREADY_EXISTS');
            }
            throw error;
        }
    }

    async deleteClient(id) {
        const deletedClient = await Client.findByIdAndDelete(id);
        if (!deletedClient) {
            throw new AppError('CLIENT_NOT_FOUND');
        }
        return deletedClient;
    }
}

module.exports = new ClientService();