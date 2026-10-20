
const CollaboratorService = require("../services/CollaboratorService");
const AppError = require('../utils/AppError');
const messages = require('../utils/messages');
function normalizeEstadoAsignacion(v) {
  if (!v) return null;
  const s = String(v)
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .trim();

  switch (s) {
    case "sobreasignado": return "Sobreasignado";
    case "asignado": return "Asignado";
    case "subasignado": return "Subasignado";
    case "sin asignar":
    case "sin asignacion":
    case "sin_asignar":
      return "Sin asignar";
    default:
      return null; 
  }
}
const pruebaColab = async (req, res) => {
  const searchQuery = req.query.search;
  const collaborators = await CollaboratorService.getAllCollaborators(searchQuery);
  return res.status(200).json(collaborators);
};

const register = async (req, res) => {
  const savedCollaborator = await CollaboratorService.registerCollaborator(req.body);
  return res.status(201).json({
    status: "success",
    message: messages.success.COLLABORATOR_REGISTERED,
    colaborador: savedCollaborator,
  });
};

const getCollaboratorById = async (req, res) => {
  const { id } = req.params;
  const collaborator = await CollaboratorService.getCollaboratorById(id);
  return res.status(200).json({
    status: "success",
    collaborator,
  });
};

const editColab = async (req, res) => {
  const { id } = req.params;
  const updates = req.body;
  updates.last_edited_by = (req.user && (req.user.name || req.user.email)) || updates.last_edited_by;
  const updatedCollaborator = await CollaboratorService.updateCollaborator(id, updates);
  return res.status(200).json({
    status: "success",
    message: messages.success.COLLABORATOR_UPDATED,
    colaborador: updatedCollaborator,
  });
};

const Eliminar = async (req, res) => {
  const { id } = req.params;
  const result = await CollaboratorService.softDeleteCollaborator(id);
  return res.status(200).json({
    status: "success",
    message: messages.success.COLLABORATOR_DELETED,
    id: result.id
  });
};

const checkContractExpiration = async (req, res) => {
  res.status(200).json({ message: messages.success.CONTRACT_EXPIRATION_CHECK_PENDING });
};

const removeProyecto = async (req, res) => {
  const { id } = req.params;
  const { projectId } = req.body;

  if (!projectId) {
    throw new AppError('MISSING_PROJECT_ID');
  }

  res.status(200).json({ message: messages.success.PROJECT_REMOVAL_PENDING(projectId, id) });
};

const updateCollaborator = async (req, res) => {
  const { id } = req.params; 
  const updates = req.body;  
  const updatedColab = await CollaboratorService.updateCollaboratorServices(id, updates);
  res.status(200).json(updatedColab);
};

const getCollaborators = async (req, res) => {
  try {
    const { search = "", estadoAsignacion = "" } = req.query;

    const estadoNorm = normalizeEstadoAsignacion(estadoAsignacion);
    const filters = {
      search: String(search || "").trim(),
      estadoAsignacion: estadoNorm,
    };

    const collaborators = await CollaboratorService.getCollaboratorsUnified(filters);
    return res.status(200).json(collaborators);
  } catch (error) {
    console.error("Error en getCollaborators:", error);
    return res.status(500).send({ message: "Error al obtener la lista de colaboradores." });
  }
};

const getSoftDeletedCollaborators = async (req, res) => {
  try {
    const { search = "", limit = 50 } = req.query;
    const softDeleted = await CollaboratorService.getSoftDeletedCollaborators({
      search: String(search).trim(),
      limit: Number(limit)
    });
    return res.status(200).json({
      status: "success",
      message: "Colaboradores con delete_at obtenidos exitosamente",
      data: softDeleted,
      total: softDeleted.length
    });
  } catch (error) {
    console.error("Error en getSoftDeletedCollaborators:", error);
    return res.status(500).json({ 
      status: "error",
      message: "Error al obtener colaboradores eliminados" 
    });
  }
};

const restoreCollaborator = async (req, res) => {
  try {
    const { id } = req.params;
    const restoredCollaborator = await CollaboratorService.restoreCollaborator(id, req.user);
    return res.status(200).json({
      status: "success",
      message: "Colaborador reestablecido exitosamente",
      collaborator: restoredCollaborator
    });
  } catch (error) {
    console.error("Error en restoreCollaborator:", error);
    if (error instanceof AppError) {
      return res.status(error.statusCode || 400).json({ 
        status: "error",
        message: error.message 
      });
    }
    return res.status(500).json({ 
      status: "error",
      message: "Error al reestablecer el colaborador" 
    });
  }
};


module.exports = {
  pruebaColab,
  register,
  getCollaboratorById,
  editColab,
  Eliminar,
  updateCollaborator,
  checkContractExpiration, 
  removeProyecto,
  getCollaborators,
  getSoftDeletedCollaborators,
  restoreCollaborator
};