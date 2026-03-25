
const { calcularMetricasDashboard,dashboardService } = require('../services/dashboard.service');


exports.getDashboardMetrics = async (req, res) => {
  try {
    console.log("Controlador: Llamando al servicio 'calcularMetricasDashboard'..."); 

    const metricas = await calcularMetricasDashboard();
    
   
    
    res.status(200).json(metricas);

  } catch (error) {
    
    console.error("Error en el controlador del dashboard:", error);
    res.status(500).json({ 
        message: "Ocurrió un error al calcular las métricas del dashboard.",
        error: error.message 
    });
  }
};

exports.getCollaboratorListByStatus = async (req, res) => {
    try {
        
        const { estado } = req.query;
        
        if (!estado) {
            return res.status(400).send({ message: "El parámetro 'estado' es requerido." });
        }

        const lista = await dashboardService.obtenerListaColaboradoresPorEstado(estado);
        return res.status(200).send(lista);

    } catch (error) {
        console.error("Error en el controlador getCollaboratorListByStatus:", error);
        return res.status(500).send({ message: "Error al obtener la lista de colaboradores." });
    }
};