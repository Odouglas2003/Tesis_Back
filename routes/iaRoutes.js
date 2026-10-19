
const express = require('express');
const router = express.Router();
const iaController = require('../controllers/iaController');

const axios = require('axios');
const logger = require('../config/logger');
const auth = require('../middlewares/auth');
const VacancieService = require('../services/VacancieService');
const ProjectService = require('../services/ProjectService');
const Collaborator = require('../models/collaborator');
const Project = require('../models/projects');
const Notification = require('../models/notification');
const JarvisConversation = require('../models/jarvisConversation');
const JarvisActionLog = require('../models/jarvisActionLog');


require("dotenv").config();

const getOwnerKey = (req) => {
  if (req.user?._id) return `user:${req.user._id}`;
  const raw = String(req.body?.conversationId || req.query?.conversationId || '').trim();
  return `session:${raw.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 100) || 'anonymous'}`;
};


router.post('/recommend-team',[auth.ensureAuth, auth.hasRole(['administrador','manager'])], iaController.recommendTeam);


// Estado del motor de IA. Siempre responde 200 para que el frontend pueda
// consultar repetidamente mientras el servicio gratuito de Render se despierta.
router.get('/status', [auth.ensureAuth], async (req, res) => {
  const AI_ENGINE_BASE_URL = process.env.AI_ENGINE_BASE_URL;
  if (!AI_ENGINE_BASE_URL) {
    return res.status(200).json({ ready: false, reason: 'not_configured' });
  }
  try {
    await axios.get(`${AI_ENGINE_BASE_URL}/`, { timeout: 8000 });
    return res.status(200).json({ ready: true });
  } catch (error) {
    return res.status(200).json({ ready: false, upstreamStatus: error.response?.status || null });
  }
});

router.post('/chat', [auth.ensureAuth], async (req, res) => {
  
  const { message, history = [] } = req.body;

  if (!message) {
    return res.status(400).json({ error: 'Falta el campo "message" en el cuerpo de la petición.' });
  }

  logger.info(`(HTTP Chat) Mensaje para la IA: "${message}"`);

  const AI_ENGINE_BASE_URL = process.env.AI_ENGINE_BASE_URL;
  
  if (!AI_ENGINE_BASE_URL) {
    logger.error("FATAL: La variable de entorno AI_ENGINE_BASE_URL no está definida.");
    return res.status(500).json({ error: "Error de configuración del servidor: no se encontró la URL del motor de IA." });
  }

  try {
    
    logger.info(`(HTTP Chat) Enviando a la IA en: ${AI_ENGINE_BASE_URL}`);
    const ownerKey = getOwnerKey(req);
    const savedConversation = await JarvisConversation.findOne({ ownerKey }).lean();
    const clientHistory = Array.isArray(history)
      ? history.slice(-10).map((item) => ({
          role: item.autor === 'assistant' ? 'assistant' : 'user',
          content: String(item.texto || '').slice(0, 4000)
        })).filter((item) => item.content)
      : [];
    const chatHistory = savedConversation?.messages?.length
      ? savedConversation.messages.slice(-10).map(({ role, content }) => ({ role, content }))
      : clientHistory;

    const aiResponse = await axios.post(`${AI_ENGINE_BASE_URL}/chat/`, {
      query: message,
      chat_history: chatHistory
    });

    const respuestaDeIA = aiResponse.data; 
    logger.info(`(HTTP Chat) Respuesta recibida de la IA: ${JSON.stringify(respuestaDeIA)}`);

  
    await JarvisConversation.findOneAndUpdate(
      { ownerKey },
      {
        $push: { messages: { $each: [
          { role: 'user', content: String(message).slice(0, 8000) },
          { role: 'assistant', content: String(respuestaDeIA.answer || '').slice(0, 8000) }
        ], $slice: -50 } },
        $set: { updatedAt: new Date() }
      },
      { upsert: true, new: true }
    );
    return res.status(200).json(respuestaDeIA);

  } catch (error) {
    
    if (error.response) {
      logger.error(`Error del Motor de IA: ${error.response.status} - ${JSON.stringify(error.response.data)}`);
      // No reenviar 401/403 del motor: el frontend los interpreta como sesión vencida y cierra la sesión.
      const upstreamStatus = error.response.status;
      const status = upstreamStatus === 401 || upstreamStatus === 403 ? 502 : upstreamStatus;
      return res.status(status).json({
        error: "El motor de IA respondió con un error.",
        upstreamStatus,
      });
    } else {
      logger.error(`Error de red al conectar con la IA: ${error.message}`);
      return res.status(503).json({ error: "No se pudo conectar con el servicio de IA." });
    }
  }
});

