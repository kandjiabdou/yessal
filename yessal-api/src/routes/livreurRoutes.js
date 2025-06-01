const express = require('express');
const router = express.Router();
const livreurController = require('../controllers/livreurController');
const { authenticate, authorize } = require('../middleware/auth');
const { validate, schemas } = require('../middleware/validation');

/**
 * @swagger
 * tags:
 *   name: Delivery
 *   description: Delivery person management
 */

/**
 * @swagger
 * /api/livreurs:
 *   get:
 *     summary: Get all delivery personnel
 *     tags: [Delivery]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search term for name, email, or phone
 *       - in: query
 *         name: available
 *         schema:
 *           type: boolean
 *         description: Filter by availability status
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
 *         description: List of delivery personnel
 *       401:
 *         description: Unauthorized
 */
router.get('/', authenticate, livreurController.getLivreurs);

/**
 * @swagger
 * /api/livreurs/{id}:
 *   get:
 *     summary: Get delivery person by ID
 *     tags: [Delivery]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Delivery person ID
 *     responses:
 *       200:
 *         description: Delivery person details
 *       404:
 *         description: Delivery person not found
 */
router.get('/:id', 
  authenticate, 
  validate(schemas.idParam, 'params'),
  livreurController.getLivreurById
);

/**
 * @swagger
 * /api/livreurs:
 *   post:
 *     summary: Create a new delivery person
 *     tags: [Delivery]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/LivreurCreate'
 *     responses:
 *       201:
 *         description: Delivery person created successfully
 *       400:
 *         description: Validation error
 *       403:
 *         description: Forbidden - only managers can create delivery personnel
 */
router.post('/', 
  authenticate, 
  authorize(['Manager']),
  validate(schemas.livreurCreate),
  livreurController.createLivreur
);

/**
 * @swagger
 * /api/livreurs/{id}:
 *   put:
 *     summary: Update delivery person
 *     tags: [Delivery]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Delivery person ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/LivreurUpdate'
 *     responses:
 *       200:
 *         description: Delivery person updated successfully
 *       400:
 *         description: Validation error
 *       403:
 *         description: Forbidden - only managers can update delivery personnel
 *       404:
 *         description: Delivery person not found
 */
router.put('/:id', 
  authenticate, 
  authorize(['Manager']),
  validate(schemas.idParam, 'params'),
  validate(schemas.livreurUpdate),
  livreurController.updateLivreur
);

/**
 * @swagger
 * /api/livreurs/{id}:
 *   delete:
 *     summary: Delete delivery person
 *     tags: [Delivery]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Delivery person ID
 *     responses:
 *       200:
 *         description: Delivery person deleted successfully
 *       400:
 *         description: Cannot delete delivery person with related orders
 *       403:
 *         description: Forbidden - only managers can delete delivery personnel
 *       404:
 *         description: Delivery person not found
 */
router.delete('/:id', 
  authenticate, 
  authorize(['Manager']),
  validate(schemas.idParam, 'params'),
  livreurController.deleteLivreur
);

/**
 * @swagger
 * /api/livreurs/{id}/availability:
 *   patch:
 *     summary: Update availability status
 *     tags: [Delivery]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Delivery person ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - statutDisponibilite
 *             properties:
 *               statutDisponibilite:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Availability updated successfully
 *       403:
 *         description: Forbidden - only managers can update availability
 *       404:
 *         description: Delivery person not found
 */
router.patch('/:id/availability', 
  authenticate, 
  authorize(['Manager']),
  validate(schemas.idParam, 'params'),
  livreurController.updateAvailability
);

/**
 * @swagger
 * /api/livreurs/{id}/orders:
 *   get:
 *     summary: Get orders assigned to a delivery person
 *     tags: [Delivery]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Delivery person ID
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [PrisEnCharge, LavageEnCours, Repassage, Collecte, Livraison, Livre]
 *         description: Filter by order status
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
 *         description: List of orders
 *       404:
 *         description: Delivery person not found
 */
router.get('/:id/orders', 
  authenticate,
  validate(schemas.idParam, 'params'),
  livreurController.getLivreurOrders
);

module.exports = router;
