const express = require('express');
const router = express.Router();
const fluxFinancierController = require('../controllers/fluxFinancierController');
const { authenticate, authorize } = require('../middleware/auth');

/**
 * @swagger
 * components:
 *   schemas:
 *     FluxFinancier:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *           example: 1
 *         type:
 *           type: string
 *           enum: [depense, recette]
 *           example: "depense"
 *         montant:
 *           type: number
 *           example: 50000
 *         devise:
 *           type: string
 *           example: "FCFA"
 *         dateFluxFinancier:
 *           type: string
 *           format: date-time
 *           example: "2025-02-01T10:00:00Z"
 *         motif:
 *           type: string
 *           example: "Achat de détergent"
 *         beneficiaire:
 *           type: string
 *           example: "Fournisseur ABC"
 *         sourceFinancement:
 *           type: string
 *           enum: [caisse, banque, propre, autre]
 *           example: "caisse"
 *         description:
 *           type: string
 *           example: "Achat mensuel de produits"
 *         preuveUrl:
 *           type: string
 *           example: "https://drive.google.com/file/d/..."
 *         laverieId:
 *           type: integer
 *           example: 1
 *         laverieName:
 *           type: string
 *           example: "Yessal Sacré-Coeur"
 *         createdBy:
 *           type: string
 *           example: "5"
 *         sourceApp:
 *           type: string
 *           enum: [associe, associe]
 *           example: "ASSOCIE"
 *         status:
 *           type: string
 *           enum: [pending, validated, rejected, annule]
 *           example: "pending"
 *         createdAt:
 *           type: string
 *           format: date-time
 *           example: "2025-02-01T10:00:00Z"
 */

/**
 * @swagger
 * tags:
 *   name: Flux Financier
 *   description: Gestion des flux financiers (dépenses et recettes)
 */

/**
 * @swagger
 * /api/flux-financier:
 *   post:
 *     summary: Créer un nouveau flux financier
 *     tags: [Flux Financier]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - type
 *               - montant
 *               - dateFluxFinancier
 *             properties:
 *               type:
 *                 type: string
 *                 enum: [depense, recette]
 *                 example: "depense"
 *               montant:
 *                 type: number
 *                 example: 50000
 *               dateFluxFinancier:
 *                 type: string
 *                 format: date-time
 *                 example: "2025-02-01T10:00:00Z"
 *               motif:
 *                 type: string
 *                 example: "Achat de détergent"
 *               beneficiaire:
 *                 type: string
 *                 example: "Fournisseur ABC"
 *               sourceFinancement:
 *                 type: string
 *                 enum: [caisse, banque, propre, autre]
 *                 example: "caisse"
 *               description:
 *                 type: string
 *                 example: "Achat mensuel de produits"
 *               preuveUrl:
 *                 type: string
 *                 example: "https://drive.google.com/file/d/..."
 *               laverieId:
 *                 type: integer
 *                 example: 1
 *     responses:
 *       201:
 *         description: Flux créé avec succès
 *       400:
 *         description: Données invalides
 *       401:
 *         description: Non authentifié
 *       403:
 *         description: Accès refusé
 */
router.post(
  '/',
  authenticate,
  authorize(['ASSOCIE', 'ADMIN']),
  fluxFinancierController.createFlux
);

/**
 * @swagger
 * /api/flux-financier:
 *   get:
 *     summary: Obtenir tous les flux financiers du associe
 *     tags: [Flux Financier]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [depense, recette]
 *         description: Filtrer par type
 *       - in: query
 *         name: laverieId
 *         schema:
 *           type: integer
 *         description: Filtrer par laverie
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Date de début
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Date de fin
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [pending, validated, rejected]
 *         description: Statut
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Numéro de page
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 50
 *         description: Nombre d'éléments par page
 *     responses:
 *       200:
 *         description: Liste des flux
 *       401:
 *         description: Non authentifié
 */
router.get(
  '/',
  authenticate,
  authorize(['ASSOCIE', 'ADMIN']),
  fluxFinancierController.getAllFlux
);

/**
 * @swagger
 * /api/flux-financier/laverie/{laverieId}:
 *   get:
 *     summary: Obtenir les flux d'une laverie
 *     tags: [Flux Financier]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: laverieId
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID de la laverie
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [depense, recette]
 *         description: Filtrer par type
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Date de début
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Date de fin
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Numéro de page
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 50
 *         description: Nombre d'éléments par page
 *     responses:
 *       200:
 *         description: Liste des flux de la laverie
 *       401:
 *         description: Non authentifié
 */
router.get(
  '/laverie/:laverieId',
  authenticate,
  authorize(['ASSOCIE', 'ADMIN']),
  fluxFinancierController.getFluxByLaverie
);

