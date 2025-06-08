const express = require('express');
const router = express.Router();
const orderController = require('../controllers/orderController');
const { authenticate, authorize } = require('../middleware/auth');
const { validate, schemas } = require('../middleware/validation');

/**
 * @swagger
 * components:
 *   schemas:
 *     OrderResponse:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *           example: true
 *         message:
 *           type: string
 *           example: "Order created successfully"
 *         data:
 *           type: object
 *           properties:
 *             id:
 *               type: integer
 *               example: 1
 *             clientUserId:
 *               type: integer
 *               example: 1
 *             siteLavageId:
 *               type: integer
 *               example: 1
 *             statut:
 *               type: string
 *               enum: [PrisEnCharge, LavageEnCours, Repassage, Collecte, Livraison, Livre]
 *               example: "PrisEnCharge"
 *             masseClientIndicativeKg:
 *               type: number
 *               example: 8.5
 *             prixTotal:
 *               type: number
 *               example: 5100
 *
 * tags:
 *   name: Orders
 *   description: Order management
 */

/**
 * @swagger
 * /api/orders:
 *   post:
 *     summary: Create a new order
 *     tags: [Orders]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - siteLavageId
 *               - masseClientIndicativeKg
 *               - formuleCommande
 *             properties:
 *               clientUserId:
 *                 type: integer
 *                 description: ID of the registered client (optional if clientInvite is provided)
 *                 example: 1
 *               clientInvite:
 *                 type: object
 *                 description: Guest client information (required if clientUserId is not provided)
 *                 properties:
 *                   nom:
 *                     type: string
 *                     example: "Sow"
 *                   telephone:
 *                     type: string
 *                     example: "+221777777777"
 *                   email:
 *                     type: string
 *                     format: email
 *                     example: "client@example.com"
 *               siteLavageId:
 *                 type: integer
 *                 description: ID of the laundry site
 *                 example: 1
 *               masseClientIndicativeKg:
 *                 type: number
 *                 minimum: 6
 *                 description: Estimated weight in kg
 *                 example: 8.5
 *               formuleCommande:
 *                 type: string
 *                 enum: [BaseMachine, Detail]
 *                 description: Order formula type
 *                 example: "BaseMachine"
 *               estEnLivraison:
 *                 type: boolean
 *                 description: Whether delivery is requested
 *                 default: false
 *                 example: true
 *               adresseLivraison:
 *                 type: object
 *                 description: Delivery address (required if estEnLivraison is true)
 *                 properties:
 *                   adresseText:
 *                     type: string
 *                     example: "123 Rue de la Livraison, Dakar"
 *                   latitude:
 *                     type: number
 *                     example: 14.7167
 *                   longitude:
 *                     type: number
 *                     example: -17.4677
 *               typeReduction:
 *                 type: string
 *                 enum: [Ouverture, Etudiant]
 *                 description: Type of discount to apply
 *                 example: "Etudiant"
 *               options:
 *                 type: object
 *                 properties:
 *                   aOptionRepassage:
 *                     type: boolean
 *                     description: Ironing option
 *                     default: false
 *                     example: true
 *                   aOptionSechage:
 *                     type: boolean
 *                     description: Drying option
 *                     default: false
 *                     example: true
 *                   aOptionLivraison:
 *                     type: boolean
 *                     description: Delivery option
 *                     default: false
 *                     example: true
 *                   aOptionExpress:
 *                     type: boolean
 *                     description: Express service option
 *                     default: false
 *                     example: false
 *           example:
 *             siteLavageId: 1
 *             masseClientIndicativeKg: 8.5
 *             formuleCommande: "BaseMachine"
 *             estEnLivraison: true
 *             adresseLivraison:
 *               adresseText: "123 Rue de la Livraison, Dakar"
 *               latitude: 14.7167
 *               longitude: -17.4677
 *             options:
 *               aOptionRepassage: true
 *               aOptionSechage: true
 *               aOptionLivraison: true
 *     responses:
 *       201:
 *         description: Order created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/OrderResponse'
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 */
router.post('/', 
  authenticate, 
  validate(schemas.commandeCreate),
  orderController.createOrder
);

