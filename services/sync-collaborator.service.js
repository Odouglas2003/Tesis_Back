// services/sync-collaborator.service.js
const Colab = require("../models/collaborator");
// Tu archivo es models/projects.js (plural)
const Project = require("../models/projects");
const { listUsersPage, getUserById } = require("./bizneo.service");
const { Types, isValidObjectId } = require("mongoose");

// 👉 Jornada por defecto para INSERTS
const DEFAULT_JORNADA_ID = new Types.ObjectId("68dea2a55adc6074fb9ad4f4");

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const parseDate = (d) => (d ? (isNaN(+new Date(d)) ? null : new Date(d)) : null);

// --- Helper para NO pisar la imagen existente ---
function preserveImageField(payload) {
  if (!payload) return payload;
  if ("image" in payload && (payload.image == null || payload.image === "")) {
    delete payload.image;
  }
  return payload;
}

// --- No sobreescribir 'roles' en updates (solo en inserts)
function stripRoles(obj) {
  if (!obj) return obj;
  const out = { ...obj };
  delete out.roles;
  return out;
}

// --- No sobreescribir 'estado' en updates (respetar el de Rubik)
function stripEstado(obj) {
  if (!obj) return obj;
  const out = { ...obj };
  delete out.estado;
  return out;
}

// --- NO sobrescribir Proyectos si vienen vacíos en updates
function stripProjectsOnEmpty(obj) {
  if (!obj) return obj;
  if (!Array.isArray(obj.Proyectos) || obj.Proyectos.length === 0) {
    const out = { ...obj };
    delete out.Proyectos;
    return out;
  }
  return obj;
}

// --- Helper compuesto para updates seguros
function safeUpdatePayload(payload) {
  return preserveImageField(stripProjectsOnEmpty(stripEstado(stripRoles(payload))));
}

// Normaliza fechas a medianoche UTC
function toUtcDay(d) {
  if (!d) return null;
  const x = new Date(d);
  return new Date(Date.UTC(x.getUTCFullYear(), x.getUTCMonth(), x.getUTCDate()));
}
function todayUtc() {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}
function isPastDay(date) {
  const d = toUtcDay(date);
  if (!d) return false;
  return d.getTime() < todayUtc().getTime();
}

function pickCurrentContract(contracts = []) {
  if (!contracts?.length) return null;
  const open = contracts.find((c) => !c.end_at);
  const c =
    open ||
    contracts.slice().sort((a, b) => new Date(b.start_at) - new Date(a.start_at))[0];
  return c
    ? {
        id: c.id,
        fte: c.fte ?? null,
        start_at: parseDate(c.start_at),
        end_at: parseDate(c.end_at),
      }
    : null;
}

// --- Helpers de merge/compare ---
const asId = (v) => (v && v.toString ? v.toString() : String(v || ""));
function uniqStr(arr = []) {
  return Array.from(new Set((arr || []).filter(Boolean)));
}
function mergeProyectos(...lists) {
  const key = (p) => `${asId(p?.projectId)}::${p?.rol || ""}::${p?.seniority || ""}`;
  const map = new Map();
  lists.flat().forEach((p) => {
    if (p?.projectId) map.set(key(p), p);
  });
  return Array.from(map.values());
}

function diffRelevant(oldDoc, newDoc) {
  const reasons = [];
  const oldDni = String(oldDoc.dni ?? "").trim();
  const newDni = String(newDoc.dni ?? "").trim();
  if (oldDni !== newDni) reasons.push("dni");

  const oldEmail = String(oldDoc.email ?? "").trim().toLowerCase();
  const newEmail = String(newDoc.email ?? "").trim().toLowerCase();
  if (oldEmail !== newEmail) reasons.push("email");

  const oldTech = new Set((oldDoc.tecnologias ?? []).map((t) => String(t).toLowerCase()));
  const newTech = new Set((newDoc.tecnologias ?? []).map((t) => String(t).toLowerCase()));
  if (oldTech.size !== newTech.size || ![...oldTech].every((item) => newTech.has(item))) {
    reasons.push("tecnologias");
  }

  return { reasons };
}

const isSoftDeleted = (doc) => !!doc?.delete_at;

/**
 * Si pasás projectId (ObjectId) del primer taxón/área, lo agrego a Proyectos en inserts.
 */
