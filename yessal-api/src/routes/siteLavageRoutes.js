const express = require('express');
const router = express.Router();
const siteLavageController = require('../controllers/siteLavageController');
const { authenticate, authorize } = require('../middleware/auth');
const { validate, schemas } = require('../middleware/validation');

/**
 * @swagger
 * tags:
 *   name: Sites de Lavage
 *   description: Gestion des sites de lavage
 */

/**
 * @swagger
 * /api/sites:
 *   get:
 *     summary: Liste tous les sites de lavage
 *     tags: [Sites de Lavage]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: ville
 *         schema:
 *           type: string
 *         description: Filtrer par ville
 *       - in: query
 *         name: statutOuverture
 *         schema:
 *           type: boolean
 *         description: Filtrer par statut d'ouverture
 *     responses:
 *       200:
 *         description: Liste des sites
 */
router.get('/', authenticate, siteLavageController.getSites);

/**
 * @swagger
 * /api/sites/{id}:
 *   get:
 *     summary: Obtenir les détails d'un site
 *     tags: [Sites de Lavage]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Détails du site
 */
router.get('/:id', 
  authenticate, 
  validate(schemas.idParam, 'params'),
  siteLavageController.getSiteById
);

/**
 * @swagger
 * /api/sites:
 *   post:
 *     summary: Créer un nouveau site
 *     tags: [Sites de Lavage]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/SiteLavageCreate'
 *     responses:
 *       201:
 *         description: Site créé avec succès
 */
router.post('/', 
  authenticate, 
  authorize(['Manager']), 
  validate(schemas.siteLavageCreate),
  siteLavageController.createSite
);

/**
 * @swagger
 * /api/sites/{id}:
 *   put:
 *     summary: Mettre à jour un site
 *     tags: [Sites de Lavage]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/SiteLavageUpdate'
 *     responses:
 *       200:
 *         description: Site mis à jour avec succès
 */
router.put('/:id', 
  authenticate, 
  authorize(['Manager']), 
  validate(schemas.idParam, 'params'),
  validate(schemas.siteLavageUpdate),
  siteLavageController.updateSite
);

/**
 * @swagger
 * /api/sites/{id}:
 *   delete:
 *     summary: Supprimer un site
 *     tags: [Sites de Lavage]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Site supprimé avec succès
 */
router.delete('/:id', 
  authenticate, 
  authorize(['Manager']), 
  validate(schemas.idParam, 'params'),
  siteLavageController.deleteSite
);

/**
 * @swagger
 * /api/sites/{id}/machines:
 *   get:
 *     summary: Get all machines for a laundry site
 *     tags: [LaundrysSites]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Laundry site ID
 *     responses:
 *       200:
 *         description: List of machines
 *       404:
 *         description: Laundry site not found
 */
router.get('/:id/machines', 
  validate(schemas.idParam, 'params'),
  siteLavageController.getSiteMachines
);

/**
 * @swagger
 * /api/sites/{id}/machines:
 *   post:
 *     summary: Add a machine to a laundry site
 *     tags: [LaundrysSites]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Laundry site ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - numero
 *               - type
 *               - poidsKg
 *             properties:
 *               numero:
 *                 type: integer
 *               nom:
 *                 type: string
 *               type:
 *                 type: string
 *               poidsKg:
 *                 type: number
 *     responses:
 *       201:
 *         description: Machine added successfully
 *       400:
 *         description: Validation error
 *       403:
 *         description: Forbidden - only managers can add machines
 *       404:
 *         description: Laundry site not found
 *       409:
 *         description: Machine with this number already exists
 */
router.post('/:id/machines', 
  authenticate, 
  authorize(['Manager']),
  validate(schemas.idParam, 'params'),
  siteLavageController.addMachineToSite
);

/**
 * @swagger
 * /api/sites/{siteId}/machines/{machineId}:
 *   put:
 *     summary: Update a machine
 *     tags: [LaundrysSites]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: siteId
 *         required: true
 *         schema:
 *           type: integer
 *         description: Laundry site ID
 *       - in: path
 *         name: machineId
 *         required: true
 *         schema:
 *           type: integer
 *         description: Machine ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               numero:
 *                 type: integer
 *               nom:
 *                 type: string
 *               type:
 *                 type: string
 *               poidsKg:
 *                 type: number
 *     responses:
 *       200:
 *         description: Machine updated successfully
 *       400:
 *         description: Validation error
 *       403:
 *         description: Forbidden - only managers can update machines
 *       404:
 *         description: Machine not found
 *       409:
 *         description: Machine with this number already exists
 */
router.put('/:siteId/machines/:machineId', 
  authenticate, 
  authorize(['Manager']),
  siteLavageController.updateMachine
);

/**
 * @swagger
 * /api/sites/{siteId}/machines/{machineId}:
 *   delete:
 *     summary: Delete a machine
 *     tags: [LaundrysSites]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: siteId
 *         required: true
 *         schema:
 *           type: integer
 *         description: Laundry site ID
 *       - in: path
 *         name: machineId
 *         required: true
 *         schema:
 *           type: integer
 *         description: Machine ID
 *     responses:
 *       200:
 *         description: Machine deleted successfully
 *       403:
 *         description: Forbidden - only managers can delete machines
 *       404:
 *         description: Machine not found
 */
router.delete('/:siteId/machines/:machineId', 
  authenticate, 
  authorize(['Manager']),
  siteLavageController.deleteMachine
);

/**
 * @swagger
 * /api/sites/find/nearest:
 *   post:
 *     summary: Find nearest laundry sites
 *     tags: [LaundrysSites]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - latitude
 *               - longitude
 *             properties:
 *               latitude:
 *                 type: number
 *               longitude:
 *                 type: number
 *               radius:
 *                 type: number
 *                 default: 10
 *               limit:
 *                 type: integer
 *                 default: 5
 *     responses:
 *       200:
 *         description: List of nearest laundry sites
 *       400:
 *         description: Latitude and longitude are required
 */
router.post('/find/nearest', siteLavageController.findNearestSites);

/**
 * @swagger
 * /api/sites/{id}/stats:
 *   get:
 *     summary: Obtenir les statistiques d'un site
 *     tags: [Sites de Lavage]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *       - in: query
 *         name: dateDebut
 *         schema:
 *           type: string
 *           format: date
 *         description: Date de début (YYYY-MM-DD)
 *       - in: query
 *         name: dateFin
 *         schema:
 *           type: string
 *           format: date
 *         description: Date de fin (YYYY-MM-DD)
 *     responses:
 *       200:
 *         description: Statistiques du site
 */
router.get('/:id/stats', 
  authenticate, 
  authorize(['Manager']), 
  validate(schemas.idParam, 'params'),
  siteLavageController.getSiteStats
);

module.exports = router;
