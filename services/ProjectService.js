



// // services/ProjectService.js (versión COMPLETA y MODIFICADA)
// const Project = require("../models/projects");
// const Colab = require("../models/collaborator");
// const Vacan = require("../models/vacancy");
// const logger = require("../config/logger");
// const AppError = require('../utils/AppError'); // Asumo que tienes este archivo para errores personalizados
// const Technology = require("../models/technologies");
// const {
//   createProject: createBizneoProject,
//   assignUserToProject: assignBizneoUser,
//   removeUserFromProject: removeBizneoUser,
//   getTaxonById,
//   createTaxon,
//   assignUsersToTaxon
// } = require('./bizneo.service');
// const processSkillsForDB = async (skills) => {
//   if (!skills || !Array.isArray(skills) || skills.length === 0) return [];
//   const skillNames = skills.map(skill =>
//     (typeof skill === 'string' ? skill.trim() : skill.name.trim())
//   ).filter(Boolean);
//   if (skillNames.length === 0) return [];
//   const foundTechs = await Technology.find(
//     { name: { $in: skillNames } },
//     null,
//     { collation: { locale: 'es', strength: 2 } }
//   );
//   if (foundTechs.length !== skillNames.length) {
//     throw new AppError('VACANCY_INVALID_TECHNOLOGY', 400, 'Uno o más nombres de tecnología proporcionados no son válidos o no existen.');
//   }
//   return foundTechs.map(tech => ({ technologyId: tech._id }));
// };

// class ProjectService {

//   _calculateContractStatus(project) {
//     let alertLevel = null;
//     let message = null;
//     let daysRemaining = null;
//     const today = new Date();
//     today.setHours(0, 0, 0, 0);
//     const contractEndDateField = project.endDate;
//     if (contractEndDateField) {
//       const contractEnd = new Date(contractEndDateField);
//       if (!isNaN(contractEnd.getTime())) {
//         contractEnd.setHours(0, 0, 0, 0);
//         const diffTime = contractEnd.getTime() - today.getTime();
//         const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
//         daysRemaining = diffDays;

//         if (diffDays <= 30) {
//           alertLevel = diffDays < 0 ? "expired" : diffDays === 0 ? "due_today" : "warning";
//           message = diffDays < 0 ? `Proyecto vencido hace ${Math.abs(diffDays)} día(s)` : diffDays === 0 ? "Proyecto vence hoy" : `Proyecto vence en ${diffDays} día(s)`;
//         } else {
//           alertLevel = "on_time";
//           message = `Proyecto vigente, vence en ${diffDays} día(s)`;
//         }
//       }
//     }
//     return { daysRemaining, alertLevel, message };
//   }

//   async getAllProjectsWithStatus(searchQuery) {
//     const baseFilter = { delete_at: null };
//     if (searchQuery) {
//       baseFilter.name = { $regex: String(searchQuery).trim(), $options: "i" };
//     }

//     const projects = await Project.find(baseFilter).sort({ created_at: -1 });

//     const enrichedProjects = projects.map((project) => {
//       const contractStatus = this._calculateContractStatus(project);
//       return {
//         ...project.toJSON(),
//         contractStatus,
//       };
//     });

//     return enrichedProjects;
//   }

//   async getProjectById(id) {
//     const project = await Project.findById(id);
//     if (!project || project.delete_at) {
//       throw new AppError('PROJECT_NOT_FOUND');
//     }
//     const contractStatus = this._calculateContractStatus(project);
//     return { ...project.toJSON(), contractStatus };
//   }

//   async registerProject(projectData) {
//     const existingByName = await Project.findOne({ name: projectData.name, delete_at: null });
//     if (existingByName) {
//       throw new AppError('PROJECT_NAME_ALREADY_EXISTS');
//     }

//     const newProject = new Project(projectData);
//     const savedProject = await newProject.save();
//     logger.info(`Proyecto registrado: ${savedProject.name} (ID: ${savedProject.id})`);
//      // 2. Sincronizar con Bizneo
//     let bizneoProject;
//     try {
//       // 2. Sincronizar CREACIÓN del proyecto en Bizneo
//       bizneoProject = await createBizneoProject(savedProject.name);
//       if (bizneoProject && bizneoProject.id) {
//         savedProject.bizneoId = bizneoProject.id;
//         await savedProject.save();
//         logger.info(`Proyecto de Rubik ${savedProject.id} sincronizado con Bizneo ID ${bizneoProject.id}`);
//       } else {
//         // Si no se pudo crear el proyecto en Bizneo, no podemos continuar con las asignaciones.
//         logger.error(`No se pudo crear el proyecto en Bizneo. No se sincronizarán las asignaciones.`);
//         return savedProject; // Devolvemos el proyecto de Rubik tal como está.
//       }
//     } catch (error) {
//       logger.error(`Falló la sincronización de creación con Bizneo para '${savedProject.name}'. Error: ${error.message}`);
//       return savedProject;
//     }