function mapUserToColabDoc(u, { projectId } = {}) {
  const bizneoId = Number(u.id);
  const email = (u.email || `user-${bizneoId}@bizneo.local`).trim();
  const current = pickCurrentContract(u?.work_contracts || []);

  const endUTC = current?.end_at ? toUtcDay(current.end_at) : null;
  const activeByContract = !endUTC || !isPastDay(endUTC);
  const accessEnabled = (u.access || "").toLowerCase() !== "revoked";
  const estado = accessEnabled && activeByContract ? "Activo" : "Inactivo";

  const roles = [];
  const rol = u.rol || null;
  const seniority = u.seniority || null;
  if (rol || seniority) roles.push({ rol, seniority });

  const tecnologiasStr = String(u.tecnologías || "");
  const tecnologias = tecnologiasStr.split(",").map((t) => t.trim()).filter(Boolean);

  const Proyectos = [];
  if (projectId) {
    Proyectos.push({
      projectId,
      rol: roles[0]?.rol || null,
      horasAsignadas: null,
      seniority: roles[0]?.seniority || "Sin especificar",
      orderDate: null,
      startDate: current?.start_at || null,
    });
  }

  const doc = {
    bizneoId,
    dni: u.dni ? Number(u.dni) : Number(bizneoId),
    first_name: (u.first_name || "").trim(),
    last_name: (u.last_name || "").trim(),
    email,
    estado, // <- solo en inserts (via $setOnInsert)
    Proyectos,
    tecnologias,
    roles,
    fin_contrato: endUTC,
    start_contrato: current?.start_at ? toUtcDay(current.start_at) : null,
    honorarios: u.fixed_salary ?? null,
    observacion: null,
    delete_at: null,
    last_edited_by: null,
    last_edited_on: null,
  };

  const img = u.image && String(u.image).trim();
  if (img) doc.image = img;

  return doc;
}

// --- Campos comunes para restaurar soft-delete (sin tocar 'estado')
function restoreFields() {
  return {
    delete_at: null,
    last_edited_by: "sync-restore",
    last_edited_on: new Date(),
  };
}

/**
 * 💥 Detach específico para TU modelo:
 * - Project.assignedPersons: [{ id: String, ... }]
 * - `id` guarda el _id de Mongo del colaborador (string).
 * - También intentamos con ObjectId real por si algún doc quedó casteado en el subdoc.
 */
async function detachCollaboratorFromAllProjects(collab) {
  if (!collab?._id) return 0;

  const oidStr = collab._id.toString();
  const inSet = [oidStr];

  // Por si hay subdocs con ObjectId real:
  if (isValidObjectId(oidStr)) {
    inSet.push(new Types.ObjectId(oidStr));
  }

  // 1) Detectar proyectos donde aparece
  const where = { "assignedPersons.id": { $in: inSet } };

  // 2) Pull por match (el campo del subdoc es String en tu schema)
  const res = await Project.updateMany(
    where,
    { $pull: { assignedPersons: { id: { $in: inSet.map(String) } } } }
  );

  return Number(res.modifiedCount ?? res.nModified ?? 0);
}

