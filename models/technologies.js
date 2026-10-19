
// models/technologies.js
const { Schema, model } = require("mongoose");

const techSchema = new Schema({
  // El campo 'id' manual se elimina. Usaremos el _id que MongoDB crea por defecto.
  name: { 
    type: String,
    required: true,
    unique: true // Es una buena práctica asegurar que no haya tecnologías con nombres duplicados.
  },
  description: {
    type: String,
    trim: true,
    default: ""
  },
  status: {
    type: Boolean,
    default: true
  }
}, {
  // Opciones del Schema para transformar la salida
  toJSON: {
    virtuals: true, // Asegura que los campos virtuales se incluyan en la salida JSON
    transform: (doc, ret) => {
      // 'ret' es el objeto plano que se va a enviar como respuesta.
      // Eliminamos el _id para que el frontend solo vea 'id'.
      delete ret._id;
    }
  },
  toObject: {
    virtuals: true // Asegura que los campos virtuales se incluyan al convertir a objeto
  },
  versionKey: false // Elimina el campo __v de la respuesta
});

// Crea el campo virtual 'id' que es un alias de '_id'
// Esto no se guarda en la base de datos, se genera al momento de la consulta.
techSchema.virtual('id').get(function() {
  return this._id.toHexString();
});

module.exports = model("Technology", techSchema, "technologies");