//     // --- ¡NUEVA LÓGICA DE ASIGNACIÓN! ---
//     // 3. Sincronizar ASIGNACIÓN de personas
//     // Verificamos si en la data inicial venían personas asignadas
//     if (projectData.assignedPersons && projectData.assignedPersons.length > 0) {
//       logger.info(`Iniciando sincronización de ${projectData.assignedPersons.length} persona(s) asignada(s) para el proyecto ${savedProject.name}`);

//       // Usamos Promise.allSettled para intentar asignar a todos, incluso si alguno falla.
//       const assignmentPromises = projectData.assignedPersons.map(async (person) => {
//         // `person.id` aquí es el ID de MongoDB del colaborador
//         const collaborator = await Colab.findById(person.id).select('bizneoId name').lean();
        
//         if (collaborator && collaborator.bizneoId) {
//           try {
//             await assignBizneoUser(collaborator.bizneoId, bizneoProject.id);
//             logger.info(` -> Usuario ${collaborator.name} (Bizneo ID: ${collaborator.bizneoId}) asignado correctamente al proyecto Bizneo ID ${bizneoProject.id}`);
//             return { status: 'fulfilled', bizneoId: collaborator.bizneoId };
//           } catch (error) {
//             logger.error(` -> Falló la asignación para ${collaborator.name} (Bizneo ID: ${collaborator.bizneoId}). Error: ${error.message}`);
//             return { status: 'rejected', bizneoId: collaborator.bizneoId, reason: error.message };
//           }
//         } else {
//           logger.warn(` -> No se pudo asignar a la persona con ID de Rubik ${person.id}. No se encontró su 'bizneoId'.`);
//           return { status: 'rejected', rubikId: person.id, reason: 'Missing bizneoId' };
//         }
//       });

//       await Promise.allSettled(assignmentPromises);
//     }
//     // --- FIN DE LA NUEVA LÓGICA ---

//     return savedProject;
//   }


//   async registerWithRelations(payload) {
//     const {
//       project,
//       collaborators = [],
//       vacancies = [],
//     } = payload || {};

//     if (!project || !project.name || !project.client) {
//       throw new AppError("Faltan datos obligatorios del proyecto (name, client)", 400);
//     }

//     // 1) Crear proyecto
//     const proj = await Project.create(project);

//     // 2) Actualizar colaboradores (como en tus otras APIs, SIN session)
//     const collaboratorResults = [];
//     for (const c of collaborators) {
//       const filter = c.id ? { _id: c.id } : (c.dni ? { dni: c.dni } : null);
//       if (!filter) throw new AppError("Cada colaborador debe traer 'id' o 'dni'", 400);

//       const current = await Colab.findOne(filter);
//       if (!current) throw new AppError("Colaborador no encontrado para actualizar", 404);

//       const prevProjectHours = Number(c.prevProjectHours || 0); // horas que tenía en ESTE proyecto (0 si nuevo)
//       const projectHours = Number(c.projectHours || 0);     // horas nuevas para ESTE proyecto
//       const diff = projectHours - prevProjectHours; // + suma, - resta

//       const updateOps = {
//         $set: { last_edited_on: new Date() },
//         $inc: { horasAsignadas: diff }, // ajusta horas globales
//       };

//       if (c.name) updateOps.$set.name = c.name;
//       if (c.rol) updateOps.$set.rol = c.rol;
//       if (c.seniority) updateOps.$set.seniority = c.seniority;

//       // Registrar asignación del proyecto en el colaborador si corresponde
//       if (c.assignToProject === true) {
//         updateOps.$push = {
//           Proyectos: {
//             projectId: proj._id,
//             rol: c.rol,
//             horasAsignadas: projectHours,
//             seniority: c.seniority,
//           }
//         };
//       }

//       const updated = await Colab.findOneAndUpdate(
//         filter,
//         updateOps,
//         { new: true }
//       );

//       collaboratorResults.push({
//         id: updated._id.toString(),
//         diffAplicado: diff,
//         horasGlobalesDespues: updated.horasAsignadas,
//         projectHoursFinal: projectHours,
//       });
//     }

