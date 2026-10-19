const { Schema, model } = require('mongoose');

const actionLogSchema = new Schema({
  ownerKey: { type: String, required: true, index: true },
  actionType: { type: String, required: true },
  title: { type: String },
  payload: { type: Schema.Types.Mixed },
  status: { type: String, enum: ['success', 'error'], required: true },
  message: { type: String },
  createdAt: { type: Date, default: Date.now, index: true }
}, { versionKey: false });

module.exports = model('JarvisActionLog', actionLogSchema, 'jarvis_action_logs');
