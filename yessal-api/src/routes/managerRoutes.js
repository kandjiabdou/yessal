const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth');
const { validate, schemas } = require('../middleware/validation');
const managerController = require('../controllers/managerController');

/**
 * @swagger
 * tags:
 *   name: Managers
 *   description: Gestion des managers
 */

/**
 * @swagger
 * /api/managers/{id}/site:
 *   post:
 *     summary: Changer le site principal d'un manager
 *     tags: [Managers]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID du manager
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - siteId
 *             properties:
 *               siteId:
 *                 type: integer
 *                 description: ID du site de lavage
 *     responses:
 *       200:
 *         description: Site principal mis à jour avec succès
 *       400:
 *         description: Erreur de validation
 *       403:
 *         description: Accès non autorisé
 *       404:
 *         description: Manager ou site non trouvé
 */
router.post('/:id/site', 
  authenticate,
  authorize(['Manager']),
  validate(schemas.idParam, 'params'),
  validate(schemas.managerSiteUpdate),
  managerController.updateManagerSite
);

module.exports = router; 