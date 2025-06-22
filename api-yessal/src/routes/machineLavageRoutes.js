const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth');
const { validate, schemas } = require('../middleware/validation');
const machineLavageController = require('../controllers/machineLavageController');

/**
 * @swagger
 * tags:
 *   name: Machines de Lavage
 *   description: Gestion des machines de lavage
 */

/**
 * @swagger
 * /api/machines:
 *   get:
 *     summary: Liste toutes les machines de lavage
 *     tags: [Machines de Lavage]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: siteLavageId
 *         schema:
 *           type: integer
 *         description: Filtrer par site de lavage
 *     responses:
 *       200:
 *         description: Liste des machines
 */
router.get('/', authenticate, authorize(['Manager']), machineLavageController.getMachines);

/**
 * @swagger
 * /api/machines/{id}:
 *   get:
 *     summary: Obtenir les détails d'une machine
 *     tags: [Machines de Lavage]
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
 *         description: Détails de la machine
 */
router.get('/:id', 
  authenticate, 
  authorize(['Manager']), 
  validate(schemas.idParam, 'params'),
  machineLavageController.getMachineById
);

/**
 * @swagger
 * /api/machines:
 *   post:
 *     summary: Créer une nouvelle machine
 *     tags: [Machines de Lavage]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/MachineCreate'
 *     responses:
 *       201:
 *         description: Machine créée avec succès
 */
router.post('/', 
  authenticate, 
  authorize(['Manager']), 
  validate(schemas.machineCreate),
  machineLavageController.createMachine
);

/**
 * @swagger
 * /api/machines/{id}:
 *   put:
 *     summary: Mettre à jour une machine
 *     tags: [Machines de Lavage]
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
 *             $ref: '#/components/schemas/MachineUpdate'
 *     responses:
 *       200:
 *         description: Machine mise à jour avec succès
 */
router.put('/:id', 
  authenticate, 
  authorize(['Manager']), 
  validate(schemas.idParam, 'params'),
  validate(schemas.machineUpdate),
  machineLavageController.updateMachine
);

/**
 * @swagger
 * /api/machines/{id}:
 *   delete:
 *     summary: Supprimer une machine
 *     tags: [Machines de Lavage]
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
 *         description: Machine supprimée avec succès
 */
router.delete('/:id', 
  authenticate, 
  authorize(['Manager']), 
  validate(schemas.idParam, 'params'),
  machineLavageController.deleteMachine
);

module.exports = router; 