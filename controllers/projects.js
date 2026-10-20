


// controllers/projects.js

const ProjectService = require("../services/ProjectService");
//const AppError = require('../utils/AppError');
const messages = require('../utils/messages');
const { canEditProject, forbidden } = require('../utils/managerScope');

const pruebaProjec = async (req, res) => {
  const searchQuery = req.query.search;
  const projectsWithStatus = await ProjectService.getAllProjectsWithStatus(searchQuery);
  return res.status(200).json({
    status: "success",
    count: projectsWithStatus.length,
    data: projectsWithStatus,
  });
};

const register = async (req, res) => {
  // --- INICIO DE LA CORRECCIÓN ---

  // 1. Tomamos una copia de los datos del cuerpo de la solicitud
  const projectData = { ...req.body };

  // 2. Verificamos si el campo 'category' existe y es un string
  if (projectData.category && typeof projectData.category === 'string') {
    const categoryLower = projectData.category.toLowerCase();
    // 3. Normalizamos el valor: primera letra en mayúscula, el resto en minúscula
    projectData.category = categoryLower.charAt(0).toUpperCase() + categoryLower.slice(1);
    // Ahora, si llega "inversion", se convertirá en "Inversion" antes de pasarlo al servicio.
  }

  // 4. Pasamos los datos ya normalizados al servicio
  const savedProject = await ProjectService.registerProject(projectData);
  // 🔔 Disparar actualización FAISS en la IA
 
   try {
       const IaService = require("../services/IaService");
       await IaService.triggerFaissUpdate(savedProject._id.toString());
      } catch (err) {
         console.error("⚠️ No se pudo actualizar FAISS:", err.message);
      }

  // --- FIN DE LA CORRECCIÓN ---
  console.log('Proyecto registrado:', savedProject);
  return res.status(201).json({
    status: "success",
    message: messages.success.PROJECT_REGISTERED,
    project: savedProject,
  });
};

const registerWithRelations = async (req, res) => {
  const { body: payload } = req;
  if (payload && payload.project) {
    payload.project.last_edited_by = (req.user && (req.user.name || req.user.email)) || payload.project.last_edited_by;
    if (payload.ia_generated === true) payload.project.ia_generated = true;
  }
  const result = await ProjectService.registerWithRelations(payload);
  return res.status(201).json({
    status: "success",
    message: "Proyecto registrado y relaciones procesadas",
    data: result,
  });
};

const getProjectByID = async (req, res) => {
  const { id } = req.params; 
  const project = await ProjectService.getProjectById(id);
  return res.status(200).json({
    status: "success",
    data: project,
  });
};

const editProject = async (req, res) => {
  const { id } = req.params;
  const updates = req.body;
  if (!(await canEditProject(req.user, id))) {
    return forbidden(res, 'Solo podés modificar proyectos donde sos Project Manager.');
  }
  updates.last_edited_by = (req.user && (req.user.name || req.user.email)) || updates.last_edited_by;

  // --- CORRECCIÓN SIMILAR PARA LA EDICIÓN (BUENA PRÁCTICA) ---
  // También normalizamos la categoría si se está intentando editar.
  if (updates.category && typeof updates.category === 'string') {
    const categoryLower = updates.category.toLowerCase();
    updates.category = categoryLower.charAt(0).toUpperCase() + categoryLower.slice(1);
  }
  // --- FIN DE LA CORRECCIÓN PARA EDICIÓN ---

  const updatedProject = await ProjectService.updateProject(id, updates);

  // 🔔 Disparar actualización FAISS en la IA
  try {
      const IaService = require("../services/IaService");
      await IaService.triggerFaissUpdate(updatedProject._id.toString());
  } catch (err) {
      console.error("⚠️ No se pudo actualizar FAISS:", err.message);
  }
  return res.status(200).json({
    status: "success",
    message: messages.success.PROJECT_UPDATED,
    project: updatedProject,
  });
};

const eliminar = async (req, res) => {
  const { id } = req.params;
  const result = await ProjectService.softDeleteProject(id);
  return res.status(200).json({
    status: "success",
    message: messages.success.PROJECT_DELETED,
    details: result
  });
};

// --- MÉTODOS PARA PERSONAS ASIGNADAS ---

const addAssignedPerson = async (req, res) => {
  const { id } = req.params;
  if (!(await canEditProject(req.user, id))) {
    return forbidden(res, 'Solo podés modificar proyectos donde sos Project Manager.');
  }
  const person = req.body;
  const project = await ProjectService.addAssignedPerson(id, person);
  return res.status(200).json({ 
    status: "success", 
    message: messages.success.PERSON_ASSIGNED, 
    project 
  });
};

const removeAssignedPerson = async (req, res) => {
  const { id } = req.params;
  if (!(await canEditProject(req.user, id))) {
    return forbidden(res, 'Solo podés modificar proyectos donde sos Project Manager.');
  }
  const { id: personId } = req.body;
  const project = await ProjectService.removeAssignedPerson(id, personId);
  return res.status(200).json({ 
    status: "success", 
    message: messages.success.PERSON_REMOVED, 
    project 
  });
};

const updateAssignedPerson = async (req, res) => {
  const { id } = req.params;
  if (!(await canEditProject(req.user, id))) {
    return forbidden(res, 'Solo podés modificar proyectos donde sos Project Manager.');
  }
  const { id: personId, ...fieldsToUpdate } = req.body;// El ID de la persona y los campos a actualizar
  const project = await ProjectService.updateAssignedPerson(id, personId, fieldsToUpdate);
  return res.status(200).json({ 
    status: "success", 
    message: messages.success.PERSON_UPDATED, 
    project 
  });
};

module.exports = {
  pruebaProjec,
  register,
  getProjectByID,
  editProject,
  eliminar,
  addAssignedPerson,
  removeAssignedPerson,
  updateAssignedPerson,
  registerWithRelations,
};