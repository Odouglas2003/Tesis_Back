// controllers/iaMetrics.js
'use strict'

const Collaborator = require('../models/collaborator');
const Project = require('../models/projects');
const Vacancie = require('../models/vacancy');
const logger = require('../config/logger'); 

const iaMetricsController = {
    getMetricsForAI: async (req, res) => {
        logger.info('Recibida petición en el endpoint de métricas para la IA...');

        try {
            const results = await Promise.allSettled([
                
                Collaborator.countDocuments({ delete_at: null }),
                Project.aggregate([
                    { $match: { delete_at: null } },
                    { $project: { num_assigned: { $size: { $ifNull: ["$assignedPersons", []] } } } }
                ]),
                
            
                Vacancie.countDocuments({ delete_at: null }),
                
                
                Collaborator.aggregate([
                    { $match: { delete_at: null, tecnologias: { $exists: true, $ne: [] } } },
                    { $unwind: "$tecnologias" },
                    { $group: { _id: "$tecnologias", count: { $sum: 1 } } },
                    { $sort: { count: -1 } },
                    { $limit: 5 }
                ])
            ]);

        
            const activeCollaborators = results[0].status === 'fulfilled' ? results[0].value : 'Error al calcular';
            const totalAssignments = results[1].status === 'fulfilled' 
                ? results[1].value.reduce((acc, doc) => acc + doc.num_assigned, 0)
                : 'Error al calcular';

            const activeVacancies = results[2].status === 'fulfilled' ? results[2].value : 'Error';
            
            const techSummary = results[3].status === 'fulfilled' 
                ? results[3].value.map(item => `${item._id} (${item.count} menciones)`) 
                : 'Error al calcular';

            
            const finalMetrics = {
                cantidad_colaboradores_activos: activeCollaborators,
                total_asignaciones_en_proyectos: totalAssignments,
                cantidad_vacantes_abiertas: activeVacancies,
                top_5_tecnologias: techSummary,
            };

            logger.info('Métricas para la IA calculadas exitosamente.');
            console.log('Métricas finales para la IA:', finalMetrics);
            return res.status(200).json(finalMetrics);

        } catch (error) {
            logger.error(`Error catastrófico en getMetricsForAI: ${error}`);
            return res.status(500).send({ message: 'Error interno del servidor al procesar las métricas para la IA.' });
        }
    }
};

module.exports = iaMetricsController;