//     // 3) Asegurar assignedPersons en el Proyecto (si no vino en project)
//     if (!Array.isArray(project.assignedPersons) || project.assignedPersons.length === 0) {
//       const persons = collaborators.map(c => ({
//         id: c.id,
//         name: c.name,
//         rol: c.rol,
//         seniority: c.seniority,
//         horasAsignadas: String(Number(c.projectHours || 0)),
//         tecnologias: c.tecnologias || [],
//         orderDate: c.orderDate || null,
//         startDate: c.startDate || null,
//       })).filter(p => p.id);
//       if (persons.length) {
//         await Project.findByIdAndUpdate(
//           proj._id,
//           { $push: { assignedPersons: { $each: persons } } },
//           { new: true }
//         );
//       }
//     }
//     let vacanciesCreated = [];
//     if (Array.isArray(vacancies) && vacancies.length) {
//       const toInsert = await Promise.all(
//         vacancies.map(async (v) => {
//           const hours = Number(v.hours ?? v.time ?? 0);

//           // Convertir skills con tu helper
//           const skills = await processSkillsForDB(v.skills);

//           return {
//             projectId: proj._id,
//             manager_id: v.manager_id ?? project.managerId ?? null,
//             manager_name: v.manager_name ?? project.managerName ?? null,
//             vacancieName: v.vacancieName ?? v.name ?? "Sin nombre",
//             time: hours,
//             orderDate: v.orderDate ?? null,
//             startDate: v.startDate ?? null,
//             seniority: v.seniority ?? null,
//             skills, // ahora sí con technologyId
//           };
//         })
//       );

//       try {
//         vacanciesCreated = await Vacan.insertMany(toInsert, { ordered: false });
//         logger.info(`${vacanciesCreated.length} vacante(s) creadas para el proyecto ${proj.name}.`);
//       } catch (err) {
//         const first = err?.writeErrors?.[0]?.err || err;
//         logger.error(`Error insertando vacantes: ${first?.errmsg || first?.message || String(err)}`);
//         throw new AppError(first?.errmsg || first?.message || 'No se pudieron crear las vacantes', 400);
//       }
//     }
//   }

//   // --- ¡FUNCIÓN MODIFICADA! ---
//   async updateProject(id, updates) {
//     delete updates.id;
//     delete updates._id;

//     // --- LÓGICA DE NORMALIZACIÓN AÑADIDA ---
//     // Si en la actualización viene el campo 'category', lo normalizamos
//     // para asegurar que coincida con los valores del enum ('Gobierno', 'Privado', 'Inversion').
//     if (Object.prototype.hasOwnProperty.call(updates, 'category') && typeof updates.category === 'string') {
//       const cat = updates.category.trim().toLowerCase();
//       if (cat === 'gobierno') {
//         updates.category = 'Gobierno';
//       } else if (cat === 'privado') {
//         updates.category = 'Privado';
//       } else if (cat === 'inversion') {
//         updates.category = 'Inversion';
//       }
//       // Si no coincide con ninguno, dejamos que la validación de Mongoose haga su trabajo y lance un error.
//     }
//     // --- FIN DE LA LÓGICA DE NORMALIZACIÓN ---

//     updates.last_edited_on = new Date();

//     const updatedProject = await Project.findOneAndUpdate(
//       { _id: id, delete_at: null },
//       { $set: updates },
//       { new: true, runValidators: true } // runValidators es clave para que el enum se verifique
//     );

//     if (!updatedProject) {
//       throw new AppError('PROJECT_NOT_FOUND_OR_CANNOT_UPDATE'); // Mensaje de error más específico
//     }
//     logger.info(`Proyecto actualizado: ${updatedProject.name} (ID: ${id})`);
//     return updatedProject;
//   }
//   // --- FIN DE LA FUNCIÓN MODIFICADA ---

//   async softDeleteProject(id) {
//     const deletedProject = await Project.findOneAndUpdate(
//       { _id: id, delete_at: null },
//       { $set: { delete_at: new Date() } },
//       { new: true }
//     );

//     if (!deletedProject) {
//       throw new AppError('PROJECT_NOT_FOUND');
//     }

//     logger.info(`Proyecto marcado como eliminado: ${deletedProject.name} (ID: ${id})`);

//     await Colab.updateMany(
//       { "Proyectos.projectId": deletedProject._id },
//       { $pull: { Proyectos: { projectId: deletedProject._id } } }
//     );
//     logger.info(`Personas desasignadas del proyecto ${deletedProject.name}`);

//     const deletionDate = deletedProject.delete_at;

