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
  authorize(['MANAGER']),
  validate(schemas.idParam, 'params'),
  validate(schemas.managerSiteUpdate),
  managerController.updateManagerSite
);

/**
 * @swagger
 * /api/managers/{id}/work-session:
 *   post:
 *     summary: Démarrer ou mettre à jour une session de travail
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
 *             properties:
 *               siteId:
 *                 type: integer
 *                 nullable: true
 *                 description: ID du site de lavage (null pour "Hors site - Fermer")
 *     responses:
 *       200:
 *         description: Session de travail mise à jour avec succès
 *       400:
 *         description: Erreur de validation
 *       403:
 *         description: Accès non autorisé
 *       404:
 *         description: Manager ou site non trouvé
 */
router.post('/:id/work-session', 
  authenticate,
  authorize(['MANAGER']),
  validate(schemas.idParam, 'params'),
  validate(schemas.managerWorkSessionUpdate),
  managerController.setWorkSession
);

/**
 * @swagger
 * /api/managers/{id}/work-session:
 *   get:
 *     summary: Récupérer la session de travail actuelle
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
 *     responses:
 *       200:
 *         description: Session de travail récupérée avec succès
 *       403:
 *         description: Accès non autorisé
 *       404:
 *         description: Manager non trouvé
 */
router.get('/:id/work-session', 
  authenticate,
  authorize(['MANAGER']),
  validate(schemas.idParam, 'params'),
  managerController.getWorkSession
);

/**
 * @swagger
 * /api/managers/{id}/activity:
 *   put:
 *     summary: Mettre à jour l'activité du manager
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
 *     responses:
 *       200:
 *         description: Activité mise à jour avec succès
 *       403:
 *         description: Accès non autorisé
 */
router.put('/:id/activity', 
  authenticate,
  authorize(['MANAGER']),
  validate(schemas.idParam, 'params'),
  managerController.updateActivity
);

/**
 * @swagger
 * /api/managers/sessions:
 *   get:
 *     summary: Récupérer toutes les sessions actives (admin)
 *     tags: [Managers]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Sessions actives récupérées avec succès
 *       403:
 *         description: Accès non autorisé
 */
router.get('/sessions', 
  authenticate,
  authorize(['MANAGER']),
  managerController.getAllActiveSessions
);

module.exports = router; 