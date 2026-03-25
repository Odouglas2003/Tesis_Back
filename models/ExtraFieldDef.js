const { Schema, model } = require('mongoose');

const extraFieldDefSchema = new Schema(
  {
    companyId: { type: Number, required: true, default: 1 },
    key:       { type: String, required: true, unique: true },        // "licenciaConducir"
    label:     { type: String, required: true },                      // "Licencia de conducir"
    type:      { type: String, enum: ['string','number','boolean','select','multiselect','date'], required: true },
    options:   [String],     // sólo para select / multiselect
    order:     { type: Number, default: 0 },
  },
  { timestamps: true, collection: 'extra_field_defs' }
);

module.exports = model('ExtraFieldDef', extraFieldDefSchema);
