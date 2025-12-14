/**
 * ============================================
 * ROUTES COMPTABILITÉ
 * ============================================
 * 
 * Endpoints pour accéder aux fonctionnalités comptables en temps réel
 */

const express = require('express');
const router = express.Router();
const comptabiliteController = require('../controllers/comptabiliteController');
const { authenticate, authorize } = require('../middleware/auth');

/**
 * @swagger
 * tags:
 *   name: Comptabilité
 *   description: Gestion de la comptabilité en temps réel
 */

// ============================================
// TRÉSORERIE
// ============================================

/**
 * @swagger
 * /api/comptabilite/tresorerie:
 *   get:
 *     summary: Obtenir le cash disponible en temps réel
 *     tags: [Comptabilité]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: dateReference
 *         schema:
 *           type: string
 *           format: date-time
 *         description: Date de référence (par défaut = maintenant)
 *     responses:
 *       200:
 *         description: Trésorerie calculée avec succès
 *       401:
 *         description: Non authentifié
 */
router.get(
  '/tresorerie',
  authenticate,
  authorize(['ASSOCIE', 'ADMIN']),
  comptabiliteController.getTresorerie
);

// ============================================
// DETTES
// ============================================

/**
 * @swagger
 * /api/comptabilite/dettes:
 *   get:
 *     summary: Obtenir les dettes envers chaque associé
 *     tags: [Comptabilité]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: dateReference
 *         schema:
 *           type: string
 *           format: date-time
 *         description: Date de référence (par défaut = maintenant)
 *     responses:
 *       200:
 *         description: Dettes calculées avec succès
 *       401:
 *         description: Non authentifié
 */
router.get(
  '/dettes',
  authenticate,
  authorize(['ASSOCIE', 'ADMIN']),
  comptabiliteController.getDettes
);

// ============================================
// RÉSULTAT
// ============================================

/**
 * @swagger
 * /api/comptabilite/resultat:
 *   get:
 *     summary: Obtenir le résultat d'une période
 *     tags: [Comptabilité]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: dateDebut
 *         required: true
 *         schema:
 *           type: string
 *           format: date
 *         description: Date de début de la période
 *       - in: query
 *         name: dateFin
 *         required: true
 *         schema:
 *           type: string
 *           format: date
 *         description: Date de fin de la période
 *       - in: query
 *         name: siteLavageId
 *         schema:
 *           type: integer
 *         description: Filtre par site de laverie (optionnel)
 *     responses:
 *       200:
 *         description: Résultat calculé avec succès
 *       400:
 *         description: Paramètres manquants ou invalides
 *       401:
 *         description: Non authentifié
 */
router.get(
  '/resultat',
  authenticate,
  authorize(['ASSOCIE', 'ADMIN']),
  comptabiliteController.getResultat
);

/**
 * @swagger
 * /api/comptabilite/resultat/mois-courant:
 *   get:
 *     summary: Obtenir le résultat du mois en cours
 *     tags: [Comptabilité]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: siteLavageId
 *         schema:
 *           type: integer
 *         description: Filtre par site de laverie (optionnel)
 *     responses:
 *       200:
 *         description: Résultat du mois calculé avec succès
 *       401:
 *         description: Non authentifié
 */
router.get(
  '/resultat/mois-courant',
  authenticate,
  authorize(['ASSOCIE', 'ADMIN']),
  comptabiliteController.getResultatMoisCourant
);

/**
 * @swagger
 * /api/comptabilite/resultat/annee-courante:
 *   get:
 *     summary: Obtenir le résultat de l'année en cours
 *     tags: [Comptabilité]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: siteLavageId
 *         schema:
 *           type: integer
 *         description: Filtre par site de laverie (optionnel)
 *     responses:
 *       200:
 *         description: Résultat de l'année calculé avec succès
 *       401:
 *         description: Non authentifié
 */
router.get(
  '/resultat/annee-courante',
  authenticate,
  authorize(['ASSOCIE', 'ADMIN']),
  comptabiliteController.getResultatAnneeCourante
);

// ============================================
// SIG (Soldes Intermédiaires de Gestion)
// ============================================

/**
 * @swagger
 * /api/comptabilite/sig:
 *   get:
 *     summary: Obtenir le SIG d'une période
 *     tags: [Comptabilité]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: dateDebut
 *         required: true
 *         schema:
 *           type: string
 *           format: date
 *         description: Date de début de la période
 *       - in: query
 *         name: dateFin
 *         required: true
 *         schema:
 *           type: string
 *           format: date
 *         description: Date de fin de la période
 *       - in: query
 *         name: siteLavageId
 *         schema:
 *           type: integer
 *         description: Filtre par site de laverie (optionnel)
 *     responses:
 *       200:
 *         description: SIG calculé avec succès
 *       400:
 *         description: Paramètres manquants ou invalides
 *       401:
 *         description: Non authentifié
 */
router.get(
  '/sig',
  authenticate,
  authorize(['ASSOCIE', 'ADMIN']),
  comptabiliteController.getSIG
);

