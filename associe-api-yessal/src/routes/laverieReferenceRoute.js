const express = require('express');
const router = express.Router();
const laverieReferenceController = require('../controllers/laverieReferenceController');
const { authenticate, authorize } = require('../middleware/auth');

/**
 * @swagger
 * /api/laverie-reference:
 *   get:
 *     summary: Obtenir toutes les laveries disponibles
 *     tags: [Laverie Reference]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Liste des laveries
 *       401:
 *         description: Non authentifié
 */
router.get(
  '/',
  authenticate,
  authorize(['ASSOCIE', 'ADMIN']),
  laverieReferenceController.getAllLaveries
);

module.exports = router;
