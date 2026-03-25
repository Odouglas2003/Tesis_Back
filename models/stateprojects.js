const { Schema, model } = require("mongoose");

const stateProjectSchema = new Schema({
  id: { type: String, required: true, unique: true },
  status: { type: String, default: "" }
});

module.exports = model("StateProject", stateProjectSchema, "stateproject");
