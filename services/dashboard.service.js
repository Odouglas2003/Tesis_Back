


const Collaborator = require('../models/collaborator');
const Project = require('../models/projects');
const Vacancie = require('../models/vacancy');
const Technology = require('../models/technologies'); 
//const Jornada = require('../models/jornada');

const calcularMetricasDashboard = async () => {
    const [
        metricasClave,
        contratacionesMensuales,
        estadoDeProyectos,
        estadoDeAsignacion, 
        tecnologiasTop,
        personasPorProyecto
    ] = await Promise.all([
        obtenerMetricasClave(),
        obtenerContratacionesMensuales(),
        obtenerEstadoDeProyectos(),
        obtenerEstadoDeAsignacion(), 
        obtenerTecnologiasTop(15),
        obtenerPersonasPorProyecto(12)
    ]);

    return {
        metricasClave,
        contratacionesMensuales,
        estadoDeProyectos,
        estadoDeAsignacion,
        tecnologiasTop,
        personasPorProyecto
    };
};


const obtenerMetricasClave = async () => {
    
    const filtroEntidadesActivas = { delete_at: { $in: [null, undefined] } };

    const [
        totalColaboradores,
        proyectosActivos,
        vacantesActivas,
        totalTecnologias
    ] = await Promise.all([
        Collaborator.countDocuments(filtroEntidadesActivas),
        Project.countDocuments(filtroEntidadesActivas),
        Vacancie.countDocuments(filtroEntidadesActivas),
        Technology.countDocuments()
    ]);
    return { totalColaboradores, proyectosActivos, vacantesActivas, totalTecnologias };
};


const obtenerContratacionesMensuales = async () => {
    const hoy = new Date();
    const fechaInicio = new Date(hoy.getFullYear() - 1, hoy.getMonth(), 1);

    const contratacionesPorMes = await Collaborator.aggregate([
        { $match: { start_contrato: { $gte: fechaInicio } } },
        { $group: { 
            _id: { $dateToString: { format: "%Y-%m", date: "$start_contrato" } },
            cantidad: { $sum: 1 }
        }},
        { $sort: { _id: 1 } }
    ]);

    const datosGrafico = [];
    const mapaContrataciones = new Map(contratacionesPorMes.map(item => [item._id, item.cantidad]));

    for (let i = 0; i < 12; i++) {
        const mesActual = new Date(hoy.getFullYear(), hoy.getMonth() - i, 1);
        const mesFormateado = `${mesActual.getFullYear()}-${String(mesActual.getMonth() + 1).padStart(2, '0')}`;
        
        datosGrafico.push({
            mes: mesFormateado,
            nuevasContrataciones: mapaContrataciones.get(mesFormateado) || 0
        });
    }
    
    datosGrafico.sort((a, b) => a.mes.localeCompare(b.mes));

    return {
        titulo: "Contrataciones por Mes (Últimos 12 meses)",
        datos: datosGrafico
    };
};


const obtenerEstadoDeProyectos = async () => {
    const resultado = await Project.aggregate([
        { $group: { 
            _id: { 
                $cond: {
                    if: { $ne: [{ $ifNull: ["$delete_at", null] }, null] },
                    then: "Finalizado",
                    else: "$status"
                }
             },
            cantidad: { $sum: 1 }
        }}
    ]);
    const porEstado = resultado.reduce((acumulador, item) => {
        if (item._id) {
            acumulador[item._id] = item.cantidad;
        }
        return acumulador;
    }, {});
    const total = resultado.reduce((suma, item) => suma + item.cantidad, 0);
   
    return { total, porEstado };
};





