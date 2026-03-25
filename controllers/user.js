

// controllers/user.js (versión COMPLETA y MODIFICADA)
const UserService = require("../services/UserService");
const logger = require('../config/logger');
const AppError = require('../utils/AppError'); // <-- NUEVA IMPORTACIÓN
const messages = require('../utils/messages'); // <-- NUEVA IMPORTACIÓN

const login = async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) return res.status(400).json({ message: "Faltan credenciales" });

        const { user, token } = await UserService.loginUser(email, password);
        return res.status(200).json({ user, token });
    } catch (err) {
        // Si viene de tu UserService con AppError.key, mapeamos rápido.
        const k = err?.key;

        let message = "No se pudo iniciar sesión";
        let status = 400;

        if (k === "INVALID_CREDENTIALS") {
            message = "Usuario o contraseña incorrectos.";
            status = 401;
        } else if (k === "ACCOUNT_PENDING_APPROVAL") {
            message = "Tu cuenta está pendiente de aprobación.";
            status = 403;
        } else if (k === "ACCOUNT_REJECTED") {
            message = "Tu cuenta fue rechazada.";
            status = 403;
        } else if (k === "ACCOUNT_STATUS_LOGIN_FORBIDDEN") {
            message = "El estado de tu cuenta no permite iniciar sesión.";
            status = 403;
        }

        return res.status(status).json({ message });
    }
};

const register = async (req, res) => {
    const params = req.body;
    if (!params.name || !params.email || !params.password || !params.rol) {
        throw new AppError('MISSING_REGISTER_DATA');
    }

    const registeredUser = await UserService.registerUser(params);
    return res.status(201).json({
        status: "success",
        message: messages.success.REGISTER_REQUEST_SUCCESS,
        user: registeredUser,
    });
};

const pruebauser = async (req, res) => {
    const users = await UserService.getAllUsers();
    return res.status(200).json(users);
};

const handleAuthorization = async (req, res) => {
    const { token, action } = req.params;
    const result = await UserService.processAuthorization(token, action);

    // El servicio ahora lanza AppError, que será capturado por el manejador global y responderá JSON.
    // Para el caso de éxito, podemos enviar un mensaje HTML más amigable.
    const successMessage = messages.success.AUTH_PROCESSED(result.action);
    return res.status(200).send(`<body style="font-family: sans-serif; text-align: center; padding-top: 50px;"><h1>${successMessage}</h1></body>`);
};

const updateUser = async (req, res) => {
    const email = req.params.email;
    const updates = req.body;
    const updatedUser = await UserService.updateUserByEmail(email, updates);
    return res.status(200).json({
        status: "success",
        message: messages.success.USER_UPDATED,
        user: updatedUser,
    });
};

const deleteUser = async (req, res) => {
    const email = req.params.email;
    if (!email) {
        throw new AppError('MISSING_EMAIL_IN_URL');
    }
    await UserService.deleteUserByEmail(email);
    return res.status(200).json({
        status: "success",
        message: messages.success.USER_DELETED
    });
};

const editPassword = async (req, res, next) => {
    const { email } = req.body;
    if (!email) {
        throw new AppError('MISSING_EMAIL_FOR_RESET');
    }

    try {
        await UserService.requestPasswordReset(email);
        return res.status(200).json({ message: messages.success.PASSWORD_RESET_REQUEST_SUCCESS });
    } catch (error) {
        // Lógica de seguridad: si el error es que el usuario no se encontró,
        // igual respondemos con el mensaje de éxito genérico para no revelar información.
        if (error instanceof AppError && error.key === 'USER_NOT_FOUND_FOR_RESET') {
            logger.warn(`Intento de reseteo para email no procesable (controlador): ${email}`);
            return res.status(200).json({ message: messages.success.PASSWORD_RESET_REQUEST_SUCCESS });
        }
        // Para cualquier otro error (ej. fallo al enviar email), lo pasamos al manejador global.
        next(error);
    }
};

const resetPassword = async (req, res) => {
    const { email, newPassword, confirmPassword } = req.body;
    if (!email || !newPassword || !confirmPassword) {
        throw new AppError('MISSING_RESET_DATA');
    }
    if (newPassword !== confirmPassword) {
        throw new AppError('PASSWORDS_DO_NOT_MATCH');
    }
    await UserService.resetUserPassword(email, newPassword);
    return res.status(200).json({ message: messages.success.PASSWORD_RESET_SUCCESS });
};


module.exports = {
    pruebauser,
    register,
    login,
    handleAuthorization,
    updateUser,
    deleteUser,
    editPassword,
    resetPassword,
};