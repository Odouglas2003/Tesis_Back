const { Schema, model } = require('mongoose');

const basicFieldDefSchema = new Schema(
  {
    companyId: { type: Number, required: true, default: 1 },
    key:       { type: String, required: true, unique: true },   // "idExterno"
    label:     { type: String, required: true },                 // "ID"
    type:      { type: String, enum: ['string','number','date'], required: true },
    order:     { type: Number, default: 0 },
  },
  { timestamps: true, collection: 'basic_field_defs' }
);

module.exports = model('BasicFieldDef', basicFieldDefSchema);
