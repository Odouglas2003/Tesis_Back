const { Schema, model } = require("mongoose");

const readerSchema = new Schema({
  email: { type: String, required: true },
  readAt: { type: Date },
});

const notificationSchema = new Schema({
  type: { type: String, required: true },
  referenceId: { type: String, required: true },
  message: { type: String, required: true },
  alertLevel: { type: String, enum: ["warning", "expired", "info"], required: true },
  recipients: { type: [String], default: [], required: true },
  sentAt: { type: Date, default: Date.now },
  readers: { type: [readerSchema], default: [] }
});

module.exports = model("Notifications", notificationSchema, "notifications");