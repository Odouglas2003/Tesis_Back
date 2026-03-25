const Colab = require("../models/collaborator");
const svc = require("../services/bizneoSync.service");
const { getUserById } = require("../services/bizneo.service");
function makeCollector(limit = 100) {
  const state = {
    collab: { created: [], updated: [], skipped: [] },
  };

  const pushLimited = (arr, item) => {
    if (arr.length < limit) arr.push(item);
  };

  const onChangeCollab = (payload = {}) => {
    const { type, doc, changes, reason, hint } = payload;
    const reasons = Array.isArray(changes?.reasons) ? changes.reasons : [];

    if (type === "created" && doc?._id) {
      pushLimited(state.collab.created, {
        _id: String(doc._id),
        first_name: doc.first_name || "",
        last_name: doc.last_name || "",
        email: doc.email || null,
        changes: reasons, 
      });
      return;
    }

    if ((type === "updated" || type === "merged") && doc?._id) {
      pushLimited(state.collab.updated, {
        _id: String(doc._id),
        first_name: doc.first_name || "",
        last_name: doc.last_name || "",
        email: doc.email || null,
        changes: reasons,
      });
      return;
    }

    if (type === "skipped") {
      pushLimited(state.collab.skipped, {
        reason: String(reason || "unknown"),
        hint: hint || {},
      });
    }
  };

  return { state, onChangeCollab };
}

function splitInactiveFromBizneo(skipped = [], limit = 100) {
  const relevant = new Set([
    "contract_expired",
    "contract_expired_lite",
    "inactive_lite",
    "inactive",
  ]);
  const all = skipped.filter((s) => relevant.has(String(s.reason)));
  const total = all.length;
  const items = all.slice(0, limit);
  return { total, items };
}

async function fetchInactiveFromDb(limit = 100) {
  const today = new Date();
  const fortyFiveDaysAgo = new Date(today.getTime() - (45 * 24 * 60 * 60 * 1000));
  
  const query = {
    $or: [
      // Todos los que tengan estado Inactivo (sin restricción de tiempo)
      { estado: "Inactivo" },
      // Los que tengan delete_at hace más de 45 días
      { delete_at: { $ne: null, $lt: fortyFiveDaysAgo } },
      // Los que tengan contrato vencido hace más de 45 días (sin delete_at)
      { 
        delete_at: null,
        fin_contrato: { $ne: null, $lt: fortyFiveDaysAgo }
      }
    ]
  };

  const [total, docs] = await Promise.all([
    Colab.countDocuments(query),
    Colab.find(query).select("_id first_name last_name email estado delete_at fin_contrato last_edited_on").limit(limit).lean(),
  ]);

  // Actualizar estado a "Inactivo" para aquellos que no lo tengan
  if (docs && docs.length > 0) {
    const idsToUpdate = docs
      .filter(doc => doc.estado !== "Inactivo")
      .map(doc => doc._id);
    
    if (idsToUpdate.length > 0) {
      await Colab.updateMany(
        { _id: { $in: idsToUpdate } },
        { 
          $set: { 
            estado: "Inactivo",
            last_edited_on: new Date(),
            last_edited_by: "bizneo-sync-inactive"
          }
        }
      );
      
      // Actualizar los docs en memoria para reflejar el cambio
      docs.forEach(doc => {
        if (idsToUpdate.some(id => id.equals(doc._id))) {
          doc.estado = "Inactivo";
          doc.last_edited_on = new Date();
        }
      });
    }
  }

  return { total, items: docs || [] };
}
function pickContractFromBizneo(bz) {
  const list = Array.isArray(bz?.work_contracts) ? bz.work_contracts.slice() : [];
  if (!list.length) return null;

  const today = new Date().toISOString().slice(0, 10);
  const open = list.find(c => !c.end_at);
  if (open) return open;

  const current = list.find(c => c.end_at && c.end_at >= today);
  if (current) return current;

  return list.sort((a, b) =>
    new Date(b.end_at || b.start_at) - new Date(a.end_at || a.start_at)
  )[0];
}