//     const result = await Vacan.updateMany(
//       {
//         projectId: deletedProject._id,
//         delete_at: null
//       },
//       {
//         $set: {
//           delete_at: deletionDate,
//           last_edited_on: deletionDate,
//           last_edited_by: "Sistema (Borrado de Proyecto)"
//         }
//       }
//     );

//     if (result.modifiedCount > 0) {
//       logger.info(`${result.modifiedCount} vacante(s) activa(s) del proyecto ${deletedProject.name} han sido eliminadas.`);
//     }

//     return {
//       id: id,
//       deleted_at: deletionDate,
//       vacancies_deleted_count: result.modifiedCount
//     };
//   }

//   // --- MÉTODOS PARA PERSONAS ASIGNADAS ---

//   async addAssignedPerson(projectId, personData) {
//     const project = await Project.findById(projectId);
//     if (!project) {
//       throw new AppError('PROJECT_NOT_FOUND');
//     }

//     const collaborator = await Colab.findById(personData.id);
//     if (!collaborator) {
//       throw new AppError(`COLABORADOR_NO_ENCONTRADO: ${personData.id}`);
//     }

//     await Colab.findByIdAndUpdate(
//       personData.id,
//       {
//         $inc: { horasAsignadas: personData.horasAsignadas || 0 },
//         $push: {
//           Proyectos: {
//             projectId: project._id,
//             rol: personData.rol,
//             horasAsignadas: personData.horasAsignadas,
//             seniority: personData.seniority,
//           },
//         },
//       },
//       { new: true }
//     );

//     logger.info(`Colaborador ${collaborator.dni} actualizado: ${personData.horasAsignadas} horas asignadas al proyecto ${project.name}.`);

//     const updatedProject = await Project.findByIdAndUpdate(
//       projectId,
//       { $push: { assignedPersons: personData } },
//       { new: true }
//     );
//     // 2. Sincronizar con Bizneo
//     if (project.bizneoId && collaborator.bizneoId) {
//       try {
//         await assignBizneoUser(collaborator.bizneoId, project.bizneoId);
//       } catch (error) {
//         logger.error(`La asignación en Rubik fue exitosa, pero falló la sincronización con Bizneo para el usuario ${collaborator.bizneoId} en el proyecto ${project.bizneoId}. Error: ${error.message}`);
//       }
//     } else {
//       logger.warn(`Sincronización con Bizneo omitida para la asignación: Faltan IDs (Proyecto: ${project.bizneoId}, Colaborador: ${collaborator.bizneoId})`);
//     }

//     return updatedProject;
//   }

//   async removeAssignedPerson(projectId, personId) {
//     const collaborator = await Colab.findById(personId);
//     if (!collaborator) {
//       throw new AppError(`COLABORADOR_NO_ENCONTRADO: ${personId}`);
//     }

//     const projectAssignment = collaborator.Proyectos.find(
//       p => p.projectId.toString() === projectId
//     );

//     let hoursToReclaim = 0;
//     if (projectAssignment) {
//       hoursToReclaim = projectAssignment.horasAsignadas || 0;
//     } else {
//       logger.warn(`Inconsistencia: El colaborador ID ${personId} no tenía el proyecto ID ${projectId} en su lista. No se descontarán horas.`);
//     }

//     await Colab.updateOne(
//       { _id: personId },
//       {
//         $inc: { horasAsignadas: -hoursToReclaim },
//         $pull: { Proyectos: { projectId: projectId } }
//       }
//     );

//     logger.info(`Colaborador ${collaborator.dni} actualizado: ${hoursToReclaim} horas devueltas. Proyecto ${projectId} desasignado.`);

//     const updatedProject = await Project.findByIdAndUpdate(
//       projectId,
//       { $pull: { assignedPersons: { id: personId } } },
//       { new: true }
//     );

//     if (!updatedProject) {
//       throw new AppError('PROJECT_NOT_FOUND');
//     }

//     logger.info(`Persona con ID ${personId} eliminada del proyecto ${updatedProject.name}`);

//     // 2. Sincronizar con Bizneo
//     if (projectId.bizneoId && collaborator.bizneoId) {
//       try {
//         await removeBizneoUser(collaborator.bizneoId, projectId.bizneoId);
//       } catch(error) {
//         logger.error(`La desasignación en Rubik fue exitosa, pero falló la sincronización con Bizneo para el usuario ${collaborator.bizneoId} en el proyecto ${projectId.bizneoId}. Error: ${error.message}`);
//       }
//     } else {
//         logger.warn(`Sincronización con Bizneo omitida para la desasignación: Faltan IDs (Proyecto: ${projectId.bizneoId}, Colaborador: ${collaborator.bizneoId})`);
//     }


