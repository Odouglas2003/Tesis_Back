const { Schema, model } = require("mongoose");

const columnSchema = new Schema({
  displayName: String,
  field: String,
  order: Number
});

const tableConfigSchema = new Schema({
  section: String,
  columns: [columnSchema]
});

module.exports = model("TableConfig", tableConfigSchema, "configure");
