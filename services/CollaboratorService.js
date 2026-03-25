const Collaborator = require("../models/collaborator");
const logger = require('../config/logger');
const AppError = require('../utils/AppError'); 
class CollaboratorService {

  async getAllCollaborators(searchQuery) {
    const query = { delete_at: null };
    if (searchQuery) {
      const searchRegex = { $regex: String(searchQuery).trim(), $options: "i" };
      query.$or = [{ first_name: searchRegex }, { last_name: searchRegex }, { email: searchRegex }, { dni: searchRegex }];
    }
    return Collaborator.find(query)
      .populate({ path: 'Proyectos.projectId', select: 'id name client' })
      .populate({ path: "jornadaId"})
      .collation({ locale: 'es', strength: 2 })
      .sort({ last_name: 1, first_name: 1 });
  }

  async getCollaboratorById(id) {
    const collaborator = await Collaborator.findById(id).populate('Proyectos.projectId', 'id name client').populate({ path: "jornadaId"});
    if (!collaborator || collaborator.delete_at) {
      throw new AppError('COLLABORATOR_NOT_FOUND');
    }
    return collaborator;
  }

  async registerCollaborator(collaboratorData) {
    const { dni, email } = collaboratorData;
    
    const existingByDni = await Collaborator.findOne({ dni, delete_at: null });
    if (existingByDni) {
      throw new AppError('DNI_ALREADY_EXISTS');
    }
    
    const existingByEmail = await Collaborator.findOne({ email, delete_at: null });
    if (existingByEmail) {
      throw new AppError('EMAIL_ALREADY_EXISTS_COLLABORATOR');
    }
    
    const newCollaborator = new Collaborator(collaboratorData);
    const savedColab = await newCollaborator.save();
    logger.info(`Colaborador registrado: ${savedColab.first_name} (ID: ${savedColab.id})`);
    return savedColab;
  }

  async getSoftDeletedCollaborators({ search = "", limit = 50 } = {}) {
    const today = new Date();
    const fortyFiveDaysAgo = new Date(today.getTime() - (45 * 24 * 60 * 60 * 1000));
    
    const query = {
      $or: [
        // Los que tengan estado Inactivo Y delete_at (sin restricción de tiempo)
        { 
          estado: "Inactivo",
          delete_at: { $ne: null }
        },
        // Los que tengan delete_at hace más de 45 días (cualquier estado)
        { delete_at: { $ne: null, $lt: fortyFiveDaysAgo } }
      ]
    };
    
    if (search) {
      const searchRegex = { $regex: String(search).trim(), $options: "i" };
      query.$and = [
        { $or: query.$or }, // Mantener la lógica original
        {
          $or: [
            { first_name: searchRegex }, 
            { last_name: searchRegex }, 
            { email: searchRegex }, 
            { dni: searchRegex }
          ]
        }
      ];
      delete query.$or; // Eliminar el $or original porque ahora está en $and
    }
    
    return Collaborator.find(query)
      .select('_id first_name last_name email dni estado delete_at bizneoId')
      .sort({ delete_at: -1, last_name: 1, first_name: 1 })
      .limit(Number(limit))
      .lean();
  }

  async restoreCollaborator(id, user) {
    const collaborator = await Collaborator.findById(id);
    
    if (!collaborator) {
      throw new AppError('COLLABORATOR_NOT_FOUND');
    }
    
    if (!collaborator.delete_at) {
      throw new AppError('COLLABORATOR_NOT_SOFT_DELETED', 400, 'El colaborador no está eliminado');
    }
    
    const now = new Date();
    const updates = {
      $set: {
        estado: "Activo",
        fin_contrato: now,
        last_edited_by: (user && (user.username || user.id)) || "restore-api",
        last_edited_on: now
      },
      $unset: { delete_at: 1 }
    };
    
    const restored = await Collaborator.findByIdAndUpdate(id, updates, { new: true })
      .populate('Proyectos.projectId', 'id name client')
      .populate('jornadaId');
    
    logger.info(`Colaborador reestablecido: ${restored.first_name} ${restored.last_name} (ID: ${restored.id}) por ${user?.username || 'sistema'}`);
    return restored;
  }

  async updateCollaborator(id, updates) {
    // Eliminar campos que no deben ser modificados directamente
    delete updates.id; 
    delete updates._id;
    updates.last_edited_on = new Date();

    const updatedColab = await Collaborator.findOneAndUpdate(
      { _id: id, delete_at: null },
      { $set: updates },
      { new: true, runValidators: true }
    ).populate('Proyectos.projectId', 'id name client');

    if (!updatedColab) {
      throw new AppError('COLLABORATOR_NOT_FOUND');
    }
    logger.info(`Colaborador actualizado: ID ${id}`);
    return updatedColab;
  }
  