function buildDetail(docDB = null, bizneoUser = null) {
  const db = docDB || {};
  const bz = bizneoUser || {};
  const firstRole = Array.isArray(db.roles) && db.roles.length ? db.roles[0] : null;

  const c = pickContractFromBizneo(bz);
  const contract = c
    ? {
      id: c.id ?? null,
      start_at: c.start_at ?? db.start_contrato ?? null,
      end_at: c.end_at ?? db.fin_contrato ?? null,
      fte: c.fte ?? null,
      status: (bz.access || "").toLowerCase() === "enabled" ? "active" : "inactive",
    }
    : {
      id: null,
      start_at: db.start_contrato ?? null,
      end_at: db.fin_contrato ?? null,
      fte: null,
      status: (bz.access || "").toLowerCase() === "enabled" ? "active" : "inactive",
    };



  return {
    bizneoId: bz.id ?? db.bizneoId ?? null,
    dni: bz.dni ?? db.dni ?? null,

    first_name: bz.first_name ?? db.first_name ?? null,
    last_name: bz.last_name ?? db.last_name ?? null,
    gender: bz.gender ?? null,
    birthday: bz.birthday ?? null,
    marital_status: bz.estado_civil ?? null,
    alias: bz.alias ?? null,

    
    role: bz.rol ?? firstRole?.rol ?? null,
    seniority: bz.seniority ?? firstRole?.seniority ?? null,
    access: bz.access ?? null,
    company_phone: bz.company_phone ?? null,
    last_login_at: bz.last_login_at ?? null,

   
    email: bz.email ?? db.email ?? null,
    alt_email: bz.mail_alternativo ?? null,
    phone: bz["teléfono"] ?? bz.telefono ?? null,

    country: "Argentina", 
    province: bz.provincia ?? null,
    city: bz.localidad ?? bz.city ?? null,
    municipality: bz.municipio ?? bz.municipality ?? null,
    neighborhood: bz.barrio ?? null,
    address: bz.domicilio ?? db.address ?? null,
    zip: bz.cp ?? null,
    piso: bz.piso ?? null,
    dpto: bz.dpto ?? null,

    nivel: bz["nivel_"] ?? null,
    nivel_2: bz["nivel_2"] ?? null,
    carrera: bz.carrera ?? null,
    carrera_2: bz["carrera 2"] ?? null,
    estado_carrera: bz.estado ?? bz.estado_2 ?? null,

    contract,

    image: db.image || bz.image || bz.avatar_url || null,
    projects: Array.isArray(bz.projects) ? bz.projects : [],
    taxons: bz.taxons ?? {},
  };
}
// -------------------------- Controllers --------------------------
async function triggerCollaborators(req, res, next) {
  try {
    const opts = req.body || {};
    const limit = Number(req.query.limit ?? opts.limit ?? 100);

    const { state, onChangeCollab } = makeCollector(limit);

    const result = await svc.syncCollaborators({ ...opts, onChangeCollab });

    const inactiveBizneo = splitInactiveFromBizneo(state.collab.skipped, limit);
    const inactiveDb = await fetchInactiveFromDb(limit);

    return res.json({
      message: "Colaboradores sincronizados",
      summary: result.summary?.collaborators ?? result.summary, 
      report: {
        collaborators: {
          ...state.collab, 
          inactive: {
            from_bizneo: inactiveBizneo,
            in_db: inactiveDb,
          },
        },
      },
      limit,
    });
  } catch (e) {
    next(e);
  }
}

async function triggerFullSync(req, res, next) {
  try {
    const opts = req.body || {};
    const limit = Number(req.query.limit ?? opts.limit ?? 100);

    const { state, onChangeCollab } = makeCollector(limit);

    const result = await svc.runFullSync({
      ...opts,
      onChangeCollab,
    });

    const inactiveBizneo = splitInactiveFromBizneo(state.collab.skipped, limit);
    const inactiveDb = await fetchInactiveFromDb(limit);

    return res.json({
      message: "Full sync ok",
      summary: result.summary, 
      report: {
        collaborators: {
          ...state.collab,
          inactive: {
            from_bizneo: inactiveBizneo,
            in_db: inactiveDb,
          },
        },
      },
      limit,
    });
  } catch (e) {
    next(e);
  }
}

async function triggerOneCollaborator(req, res, next) {
  try {
    const bizneoId = req.params.bizneoId;
    const { state, onChangeCollab } = makeCollector(1);

    const docDB = await svc.syncOneCollaborator(bizneoId, { onChange: onChangeCollab });

    let bizneoUser = null;
    try {
      bizneoUser = await getUserById(bizneoId);  
    } catch (e) {
      console.warn(`[Bizneo] getUserById ${bizneoId} falló:`, e?.message || e);
    }

    const plain = docDB && typeof docDB.toObject === "function" ? docDB.toObject() : docDB;
    const data = buildDetail(plain, bizneoUser); 

    // cambios detectados
    const changes = state.collab.updated[0]?.changes ?? state.collab.created[0]?.changes ?? [];

    return res.json({
      message: "Colaborador sincronizado",
      data,          
      changes,
      db: plain ?? null,
      bizneo: bizneoUser ?? null,
    });
  } catch (e) {
    next(e);
  }
}
async function activateOneInactiveInRubik(req, res, next) {
  try {
    const id = req.params.bizneoId || req.params.id;

    if (!id) {
      return res.status(400).json({
        message: "Debe enviar el id del colaborador en la URL",
      });
    }

    const update = {
      $set: {
        estado: "Activo",
        last_edited_by: (req.user && (req.user.username || req.user.id)) || "activate-api",
        last_edited_on: new Date(),
      },
      $unset: { delete_at: 1 },
    };

    const doc = await Colab.findByIdAndUpdate(id, update, { new: true });

    if (!doc) {
      return res.status(404).json({
        message: "No se encontró colaborador en Rubik con ese id",
      });
    }

    return res.json({
      message: "Colaborador activado en Rubik",
      bizneoId: doc.bizneoId,
      collabId: String(doc._id),
      estado: doc.estado,
    });
  } catch (e) {
    next(e);
  }
}



module.exports = {
  triggerCollaborators,
  triggerFullSync,
  triggerOneCollaborator,
  activateOneInactiveInRubik,
};