//     return updatedProject;
//   }

//   async updateAssignedPerson(id, personId, fieldsToUpdate) {
//     const setObj = {};
//     for (const key in fieldsToUpdate) {
//       setObj[`assignedPersons.$.${key}`] = fieldsToUpdate[key];
//     }
//     const updatedProject = await Project.findOneAndUpdate({ _id: id, "assignedPersons.id": personId }, { $set: setObj }, { new: true });
//     if (!updatedProject) {
//       throw new AppError('PROJECT_NOT_FOUND');
//     }
//     const collaboratorUpdated = await Colab.findOneAndUpdate(
//       { _id: personId, "Proyectos.projectId": id },
//       {
//         $set: Object.fromEntries(
//           Object.entries(fieldsToUpdate).map(([k, v]) => [`Proyectos.$.${k}`, v])
//         )
//       },
//       { new: true }
//     );
//     console.log(collaboratorUpdated);
//     if (!collaboratorUpdated) {
//       throw new AppError('COLABORADOR_O_PROYECTO_NO_ENCONTRADO');
//     }
//     return updatedProject;
//   }
// }

// module.exports = new ProjectService();


// services/ProjectService.js (versión COMPLETA y FINAL, SIN OMISIONES)
const Project = require("../models/projects");
const Colab = require("../models/collaborator");
const Vacan = require("../models/vacancy");
const logger = require("../config/logger");
const AppError = require('../utils/AppError');
const Technology = require("../models/technologies");

// --- IMPORTS ACTUALIZADOS PARA LA SINCRONIZACIÓN CON BIZNEO ---
const {
  getTaxonById,
  createTaxon,
  assignUsersToTaxon,
  BIZNEO_PUBLIC_SECTOR_ID, // ID del Sector Público
  BIZNEO_PRIVATE_SECTOR_ID // ID del Sector Privado
} = require('./bizneo.service');

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

class ProjectService {

  _calculateContractStatus(project) {
    let alertLevel = null;
    let message = null;
    let daysRemaining = null;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const contractEndDateField = project.endDate;
    if (contractEndDateField) {
      const contractEnd = new Date(contractEndDateField);
      if (!isNaN(contractEnd.getTime())) {
        contractEnd.setHours(0, 0, 0, 0);
        const diffTime = contractEnd.getTime() - today.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        daysRemaining = diffDays;

        if (diffDays <= 30) {
          alertLevel = diffDays < 0 ? "expired" : diffDays === 0 ? "due_today" : "warning";
          message = diffDays < 0 ? `Proyecto vencido hace ${Math.abs(diffDays)} día(s)` : diffDays === 0 ? "Proyecto vence hoy" : `Proyecto vence en ${diffDays} día(s)`;
        } else {
          alertLevel = "on_time";
          message = `Proyecto vigente, vence en ${diffDays} día(s)`;
        }
      }
    }
    return { daysRemaining, alertLevel, message };
  }

  async getAllProjectsWithStatus(searchQuery) {
    const baseFilter = { delete_at: null };
    if (searchQuery) {
      baseFilter.name = { $regex: String(searchQuery).trim(), $options: "i" };
    }


    const projects = await Project.find(baseFilter)
      .collation({ locale: 'es', strength: 2 })
      .sort({ name: 1 });


    const enrichedProjects = projects.map((project) => {
      const contractStatus = this._calculateContractStatus(project);
      return { ...project.toJSON(), contractStatus };
    });
    return enrichedProjects;
  }

  async getProjectById(id) {
    const project = await Project.findById(id);
    if (!project || project.delete_at) {
      throw new AppError('PROJECT_NOT_FOUND');
    }
    const contractStatus = this._calculateContractStatus(project);
    return { ...project.toJSON(), contractStatus };
  }

