// services/collaborator.history.service.js
const { Types } = require("mongoose");
const crypto = require("crypto");
const HistoryBlock = require("../models/historycolaborador"); // 👈 asegurate que el require apunte al archivo correcto

const toId = (v) => (Types.ObjectId.isValid(v) ? new Types.ObjectId(v) : null);

function normSnap(s) {
  const pid = typeof s.projectId === "string" ? toId(s.projectId) : s.projectId;
  return {
    projectId: pid,
    projectName: s.projectName ?? "",
    role: s.role ?? null,
    hoursAssigned: s.hoursAssigned ?? null,
  };
}

function makeDateKey(d = new Date()) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

async function createChangeBlock({ collaboratorId, previous, next, userId, dateKey }) {
  const collId = toId(collaboratorId);
  const changedBy = toId(userId);
  if (!collId || !changedBy) throw new Error("IDs inválidos");

  const prevNorm = (previous || []).map(normSnap);
  const nextNorm = (next || []).map(normSnap);

  const dk = dateKey || makeDateKey();
  const newChangeId =
    (crypto.randomUUID && crypto.randomUUID()) || new Types.ObjectId().toString();

  // 🔁 upsert por (collaboratorId, dateKey)
  const now = new Date();
  const doc = await HistoryBlock.findOneAndUpdate(
    { collaboratorId: collId, dateKey: dk },
    {
      $set: {
        previous: prevNorm,
        next: nextNorm,
        changedBy,
        updatedAt: now,
        changeId: newChangeId, // último cambio del día
      },
      $setOnInsert: {
        createdAt: now,
      },
    },
    { new: true, upsert: true }
  ).lean();

  return { status: "success", changeId: doc.changeId, dateKey: doc.dateKey };
}

async function getBlocks({ collaboratorId }) {
  const collId = toId(collaboratorId);
  if (!collId) throw new Error("collaboratorId inválido");

  const blocks = await HistoryBlock.find({ collaboratorId: collId })
    .populate([{ path: "changedBy", select: "email name first_name last_name" }])
    .sort({ dateKey: 1, createdAt: 1 }) // un bloque por día
    .lean();

  return {
    status: "success",
    history: blocks.map((b) => ({
      changeId: b.changeId,
      timestamp: b.updatedAt || b.createdAt,
      dateKey: b.dateKey,
      changedBy: b.changedBy || null,
      previous: b.previous.map((s) => ({
        projectId: String(s.projectId),
        projectName: s.projectName,
        role: s.role,
        hoursAssigned: s.hoursAssigned,
      })),
      next: b.next.map((s) => ({
        projectId: String(s.projectId),
        projectName: s.projectName,
        role: s.role,
        hoursAssigned: s.hoursAssigned,
      })),
      removed: b.previous.filter(
        (p) => !b.next.find((n) => String(n.projectId) === String(p.projectId))
      ),
      added: b.next.filter(
        (n) => !b.previous.find((p) => String(p.projectId) === String(n.projectId))
      ),
      updated: b.previous.flatMap((p) => {
        const n = b.next.find((x) => String(x.projectId) === String(p.projectId));
        if (!n) return [];
        if (p.role !== n.role || p.hoursAssigned !== n.hoursAssigned) {
          return [
            {
              before: {
                projectId: String(p.projectId),
                projectName: p.projectName,
                role: p.role,
                hoursAssigned: p.hoursAssigned,
              },
              after: {
                projectId: String(n.projectId),
                projectName: n.projectName,
                role: n.role,
                hoursAssigned: n.hoursAssigned,
              },
            },
          ];
        }
        return [];
      }),
    })),
  };
}

module.exports = { createChangeBlock, getBlocks };
