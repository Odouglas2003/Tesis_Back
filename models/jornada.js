// models/jornada.js
const { Schema, model } = require("mongoose");

const jornadaSchema = new Schema({
  name: {
    type: String,
    required: [true, 'El nombre de la jornada es obligatorio.'],
    unique: true, // No puede haber dos jornadas con el mismo nombre
    trim: true
  },
  hours: {
    type: Number,
    required: [true, 'Las horas de la jornada son obligatorias.'],
    min: [1, 'Las horas deben ser como mínimo 1.']
  },
  description: { // Un campo opcional para descripciones
    type: String,
    trim: true
  },
  status: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true, // Añade createdAt y updatedAt automáticamente
  toJSON: {
    virtuals: true,
    transform: (doc, ret) => {
      delete ret._id;
      delete ret.__v;
    }
  },
  toObject: { virtuals: true }
});

jornadaSchema.virtual('id').get(function () {
  return this._id.toHexString();
});

module.exports = model("Jornada", jornadaSchema, "jornadas");