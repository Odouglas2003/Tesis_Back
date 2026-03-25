// services/jwt.js

const jwt = require('jwt-simple');
const moment = require('moment');

// Leemos el secreto desde el archivo .env
const secret = process.env.JWT_SECRET;

// Función para crear el token
exports.createToken = (user) => {
    // El "payload" son los datos que queremos guardar dentro del token
    const payload = {
        sub: user._id,          // Guardamos el ID del usuario (muy importante)
        name: user.name,
        email: user.email,
        rol: user.rol,
        iat: moment().unix(),   // Fecha de creación del token (timestamp)
        exp: moment().add(9, 'hours').unix() // Fecha de expiración (30 días desde ahora)
    };

    // Codificamos el payload para generar el token JWT
    return jwt.encode(payload, secret);
};