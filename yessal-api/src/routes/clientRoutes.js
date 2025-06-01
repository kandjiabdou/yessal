const express = require('express');
const router = express.Router();
const clientController = require('../controllers/clientController');
const { authenticate, authorize } = require('../middleware/auth');
const { validate, schemas } = require('../middleware/validation');

/**
 * @swagger
 * /api/clients/search:
 *   get:
 *     summary: Rechercher des clients
 *     tags: [Clients]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: q
 *         schema:
 *           type: string
 *         required: true
 *         description: Terme de recherche (nom, prénom, téléphone ou numéro de carte)
 *     responses:
 *       200:
 *         description: Liste des clients trouvés
 *       400:
 *         description: Terme de recherche invalide
 *       401:
 *         description: Non authentifié
 */
router.get('/search',
  authenticate,
  authorize(['Manager']),
  clientController.searchClients
);

/**
 * @swagger
 * /api/clients/{id}:
 *   get:
 *     summary: Obtenir les détails d'un client
 *     tags: [Clients]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID du client
 *     responses:
 *       200:
 *         description: Détails du client
 *       404:
 *         description: Client non trouvé
 */
router.get('/:id',
  authenticate,
  validate(schemas.idParam, 'params'),
  clientController.getClientDetails
);

/**
 * @swagger
 * /api/clients/guest:
 *   post:
 *     summary: Créer un client invité
 *     tags: [Clients]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - nom
 *               - prenom
 *               - telephone
 *             properties:
 *               nom:
 *                 type: string
 *               prenom:
 *                 type: string
 *               telephone:
 *                 type: string
 *               email:
 *                 type: string
 *               adresseText:
 *                 type: string
 *     responses:
 *       201:
 *         description: Client invité créé avec succès
 *       400:
 *         description: Données invalides
 */
router.post('/guest',
  authenticate,
  authorize(['Manager']),
  validate(schemas.clientGuest),
  clientController.createGuestClient
);

/**
 * @swagger
 * /api/clients:
 *   post:
 *     summary: Créer un nouveau compte client
 *     tags: [Clients]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - nom
 *               - prenom
 *               - telephone
 *             properties:
 *               nom:
 *                 type: string
 *               prenom:
 *                 type: string
 *               telephone:
 *                 type: string
 *               email:
 *                 type: string
 *               adresseText:
 *                 type: string
 *     responses:
 *       201:
 *         description: Compte client créé avec succès
 *       400:
 *         description: Données invalides ou téléphone déjà utilisé
 */
router.post('/',
  authenticate,
  authorize(['Manager']),
  validate(schemas.clientCreate),
  clientController.createClientAccount
);

module.exports = router; 