/**
 * @swagger
 * /api/flux-financier/laverie/{laverieId}/stats:
 *   get:
 *     summary: Obtenir les statistiques d'une laverie
 *     tags: [Flux Financier]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: laverieId
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID de la laverie
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Date de début
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Date de fin
 *     responses:
 *       200:
 *         description: Statistiques
 *       401:
 *         description: Non authentifié
 */
router.get(
  '/laverie/:laverieId/stats',
  authenticate,
  authorize(['ASSOCIE', 'ADMIN']),
  fluxFinancierController.getStatistics
);

/**
 * @swagger
 * /api/flux-financier/stats:
 *   get:
 *     summary: Obtenir les statistiques de tous les flux (sans filtrer par laverie)
 *     tags: [Flux Financier]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Date de début
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Date de fin
 *       - in: query
 *         name: month
 *         schema:
 *           type: string
 *         description: Mois (format YYYY-MM)
 *       - in: query
 *         name: year
 *         schema:
 *           type: string
 *         description: Année (format YYYY)
 *     responses:
 *       200:
 *         description: Statistiques globales
 *       401:
 *         description: Non authentifié
 */
router.get(
  '/stats',
  authenticate,
  authorize(['ASSOCIE', 'ADMIN']),
  fluxFinancierController.getStatistics
);

/**
 * @swagger
 * /api/flux-financier/{id}:
 *   get:
 *     summary: Obtenir un flux financier par ID
 *     tags: [Flux Financier]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID du flux
 *     responses:
 *       200:
 *         description: Détails du flux
 *       404:
 *         description: Flux non trouvé
 *       401:
 *         description: Non authentifié
 */
router.get(
  '/:id',
  authenticate,
  authorize(['ASSOCIE', 'ADMIN']),
  fluxFinancierController.getFluxById
);

/**
 * @swagger
 * /api/flux-financier/{id}:
 *   put:
 *     summary: Mettre à jour un flux financier
 *     tags: [Flux Financier]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID du flux
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               montant:
 *                 type: number
 *               dateFluxFinancier:
 *                 type: string
 *                 format: date-time
 *               motif:
 *                 type: string
 *               beneficiaire:
 *                 type: string
 *               sourceFinancement:
 *                 type: string
 *               description:
 *                 type: string
 *     responses:
 *       200:
 *         description: Flux mis à jour
 *       403:
 *         description: Non autorisé
 *       404:
 *         description: Flux non trouvé
 */
router.put(
  '/:id',
  authenticate,
  authorize(['ASSOCIE', 'ADMIN']),
  fluxFinancierController.updateFlux
);

/**
 * @swagger
 * /api/flux-financier/{id}/preuves:
 *   post:
 *     summary: Ajouter une preuve (pièce jointe) à un flux
 *     tags: [Flux Financier]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID du flux
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - fileId
 *               - filename
 *               - downloadUrl
 *               - mimetype
 *               - size
 *             properties:
 *               fileId:
 *                 type: string
 *                 example: "uuid-xxx"
 *               filename:
 *                 type: string
 *                 example: "facture.pdf"
 *               downloadUrl:
 *                 type: string
 *                 example: "http://localhost:4600/api/files/download/uuid?token=xxx"
 *               mimetype:
 *                 type: string
 *                 example: "application/pdf"
 *               size:
 *                 type: integer
 *                 example: 245678
 *     responses:
 *       201:
 *         description: Preuve ajoutée
 *       400:
 *         description: Données invalides
 *       403:
 *         description: Accès refusé
 */
router.post(
  '/:id/preuves',
  authenticate,
  authorize(['ASSOCIE', 'ADMIN']),
  fluxFinancierController.addPreuve
);

// Valider un flux (ASSOCIE)
router.post(
  '/:id/validate',
  authenticate,
  authorize(['ASSOCIE', 'ADMIN']),
  fluxFinancierController.validateFlux
);

/**
 * @swagger
 * /api/flux-financier/preuves/{preuveId}:
 *   delete:
 *     summary: Supprimer une preuve d'un flux
 *     tags: [Flux Financier]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: preuveId
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID de la preuve
 *     responses:
 *       200:
 *         description: Preuve supprimée
 *       403:
 *         description: Accès refusé
 *       404:
 *         description: Preuve non trouvée
 */
router.delete(
  '/preuves/:preuveId',
  authenticate,
  authorize(['ASSOCIE', 'ADMIN']),
  fluxFinancierController.deletePreuve
);

/**
 * @swagger
 * /api/flux-financier/{id}:
 *   delete:
 *     summary: Supprimer un flux financier
 *     tags: [Flux Financier]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID du flux
 *     responses:
 *       200:
 *         description: Flux supprimé
 *       403:
 *         description: Non autorisé
 *       404:
 *         description: Flux non trouvé
 */
router.delete(
  '/:id',
  authenticate,
  authorize(['ASSOCIE', 'ADMIN']),
  fluxFinancierController.deleteFlux
);

module.exports = router;