async function syncOneById(userId, { projectId } = {}, onChange = () => {}) {
  const escapeRegex = (s) => String(s).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

  const u = await getUserById(userId);
  const mappedRaw = mapUserToColabDoc(u, { projectId });

  // Normalizamos email para evitar duplicados por casing/espacios
  const emailNorm = (mappedRaw.email || "").trim().toLowerCase();
  const mapped = { ...mappedRaw, email: emailNorm };

  // Buscar posibles duplicados (por bizneoId, por email y por DNI)
  const [docByBizneo, docByEmail, docByDni] = await Promise.all([
    Colab.findOne({ bizneoId: mapped.bizneoId }),
    emailNorm ? Colab.findOne({ email: new RegExp(`^${escapeRegex(emailNorm)}$`, "i") }) : null,
    Number.isFinite(Number(mapped.dni)) ? Colab.findOne({ dni: Number(mapped.dni) }) : null,
  ]);
  const existing = docByBizneo || docByEmail || docByDni;

  // Regla de baja: contrato vencido o acceso revocado en Bizneo
  const deBaja = (mapped.fin_contrato && isPastDay(mapped.fin_contrato)) || mappedRaw.estado === "Inactivo";

  // ---- Inactivo por Bizneo ----
  if (deBaja) {
    if (existing) {
      const wasSoft = isSoftDeleted(existing);

      // 💥 Sacarlo de todos los proyectos
      let removedFromProjects = 0;
      try {
        removedFromProjects = await detachCollaboratorFromAllProjects(existing);
      } catch (e) {
        console.warn(`[sync] No se pudo detachear de proyectos: ${e?.message || e}`);
      }

      const update = {
        // estado: "Inactivo", // <- NO tocar estado desde la sync
        fin_contrato: mapped.fin_contrato ?? existing.fin_contrato,
        start_contrato: mapped.start_contrato ?? existing.start_contrato,
        last_edited_by: "sync-deactivate-bizneo",
        last_edited_on: new Date(),
      };
      if (!wasSoft) update.delete_at = new Date();

      const safe = safeUpdatePayload(update);
      await Colab.updateOne({ _id: existing._id }, { $set: safe });
      const updated = await Colab.findById(existing._id);

      onChange({ type: "bizneo_inactive", doc: updated, wasSoft, removedFromProjects });
      return updated;
    } else {
      onChange({ type: "bizneo_inactive_skipped_create", hint: { userId, email: mapped.email } });
      return null;
    }
  }

  // ---- Activo en Bizneo ----

  // A) Merge bizneo + email (distintos docs)
  if (docByBizneo && docByEmail && asId(docByBizneo._id) !== asId(docByEmail._id)) {
    const wasSoft = isSoftDeleted(docByBizneo);
    const diff = diffRelevant(docByBizneo, mapped);
    const mergedBase = {
      ...mapped,
      tecnologias: uniqStr([
        ...(docByBizneo.tecnologias || []),
        ...(docByEmail.tecnologias || []),
        ...(mapped.tecnologias || []),
      ]),
      Proyectos: mergeProyectos(docByBizneo.Proyectos, docByEmail.Proyectos, mapped.Proyectos),
      last_edited_by: wasSoft ? "sync-restore-merge-email-bizneo" : "sync-merge-email-bizneo",
      last_edited_on: new Date(),
    };
    const merged = safeUpdatePayload(wasSoft ? { ...mergedBase, ...restoreFields() } : mergedBase);

    await Colab.updateOne({ _id: docByBizneo._id }, { $set: merged });
    await Colab.deleteOne({ _id: docByEmail._id });

    const updated = await Colab.findById(docByBizneo._id);
    onChange({
      type: wasSoft ? "created" : "updated",
      keptId: docByBizneo._id,
      removedId: docByEmail._id,
      doc: updated,
      changes: diff,
    });
    return updated;
  }

  // B2) No hay bizneo ni email, pero sí DNI -> actualizar ese
  if (!docByBizneo && !docByEmail && docByDni) {
    const wasSoft = isSoftDeleted(docByDni);
    const diff = diffRelevant(docByDni, mapped);
    const updateBase = {
      ...mapped,
      tecnologias: uniqStr([...(docByDni.tecnologias || []), ...(mapped.tecnologias || [])]),
      Proyectos: mergeProyectos(docByDni.Proyectos, mapped.Proyectos),
      last_edited_by: wasSoft ? "sync-restore-update-by-dni" : "sync-update-by-dni",
      last_edited_on: new Date(),
    };
    const update = safeUpdatePayload(wasSoft ? { ...updateBase, ...restoreFields() } : updateBase);

    await Colab.updateOne({ _id: docByDni._id }, { $set: update });
    const updated = await Colab.findById(docByDni._id);

    onChange({ type: wasSoft ? "created" : "updated", doc: updated, changes: diff });
    return updated;
  }

  // B) No hay bizneo pero sí email -> actualizar ese
  if (!docByBizneo && docByEmail) {
    const wasSoft = isSoftDeleted(docByEmail);
    const diff = diffRelevant(docByEmail, mapped);
    const updateBase = {
      ...mapped,
      tecnologias: uniqStr([...(docByEmail.tecnologias || []), ...(mapped.tecnologias || [])]),
      Proyectos: mergeProyectos(docByEmail.Proyectos, mapped.Proyectos),
      last_edited_by: wasSoft ? "sync-restore-update-by-email" : "sync-update-by-email",
      last_edited_on: new Date(),
    };
    const update = safeUpdatePayload(wasSoft ? { ...updateBase, ...restoreFields() } : updateBase);

    await Colab.updateOne({ _id: docByEmail._id }, { $set: update });
    const updated = await Colab.findById(docByEmail._id);

    onChange({ type: wasSoft ? "created" : "updated", doc: updated, changes: diff });
    return updated;
  }

  // C) Hay bizneo y DNI distintos -> merge en bizneo
  if (docByBizneo && docByDni && asId(docByBizneo._id) !== asId(docByDni._id)) {
    const wasSoft = isSoftDeleted(docByBizneo);
    const diff = diffRelevant(docByBizneo, mapped);
    const mergedBase = {
      ...mapped,
      tecnologias: uniqStr([
        ...(docByBizneo.tecnologias || []),
        ...(docByDni.tecnologias || []),
        ...(mapped.tecnologias || []),
      ]),
      Proyectos: mergeProyectos(docByBizneo.Proyectos, docByDni.Proyectos, mapped.Proyectos),
      last_edited_by: wasSoft ? "sync-restore-merge-dni-bizneo" : "sync-merge-dni-bizneo",
      last_edited_on: new Date(),
    };
    const merged = safeUpdatePayload(wasSoft ? { ...mergedBase, ...restoreFields() } : mergedBase);

    await Colab.updateOne({ _id: docByBizneo._id }, { $set: merged });
    await Colab.deleteOne({ _id: docByDni._id });

    const updated = await Colab.findById(docByBizneo._id);
    onChange({
      type: wasSoft ? "created" : "updated",
      keptId: docByBizneo._id,
      removedId: docByDni._id,
      doc: updated,
      changes: diff,
    });
    return updated;
  }

  // D) Upsert por bizneoId
  const existed = !!docByBizneo;
  const wasSoft = isSoftDeleted(docByBizneo);
  const diffUpsert = docByBizneo ? diffRelevant(docByBizneo, mapped) : { reasons: [] };

  const baseSet = safeUpdatePayload({ ...mapped });
  const $set = existed && wasSoft ? { ...baseSet, ...restoreFields() } : baseSet;

  // Insert-only
  const $setOnInsert = {
    roles: mapped.roles || [],
    estado: "Activo",              // nuevos llegan activos
    jornadaId: DEFAULT_JORNADA_ID, // jornada por defecto
  };
  if (!existed && Array.isArray(mapped.Proyectos)) {
    $setOnInsert.Proyectos = mapped.Proyectos;
  }

  const doc = await Colab.findOneAndUpdate(
    { bizneoId: mapped.bizneoId },
    { $set, $setOnInsert },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  );

  onChange({ type: existed ? (wasSoft ? "created" : "updated") : "created", doc, changes: diffUpsert });
  return doc;
}

