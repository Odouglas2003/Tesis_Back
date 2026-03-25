
const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/dashboard.controller');
const auth = require('../middlewares/auth');




router.get('/metrics', [auth.ensureAuth, auth.hasRole(['administrador','manager'])],dashboardController.getDashboardMetrics);

router.get('/dashboard/list-by-status', [auth.ensureAuth, auth.hasRole(['administrador','manager'])], dashboardController.getCollaboratorListByStatus);

module.exports = router;