router.post('/speech', [auth.ensureAuth], async (req, res) => {
  const text = String(req.body?.text || '').trim();
  if (!text || text.length > 4000) {
    return res.status(400).json({ error: 'El texto para voz no es válido.' });
  }
  try {
    const response = await axios.post(`${process.env.AI_ENGINE_BASE_URL}/speech/`, { text }, {
      responseType: 'arraybuffer',
      timeout: 60000,
      headers: { 'Content-Type': 'application/json' }
    });
    res.setHeader('Content-Type', 'audio/mpeg');
    res.setHeader('Cache-Control', 'no-store');
    return res.send(Buffer.from(response.data));
  } catch (error) {
    logger.error(`Error generando voz neuronal: ${error.message}`);
    return res.status(502).json({ error: 'La voz neuronal no está disponible.' });
  }
});

router.get('/chat/history', [auth.ensureAuth], async (req, res, next) => {
  try {
    const conversation = await JarvisConversation.findOne({ ownerKey: getOwnerKey(req) }).lean();
    return res.json({ messages: conversation?.messages || [] });
  } catch (error) { next(error); }
});

router.delete('/chat/history', [auth.ensureAuth], async (req, res, next) => {
  try {
    await JarvisConversation.deleteOne({ ownerKey: getOwnerKey(req) });
    return res.json({ status: 'success' });
  } catch (error) { next(error); }
});

router.get('/actions/history', [auth.ensureAuth], async (req, res, next) => {
  try {
    const actions = await JarvisActionLog.find({ ownerKey: getOwnerKey(req) }).sort({ createdAt: -1 }).limit(20).lean();
    return res.json({ actions });
  } catch (error) { next(error); }
});