  // --- FUNCIÓN 'registerProject' COMPLETAMENTE REEMPLAZADA CON LA NUEVA LÓGICA ---
  async registerProject(projectData) {
    const { name, category, assignedPersons = [] } = projectData;

    // Lógica de traducción de Categoría a parentId de Bizneo
    let parentBizneoId;
    if (category && category.toLowerCase() === 'gobierno') {
        parentBizneoId = BIZNEO_PUBLIC_SECTOR_ID;
    } else {
        parentBizneoId = BIZNEO_PRIVATE_SECTOR_ID; // Todo lo demás va a Privado
    }
    logger.info(`Categoría '${category}' mapeada a parentBizneoId: ${parentBizneoId}`);
    
    // 1. Crear en Rubik
    const existingByName = await Project.findOne({ name: projectData.name, delete_at: null });
    if (existingByName) {
      throw new AppError('PROJECT_NAME_ALREADY_EXISTS');
    }
    const savedProject = await new Project(projectData).save();
    logger.info(`Proyecto creado en Rubik: ${name} (ID: ${savedProject.id})`);

    // let bizneoTaxon;
    // try {
    //     // 2. Crear el Taxon anidado en Bizneo
    //     bizneoTaxon = await createTaxon(name, parentBizneoId);
    //     if (!bizneoTaxon || !bizneoTaxon.id) {
    //         throw new Error("La creación del Taxon en Bizneo no devolvió un ID.");
    //     }
        
    //     savedProject.bizneoTaxonId = bizneoTaxon.id;
    //     await savedProject.save();
    //     logger.info(`Proyecto de Rubik sincronizado con Bizneo. Taxon ID: ${bizneoTaxon.id}`);

    //     // 3. Asignar los miembros iniciales a Bizneo
    //     if (assignedPersons.length > 0) {
    //         const collaboratorMongoIds = assignedPersons.map(p => p.id);
    //         const collaborators = await Colab.find({ '_id': { $in: collaboratorMongoIds } }).select('bizneoId').lean();
    //         const bizneoUserIds = collaborators.map(c => c.bizneoId).filter(Boolean);

    //         if (bizneoUserIds.length > 0) {
    //             await assignUsersToTaxon(bizneoTaxon.id, bizneoUserIds);
    //         }
    //     }
    // } catch (error) {
    //     logger.error(`Falló la sincronización con Bizneo para el proyecto '${name}'. El proyecto existe en Rubik pero no en Bizneo. Error: ${error.message}`);
    // }
    return savedProject;
  }

  async registerWithRelations(payload) {
    const {
      project,
      collaborators = [],
      vacancies = [],
    } = payload || {};

    if (!project || !project.name || !project.client) {
      throw new AppError("Faltan datos obligatorios del proyecto (name, client)", 400);
    }

    const proj = await Project.create({ delete_at: null, ...project });
    const collaboratorResults = [];
    for (const c of collaborators) {
      const filter = c.id ? { _id: c.id } : (c.dni ? { dni: c.dni } : null);
      if (!filter) throw new AppError("Cada colaborador debe traer 'id' o 'dni'", 400);

      const current = await Colab.findOne(filter);
      if (!current) throw new AppError("Colaborador no encontrado para actualizar", 404);

      const prevProjectHours = Number(c.prevProjectHours || 0);
      const projectHours = Number(c.projectHours || 0);
      const diff = projectHours - prevProjectHours;

      const updateOps = {
        $set: { last_edited_on: new Date() },
        $inc: { horasAsignadas: diff },
      };

      if (c.name) updateOps.$set.name = c.name;
      if (c.rol) updateOps.$set.rol = c.rol;
      if (c.seniority) updateOps.$set.seniority = c.seniority;

      if (c.assignToProject === true) {
        updateOps.$push = {
          Proyectos: {
            projectId: proj._id,
            rol: c.rol,
            horasAsignadas: projectHours,
            seniority: c.seniority,
          }
        };
      }

      const updated = await Colab.findOneAndUpdate(
        filter,
        updateOps,
        { new: true }
      );

      collaboratorResults.push({
        id: updated._id.toString(),
        diffAplicado: diff,
        horasGlobalesDespues: updated.horasAsignadas,
        projectHoursFinal: projectHours,
      });
    }

    if (!Array.isArray(project.assignedPersons) || project.assignedPersons.length === 0) {
      const persons = collaborators.map(c => ({
        id: c.id,
        name: c.name,
        rol: c.rol,
        seniority: c.seniority,
        horasAsignadas: String(Number(c.projectHours || 0)),
        tecnologias: c.tecnologias || [],
        orderDate: c.orderDate || null,
        startDate: c.startDate || null,
      })).filter(p => p.id);
      if (persons.length) {
        await Project.findByIdAndUpdate(
          proj._id,
          { $push: { assignedPersons: { $each: persons } } },
          { new: true }
        );
      }
    }
    let vacanciesCreated = [];
    if (Array.isArray(vacancies) && vacancies.length) {
      const toInsert = await Promise.all(
        vacancies.map(async (v) => {
          const hours = Number(v.hours ?? v.time ?? 0);
          const skills = await processSkillsForDB(v.skills);
          return {
            projectId: proj._id,
            manager_id: v.manager_id ?? project.managerId ?? null,
            manager_name: v.manager_name ?? project.managerName ?? null,
            vacancieName: v.vacancieName ?? v.name ?? "Sin nombre",
            time: hours,
            orderDate: v.orderDate ?? null,
            startDate: v.startDate ?? null,
            seniority: v.seniority ?? null,
            skills,
          };
        })
      );

      try {
        vacanciesCreated = await Vacan.insertMany(toInsert, { ordered: false });
        logger.info(`${vacanciesCreated.length} vacante(s) creadas para el proyecto ${proj.name}.`);
      } catch (err) {
        const first = err?.writeErrors?.[0]?.err || err;
        logger.error(`Error insertando vacantes: ${first?.errmsg || first?.message || String(err)}`);
        throw new AppError(first?.errmsg || first?.message || 'No se pudieron crear las vacantes', 400);
      }
    }
  }
  
