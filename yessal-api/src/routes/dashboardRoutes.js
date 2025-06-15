const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth');
const { validate, schemas } = require('../middleware/validation');
const dashboardController = require('../controllers/dashboardController');

/**
 * @swagger
 * /api/dashboard/{siteId}:
 *   get:
 *     summary: Obtenir les données du dashboard pour un site
 *     tags: [Dashboard]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: siteId
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID du site de lavage
 *     responses:
 *       200:
 *         description: Données du dashboard
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     todayStats:
 *                       type: object
 *                       properties:
 *                         totalCommandes:
 *                           type: integer
 *                         totalRevenue:
 *                           type: number
 *                         totalPoidsKg:
 *                           type: number
 *                         totalLivraisons:
 *                           type: integer
 *                     weekStats:
 *                       type: object
 *                       properties:
 *                         totalCommandes:
 *                           type: integer
 *                         totalRevenue:
 *                           type: number
 *                         totalPoidsKg:
 *                           type: number
 *                         totalLivraisons:
 *                           type: integer
 *                     recentOrders:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: integer
 *                           clientName:
 *                             type: string
 *                           prixTotal:
 *                             type: number
 *                           masseClientIndicativeKg:
 *                             type: number
 *                           statut:
 *                             type: string
 *                           dateHeureCommande:
 *                             type: string
 *                     siteName:
 *                       type: string
 *       403:
 *         description: Forbidden - only managers can access dashboard
 *       404:
 *         description: Site not found
 */
router.get('/:siteId', 
  authenticate, 
  authorize(['Manager']),
  validate(schemas.siteIdParam, 'params'),
  dashboardController.getDashboardData
);

module.exports = router; 