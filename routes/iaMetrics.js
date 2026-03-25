// routes/iaMetrics.js
'use strict'

const express = require('express');
const IaMetricsController = require('../controllers/iaMetrics');
const router = express.Router();
const auth = require('../middlewares/auth');

// Ruta dedicada y segura para que la IA consuma las métricas
router.get('/ia/metrics',[auth.ensureAuth, auth.hasRole(['administrador'])], IaMetricsController.getMetricsForAI);

module.exports = router;