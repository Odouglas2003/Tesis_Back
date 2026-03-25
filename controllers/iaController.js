
const IaService = require('../services/IaService');
const ExcelJS = require('exceljs');
const mongoose = require('mongoose'); 


const recommendTeam = async (req, res, next) => {
    try {
        console.log('Received recommendation request (RAW STRING):', JSON.stringify(req.body, null, 2));
        const recommendationRequest = req.body;
       
       
        if (!recommendationRequest.request_details) {
            const error = new Error("El campo 'request_details' es requerido.");
            error.statusCode = 400; 
            throw error;
        }
        
        if (!recommendationRequest.request_details.start_date) {
            const error = new Error("El campo 'start_date' dentro de 'request_details' es requerido.");
            error.statusCode = 400;
            throw error;
        }

        
        if (!recommendationRequest.positions_requested || !Array.isArray(recommendationRequest.positions_requested) || recommendationRequest.positions_requested.length === 0) {
            const error = new Error("El campo 'positions_requested' es requerido y debe ser un array con al menos una posición.");
            error.statusCode = 400;
            throw error;
        }

        
        const teamRecommendation = await IaService.recommendProjectTeam(recommendationRequest);

        console.log('Received recommendation request (RAW STRING):', JSON.stringify(teamRecommendation, null, 2));
       
        
        res.status(200).json({
            status: 'success',
            message: 'Recomendación de equipo generada exitosamente.',
            data: teamRecommendation
        });

    } catch (error) {
        
        next(error);
    }
};
const analyticsQuery = async (req, res, next) => {
  try {
    const { query, text } = req.body || {};
    const q = (typeof text === "string" && text) || (typeof query === "string" && query);

    if (!q || !q.trim()) {
      const error = new Error('El campo "query" (o "text") es requerido y debe ser string.');
      error.statusCode = 400;
      throw error;
    }

    const result = await IaService.analyticsQuery({ query: q.trim() });
    
    if (result?.error) {
    return res.status(200).json({
    ...result,
    warning: "La consulta no fue no es valida"
     });
    }
    if (Array.isArray(result.results) && result.results.length === 0) {
      result.warning =
        "No se encontraron resultados para tu consulta. La almacenaremos para entrenar mejor a la IA"
         "en su próxima versión.";
    }

    return res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

const triggerFaissUpdate = async (req, res, next) => {
  try {
    const { item_id, itemId } = req.body || {};
    const id = item_id || itemId;
    if (!id) {
      const error = new Error('El campo "item_id" es requerido.');
      error.statusCode = 400;
      throw error;
    }
    const data = await IaService.triggerFaissUpdate(id);
    return res.status(200).json({ status: "success", data });
  } catch (error) {
    next(error);
  }
};



const exportAnalyticsReport = async (req, res, next) => {
  try {
    const { query } = req.body;
    if (!query || !query.trim()) {
      return res.status(400).json({ message: 'El campo "query" es requerido.' });
    }

    const responseFromIA = await IaService.analyticsQuery({ query: query.trim() });
    const results = responseFromIA.results || [];
    const collection = responseFromIA.collection;

    if (!Array.isArray(results) || results.length === 0) {
      return res.status(404).json({ message: 'No hay resultados.' });
    }

    const workbook = new ExcelJS.Workbook();
    const ws = workbook.addWorksheet('Reporte');

    let rows = [];
    let headers = [];

    if (collection === "projects") {
      headers = [
        "Proyecto",
        "Cliente",
        "Estado",
        "Tipo",
        "Categoría",
        "Inicio",
        "Fin",
        "Manager",
        "Persona Asignada",
        "Rol",
        "Seniority",
        "Tecnologías",
        "Horas Asignadas",
        "Editado por",
        "Editado el"
      ];

      results.forEach(project => {
        if (project.assignedPersons?.length > 0) {
          project.assignedPersons.forEach(p => {
            rows.push({
              "Proyecto": project.name,
              "Cliente": project.client,
              "Estado": project.status,
              "Tipo": project.projectType,
              "Categoría": project.category,
              "Inicio": project.startDate,
              "Fin": project.endDate,
              "Manager": project.managerName,
              "Persona Asignada": p.name,
              "Rol": p.rol,
              "Seniority": p.seniority,
              "Tecnologías": p.tecnologias?.join(", "),
              "Horas Asignadas": p.horasAsignadas,
              "Editado por": project.last_edited_by,
              "Editado el": project.last_edited_on
            });
          });
        } else {
          rows.push({
            "Proyecto": project.name,
            "Cliente": project.client,
            "Estado": project.status,
            "Tipo": project.projectType,
            "Categoría": project.category,
            "Inicio": project.startDate,
            "Fin": project.endDate,
            "Manager": project.managerName,
            "Persona Asignada": "(sin asignar)",
            "Rol": "",
            "Seniority": "",
            "Tecnologías": "",
            "Horas Asignadas": "",
            "Editado por": project.last_edited_by,
            "Editado el": project.last_edited_on
          });
        }
      });

    }

    else if (collection === "collaborator") {
      headers = [
        "Proyecto",
        "Nombre",
        "Rol",
        "Seniority",
        "Tecnologías",
        "Horas Asignadas",
        "Email",
        "Estado",
        "Inicio Contrato",
        "Fin Contrato",
        "Creado",
        "Editado por",
        "Editado el"
      ];

      const projectIds = results.flatMap(c => c.Proyectos?.map(p => p.projectId));
      const uniqueIds = [...new Set(projectIds)];
      const projectDocs = await mongoose.connection.db.collection("projects")
        .find({ _id: { $in: uniqueIds.map(id => new mongoose.Types.ObjectId(id)) } })
        .toArray();

      const projectMap = new Map(projectDocs.map(p => [p._id.toString(), p.name]));

      results.forEach(col => {
        if (col.Proyectos?.length > 0) {
          col.Proyectos.forEach(a => {
            rows.push({
              "Proyecto": projectMap.get(a.projectId) || "(ID sin nombre)",
              "Nombre": `${col.first_name} ${col.last_name}`,
              "Rol": a.rol,
              "Seniority": a.seniority,
              "Tecnologías": col.tecnologias?.join(", "),
              "Horas Asignadas": a.horasAsignadas,
              "Email": col.email,
              "Estado": col.estado,
              "Inicio Contrato": col.start_contrato,
              "Fin Contrato": col.fin_contrato,
              "Creado": col.created_at,
              "Editado por": col.last_edited_by,
              "Editado el": col.last_edited_on
            });
          });
        } else {
          rows.push({
            "Proyecto": "(Sin asignación)",
            "Nombre": `${col.first_name} ${col.last_name}`,
            "Rol": col.roles?.[0]?.rol,
            "Seniority": col.roles?.[0]?.seniority,
            "Tecnologías": col.tecnologias?.join(", "),
            "Email": col.email,
            "Estado": col.estado,
            "Inicio Contrato": col.start_contrato,
            "Fin Contrato": col.fin_contrato,
            "Creado": col.created_at,
            "Editado por": col.last_edited_by,
            "Editado el": col.last_edited_on
          });
        }
      });

    }

    ws.columns = headers.map(h => ({ header: h, key: h, width: 30 }));

    
    const headerRow = ws.getRow(1);
    headerRow.font = { bold: true, color: { argb: "FFFFFFFF" } };
    headerRow.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF4F81BD" } };

    
    rows.forEach(r => ws.addRow(r));

    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition", `attachment; filename="reporte_${collection}.xlsx"`);

    await workbook.xlsx.write(res);
    res.end();

  } catch (err) {
    next(err);
  }
};



module.exports = {
    recommendTeam,
    analyticsQuery,
    exportAnalyticsReport,
    triggerFaissUpdate
};