/**
 * @swagger
 * /api/comptabilite/sig/mensuel:
 *   get:
 *     summary: Obtenir le SIG mensuel d'une année
 *     tags: [Comptabilité]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: annee
 *         required: true
 *         schema:
 *           type: integer
 *         description: Année
 *       - in: query
 *         name: siteLavageId
 *         schema:
 *           type: integer
 *         description: Filtre par site de laverie (optionnel)
 *     responses:
 *       200:
 *         description: SIG mensuel calculé avec succès
 *       400:
 *         description: Paramètres manquants ou invalides
 *       401:
 *         description: Non authentifié
 */
router.get(
  '/sig/mensuel',
  authenticate,
  authorize(['ASSOCIE', 'ADMIN']),
  comptabiliteController.getSIGMensuel
);

/**
 * @swagger
 * /api/comptabilite/sig/annuel:
 *   get:
 *     summary: Obtenir le SIG annuel
 *     tags: [Comptabilité]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: annee
 *         required: true
 *         schema:
 *           type: integer
 *         description: Année
 *       - in: query
 *         name: siteLavageId
 *         schema:
 *           type: integer
 *         description: Filtre par site de laverie (optionnel)
 *     responses:
 *       200:
 *         description: SIG annuel calculé avec succès
 *       400:
 *         description: Paramètres manquants ou invalides
 *       401:
 *         description: Non authentifié
 */
router.get(
  '/sig/annuel',
  authenticate,
  authorize(['ASSOCIE', 'ADMIN']),
  comptabiliteController.getSIGAnnuel
);

// ============================================
// BILAN
// ============================================

/**
 * @swagger
 * /api/comptabilite/bilan:
 *   get:
 *     summary: Obtenir le bilan à une date donnée
 *     tags: [Comptabilité]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: dateReference
 *         schema:
 *           type: string
 *           format: date-time
 *         description: Date de référence (par défaut = maintenant)
 *       - in: query
 *         name: siteLavageId
 *         schema:
 *           type: integer
 *         description: Filtre par site de laverie (optionnel)
 *     responses:
 *       200:
 *         description: Bilan calculé avec succès
 *       401:
 *         description: Non authentifié
 */
router.get(
  '/bilan',
  authenticate,
  authorize(['ASSOCIE', 'ADMIN']),
  comptabiliteController.getBilan
);

// ============================================
// CLÔTURE DE PÉRIODE
// ============================================

/**
 * @swagger
 * /api/comptabilite/cloture:
 *   post:
 *     summary: Clôturer une période comptable
 *     tags: [Comptabilité]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - dateDebut
 *               - dateFin
 *             properties:
 *               dateDebut:
 *                 type: string
 *                 format: date
 *                 example: "2025-01-01"
 *               dateFin:
 *                 type: string
 *                 format: date
 *                 example: "2025-01-31"
 *               tauxDividende:
 *                 type: number
 *                 minimum: 0
 *                 maximum: 1
 *                 example: 0.3
 *                 description: Pourcentage du résultat distribué en dividendes (0.3 = 30%)
 *               siteLavageId:
 *                 type: integer
 *                 description: Filtre par site de laverie (optionnel)
 *     responses:
 *       201:
 *         description: Période clôturée avec succès
 *       400:
 *         description: Paramètres manquants ou invalides
 *       401:
 *         description: Non authentifié
 *       403:
 *         description: Accès refusé
 */
router.post(
  '/cloture',
  authenticate,
  authorize(['ASSOCIE', 'ADMIN']),
  comptabiliteController.cloturerPeriode
);

// ============================================
// TABLEAU DE BORD
// ============================================

/**
 * @swagger
 * /api/comptabilite/dashboard:
 *   get:
 *     summary: Obtenir le tableau de bord en temps réel
 *     tags: [Comptabilité]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: dateReference
 *         schema:
 *           type: string
 *           format: date-time
 *         description: Date de référence (par défaut = maintenant)
 *       - in: query
 *         name: siteLavageId
 *         schema:
 *           type: integer
 *         description: Filtre par site de laverie (optionnel)
 *     responses:
 *       200:
 *         description: Dashboard généré avec succès
 *       401:
 *         description: Non authentifié
 */
router.get(
  '/dashboard',
  authenticate,
  authorize(['ASSOCIE', 'ADMIN']),
  comptabiliteController.getDashboard
);

// ============================================
// RECALCUL
// ============================================

/**
 * @swagger
 * /api/comptabilite/recalcul:
 *   post:
 *     summary: Déclencher un recalcul complet sur une période
 *     tags: [Comptabilité]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - dateDebut
 *               - dateFin
 *             properties:
 *               dateDebut:
 *                 type: string
 *                 format: date
 *                 example: "2025-01-01"
 *               dateFin:
 *                 type: string
 *                 format: date
 *                 example: "2025-01-31"
 *               siteLavageId:
 *                 type: integer
 *                 description: Filtre par site de laverie (optionnel)
 *     responses:
 *       200:
 *         description: Recalcul effectué avec succès
 *       400:
 *         description: Paramètres manquants ou invalides
 *       401:
 *         description: Non authentifié
 *       403:
 *         description: Accès refusé
 */
router.post(
  '/recalcul',
  authenticate,
  authorize(['ASSOCIE', 'ADMIN']),
  comptabiliteController.recalculerPeriode
);

module.exports = router;
