const express = require('express');
const router = express.Router();
const fideliteController = require('../controllers/fideliteController');
const { authenticate, authorize } = require('../middleware/auth');
const { validate, schemas } = require('../middleware/validation');

/**
 * @swagger
 * tags:
 *   name: Loyalty
 *   description: Loyalty program management
 */

/**
 * @swagger
 * /api/fidelite/me:
 *   get:
 *     summary: Get current user's loyalty information
 *     tags: [Loyalty]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Loyalty information
 *       403:
 *         description: Forbidden - only clients can access their loyalty information
 *       404:
 *         description: Loyalty information not found
 */
router.get('/me', authenticate, authorize(['Client']), fideliteController.getMyFidelite);

/**
 * @swagger
 * /api/fidelite/search/{numeroCarteFidelite}:
 *   get:
 *     summary: Search client by loyalty card number
 *     tags: [Loyalty]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: numeroCarteFidelite
 *         required: true
 *         schema:
 *           type: string
 *           pattern: '^TH\d{5}[A-Z]{3}$'
 *           example: 'TH23468KASS'
 *         description: Loyalty card number (format TH + 5 digits + 3 letters)
 *     responses:
 *       200:
 *         description: Client found with loyalty information
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     client:
 *                       type: object
 *                       properties:
 *                         id:
 *                           type: integer
 *                         nom:
 *                           type: string
 *                         prenom:
 *                           type: string
 *                         email:
 *                           type: string
 *                         telephone:
 *                           type: string
 *                         typeClient:
 *                           type: string
 *                           enum: [Standard, Premium]
 *                         estEtudiant:
 *                           type: boolean
 *                         adresseText:
 *                           type: string
 *                     fidelite:
 *                       type: object
 *                       properties:
 *                         id:
 *                           type: integer
 *                         numeroCarteFidelite:
 *                           type: string
 *                         nombreLavageTotal:
 *                           type: integer
 *                         poidsTotalLaveKg:
 *                           type: number
 *                         lavagesGratuits6kgRestants:
 *                           type: integer
 *                         lavagesGratuits20kgRestants:
 *                           type: integer
 *                         createdAt:
 *                           type: string
 *                           format: date-time
 *                         updatedAt:
 *                           type: string
 *                           format: date-time
 *       400:
 *         description: Invalid loyalty card number format
 *       403:
 *         description: Forbidden - insufficient permissions
 *       404:
 *         description: Client not found with this loyalty card number
 */
router.get('/search/:numeroCarteFidelite', 
  authenticate,
  authorize(['Manager']),
  fideliteController.getClientByNumeroCarteFidelite
);

/**
 * @swagger
 * /api/fidelite/client/{clientId}:
 *   get:
 *     summary: Get loyalty information for a client
 *     tags: [Loyalty]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: clientId
 *         required: true
 *         schema:
 *           type: integer
 *         description: Client ID
 *     responses:
 *       200:
 *         description: Loyalty information
 *       403:
 *         description: Forbidden - insufficient permissions
 *       404:
 *         description: Client or loyalty information not found
 */
router.get('/client/:clientId', 
  authenticate,
  validate(schemas.idParam, 'params'),
  fideliteController.getClientFidelite
);

/**
 * @swagger
 * /api/fidelite/client/{clientId}/history:
 *   get:
 *     summary: Get loyalty history for a client
 *     tags: [Loyalty]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: clientId
 *         required: true
 *         schema:
 *           type: integer
 *         description: Client ID
 *     responses:
 *       200:
 *         description: Loyalty history
 *       403:
 *         description: Forbidden - only managers can view detailed loyalty history
 *       404:
 *         description: Client or loyalty information not found
 */
router.get('/client/:clientId/history', 
  authenticate,
  authorize(['Manager']),
  validate(schemas.idParam, 'params'),
  fideliteController.getClientFideliteHistory
);

/**
 * @swagger
 * /api/fidelite/client/{clientId}/adjust:
 *   post:
 *     summary: Adjust loyalty points for a client
 *     tags: [Loyalty]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: clientId
 *         required: true
 *         schema:
 *           type: integer
 *         description: Client ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               nombreLavageTotal:
 *                 type: integer
 *               poidsTotalLaveKg:
 *                 type: number
 *               lavagesGratuits6kgRestants:
 *                 type: integer
 *               lavagesGratuits20kgRestants:
 *                 type: integer
 *               reason:
 *                 type: string
 *     responses:
 *       200:
 *         description: Loyalty points adjusted successfully
 *       403:
 *         description: Forbidden - only managers can adjust loyalty points
 *       404:
 *         description: Client or loyalty information not found
 */
router.post('/client/:clientId/adjust', 
  authenticate,
  authorize(['Manager']),
  validate(schemas.idParam, 'params'),
  fideliteController.adjustFidelitePoints
);

/**
 * @swagger
 * /api/fidelite/premium:
 *   get:
 *     summary: Get all premium subscriptions
 *     tags: [Loyalty]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: annee
 *         schema:
 *           type: integer
 *         description: Filter by year
 *       - in: query
 *         name: mois
 *         schema:
 *           type: integer
 *         description: Filter by month
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Number of items per page
 *     responses:
 *       200:
 *         description: List of premium subscriptions
 *       403:
 *         description: Forbidden - only managers can view all premium subscriptions
 */
router.get('/premium', 
  authenticate,
  authorize(['Manager']),
  fideliteController.getAllPremiumSubscriptions
);

/**
 * @swagger
 * /api/fidelite/client/{clientId}/premium:
 *   post:
 *     summary: Create or update premium subscription
 *     tags: [Loyalty]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: clientId
 *         required: true
 *         schema:
 *           type: integer
 *         description: Client ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - annee
 *               - mois
 *               - limiteKg
 *             properties:
 *               annee:
 *                 type: integer
 *               mois:
 *                 type: integer
 *               limiteKg:
 *                 type: number
 *               kgUtilises:
 *                 type: number
 *     responses:
 *       200:
 *         description: Premium subscription created or updated successfully
 *       403:
 *         description: Forbidden - only managers can manage premium subscriptions
 *       404:
 *         description: Client not found
 */
router.post('/client/:clientId/premium', 
  authenticate,
  authorize(['Manager']),
  validate(schemas.idParam, 'params'),
  fideliteController.managePremiumSubscription
);

module.exports = router;