  // Asumimos que esta función es idéntica a la anterior
  async updateCollaboratorServices(id, updates) {
    delete updates.dni; 
    delete updates.id; 
    delete updates._id;
    updates.last_edited_on = new Date();
    
    const updatedColab = await Collaborator.findOneAndUpdate(
      { _id: id, delete_at: null },
      { $set: updates },
      { new: true, runValidators: true }
    ).populate('Proyectos.projectId', 'id name client');
    
    if (!updatedColab) {
      throw new AppError('COLLABORATOR_NOT_FOUND');
    }
    logger.info(`Colaborador actualizado (servicios): ID ${id}`);
    return updatedColab;
  }

  async softDeleteCollaborator(id) {
    const updatedColab = await Collaborator.findByIdAndUpdate(id, { 
      $set: { 
        delete_at: new Date(),
        estado: "Inactivo"
      } 
    });
    if (!updatedColab) {
      throw new AppError('COLLABORATOR_NOT_FOUND');
    }
    logger.info(`Colaborador eliminado (soft): ID ${id}`);
    return { id };
  }

  async checkContractExpirations() {
    logger.info('Verificando expiración de contratos...');
    return [];
  }

  async removeProyectoFromColaborator(collaboratorId, projectIdToRemove) {
    const collaborator = await Collaborator.findByIdAndUpdate(
      collaboratorId,
      { $pull: { Proyectos: { projectId: projectIdToRemove } } },
      { new: true }
    );
    if (!collaborator) {
      throw new AppError('COLLABORATOR_NOT_FOUND');
    }
    logger.info(`Proyecto ${projectIdToRemove} removido del colaborador ${collaboratorId}`);
    return collaborator;
  }
  
