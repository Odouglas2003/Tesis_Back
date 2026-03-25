
// models/collaborator.js
const { Schema, model } = require("mongoose");

const Proyectoinfo = new Schema({
  
  projectId: { type: Schema.Types.ObjectId, ref: 'Project' }, 
  rol: { type: String },
  horasAsignadas: { type: Number },
  seniority: { type: String },
  orderDate: { type: Date },
  startDate: { type: Date },
},{_id: false});

const RolSeniorityInfo = new Schema({
  rol: { type: String, required: true },
  seniority: { type: String, required: true },
}, { _id: false });

const userSchema = new Schema({
  bizneoId: { type: Number, index: true, unique: true, sparse: true },
  dni: { type: String, required: true, unique: true },
  first_name: { type: String, required: true },
  last_name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  Proyectos: { type: [Proyectoinfo], default: [] },
  history: { type: Schema.Types.ObjectId, ref: 'HistoryColaborador' },
  tecnologias: { type: [String], default: [] },
  estado: { type: String, required: true },
  fin_contrato: { type: Date },
  honorarios: { type: Number },
  start_contrato: { type: Date },
  horasAsignadas: { type: Number },
  observacion: { type: Number },
  created_at: { type: Date, required: true, default: Date.now },
  delete_at: { type: Date },
  last_edited_by: { type: String },
  last_edited_on: { type: Date },
  roles: { type: [RolSeniorityInfo], default: [] },
  image: { type: String},
  jornadaId: { 
    type: Schema.Types.ObjectId, 
    ref: 'Jornada', 
    required: true 
  },
}, {
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


userSchema.virtual('id').get(function() {
  return this._id.toHexString();
});

module.exports = model("Colab", userSchema, "collaborator");