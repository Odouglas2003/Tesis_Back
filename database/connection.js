// Importar dotenv para cargar las variables de entorno
// 

// database/connection.js
require("dotenv").config();
const mongoose = require("mongoose");

const connection = async () => {
  const uri = process.env.MONGO_HOST;

  


  try {
  
    // Si se queda aquí colgado por 5 segundos, es un problema de red/firewall/servicio.
    await mongoose.connect(uri, {
        serverSelectionTimeoutMS: 5000 // Falla después de 5 segundos en lugar de 10
    });

    console.log("[SUCCESS] ¡Conexión con MongoDB establecida exitosamente!");
   
  } catch (error) {
    error.message = `[MONGO CONNECTION ERROR]: ${error.message}`;
    throw error;
  }
};

module.exports = connection;
