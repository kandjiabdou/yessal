const express = require('express');
const router = express.Router();
const shopController = require('../controllers/shopController');
const { authenticate } = require('../middleware/auth');
const { validate, schemas } = require('../middleware/validation');

/**
 * @swagger
 * tags:
 *   name: Boutique
 *   description: Gestion de la boutique (produits, stock, ventes)
 */

// ============================================
// ROUTES CATÉGORIES
// ============================================

/**
 * @swagger
 * /api/shop/categories:
 *   get:
 *     summary: Récupérer toutes les catégories
 *     tags: [Boutique]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Liste des catégories
 */
router.get('/categories', authenticate, shopController.getCategories);

/**
 * @swagger
 * /api/shop/categories:
 *   post:
 *     summary: Créer une catégorie
 *     tags: [Boutique]
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
 *             properties:
 *               nom:
 *                 type: string
 *               description:
 *                 type: string
 *     responses:
 *       201:
 *         description: Catégorie créée
 */
router.post(
  '/categories',
  authenticate,
  validate(schemas.categoryCreate),
  shopController.createCategory
);

/**
 * @swagger
 * /api/shop/categories/{id}:
 *   put:
 *     summary: Mettre à jour une catégorie
 *     tags: [Boutique]
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
 *         description: Catégorie mise à jour
 */
router.put(
  '/categories/:id',
  authenticate,
  validate(schemas.categoryUpdate),
  shopController.updateCategory
);

/**
 * @swagger
 * /api/shop/categories/{id}:
 *   delete:
 *     summary: Supprimer une catégorie
 *     tags: [Boutique]
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
 *         description: Catégorie supprimée
 */
router.delete('/categories/:id', authenticate, shopController.deleteCategory);

// ============================================
// ROUTES PRODUITS
// ============================================

/**
 * @swagger
 * /api/shop/products:
 *   get:
 *     summary: Récupérer tous les produits
 *     tags: [Boutique]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: categorieId
 *         schema:
 *           type: integer
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *       - in: query
 *         name: actif
 *         schema:
 *           type: boolean
 *     responses:
 *       200:
 *         description: Liste des produits
 */
router.get('/products', authenticate, shopController.getProducts);

/**
 * @swagger
 * /api/shop/products/{id}:
 *   get:
 *     summary: Récupérer un produit par ID
 *     tags: [Boutique]
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
 *         description: Détails du produit
 */
router.get('/products/:id', authenticate, shopController.getProductById);

/**
 * @swagger
 * /api/shop/products:
 *   post:
 *     summary: Créer un produit
 *     tags: [Boutique]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       201:
 *         description: Produit créé
 */
router.post(
  '/products',
  authenticate,
  validate(schemas.productCreate),
  shopController.createProduct
);

/**
 * @swagger
 * /api/shop/products/{id}:
 *   put:
 *     summary: Mettre à jour un produit
 *     tags: [Boutique]
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
 *         description: Produit mis à jour
 */
router.put(
  '/products/:id',
  authenticate,
  validate(schemas.productUpdate),
  shopController.updateProduct
);

/**
 * @swagger
 * /api/shop/products/{id}:
 *   delete:
 *     summary: Supprimer un produit
 *     tags: [Boutique]
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
 *         description: Produit supprimé
 */
router.delete('/products/:id', authenticate, shopController.deleteProduct);

// ============================================
// ROUTES STOCK
// ============================================

/**
 * @swagger
 * /api/shop/sites/{siteLavageId}/stock:
 *   get:
 *     summary: Récupérer le stock d'un site
 *     tags: [Boutique]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: siteLavageId
 *         required: true
 *         schema:
 *           type: integer
 *       - in: query
 *         name: lowStock
 *         schema:
 *           type: boolean
 *       - in: query
 *         name: categorieId
 *         schema:
 *           type: integer
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Stock du site
 */
router.get('/sites/:siteLavageId/stock', authenticate, shopController.getSiteStock);

/**
 * @swagger
 * /api/shop/sites/{siteLavageId}/products/{produitId}/stock:
 *   get:
 *     summary: Récupérer le stock d'un produit pour un site
 *     tags: [Boutique]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Stock du produit
 */
router.get(
  '/sites/:siteLavageId/products/:produitId/stock',
  authenticate,
  shopController.getProductStock
);

/**
 * @swagger
 * /api/shop/sites/{siteLavageId}/products/{produitId}/stock:
 *   post:
 *     summary: Initialiser le stock d'un produit pour un site
 *     tags: [Boutique]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       201:
 *         description: Stock initialisé
 */
router.post(
  '/sites/:siteLavageId/products/:produitId/stock',
  authenticate,
  validate(schemas.stockUpdate),
  shopController.initializeStock
);

/**
 * @swagger
 * /api/shop/sites/{siteLavageId}/products/{produitId}/stock:
 *   put:
 *     summary: Mettre à jour le stock
 *     tags: [Boutique]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Stock mis à jour
 */
router.put(
  '/sites/:siteLavageId/products/:produitId/stock',
  authenticate,
  validate(schemas.stockUpdate),
  shopController.updateStock
);

/**
 * @swagger
 * /api/shop/sites/{siteLavageId}/products/{produitId}/stock/adjust:
 *   post:
 *     summary: Ajuster le stock (ajout/retrait)
 *     tags: [Boutique]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Stock ajusté
 */
router.post(
  '/sites/:siteLavageId/products/:produitId/stock/adjust',
  authenticate,
  validate(schemas.stockAdjust),
  shopController.adjustStock
);

/**
 * @swagger
 * /api/shop/sites/{siteLavageId}/stock/movements:
 *   get:
 *     summary: Récupérer les mouvements de stock
 *     tags: [Boutique]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Liste des mouvements
 */
router.get(
  '/sites/:siteLavageId/stock/movements',
  authenticate,
  shopController.getStockMovements
);

// ============================================
// ROUTES VENTES
// ============================================

/**
 * @swagger
 * /api/shop/sales:
 *   post:
 *     summary: Créer une vente
 *     tags: [Boutique]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       201:
 *         description: Vente créée
 */
router.post(
  '/sales',
  authenticate,
  validate(schemas.saleCreate),
  shopController.createSale
);

/**
 * @swagger
 * /api/shop/sites/{siteLavageId}/sales:
 *   get:
 *     summary: Récupérer les ventes d'un site
 *     tags: [Boutique]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: clientUserId
 *         schema:
 *           type: integer
 *       - in: query
 *         name: managerUserId
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Liste des ventes
 */
router.get('/sites/:siteLavageId/sales', authenticate, shopController.getSales);

/**
 * @swagger
 * /api/shop/sales/{id}:
 *   get:
 *     summary: Récupérer une vente par ID
 *     tags: [Boutique]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Détails de la vente
 */
router.get('/sales/:id', authenticate, shopController.getSaleById);

/**
 * @swagger
 * /api/shop/sites/{siteLavageId}/sales/stats:
 *   get:
 *     summary: Récupérer les statistiques de vente
 *     tags: [Boutique]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *     responses:
 *       200:
 *         description: Statistiques de vente
 */
router.get('/sites/:siteLavageId/sales/stats', authenticate, shopController.getSalesStats);

module.exports = router;
