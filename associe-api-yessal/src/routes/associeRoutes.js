const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth');
const { validate, schemas } = require('../middleware/validation');
const associeController = require('../controllers/associeController');

/**
 * @swagger
 * tags:
 *   name: associes
 *   description: Gestion des associes
 */

/**
 * @swagger
 * /api/associes/{id}/site:
 *   post:
 *     summary: Changer le site principal d'un associe
 *     tags: [associes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID du associe
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
 *         description: Associe ou site non trouvé
 */
router.post('/:id/site', 
  authenticate,
  authorize(['ASSOCIE']),
  validate(schemas.idParam, 'params'),
  validate(schemas.associeSiteUpdate),
  associeController.updateassocieSite
);

/**
 * @swagger
 * /api/associes/{id}/work-session:
 *   post:
 *     summary: Démarrer ou mettre à jour une session de travail
 *     tags: [associes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID du associe
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
 *         description: Associe ou site non trouvé
 */
router.post('/:id/work-session', 
  authenticate,
  authorize(['ASSOCIE']),
  validate(schemas.idParam, 'params'),
  validate(schemas.associeWorkSessionUpdate),
  associeController.setWorkSession
);

/**
 * @swagger
 * /api/associes/{id}/work-session:
 *   get:
 *     summary: Récupérer la session de travail actuelle
 *     tags: [associes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID du associe
 *     responses:
 *       200:
 *         description: Session de travail récupérée avec succès
 *       403:
 *         description: Accès non autorisé
 *       404:
 *         description: Associe non trouvé
 */
router.get('/:id/work-session', 
  authenticate,
  authorize(['ASSOCIE']),
  validate(schemas.idParam, 'params'),
  associeController.getWorkSession
);

/**
 * @swagger
 * /api/associes/{id}/activity:
 *   put:
 *     summary: Mettre à jour l'activité du associe
 *     tags: [associes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID du associe
 *     responses:
 *       200:
 *         description: Activité mise à jour avec succès
 *       403:
 *         description: Accès non autorisé
 */
router.put('/:id/activity', 
  authenticate,
  authorize(['ASSOCIE']),
  validate(schemas.idParam, 'params'),
  associeController.updateActivity
);

/**
 * @swagger
 * /api/associes/sessions:
 *   get:
 *     summary: Récupérer toutes les sessions actives (admin)
 *     tags: [associes]
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
  authorize(['ASSOCIE']),
  associeController.getAllActiveSessions
);

module.exports = router; 