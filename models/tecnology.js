const { Schema, model } = require("mongoose");

const userSchema = new Schema({
    id: { type: Number },
    first_name: { type: String},
    last_name: { type: String},
    tecnologias: { type: String, required: true }, // Lista de tecnologias
});

module.exports = model("Tecno", userSchema, "tecnology");
