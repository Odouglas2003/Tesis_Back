// middlewares/auth.js

const jwt = require('jwt-simple');
const moment = require('moment');
const User = require('../models/user'); // ¡Asegúrate de que esta ruta a tu modelo es correcta!
const secret = process.env.JWT_SECRET;

/**
 * Middleware de AUTENTICACIÓN.
 
 */
const ensureAuth = async (req, res, next) => {
    // 1. Verificar si llega la cabecera de autorización
    if (!req.headers.authorization) {
        return res.status(403).send({ status: "error", message: "La petición no tiene la cabecera de autenticación." });
    }

    // 2. Limpiar el token (quitar "Bearer " y comillas)
    const token = req.headers.authorization.replace(/['"]+/g, '').split(" ")[1];

    try {
        // 3. Decodificar el token
        const payload = jwt.decode(token, secret);

        // 4. Comprobar si el token ha expirado
        if (payload.exp <= moment().unix()) {
            return res.status(401).send({ status: "error", message: "El token ha expirado." });
        }

        // 5. Buscar al usuario en la BD para asegurarse de que todavía existe y está activo
        const user = await User.findById(payload.sub).select('-password');
        
        if (!user || user.status !== 'active') {
            return res.status(404).send({ status: "error", message: "El usuario identificado no existe o está inactivo." });
        }
        
        // 6. Si todo es correcto, añadir los datos del usuario a la request
        req.user = user;

    } catch (error) {
        // Esto captura errores si el token está malformado o la firma no es válida
        return res.status(401).send({ status: "error", message: "Token no válido." });
    }

    // 7. Pasar a la siguiente acción (otro middleware o el controlador final)
    next();
};

/**
 * Middleware de AUTORIZACIÓN (Basado en Roles).
 
 *
 * @param {string[]} roles - Un array de strings con los roles permitidos (ej. ['administrador', 'gestor'])
 */
const hasRole = (roles) => {
    return (req, res, next) => {
        // req.user debería existir gracias a ensureAuth
        if (!req.user) {
            return res.status(401).send({ status: "error", message: "Error: No se ha podido identificar al usuario." });
        }

        if (!roles.includes(req.user.rol)) {
            return res.status(403).send({ status: "error", message: `Acceso denegado. Se requiere uno de los siguientes roles: ${roles.join(', ')}.` });
        }

        // Si el usuario tiene el rol permitido, pasa al siguiente middleware o controlador
        next();
    };
};

// Exportamos las funciones para poder usarlas en nuestros archivos de rutas
module.exports = {
    ensureAuth,
    hasRole
};