router.post('/actions/execute', [auth.ensureAuth, auth.hasRole(['administrador','manager'])], async (req, res, next) => {
  try {
    const action = req.body?.action;
    const allowedActions = [
      'create_vacancy', 'create_project', 'assign_collaborator',
      'remove_assignment', 'close_vacancy', 'update_project', 'create_notification'
    ];
    if (!action || !allowedActions.includes(action.type)) {
      return res.status(400).json({ error: 'Acción no permitida.' });
    }

    const actionOwnerKey = getOwnerKey(req);
    res.once('finish', () => {
      JarvisActionLog.create({
        ownerKey: actionOwnerKey,
        actionType: action.type,
        title: String(action.title || action.type),
        payload: action.payload || {},
        status: res.statusCode >= 200 && res.statusCode < 300 ? 'success' : 'error',
        message: res.statusCode >= 200 && res.statusCode < 300 ? 'Acción completada' : `Error HTTP ${res.statusCode}`,
        createdAt: new Date()
      }).catch((error) => logger.error(`No se pudo auditar la acción JARVIS: ${error.message}`));
    });

    const source = action.payload || {};
    const editedBy = req.user?.email || req.user?.name || 'JARVIS';

    if (action.type === 'close_vacancy') {
      const vacancyId = String(source.vacancyId || '').trim();
      if (!vacancyId) return res.status(400).json({ error: 'Falta el ID de la vacante.' });
      const updated = await VacancieService.updateVacancy(vacancyId, { status: 'Finalizada', last_edited_by: editedBy, last_edited_on: new Date() });
      return res.status(200).json({ status: 'success', message: `Vacante "${source.name || vacancyId}" cerrada correctamente.`, data: updated });
    }

    if (action.type === 'remove_assignment') {
      const projectId = String(source.projectId || '').trim();
      const collaboratorId = String(source.collaboratorId || '').trim();
      if (!projectId || !collaboratorId) return res.status(400).json({ error: 'Faltan IDs para quitar la asignación.' });
      const updated = await ProjectService.removeAssignedPerson(projectId, collaboratorId);
      return res.status(200).json({ status: 'success', message: `${source.name || 'El colaborador'} fue quitado del proyecto.`, data: updated });
    }

    if (action.type === 'update_project') {
      const projectId = String(source.projectId || '').trim();
      const requested = source.changes && typeof source.changes === 'object' ? source.changes : {};
      const changes = {};
      for (const field of ['status', 'endDate', 'description', 'budget']) {
        if (Object.prototype.hasOwnProperty.call(requested, field)) changes[field] = requested[field];
      }
      if (!projectId || Object.keys(changes).length === 0) return res.status(400).json({ error: 'No hay cambios válidos para aplicar.' });
      if (changes.budget !== undefined && (!Number.isFinite(Number(changes.budget)) || Number(changes.budget) < 0)) return res.status(400).json({ error: 'El presupuesto no es válido.' });
      changes.last_edited_by = editedBy;
      changes.last_edited_on = new Date();
      const updated = await Project.findOneAndUpdate({ _id: projectId, delete_at: null }, { $set: changes }, { new: true, runValidators: true });
      if (!updated) return res.status(404).json({ error: 'Proyecto no encontrado.' });
      return res.status(200).json({ status: 'success', message: `Proyecto "${source.name || updated.name}" actualizado correctamente.`, data: updated });
    }

    if (action.type === 'create_notification') {
      const recipients = Array.isArray(source.recipients) ? source.recipients.map(String).filter(Boolean) : [];
      const alertLevel = ['info', 'warning', 'expired'].includes(source.alertLevel) ? source.alertLevel : 'info';
      const message = String(source.message || '').trim();
      if (!message || recipients.length === 0) return res.status(400).json({ error: 'La notificación necesita mensaje y destinatarios.' });
      const created = await Notification.create({ type: 'jarvis', referenceId: String(source.referenceId || 'jarvis'), message, alertLevel, recipients, sentAt: new Date(), readers: [] });
      return res.status(201).json({ status: 'success', message: 'Notificación interna creada correctamente.', data: created });
    }

    if (action.type === 'create_project') {
      if (req.user && req.user.rol !== 'administrador') {
        return res.status(403).json({ error: 'Solo un administrador puede crear proyectos.' });
      }
      const project = {
        name: String(source.name || '').trim(), client: String(source.client || '').trim(),
        managerId: String(source.managerId || '').trim(), managerName: String(source.managerName || '').trim(),
        managerVisibleInOrgChart: true, status: String(source.status || '').trim(),
        projectType: String(source.projectType || '').trim(), startDate: source.startDate,
        endDate: source.endDate, category: String(source.category || '').trim(),
        description: String(source.description || '').trim(), budget: Number(source.budget || 0),
        assignedPersons: [], ia_generated: true, last_edited_by: editedBy, last_edited_on: new Date()
      };
      const required = ['name', 'client', 'managerId', 'managerName', 'status', 'projectType', 'startDate', 'endDate', 'category'];
      if (required.some((field) => !project[field]) || new Date(project.endDate) < new Date(project.startDate)) {
        return res.status(400).json({ error: 'La propuesta del proyecto tiene datos inválidos.' });
      }
      const created = await ProjectService.registerProject(project);
      return res.status(201).json({ status: 'success', message: `Proyecto "${project.name}" creado correctamente.`, data: created });
    }

    if (action.type === 'assign_collaborator') {
      const projectId = String(source.projectId || '').trim();
      const person = {
        id: String(source.id || '').trim(), name: String(source.name || '').trim(),
        rol: String(source.rol || '').trim(), seniority: String(source.seniority || '').trim(),
        horasAsignadas: Number(source.horasAsignadas),
        tecnologias: Array.isArray(source.tecnologias) ? source.tecnologias.map(String) : []
      };
      if (!projectId || !person.id || !person.name || !person.rol || !person.seniority || !Number.isFinite(person.horasAsignadas) || person.horasAsignadas <= 0) {
        return res.status(400).json({ error: 'La asignación tiene datos obligatorios inválidos.' });
      }
      const [projectExists, collaborator] = await Promise.all([
        Project.findById(projectId), Collaborator.findById(person.id)
      ]);
      if (!projectExists || !collaborator) {
        return res.status(404).json({ error: 'No se encontró el proyecto o colaborador.' });
      }
      if (projectExists.assignedPersons.some((item) => String(item.id) === person.id)) {
        return res.status(409).json({ error: 'El colaborador ya está asignado a este proyecto.' });
      }
      const assignedHours = (collaborator.Proyectos || []).reduce((total, item) => total + Number(item.horasAsignadas || 0), 0);
      if (assignedHours + person.horasAsignadas > 40) {
        return res.status(409).json({ error: `La asignación supera las 40 horas semanales (disponibles: ${Math.max(0, 40 - assignedHours)}).` });
      }
      const updated = await ProjectService.addAssignedPerson(projectId, person);
      return res.status(200).json({ status: 'success', message: `${person.name} fue asignado al proyecto correctamente.`, data: updated });
    }

    const payload = {
      vacancieName: String(source.vacancieName || '').trim(),
      time: Number(source.time),
      orderDate: source.orderDate,
      startDate: source.startDate,
      seniority: String(source.seniority || '').trim(),
      description: String(source.description || '').trim(),
      status: 'Abierta',
      skills: [],
      last_edited_by: editedBy,
      last_edited_on: new Date()
    };
    if (source.projectId) payload.projectId = source.projectId;

    if (!payload.vacancieName || !Number.isFinite(payload.time) || payload.time <= 0 ||
        !payload.orderDate || !payload.startDate || !payload.seniority) {
      return res.status(400).json({ error: 'La propuesta tiene datos obligatorios inválidos.' });
    }

    const vacancy = await VacancieService.registerVacancy(payload);
    return res.status(201).json({
      status: 'success',
      message: `Vacante "${payload.vacancieName}" creada correctamente.`,
      data: vacancy
    });
  } catch (error) {
    next(error);
  }
});


router.post(
  '/analytics/query',
  iaController.analyticsQuery
);


router.post(
  '/faiss/update',
  iaController.triggerFaissUpdate
);

router.post(
  '/analytics/export',
  iaController.exportAnalyticsReport
);





module.exports = router;
