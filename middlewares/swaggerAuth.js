// En un nuevo archivo middlewares/swaggerAuth.js

const basicAuth = require('basic-auth');

// Middleware para proteger la documentación de Swagger
const swaggerAuth = (req, res, next) => {
    // 1. Define aquí tus credenciales seguras. Es mejor leerlas desde variables de entorno.
    const SWAGGER_USER = process.env.SWAGGER_USER || 'admin';
    const SWAGGER_PASSWORD = process.env.SWAGGER_PASSWORD || 'password123';

    // 2. Obtiene las credenciales que envía el navegador
    const user = basicAuth(req);

    // 3. Compara las credenciales
    if (!user || user.name !== SWAGGER_USER || user.pass !== SWAGGER_PASSWORD) {
        // Si son incorrectas, pide las credenciales al navegador
        res.set('WWW-Authenticate', 'Basic realm="Authorization Required"');
        return res.status(401).send('Acceso no autorizado');
    }

    // 4. Si son correctas, permite el acceso
    next();
};

module.exports = swaggerAuth;