  /**
   * Obtiene una lista de colaboradores, con la capacidad de filtrar por estado de asignación.
   * @param {object} filters - Un objeto que puede contener filtros. Ej: { estadoAsignacion: 'Sobrecargado' }
   * @returns {Promise<Array>}
   */
  async getCollaboratorsWithAssignmentStatus(filters = {}) {
    
    // 1. La pipeline de agregación es la misma que definimos antes.
    let pipeline = [
        // Etapa A: Solo activos
        { $match: { delete_at: { $in: [null, undefined] } } },
        // Etapa B: Unir con 'jornadas'
        {
            $lookup: {
                from: "jornadas",
                localField: "jornadaId",
                foreignField: "_id",
                as: "infoJornada"
            }
        },
        { $unwind: { path: "$infoJornada", preserveNullAndEmptyArrays: true } },
        // Etapa C: Calcular campos
        {
            $addFields: {
                totalHorasAsignadas: { $sum: "$Proyectos.horasAsignadas" },
                horasPorModalidad: { $ifNull: ["$infoJornada.hours", 0] },
                nombreJornada: { $ifNull: ["$infoJornada.name", "Sin Jornada"] }
            }
        },
        // Etapa D: Determinar el estado
        {
            $addFields: {
                estadoAsignacion: {
                    $switch: {
                        branches: [
                            { case: { $eq: ["$totalHorasAsignadas", 0] }, then: "Sin asignación" },
                            { case: { $gt: ["$totalHorasAsignadas", "$horasPorModalidad"] }, then: "Sobreasignado" },
                            { case: { $eq: ["$totalHorasAsignadas", "$horasPorModalidad"] }, then: "Asignado" },
                            { case: { $lt: ["$totalHorasAsignadas", "$horasPorModalidad"] }, then: "Subasignado" }
                        ],
                        default: "Indefinido"
                    }
                }
            }
        }
    ];

    // 2. Lógica condicional para añadir el filtro
    if (filters.estadoAsignacion) {
        pipeline.push({
            $match: { estadoAsignacion: filters.estadoAsignacion }
        });
    }

    // 3. Proyección final
    pipeline.push({
        $project: {
            _id: 1,
            id: "$id",
            first_name: 1,
            last_name: 1,
            email: 1,
            dni: 1,
            estadoAsignacion: 1,
            nombreJornada: 1
            // ... añade otros campos que necesites
        }
    });

    return Collaborator.aggregate(pipeline);
  }
async getCollaboratorsUnified({ search = "", estadoAsignacion = null } = {}) {
  const searchStr = String(search || "").trim();

  const pipeline = [
    // Solo activos (soft delete)
    { $match: { delete_at: { $in: [null, undefined] } } },
  ];

  // 🔎 Búsqueda (nombre, apellido, email, dni numérico como string)
  if (searchStr) {
    const regex = new RegExp(searchStr, "i");
    pipeline.push({
      $match: {
        $or: [
          { first_name: regex },
          { last_name: regex },
          { email: regex },
          {
            $expr: {
              $regexMatch: {
                input: { $toString: "$dni" },
                regex: searchStr,
                options: "i",
              },
            },
          },
        ],
      },
    });
  }

  // Jornada (para horas objetivo)
  pipeline.push(
    {
      $lookup: {
        from: "jornadas",
        localField: "jornadaId",
        foreignField: "_id",
        as: "infoJornada",
      },
    },
    { $unwind: { path: "$infoJornada", preserveNullAndEmptyArrays: true } },

    // Horas asignadas / objetivo
    {
      $addFields: {
        // Si Proyectos es null/undefined, que sume 0
        totalHorasAsignadas: {
          $sum: {
            $ifNull: ["$Proyectos.horasAsignadas", []],
          },
        },
        horasPorModalidad: { $ifNull: ["$infoJornada.hours", 0] },
        nombreJornada: { $ifNull: ["$infoJornada.name", "Sin Jornada"] },
      },
    },

    // Estado de asignación
    {
      $addFields: {
        estadoAsignacion: {
          $switch: {
            branches: [
              { case: { $eq: ["$totalHorasAsignadas", 0] }, then: "Sin asignar" },
              {
                case: { $gt: ["$totalHorasAsignadas", "$horasPorModalidad"] },
                then: "Sobreasignado",
              },
              {
                case: { $eq: ["$totalHorasAsignadas", "$horasPorModalidad"] },
                then: "Asignado",
              },
              {
                case: { $lt: ["$totalHorasAsignadas", "$horasPorModalidad"] },
                then: "Subasignado",
              },
            ],
            default: "Indefinido",
          },
        },
      },
    }
  );

  // 🎯 Filtro por estado de asignación (opcional)
  if (estadoAsignacion) {
    pipeline.push({ $match: { estadoAsignacion } });
  }

  // 🔗 Lookup de Projects para poblar Proyectos.projectId (id, name, client)
  pipeline.push(
    {
      $lookup: {
        from: "projects",
        localField: "Proyectos.projectId",
        foreignField: "_id",
        as: "projectsInfo",
      },
    },
    // Remapeamos Proyectos para incrustar el objeto del project
    {
      $addFields: {
        Proyectos: {
          $map: {
            input: { $ifNull: ["$Proyectos", []] },
            as: "p",
            in: {
              $mergeObjects: [
                "$$p",
                {
                  projectId: {
                    $let: {
                      vars: {
                        m: {
                          $first: {
                            $filter: {
                              input: "$projectsInfo",
                              as: "pi",
                              cond: { $eq: ["$$pi._id", "$$p.projectId"] },
                            },
                          },
                        },
                      },
                      in: {
                        _id: "$$m._id",
                        id: { $toString: "$$m._id" },
                        name: "$$m.name",
                        client: "$$m.client",
                      },
                    },
                  },
                },
              ],
            },
          },
        },
      },
    },

    // Alias útiles y id string
    {
      $addFields: {
        id: { $toString: "$_id" },
        horasAsignadas: { $ifNull: ["$totalHorasAsignadas", 0] },
      },
    },

    // 🎯 Proyección final AMPLIA (incluye lo que pediste)
    {
      $project: {
        _id: 0,
        id: 1,

        // Identificación y estado laboral
        bizneoId: 1,
        estado: 1,
        delete_at: 1,
        created_at: 1,
        last_edited_on: 1,
        last_edited_by: 1,

        // Persona
        first_name: 1,
        last_name: 1,
        email: 1,
        dni: 1,
        image: 1,
        tecnologias: 1,
        roles: 1,
        observacion: 1,
        honorarios: 1,

        // Contrato
        start_contrato: 1,
        fin_contrato: 1,

        // Jornada: devolvemos el objeto poblado con id string
        jornadaId: {
          $cond: [
            { $gt: [{ $type: "$infoJornada" }, "missing"] },
            {
              $mergeObjects: [
                "$infoJornada",
                { id: { $toString: "$infoJornada._id" } },
              ],
            },
            null,
          ],
        },
        nombreJornada: 1,

        // Proyectos
        Proyectos: 1,

        // Métricas de asignación
        horasAsignadas: 1,
        estadoAsignacion: 1,
      },
    },

    // Orden alfabético
    { $sort: { last_name: 1, first_name: 1 } }
  );

  // Collation para acentos/orden es-ES
  const result = await Collaborator.aggregate(pipeline).collation({
    locale: "es",
    strength: 2,
  });
  return result;
}


}

module.exports = new CollaboratorService();