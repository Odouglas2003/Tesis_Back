


// models/vacancie.js
const { Schema, model } = require("mongoose");

// El sub-schema para skills se mantiene igual, asumiendo que es correcto.
const SkillSchema = new Schema({
  technologyId: {
    type: Schema.Types.ObjectId,
    ref: 'Technology', // Asegúrate de que tienes un modelo llamado 'Technology'
    required: true
  },
}, { _id: false });

const vacancieSchema = new Schema({
  // --- CAMBIO: Manager ahora es explícitamente opcional ---
  manager_id: {
    type: String,
    required: false, // No es obligatorio
    default: null    // Valor por defecto si no se proporciona
  },
  manager_name: {
    type: String,
    required: false,
    default: null
  },

  manager_visible_in_org_chart: { type: Boolean, default: true },
  description: { type: String },
  status: {
    type: String,
    enum: ["Abierta", "En Proceso", "Finalizada"],
    default: "Abierta"
  },
  // --- CAMBIO: Proyecto ahora es explícitamente opcional ---
  projectId: {
    type: Schema.Types.ObjectId,
    ref: 'Project', // Asegúrate de que tienes un modelo llamado 'Project'
    required: false, // No es obligatorio
    default: null
  },

  // Campos que siguen siendo requeridos
  vacancieName: { type: String, required: true },
  time: { type: Number, required: true },
  orderDate: { type: Date, required: true },
  startDate: { type: Date, required: true },
  seniority: { type: String, required: true },

  // Estructura de skills y campos de auditoría
  skills: { type: [SkillSchema], default: [] },
  created_at: { type: Date, default: Date.now },
  delete_at: { type: Date },
  last_edited_by: { type: String },
  last_edited_on: { type: Date }
}, {
  // Opciones del Schema para transformar la salida JSON (sin cambios)
  toJSON: {
    virtuals: true,
    transform: (doc, ret) => {
      delete ret._id;
    }
  },
  toObject: {
    virtuals: true
  },
  versionKey: false
});

// Campo virtual 'id' que es un alias de '_id' para el frontend (sin cambios)
vacancieSchema.virtual('id').get(function () {
  return this._id.toHexString();
});

module.exports = model("Vacante", vacancieSchema, "vacancie");