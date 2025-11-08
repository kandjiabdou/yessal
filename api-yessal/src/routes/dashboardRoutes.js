const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth');
const { validate, schemas } = require('../middleware/validation');
const dashboardController = require('../controllers/dashboardController');

// New: separate endpoint for today's stats only
router.get('/:siteId/today',
  authenticate,
  authorize(['MANAGER']),
  validate(schemas.siteIdParam, 'params'),
  dashboardController.getTodayData
);

// New: separate endpoint for period stats only
router.get('/:siteId/period',
  authenticate,
  authorize(['MANAGER']),
  validate(schemas.siteIdParam, 'params'),
  dashboardController.getPeriodData
);

// New: endpoint for chart data
router.get('/:siteId/chart-data',
  authenticate,
  authorize(['MANAGER']),
  validate(schemas.siteIdParam, 'params'),
  dashboardController.getChartData
);

module.exports = router; 