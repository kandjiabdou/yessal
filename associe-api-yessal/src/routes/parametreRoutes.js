const express = require('express');
const router = express.Router();
const parametreController = require('../controllers/parametreController');
const { authenticate, authorize } = require('../middleware/auth');
const { validate, schemas } = require('../middleware/validation');

/**
 * @swagger
 * /api/parametres/entreprise:
 *   get:
 *     summary: Récupère les informations de l'entreprise
 *     tags: [Parametres]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Informations de l'entreprise
 *       401:
 *         description: Non authentifié
 */
router.get('/entreprise',
  authenticate,
  authorize(['ASSOCIE', 'ADMIN']),
  parametreController.getEntrepriseInfo
);

/**
 * @swagger
 * /api/parametres/user:
 *   get:
 *     summary: Récupère les informations de l'utilisateur connecté
 *     tags: [Parametres]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Informations utilisateur
 *       401:
 *         description: Non authentifié
 */
router.get('/user',
  authenticate,
  authorize(['ASSOCIE', 'ADMIN']),
  parametreController.getUserInfo
);

/**
 * @swagger
 * /api/parametres/devise-preference:
 *   put:
 *     summary: Met à jour la préférence de devise de l'utilisateur
 *     tags: [Parametres]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               devise:
 *                 type: string
 *                 enum: [FCFA, EUR]
 *                 description: Devise préférée
 *     responses:
 *       200:
 *         description: Préférence mise à jour
 *       400:
 *         description: Devise invalide
 *       401:
 *         description: Non authentifié
 */
router.put('/devise-preference',
  authenticate,
  authorize(['ASSOCIE', 'ADMIN']),
  validate(schemas.devisePreference),
  parametreController.updateDevisePreference
);

/**
 * @swagger
 * /api/parametres/associes:
 *   get:
 *     summary: Liste tous les associés
 *     tags: [Parametres]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Liste des associés
 *       401:
 *         description: Non authentifié
 */
router.get('/associes',
  authenticate,
  authorize(['ASSOCIE', 'ADMIN']),
  parametreController.listAssocies
);

module.exports = router;