const obtenerEstadoDeAsignacion = async () => {

    

    
    const pipelineProduccion = [
        { $match: { delete_at: { $in: [null, undefined] } } },
        
        {
            $lookup: {
                from: "jornadas",
                localField: "jornadaId",
                foreignField: "_id",
                as: "infoJornada"
            }
        },
        { $unwind: { path: "$infoJornada", preserveNullAndEmptyArrays: true } },
    
        {
            $addFields: {
                totalHorasAsignadas: { $sum: "$Proyectos.horasAsignadas" },
                
                // Las horas asignadas a proyectos son semanales: capacidad = jornada diaria x 5 dias
                horasPorModalidad: { $multiply: [{ $ifNull: ["$infoJornada.hours", 0] }, 5] }
            }
        },
        
        {
            $group: {
                _id: {
                    $switch: {
                        branches: [
                            { case: { $eq: ["$totalHorasAsignadas", 0] }, then: "Sin asignación" },
                            { case: { $gt: ["$totalHorasAsignadas", "$horasPorModalidad"] }, then: "Sobreasignado" },
                            { case: { $eq: ["$totalHorasAsignadas", "$horasPorModalidad"] }, then: "Asignado" },
                            { case: { $lt: ["$totalHorasAsignadas", "$horasPorModalidad"] }, then: "Subasignado" }
                        ],
                        default: "Indefinido"
                    }
                },
                cantidad: { $sum: 1 }
            }
        }
    ];
    
    const resultado = await Collaborator.aggregate(pipelineProduccion);

    
    const porEstado = resultado.reduce((acumulador, item) => {
        if (item._id !== "Indefinido") {
            acumulador[item._id] = item.cantidad;
        }
        return acumulador;
    }, {});
    
    const total = await Collaborator.countDocuments({ delete_at: { $in: [null, undefined] } });
    
    return { total, porEstado };
};

const obtenerTecnologiasTop = async (limite = 15) => {
    const resultado = await Collaborator.aggregate([
        { $match: { estado: { $regex: /activo/i } } },
        { $unwind: "$tecnologias" },
        { $group: { _id: "$tecnologias", cantidad: { $sum: 1 } } },
        { $sort: { cantidad: -1 } },
        { $limit: limite },
        { $project: { _id: 0, nombre: "$_id", cantidad: "$cantidad" } }
    ]);
    return resultado;
};

const obtenerPersonasPorProyecto = async (limite = 12) => {
  const resultado = await Project.aggregate([
    { $match: { delete_at: { $in: [null, undefined] } } },
    { $project: {
        nombre: "$name",
        cantidad: {
          $add: [
            { $size: { $ifNull: ["$assignedPersons", []] } },
            { $cond: [{ $ifNull: ["$manager", false] }, 1, 0] }
          ]
        }
    }},
    { $sort: { cantidad: -1 } },
    { $limit: limite }
  ]);
  return resultado;
};

/**
 
 * @param {string} estado 
 * @returns {Promise<Array>}
 */
const obtenerListaColaboradoresPorEstado = async (estado) => {
    const pipeline = [
        // 1. Filtrar solo por colaboradores activos
        { $match: { delete_at: { $in: [null, undefined] } } },

        // 2. Unir con la colección 'jornadas' para obtener los datos de la jornada
        {
            $lookup: {
                from: "jornadas",
                localField: "jornadaId",
                foreignField: "_id",
                as: "infoJornada"
            }
        },
        
        // 3. Convertir el array de la unión en un objeto para fácil acceso
        { 
            $unwind: { 
                path: "$infoJornada", 
                preserveNullAndEmptyArrays: true 
            } 
        },

        // 4. Calcular campos dinámicos
        {
            $addFields: {
                totalHorasAsignadas: { $sum: "$Proyectos.horasAsignadas" },
                // Tomamos las horas del documento de la jornada unida
                // Las horas asignadas a proyectos son semanales: capacidad = jornada diaria x 5 dias
                horasPorModalidad: { $multiply: [{ $ifNull: ["$infoJornada.hours", 0] }, 5] }
            }
        },

        // 5. Determinar el estado de asignación para CADA colaborador
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
                        default: "Indefindo"
                    }
                }
            }
        },

        // 6. Filtrar la lista para que coincida con el estado que nos pasaron como parámetro
        { $match: { estadoAsignacion: estado } },
        
        // 7. Seleccionar y formatear los campos que queremos devolver al frontend
        {
            $project: {
                _id: 0,
                id: "$id",
                nombre: { $concat: ["$first_name", " ", "$last_name"] },
                email: "$email",
                jornada: { $ifNull: ["$infoJornada.name", "Sin Jornada"] },
                horasContrato: "$horasPorModalidad",
                horasAsignadas: "$totalHorasAsignadas"
            }
        }
    ];
    console.log(JSON.stringify(pipeline, null, 2));
    return Collaborator.aggregate(pipeline);
};
module.exports = {
    calcularMetricasDashboard,
    obtenerListaColaboradoresPorEstado
};