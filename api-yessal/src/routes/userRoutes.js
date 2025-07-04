const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { authenticate, authorize } = require('../middleware/auth');
const { validate, schemas } = require('../middleware/validation');

/**
 * @swagger
 * tags:
 *   name: Users
 *   description: User management
 */

/**
 * @swagger
 * /api/users:
 *   get:
 *     summary: Get all users
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: role
 *         schema:
 *           type: string
 *           enum: [Client, Manager]
 *         description: Filter by user role
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search term for name, email, or phone
 *       - in: query
 *         name: typeClient
 *         schema:
 *           type: string
 *           enum: [Standard, Premium]
 *         description: Filter by client type
 *       - in: query
 *         name: siteLavageId
 *         schema:
 *           type: integer
 *         description: Filter by laundry site ID
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
 *         description: List of users
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 */
router.get('/', authenticate, authorize(['Manager']), userController.getUsers);

/**
 * @swagger
 * /api/users/invites:
 *   get:
 *     summary: Get guest clients (clients invités)
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search term for name, email, or phone
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
 *         description: List of guest clients
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 */
router.get('/invites', authenticate, authorize(['Manager']), userController.getGuestClients);

/**
 * @swagger
 * /api/users/{id}:
 *   get:
 *     summary: Get user by ID
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: User ID
 *     responses:
 *       200:
 *         description: User details
 *       404:
 *         description: User not found
 */
router.get('/:id', authenticate, validate(schemas.idParam, 'params'), userController.getUserById);

/**
 * @swagger
 * /api/users/profile/me:
 *   get:
 *     summary: Get current user profile
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Current user profile
 *       401:
 *         description: Unauthorized
 */
router.get('/profile/me', authenticate, userController.getCurrentUser);

/**
 * @swagger
 * /api/users/{id}:
 *   put:
 *     summary: Update user
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: User ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UserUpdate'
 *     responses:
 *       200:
 *         description: User updated successfully
 *       400:
 *         description: Validation error
 *       404:
 *         description: User not found
 */
router.put('/:id', 
  authenticate, 
  validate(schemas.idParam, 'params'),
  validate(schemas.userUpdate),
  userController.updateUser
);

/**
 * @swagger
 * /api/users/{id}:
 *   delete:
 *     summary: Delete user
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: User ID
 *     responses:
 *       200:
 *         description: User deleted successfully
 *       403:
 *         description: Forbidden
 *       404:
 *         description: User not found
 */
router.delete('/:id', 
  authenticate, 
  authorize(['Manager']), 
  validate(schemas.idParam, 'params'),
  userController.deleteUser
);

/**
 * @swagger
 * /api/users/geolocation/update:
 *   post:
 *     summary: Update user geolocation
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               latitude:
 *                 type: number
 *               longitude:
 *                 type: number
 *               adresseText:
 *                 type: string
 *               saveAsDefault:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Geolocation updated successfully
 *       400:
 *         description: Validation error
 */
router.post('/geolocation/update', 
  authenticate,
  userController.updateUserGeolocation
);

/**
 * @swagger
 * /api/users/{id}/abonnement-premium:
 *   post:
 *     summary: Create a premium subscription for a user
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: User ID
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
 *                 description: Year of the subscription
 *               mois:
 *                 type: integer
 *                 description: Month of the subscription (1-12)
 *               limiteKg:
 *                 type: number
 *                 description: Weight limit in kg
 *     responses:
 *       201:
 *         description: Premium subscription created successfully
 *       400:
 *         description: Validation error
 *       409:
 *         description: Subscription already exists for this period
 */
router.post('/:id/abonnement-premium', 
  authenticate,
  authorize(['Manager']),
  userController.createAbonnementPremium
);

/**
 * @swagger
 * /api/users/abonnement-premium/{id}:
 *   put:
 *     summary: Update a premium subscription
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Subscription ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               limiteKg:
 *                 type: number
 *                 description: Weight limit in kg
 *               kgUtilises:
 *                 type: number
 *                 description: Used weight in kg
 *     responses:
 *       200:
 *         description: Premium subscription updated successfully
 *       404:
 *         description: Subscription not found
 */
router.put('/abonnement-premium/:id', 
  authenticate,
  authorize(['Manager']),
  userController.updateAbonnementPremium
);

/**
 * @swagger
 * /api/users/abonnement-premium/{id}:
 *   delete:
 *     summary: Delete a premium subscription
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Subscription ID
 *     responses:
 *       200:
 *         description: Premium subscription deleted successfully
 *       404:
 *         description: Subscription not found
 */
router.delete('/abonnement-premium/:id', 
  authenticate,
  authorize(['Manager']),
  userController.deleteAbonnementPremium
);

module.exports = router;