/**
 * @swagger
 * /api/orders:
 *   get:
 *     summary: Get all orders with filtering
 *     tags: [Orders]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [PrisEnCharge, LavageEnCours, Repassage, Collecte, Livraison, Livre]
 *         description: Filter by order status
 *       - in: query
 *         name: clientId
 *         schema:
 *           type: integer
 *         description: Filter by client ID
 *       - in: query
 *         name: siteLavageId
 *         schema:
 *           type: integer
 *         description: Filter by laundry site ID
 *       - in: query
 *         name: gerantId
 *         schema:
 *           type: integer
 *         description: Filter by manager ID
 *       - in: query
 *         name: livreurId
 *         schema:
 *           type: integer
 *         description: Filter by delivery person ID
 *       - in: query
 *         name: dateFrom
 *         schema:
 *           type: string
 *           format: date
 *         description: Filter by start date
 *       - in: query
 *         name: dateTo
 *         schema:
 *           type: string
 *           format: date
 *         description: Filter by end date
 *       - in: query
 *         name: estEnLivraison
 *         schema:
 *           type: boolean
 *         description: Filter by delivery option
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
 *                     orders:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/OrderResponse'
 *                     total:
 *                       type: integer
 *                       example: 50
 *                     page:
 *                       type: integer
 *                       example: 1
 *                     limit:
 *                       type: integer
 *                       example: 10
 *       401:
 *         description: Unauthorized
 */
router.get('/', authenticate, orderController.getOrders);

/**
 * @swagger
 * /api/orders/my-orders:
 *   get:
 *     summary: Get current client's orders
 *     tags: [Orders]
 *     security:
 *       - bearerAuth: []
 *     parameters:
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
 *         description: List of client's orders
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - user is not a client
 */
router.get('/my-orders', authenticate, authorize(['Client']), orderController.getMyOrders);

/**
 * @swagger
 * /api/orders/{id}:
 *   get:
 *     summary: Get order by ID
 *     tags: [Orders]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Order ID
 *     responses:
 *       200:
 *         description: Order details
 *       404:
 *         description: Order not found
 */
router.get('/:id', 
  authenticate, 
  validate(schemas.idParam, 'params'),
  orderController.getOrderById
);

/**
 * @swagger
 * /api/orders/{id}:
 *   put:
 *     summary: Update order
 *     tags: [Orders]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Order ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/OrderUpdate'
 *     responses:
 *       200:
 *         description: Order updated successfully
 *       400:
 *         description: Validation error
 *       403:
 *         description: Forbidden - only managers can update orders
 *       404:
 *         description: Order not found
 */
router.put('/:id', 
  authenticate, 
  authorize(['Manager']),
  validate(schemas.idParam, 'params'),
  validate(schemas.orderUpdate),
  orderController.updateOrder
);

/**
 * @swagger
 * /api/orders/{id}/payment:
 *   post:
 *     summary: Add payment to order
 *     tags: [Orders]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Order ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - montant
 *               - mode
 *             properties:
 *               montant:
 *                 type: number
 *               mode:
 *                 type: string
 *                 enum: [Espece, MobileMoney, Autre]
 *               statut:
 *                 type: string
 *                 enum: [EnAttente, Paye, Echoue]
 *                 default: Paye
 *     responses:
 *       201:
 *         description: Payment added successfully
 *       400:
 *         description: Validation error or failed to calculate price
 *       403:
 *         description: Forbidden - only managers can add payments
 *       404:
 *         description: Order not found
 */
router.post('/:id/payment', 
  authenticate, 
  authorize(['Manager']),
  validate(schemas.idParam, 'params'),
  orderController.addPayment
);

/**
 * @swagger
 * /api/orders/{id}:
 *   delete:
 *     summary: Delete order
 *     tags: [Orders]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Order ID
 *     responses:
 *       200:
 *         description: Order deleted successfully
 *       403:
 *         description: Forbidden - only managers can delete orders
 *       404:
 *         description: Order not found
 */
router.delete('/:id', 
  authenticate, 
  authorize(['Manager']),
  validate(schemas.idParam, 'params'),
  orderController.deleteOrder
);

module.exports = router;