  async updateProject(id, updates) {
    delete updates.id;
    delete updates._id;

    if (Object.prototype.hasOwnProperty.call(updates, 'category') && typeof updates.category === 'string') {
      const cat = updates.category.trim().toLowerCase();
      if (cat === 'gobierno') {
        updates.category = 'Gobierno';
      } else if (cat === 'privado') {
        updates.category = 'Privado';
      } else if (cat === 'inversion') {
        updates.category = 'Inversion';
      }
    }
    
    updates.last_edited_on = new Date();
    const updatedProject = await Project.findOneAndUpdate(
      { _id: id, delete_at: null },
      { $set: updates },
      { new: true, runValidators: true }
    );

    if (!updatedProject) {
      throw new AppError('PROJECT_NOT_FOUND_OR_CANNOT_UPDATE');
    }
    logger.info(`Proyecto actualizado: ${updatedProject.name} (ID: ${id})`);
    return updatedProject;
  }

  async softDeleteProject(id) {
    const deletedProject = await Project.findOneAndUpdate(
      { _id: id, delete_at: null },
      { $set: { delete_at: new Date() } },
      { new: true }
    );

    if (!deletedProject) {
      throw new AppError('PROJECT_NOT_FOUND');
    }

    logger.info(`Proyecto marcado como eliminado: ${deletedProject.name} (ID: ${id})`);
    await Colab.updateMany(
      { "Proyectos.projectId": deletedProject._id },
      { $pull: { Proyectos: { projectId: deletedProject._id } } }
    );
    logger.info(`Personas desasignadas del proyecto ${deletedProject.name}`);

    const deletionDate = deletedProject.delete_at;
    const result = await Vacan.updateMany(
      {
        projectId: deletedProject._id,
        delete_at: null
      },
      {
        $set: {
          delete_at: deletionDate,
          last_edited_on: deletionDate,
          last_edited_by: "Sistema (Borrado de Proyecto)"
        }
      }
    );

    if (result.modifiedCount > 0) {
      logger.info(`${result.modifiedCount} vacante(s) activa(s) del proyecto ${deletedProject.name} han sido eliminadas.`);
    }

    return {
      id: id,
      deleted_at: deletionDate,
      vacancies_deleted_count: result.modifiedCount
    };
  }

  // --- MÉTODO 'addAssignedPerson' REEMPLAZADO CON LÓGICA DE SINCRONIZACIÓN ---
  async addAssignedPerson(rubikProjectId, personData) {
    const personToAddMongoId = personData.id;

    // Lógica original para actualizar en Rubik
    const projectInRubik = await Project.findById(rubikProjectId);
    if (!projectInRubik) throw new AppError('PROJECT_NOT_FOUND');
    const collaborator = await Colab.findById(personToAddMongoId);
    if (!collaborator) throw new AppError(`COLABORADOR_NO_ENCONTRADO: ${personToAddMongoId}`);
    
    await Colab.findByIdAndUpdate(personToAddMongoId, {
        $inc: { horasAsignadas: personData.horasAsignadas || 0 },
        $push: { Proyectos: { projectId: projectInRubik._id, rol: personData.rol, horasAsignadas: personData.horasAsignadas, seniority: personData.seniority } },
      }, { new: true });
    
    const updatedProjectInRubik = await Project.findByIdAndUpdate(rubikProjectId, 
        { $push: { assignedPersons: personData } }, 
        { new: true });
    logger.info(`Persona ${personToAddMongoId} añadida al proyecto ${rubikProjectId} en Rubik.`);

    // Sincronización con Bizneo (Leer, Modificar, Escribir)
    if (projectInRubik.bizneoTaxonId && collaborator.bizneoId) {
        try {
            const currentTaxon = await getTaxonById(projectInRubik.bizneoTaxonId);
            const currentMemberIds = (currentTaxon.taxon_head_employees || []).map(m => m.user_id);

            if (currentMemberIds.includes(collaborator.bizneoId)) {
                logger.warn(`El usuario ${collaborator.bizneoId} ya está en el taxon. No se sincroniza.`);
            } else {
                const newMemberIds = [...currentMemberIds, collaborator.bizneoId];
                await assignUsersToTaxon(projectInRubik.bizneoTaxonId, newMemberIds);
                logger.info(`Usuario ${collaborator.bizneoId} añadido al taxon ${projectInRubik.bizneoTaxonId} y sincronizado.`);
            }
        } catch (error) {
            logger.error(`Falló la sincronización de 'addAssignedPerson' con Bizneo. Error: ${error.message}`);
        }
    } else {
        logger.warn("Sincronización con Bizneo omitida para 'addAssignedPerson': Faltan IDs.");
    }

    return updatedProjectInRubik;
  }

