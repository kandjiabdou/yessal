const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth');
const { validate, schemas } = require('../middleware/validation');
const dashboardController = require('../controllers/dashboardController');

// New: separate endpoint for today's stats only
router.get('/:siteId/today',
  authenticate,
  authorize(['Manager']),
  validate(schemas.siteIdParam, 'params'),
  dashboardController.getTodayData
);

// New: separate endpoint for period stats only
router.get('/:siteId/period',
  authenticate,
  authorize(['Manager']),
  validate(schemas.siteIdParam, 'params'),
  dashboardController.getPeriodData
);

module.exports = router; 