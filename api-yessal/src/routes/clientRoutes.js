const express = require('express');
const router = express.Router();
const clientController = require('../controllers/clientController');
const { authenticate, authorize } = require('../middleware/auth');
const { validate, schemas } = require('../middleware/validation');

/**
 * @swagger
 * /api/clients/search:
 *   get:
 *     summary: Rechercher des clients par diverses informations
 *     description: |
 *       Recherche des clients par nom, prénom, téléphone, email ou numéro de carte de fidélité.
 *       
 *       **Recherche par numéro de carte de fidélité :**
 *       - Format exact: TH + 5 chiffres + 3 lettres (ex: TH12345ABC)
 *       - Recherche exacte et instantanée
 *       
 *       **Recherche générale :**
 *       - Recherche partielle dans nom, prénom, téléphone, email
 *       - Recherche partielle dans numéro de carte de fidélité
 *       - Insensible à la casse pour nom, prénom, email
 *     tags: [Clients]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: q
 *         schema:
 *           type: string
 *           minLength: 2
 *           example: "TH12345ABC"
 *         required: true
 *         description: |
 *           Terme de recherche (minimum 2 caractères):
 *           - Numéro de carte complet: TH12345ABC
 *           - Nom/prénom: Amadou, KANE, etc.
 *           - Téléphone: 771234567, +221771234567
 *           - Email: client@example.com
 *           - Numéro de carte partiel: TH123, ABC
 *     responses:
 *       200:
 *         description: Liste des clients trouvés avec informations de recherche
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: integer
 *                       nom:
 *                         type: string
 *                       prenom:
 *                         type: string
 *                       email:
 *                         type: string
 *                       telephone:
 *                         type: string
 *                       typeClient:
 *                         type: string
 *                         enum: [Standard, Premium]
 *                       fidelite:
 *                         type: object
 *                         properties:
 *                           numeroCarteFidelite:
 *                             type: string
 *                             example: "TH12345ABC"
 *                           nombreLavageTotal:
 *                             type: integer
 *                           poidsTotalLaveKg:
 *                             type: number
 *                           lavagesGratuits6kgRestants:
 *                             type: integer
 *                           lavagesGratuits20kgRestants:
 *                             type: integer
 *                 searchInfo:
 *                   type: object
 *                   properties:
 *                     term:
 *                       type: string
 *                       description: Terme de recherche utilisé
 *                     isLoyaltyCardSearch:
 *                       type: boolean
 *                       description: Indique si c'est une recherche par numéro de carte
 *                     totalResults:
 *                       type: integer
 *                       description: Nombre de résultats trouvés
 *       400:
 *         description: Terme de recherche invalide (moins de 2 caractères)
 *       401:
 *         description: Non authentifié
 *       403:
 *         description: Accès refusé - seuls les managers peuvent rechercher
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

/**
 * @swagger
 * /api/clients/check:
 *   post:
 *     summary: Vérifier l'existence d'un client par téléphone ou email
 *     tags: [Clients]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               telephone:
 *                 type: string
 *                 example: "+221777777777"
 *               email:
 *                 type: string
 *                 format: email
 *                 example: "client@example.com"
 *             minProperties: 1
 *     responses:
 *       200:
 *         description: Résultat de vérification
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 exists:
 *                   type: boolean
 *                   description: Indique si le client existe
 *                 message:
 *                   type: string
 *                   description: Message descriptif
 *                   example: "Un client avec ce téléphone existe déjà"
 *       400:
 *         description: Aucun critère de recherche fourni
 */
router.post('/check',
  authenticate,
  authorize(['Manager']),
  validate(schemas.clientCheck),
  clientController.checkClientExists
);

module.exports = router; 