
const { Schema, model } = require("mongoose");

const AssignedPersons = new Schema({
  name: { type: String },
  id: { type: String }, 
  rol: { type: String },
  horasAsignadas: { type: Number },
  tecnologias: { type: [String] },
  seniority: { type: String },
  orderDate: { type: Date },
  startDate: { type: Date },
});

const projectSchema = new Schema({
  
   bizneoId: { type: Number, index: true, unique: true, sparse: true },
  managerId: { type: String, required: true },
  managerName: { type: String, required: true },
  managerVisibleInOrgChart: { type: Boolean, required: true },
   ia_generated: {
    type: Boolean,
    default: false 
  },


  
  taxonId: { type: Number },
  bizneoTaxonId: { 
        type: Number, 
        index: true,
        unique: true,
        sparse: true 
    },
  
  name: { type: String, required: true, unique: true }, 
  client: { type: String, required: true },
  status: { type: String, required: true },
  phase: { type: String },
  projectType: { type: String, required: true },
  assignedPersons: { type: [AssignedPersons], default: [] },
  startDate: { type: Date, required: true },
  endDate: { type: Date, required: true },
  description: { type: String },
  created_at: { type: Date, default: Date.now },
  delete_at: { type: Date },
  last_edited_by: { type: String },
  last_edited_on: { type: Date },
  image: { type: String },
  // --- NUEVOS CAMPOS ---
  category: {
    type: String,
    required: true,
    enum: {
      values: ['Gobierno', 'Privado', 'Inversion'],
      message: '{VALUE} no es una categoría válida. Las opciones son: Gobierno, Privado, Inversion.',
       set: (value) => value.charAt(0).toUpperCase() + value.slice(1).toLowerCase()
    }
  },
  budget: {
    type: Number,
    min: [0, 'El presupuesto no puede ser negativo.']
    
  },
}, {
  // ---- ¡CONFIGURACIÓN PARA TRANSFORMAR EL ID! ----
  toJSON: {
    virtuals: true,
    transform: (doc, ret) => {
      delete ret._id; // Elimina el '_id'
    }
  },
  toObject: {
    virtuals: true
  },
  versionKey: false
});

// Crea el campo virtual 'id' que es un alias de '_id'
projectSchema.virtual('id').get(function () {
  return this._id.toHexString();
});


module.exports = model("Project", projectSchema, "projects");