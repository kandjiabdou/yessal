const express = require('express');
const router = express.Router();
const bilanController = require('../controllers/bilanController');
const { authenticate, authorize } = require('../middleware/auth');

/**
 * @swagger
 * components:
 *   schemas:
 *     BilanLaverie:
 *       type: object
 *       properties:
 *         periode:
 *           type: object
 *           properties:
 *             mois:
 *               type: string
 *               example: "2025-02"
 *             debut:
 *               type: string
 *               format: date
 *               example: "2025-02-01"
 *             fin:
 *               type: string
 *               format: date
 *               example: "2025-02-28"
 *         recettes:
 *           type: object
 *           properties:
 *             laverie:
 *               type: object
 *               properties:
 *                 commandes:
 *                   type: object
 *                   properties:
 *                     montant:
 *                       type: number
 *                       example: 500000
 *                     nombre:
 *                       type: integer
 *                       example: 45
 *                 abonnements:
 *                   type: object
 *                   properties:
 *                     montant:
 *                       type: number
 *                       example: 150000
 *                     nombre:
 *                       type: integer
 *                       example: 10
 *                 total:
 *                   type: number
 *                   example: 650000
 *             fluxFinanciers:
 *               type: object
 *               properties:
 *                 montant:
 *                   type: number
 *                   example: 100000
 *                 nombre:
 *                   type: integer
 *                   example: 5
 *             boutique:
 *               type: object
 *               properties:
 *                 montant:
 *                   type: number
 *                   example: 0
 *                 nombre:
 *                   type: integer
 *                   example: 0
 *             total:
 *               type: number
 *               example: 750000
 *         depenses:
 *           type: object
 *           properties:
 *             fluxFinanciers:
 *               type: object
 *               properties:
 *                 montant:
 *                   type: number
 *                   example: 300000
 *                 nombre:
 *                   type: integer
 *                   example: 15
 *             total:
 *               type: number
 *               example: 300000
 *         resultat:
 *           type: object
 *           properties:
 *             montant:
 *               type: number
 *               example: 450000
 *             pourcentage:
 *               type: number
 *               example: 60
 */

/**
 * @swagger
 * tags:
 *   name: Bilan
 *   description: Gestion du bilan financier de la laverie
 */

/**
 * @swagger
 * /api/bilan/laverie/{laverieId}:
 *   get:
 *     summary: Obtenir le bilan financier d'une laverie pour un mois donné
 *     tags: [Bilan]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: laverieId
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID de la laverie
 *       - in: query
 *         name: month
 *         schema:
 *           type: string
 *           pattern: '^\d{4}-\d{2}$'
 *           example: "2025-02"
 *         description: Mois au format YYYY-MM (par défaut le mois en cours)
 *     responses:
 *       200:
 *         description: Bilan de la laverie
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/BilanLaverie'
 *       400:
 *         description: Paramètres invalides
 *       401:
 *         description: Non authentifié
 *       403:
 *         description: Accès refusé
 *       404:
 *         description: Laverie non trouvée
 */
router.get(
  '/laverie/:laverieId',
  authenticate,
  authorize(['MANAGER', 'ADMIN']),
  bilanController.getBilanByLaverie
);

module.exports = router;
