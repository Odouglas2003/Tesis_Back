const mongoose = require('mongoose');
const { Schema } = mongoose;

const ThemeSchema = new Schema({
  primary: String,
  secondary: String,
  accent: String,
  background: String,
  modal: String,
  button: String,
  text: String,
  navbar: String,
  card: String,
}, { _id: false });

const BrandConfigSchema = new Schema({
  empresaId: { type: String, required: true, index: true },
  companyName: { type: String, required: true },
  slug: { type: String, index: true },
  status: { type: String, enum: ['active', 'inactive'], default: 'active', index: true },
  name: { type: String , enum: ['claro', 'oscuro'], default: 'claro' },
  logo: { type: String },          
  favicon: { type: String },       
  theme: { type: ThemeSchema, default: {} }
}, {
  toJSON: {
    virtuals: true,
    transform: (doc, ret) => { delete ret._id; }
  },
  toObject: { virtuals: true },
  versionKey: false
});

BrandConfigSchema.virtual('id').get(function () { return this._id.toHexString(); });

BrandConfigSchema.pre('save', function(next) {
  if (this.isModified('companyName') || !this.slug) {
    this.slug = (this.companyName || '')
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }
  next();
});

module.exports = mongoose.model('BrandConfig', BrandConfigSchema);
