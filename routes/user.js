
const express = require('express');
const userController = require('../controllers/user'); // Asegúrate que la ruta al controlador sea correcta

// Creamos una instancia del router de Express
const router = express.Router();
const auth = require('../middlewares/auth'); // Middleware de autenticación

// --- Definimos cada ruta y la asociamos con su función del controlador ---

// POST para crear/registrar
router.post('/register', userController.register);
router.post('/login', userController.login);

// GET para obtener datos
router.get('/prueba', [auth.ensureAuth], userController.pruebauser);
router.get('/authorize/:token/:action', userController.handleAuthorization);

// PUT para actualizar
router.put('/update/:email',[auth.ensureAuth, auth.hasRole(['administrador'])], userController.updateUser);

// DELETE para borrar
router.delete('/delete/:email',[auth.ensureAuth, auth.hasRole(['administrador'])], userController.deleteUser);

// Rutas específicas de autenticación
router.post('/auth/editpws', userController.editPassword);
router.post('/auth/resetpassword', userController.resetPassword);


// MUY IMPORTANTE: Exportamos el router, no el objeto de funciones
module.exports = router;