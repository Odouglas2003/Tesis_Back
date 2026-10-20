// Reglas de alcance para usuarios con rol "manager":
// un manager solo puede modificar proyectos donde figura como Project Manager
// y colaboradores asignados a alguno de esos proyectos. Los administradores no tienen restricción.
const Project = require('../models/projects');
const Collaborator = require('../models/collaborator');

const isManager = (user) => Boolean(user && user.rol === 'manager');

const ownerFilter = (user) => ({
  delete_at: null,
  $or: [{ managerName: user.name }, { managerId: String(user._id) }],
});

async function canEditProject(user, projectId) {
  if (!isManager(user)) return true;
  if (!projectId) return false;
  try {
    return (await Project.countDocuments({ _id: projectId, ...ownerFilter(user) })) > 0;
  } catch (_) {
    return false; // id inválido
  }
}

async function canEditCollaborator(user, collaboratorId) {
  if (!isManager(user)) return true;
  try {
    const collaborator = await Collaborator.findById(collaboratorId).select('Proyectos.projectId');
    if (!collaborator) return false;
    const projectIds = (collaborator.Proyectos || []).map((p) => p.projectId).filter(Boolean);
    if (projectIds.length === 0) return false;
    return (await Project.countDocuments({ _id: { $in: projectIds }, ...ownerFilter(user) })) > 0;
  } catch (_) {
    return false;
  }
}

const forbidden = (res, message) =>
  res.status(403).json({ status: 'error', message });

module.exports = { isManager, canEditProject, canEditCollaborator, forbidden };
