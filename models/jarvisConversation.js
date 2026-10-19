const { Schema, model } = require('mongoose');

const messageSchema = new Schema({
  role: { type: String, enum: ['user', 'assistant'], required: true },
  content: { type: String, required: true, maxlength: 8000 },
  createdAt: { type: Date, default: Date.now }
}, { _id: false });

const conversationSchema = new Schema({
  ownerKey: { type: String, required: true, unique: true, index: true },
  messages: { type: [messageSchema], default: [] },
  updatedAt: { type: Date, default: Date.now }
}, { versionKey: false });

module.exports = model('JarvisConversation', conversationSchema, 'jarvis_conversations');