  // --- MÉTODO 'removeAssignedPerson' REEMPLAZADO CON LÓGICA DE SINCRONIZACIÓN ---
  async removeAssignedPerson(rubikProjectId, personToRemoveId) {
    // Lógica original para eliminar en Rubik
    const projectInRubik = await Project.findById(rubikProjectId);
    if (!projectInRubik) throw new AppError('PROJECT_NOT_FOUND');
    const collaborator = await Colab.findById(personToRemoveId);
    if (!collaborator) throw new AppError(`COLABORADOR_NO_ENCONTRADO: ${personToRemoveId}`);

    const projectAssignment = collaborator.Proyectos.find(p => p.projectId.toString() === rubikProjectId);
    let hoursToReclaim = 0;
    if (projectAssignment) {
      hoursToReclaim = projectAssignment.horasAsignadas || 0;
    }

    await Colab.updateOne({ _id: personToRemoveId }, {
        $inc: { horasAsignadas: -hoursToReclaim },
        $pull: { Proyectos: { projectId: rubikProjectId } }
      });
    logger.info(`Colaborador ${collaborator.dni} actualizado en Rubik: ${hoursToReclaim} horas devueltas.`);

    const updatedProjectInRubik = await Project.findByIdAndUpdate(rubikProjectId, 
        { $pull: { assignedPersons: { id: personToRemoveId } } }, 
        { new: true });
    logger.info(`Persona ${personToRemoveId} eliminada del proyecto ${rubikProjectId} en Rubik.`);

    // Sincronización con Bizneo (Leer, Modificar, Escribir)
    if (projectInRubik.bizneoTaxonId && collaborator.bizneoId) {
        try {
            const currentTaxon = await getTaxonById(projectInRubik.bizneoTaxonId);
            const currentMemberIds = (currentTaxon.taxon_head_employees || []).map(m => m.user_id);
            const newMemberIds = currentMemberIds.filter(id => id !== collaborator.bizneoId);
            
            if (newMemberIds.length === currentMemberIds.length) {
                logger.warn(`El usuario ${collaborator.bizneoId} no estaba en el taxon. No se sincroniza la eliminación.`);
            } else {
                await assignUsersToTaxon(projectInRubik.bizneoTaxonId, newMemberIds);
                logger.info(`Usuario ${collaborator.bizneoId} eliminado del taxon ${projectInRubik.bizneoTaxonId} y sincronizado.`);
            }
        } catch (error) {
            logger.error(`Falló la sincronización de 'removeAssignedPerson' con Bizneo. Error: ${error.message}`);
        }
    } else {
        logger.warn("Sincronización con Bizneo omitida para 'removeAssignedPerson': Faltan IDs.");
    }
    
    return updatedProjectInRubik;
  }

  async updateAssignedPerson(id, personId, fieldsToUpdate) {
    const setObj = {};
    for (const key in fieldsToUpdate) {
      setObj[`assignedPersons.$.${key}`] = fieldsToUpdate[key];
    }
    const updatedProject = await Project.findOneAndUpdate({ _id: id, "assignedPersons.id": personId }, { $set: setObj }, { new: true });
    if (!updatedProject) {
      throw new AppError('PROJECT_NOT_FOUND');
    }
    const collaboratorUpdated = await Colab.findOneAndUpdate(
      { _id: personId, "Proyectos.projectId": id },
      {
        $set: Object.fromEntries(
          Object.entries(fieldsToUpdate).map(([k, v]) => [`Proyectos.$.${k}`, v])
        )
      },
      { new: true }
    );
    if (!collaboratorUpdated) {
      throw new AppError('COLABORADOR_O_PROYECTO_NO_ENCONTRADO');
    }
    return updatedProject;
  }
}

module.exports = new ProjectService();
