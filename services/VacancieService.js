

// services/VacancieService.js (Versión Final con Búsqueda Avanzada)
const Vacan = require("../models/vacancy");
const Project = require("../models/projects");
const Technology = require("../models/technologies");
const logger = require('../config/logger');
const AppError = require('../utils/AppError');

// --- FUNCIONES AUXILIARES (SIN CAMBIOS) ---
const processSkillsForDB = async (skills) => {
  if (!skills || !Array.isArray(skills) || skills.length === 0) return [];
  const skillNames = skills.map(skill =>
    (typeof skill === 'string' ? skill.trim() : skill.name.trim())
  ).filter(Boolean);
  if (skillNames.length === 0) return [];
  const foundTechs = await Technology.find(
    { name: { $in: skillNames } },
    null,
    { collation: { locale: 'es', strength: 2 } }
  );
  if (foundTechs.length !== skillNames.length) {
    throw new AppError('VACANCY_INVALID_TECHNOLOGY', 400, 'Uno o más nombres de tecnología proporcionados no son válidos o no existen.');
  }
  return foundTechs.map(tech => ({ technologyId: tech._id }));
};

const formatVacancyOutput = (vacancyDoc) => {
  if (!vacancyDoc) return null;
  const vacancyObj = vacancyDoc.toObject();
  if (vacancyObj.skills) {
    vacancyObj.skills = vacancyObj.skills.map(skill => {
      if (!skill.technologyId) return null;
      return { id: skill.technologyId.id, name: skill.technologyId.name };
    }).filter(Boolean);
  }
  return vacancyObj;
}

//const ALLOWED_STATUS = ["Abierta", "En Proceso", "Finalizada"];

class VacancieService {

  // --- FUNCIÓN DE BÚSQUEDA TOTALMENTE MODIFICADA ---
  async getAllVacancies(filters = {}) {
    const query = { delete_at: null };

    // 1. Filtrar por nombre de proyecto (si se proporciona)
    if (filters.projectName) {
      const projectRegex = { $regex: String(filters.projectName).trim(), $options: "i" };
      const matchingProjects = await Project.find({ name: projectRegex }).select('_id');

      if (matchingProjects.length === 0) {
        return []; // Si no hay proyectos que coincidan, no habrá vacantes
      }

      const projectIds = matchingProjects.map(p => p._id);
      query.projectId = { $in: projectIds };
    }

    // 2. Filtrar por seniority (si se proporciona)
    if (filters.seniority) {
      const seniorityRegex = { $regex: String(filters.seniority).trim(), $options: "i" };
      query.seniority = seniorityRegex;
    }

    // 3. Búsqueda general por nombre de vacante (si se proporciona 'search')
    if (filters.search) {
      const searchRegex = { $regex: String(filters.search).trim(), $options: "i" };
      query.vacancieName = searchRegex;
    }

    if (filters.status) {
      const status = String(filters.status).trim();
      query.status = { $regex: `^${status}$`, $options: "i" };
    } else {
      query.status = { $ne: "Finalizada" };
    }

    const vacancies = await Vacan.find(query)
      .populate({ path: 'projectId', select: 'id name client status' })
      .populate({ path: 'skills.technologyId', select: 'id name' })
      .collation({ locale: 'es', strength: 2 })
      .sort({ orderDate: -1, vacancieName: 1 }); // Ordenar por fecha de pedido y luego nombre

    return vacancies.map(formatVacancyOutput);
  }

  // --- EL RESTO DE FUNCIONES PERMANECEN IGUAL ---
  async getVacancyById(id) {
    const vacant = await Vacan.findById(id)
      .populate({ path: 'projectId', select: 'id name client status' })
      .populate({ path: 'skills.technologyId', select: 'id name' });
    if (!vacant || vacant.delete_at) {
      throw new AppError('VACANCY_NOT_FOUND');
    }
    return formatVacancyOutput(vacant);
  }

  async registerVacancy(vacancieData) {
    if (!vacancieData.projectId) {
      delete vacancieData.projectId;
    }
    if (!vacancieData.manager_id) {
      delete vacancieData.manager_id;
      delete vacancieData.manager_name;
    }

    if (vacancieData.projectId) {
      const projectExists = await Project.findById(vacancieData.projectId);
      if (!projectExists) {
        throw new AppError('VACANCY_PROJECT_NOT_FOUND', 404, 'El ID de proyecto proporcionado no existe.');
      }
    }

    vacancieData.skills = await processSkillsForDB(vacancieData.skills);
    const newVacan = new Vacan(vacancieData);
    const savedVacancy = await newVacan.save();
    logger.info(`Vacante registrada: ${savedVacancy.vacancieName} (ID: ${savedVacancy.id})`);

    return this.getVacancyById(savedVacancy.id);
  }

  


 async updateVacancy(id, updates) {
    
    // --- INICIO DE LA CORRECCIÓN FINAL ---

    // Paso 1: Verificamos si el campo 'projectId' fue enviado y si es un objeto.
    if (updates.projectId && typeof updates.projectId === 'object') {
        
        // Paso 2: Verificamos si el objeto tiene un 'id' con valor.
        if (updates.projectId.id) {
            // Si lo tiene, reemplazamos el objeto completo por solo la cadena del ID.
            updates.projectId = updates.projectId.id;
        } else {
            // Si es un objeto vacío como { id: '', name: '' }, significa "desasociar".
            // Lo establecemos a null.
            updates.projectId = null;
        }
    }
    
    // --- FIN DE LA CORRECCIÓN FINAL ---


    // Tu lógica original para manager_id (está perfecta)
    if (Object.prototype.hasOwnProperty.call(updates, 'manager_id') && !updates.manager_id) {
      updates.manager_id = null;
      updates.manager_name = null;
    }

    // Tu validación de proyecto ahora recibirá una cadena de texto o null.
    if (updates.projectId) {
      const projectExists = await Project.findById(updates.projectId);
      if (!projectExists) {
        throw new AppError('VACANCY_PROJECT_NOT_FOUND', 404, 'El ID de proyecto proporcionado no existe.');
      }
    }

    if (updates.skills) {
      updates.skills = await processSkillsForDB(updates.skills);
    }

    const updatedVacancie = await Vacan.findOneAndUpdate(
      { _id: id, delete_at: null },
      { $set: updates },
      { new: true, runValidators: true }
    );
    if (!updatedVacancie) {
      throw new AppError('VACANCY_NOT_FOUND');
    }
    logger.info(`Vacante actualizada: ${updatedVacancie.vacancieName} (ID: ${id})`);

    return this.getVacancyById(updatedVacancie.id);
}

  async softDeleteVacancy(id) {
    const vacant = await Vacan.findById(id);
    if (!vacant) {
      throw new AppError('VACANCY_NOT_FOUND');
    }
    if (vacant.delete_at) {
      throw new AppError('VACANCY_ALREADY_DELETED');
    }
    vacant.delete_at = new Date();
    await vacant.save();
    logger.info(`Vacante marcada como eliminada: ${vacant.vacancieName} (ID: ${id})`);
    return { id: id, deleted_at: vacant.delete_at };
  }
}

module.exports = new VacancieService();