async function syncFromUsersList({
  perPage = 25,
  startPage = 1,
  maxPages = null,
  delayMs = 200,
  onChange = () => {},
} = {}) {
  let page = startPage;
  let processed = 0;
  let created = 0; // incluye “restaurados”
  let updated = 0;
  let merged = 0;
  let inactiveBizneo = 0; // inactivos por Bizneo (marcados en esta corrida)
  let ok = 0; // total éxito: created + updated + merged + inactiveBizneo
  let fail = 0;
  let skippedByEmail = 0;
  let totalPages = 1;

  // Wrapper para contar por tipo
  const onChangeCounter = (evt) => {
    if (!evt || !evt.type) return;
    switch (evt.type) {
      case "created":
        created++; ok++; break;
      case "updated":
        updated++; ok++; break;
      case "merged":
        merged++; ok++; break;
      case "bizneo_inactive":
        inactiveBizneo++; ok++; break;
      case "bizneo_inactive_skipped_create":
        // informativo
        break;
      case "skipped":
        if (evt.reason === "email_domain") skippedByEmail++;
        break;
      default:
        break;
    }
    try { onChange(evt); } catch (e) {
      console.error(`[ERROR] onChange: ${e?.message || e}`);
    }
  };

  do {
    const { items, meta } = await listUsersPage(page, perPage);

    if (meta?.totalPages && totalPages === 1 && page === startPage) {
      totalPages = meta.totalPages;
    }

    if (!items || items.length === 0) {
      break;
    }
    for (const it of items) {
      processed++;

      // No hacemos skip por contrato inactivo acá. Lo decide syncOneById.
      if (!it.email || !it.email.endsWith("@mindfactory.ar")) {
        onChangeCounter({ type: "skipped", reason: "email_domain", hint: { id: it.id, email: it.email || null } });
        continue;
      }

      try {
        await syncOneById(it.id, {}, onChangeCounter);
      } catch (e) {
        fail++;
        console.error(`[ERROR] ${it.id}: ${e?.message || e}`);
      }

      if (delayMs) await sleep(delayMs);
    }

    page++;
  } while (page <= totalPages && (maxPages === null || page - startPage < maxPages));

  // Conteo de inactivos actuales en Rubik (soft-deleted)
  const inactiveRubik = await Colab.countDocuments({ delete_at: { $ne: null } });

  return {
    processed,
    created,           // “Agregados”
    updated,
    merged,
    inactiveBizneo,    // “Inactivos de Bizneo” (marcados en esta corrida)
    inactiveRubik,     // “Inactivos en Rubik” (tienen delete_at)
    ok,
    fail,
    skippedByEmail,
    added: created,    // alias por compatibilidad con la UI
  };
}
module.exports = { mapUserToColabDoc, syncOneById, syncFromUsersList };
