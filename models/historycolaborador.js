// models/HistoryBlock.js
const mongoose = require("mongoose");
const { Schema, Types } = mongoose;

const snapSchema = new Schema(
  {
    projectId: { type: Types.ObjectId, ref: "Project", required: true },
    projectName: { type: String, default: "" },          // denormalizado para pintar rápido
    role: { type: String, default: null },
    hoursAssigned: { type: Number, default: null },
  },
  { _id: false }
);

const historyBlockSchema = new Schema(
  {
    collaboratorId: { type: Types.ObjectId, ref: "Collaborator", index: true, required: true },
    // clave del día (timezone configurable si querés; acá uso local del server)
    dateKey: { type: String, index: true, required: true }, // p.ej. "2025-11-07"
    changeId: { type: String, index: true, required: true }, // uuid del bloque
    changedBy: { type: Types.ObjectId, ref: "User", required: true },
    // snapshots completos
    previous: { type: [snapSchema], default: [] },
    next: { type: [snapSchema], default: [] },

    // metadatos
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
  },
  { collection: "history_blocks" }
);

historyBlockSchema.pre("save", function (next) {
  this.updatedAt = new Date();
  next();
});

module.exports = mongoose.model("HistoryBlock", historyBlockSchema);
