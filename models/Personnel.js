const { Schema, model } = require('mongoose');

const personnelSchema = new Schema(
  {
    companyId:   { type: Number, required: true, default: 1 },
    idExterno:   { type: Number, unique: true, sparse: true },
    first_name:  { type: String, required: true },
    last_name:   { type: String, required: true },
    email:       { type: String, required: true, trim: true, lowercase: true },
    birthDate:   Date,

    // Datos dinámicos
    extraData:   Schema.Types.Mixed
  },
  { timestamps: true, collection: 'personnel', strict: false }
);

module.exports = model('Personnel', personnelSchema);
