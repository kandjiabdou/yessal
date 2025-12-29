const shopService = require('../services/shopService');
const { ValidationError } = require('../utils/errors');

/**
 * Contrôleur pour la gestion de la boutique
 */
class ShopController {
  // ============================================
  // CATÉGORIES
  // ============================================

  async getCategories(req, res, next) {
    try {
      const categories = await shopService.getCategories();
      res.json({
        success: true,
        data: categories
      });
    } catch (error) {
      next(error);
    }
  }

  async createCategory(req, res, next) {
    try {
      const category = await shopService.createCategory(req.body);
      res.status(201).json({
        success: true,
        data: category,
        message: 'Catégorie créée avec succès'
      });
    } catch (error) {
      next(error);
    }
  }

  async updateCategory(req, res, next) {
    try {
      const category = await shopService.updateCategory(req.params.id, req.body);
      res.json({
        success: true,
        data: category,
        message: 'Catégorie mise à jour avec succès'
      });
    } catch (error) {
      next(error);
    }
  }

  async deleteCategory(req, res, next) {
    try {
      const result = await shopService.deleteCategory(req.params.id);
      res.json({
        success: true,
        message: result.message
      });
    } catch (error) {
      next(error);
    }
  }

  // ============================================
  // PRODUITS
  // ============================================

  async getProducts(req, res, next) {
    try {
      const filters = {
        categorieId: req.query.categorieId,
        search: req.query.search,
        actif: req.query.actif
      };

      const products = await shopService.getProducts(filters);
      res.json({
        success: true,
        data: products
      });
    } catch (error) {
      next(error);
    }
  }

  async getProductById(req, res, next) {
    try {
      const product = await shopService.getProductById(req.params.id);
      res.json({
        success: true,
        data: product
      });
    } catch (error) {
      next(error);
    }
  }

  async createProduct(req, res, next) {
    try {
      const product = await shopService.createProduct(req.body);
      res.status(201).json({
        success: true,
        data: product,
        message: 'Produit créé avec succès'
      });
    } catch (error) {
      next(error);
    }
  }

  async updateProduct(req, res, next) {
    try {
      const product = await shopService.updateProduct(req.params.id, req.body);
      res.json({
        success: true,
        data: product,
        message: 'Produit mis à jour avec succès'
      });
    } catch (error) {
      next(error);
    }
  }

  async deleteProduct(req, res, next) {
    try {
      const result = await shopService.deleteProduct(req.params.id);
      res.json({
        success: true,
        message: result.message
      });
    } catch (error) {
      next(error);
    }
  }

  // ============================================
  // STOCK
  // ============================================

  async getSiteStock(req, res, next) {
    try {
      const { siteLavageId } = req.params;

      const filters = {
        lowStock: req.query.lowStock,
        categorieId: req.query.categorieId,
        search: req.query.search
      };

      const stocks = await shopService.getSiteStock(siteLavageId, filters);
      
      // Mapper les noms de colonnes du schéma vers le format attendu par le frontend
      const mappedStocks = stocks.map(stock => ({
        produitId: stock.produitId,
        siteLavageId: stock.siteLavageId,
        quantiteDisponible: stock.stock,
        seuilAlerte: stock.stockAlerte,
        prixVente: stock.prixVente,
        produit: {
          ...stock.produit,
          imageUrl: stock.produit.image
        }
      }));
      
      res.json({
        success: true,
        data: mappedStocks
      });
    } catch (error) {
      next(error);
    }
  }

  async getProductStock(req, res, next) {
    try {
      const { produitId, siteLavageId } = req.params;
      const stock = await shopService.getProductStock(produitId, siteLavageId);
      res.json({
        success: true,
        data: stock
      });
    } catch (error) {
      next(error);
    }
  }

  async initializeStock(req, res, next) {
    try {
      const { produitId, siteLavageId } = req.params;
      const stock = await shopService.initializeStock(produitId, siteLavageId, req.body);
      res.status(201).json({
        success: true,
        data: stock,
        message: 'Stock initialisé avec succès'
      });
    } catch (error) {
      next(error);
    }
  }

  async updateStock(req, res, next) {
    try {
      const { produitId, siteLavageId } = req.params;
      const stock = await shopService.updateStock(produitId, siteLavageId, req.body);
      res.json({
        success: true,
        data: stock,
        message: 'Stock mis à jour avec succès'
      });
    } catch (error) {
      next(error);
    }
  }

  async adjustStock(req, res, next) {
    try {
      const { produitId, siteLavageId } = req.params;
      const managerUserId = req.user.id;

      const stock = await shopService.adjustStock(produitId, siteLavageId, req.body, managerUserId);
      res.json({
        success: true,
        data: stock,
        message: 'Stock ajusté avec succès'
      });
    } catch (error) {
      next(error);
    }
  }

  async getStockMovements(req, res, next) {
    try {
      const { siteLavageId } = req.params;

      const filters = {
        produitId: req.query.produitId,
        type: req.query.type,
        startDate: req.query.startDate,
        endDate: req.query.endDate
      };

      const movements = await shopService.getStockMovements(siteLavageId, filters);
      res.json({
        success: true,
        data: movements
      });
    } catch (error) {
      next(error);
    }
  }

  // ============================================
  // VENTES
  // ============================================

  async createSale(req, res, next) {
    try {
      const managerUserId = req.user.id;

      // Note: Un manager peut créer des ventes pour n'importe quel site
      // car il peut gérer plusieurs sites via les sessions de travail

      const vente = await shopService.createSale(req.body, managerUserId);
      res.status(201).json({
        success: true,
        data: vente,
        message: 'Vente enregistrée avec succès'
      });
    } catch (error) {
      next(error);
    }
  }

  async getSales(req, res, next) {
    try {
      const { siteLavageId } = req.params;

      const filters = {
        startDate: req.query.startDate,
        endDate: req.query.endDate,
        clientUserId: req.query.clientUserId,
        managerUserId: req.query.managerUserId
      };

      const sales = await shopService.getSales(siteLavageId, filters);
      res.json({
        success: true,
        data: sales
      });
    } catch (error) {
      next(error);
    }
  }

  async getSaleById(req, res, next) {
    try {
      const sale = await shopService.getSaleById(req.params.id);
      res.json({
        success: true,
        data: sale
      });
    } catch (error) {
      next(error);
    }
  }

  async getSalesStats(req, res, next) {
    try {
      const { siteLavageId } = req.params;

      const filters = {
        startDate: req.query.startDate,
        endDate: req.query.endDate
      };

      const stats = await shopService.getSalesStats(siteLavageId, filters);
      res.json({
        success: true,
        data: stats
      });
    } catch (error) {
      next(error);
    }
  }

  async getTodayShopData(req, res, next) {
    try {
      const { siteLavageId } = req.params;
      const data = await shopService.getTodayShopData(parseInt(siteLavageId));
      res.json({
        success: true,
        data
      });
    } catch (error) {
      next(error);
    }
  }

  async getPeriodShopData(req, res, next) {
    try {
      const { siteLavageId } = req.params;
      const { period = 'week', offset = '0' } = req.query;
      const data = await shopService.getPeriodShopData(
        parseInt(siteLavageId),
        period,
        parseInt(offset)
      );
      res.json({
        success: true,
        data
      });
    } catch (error) {
      next(error);
    }
  }

  async cancelSale(req, res, next) {
    try {
      const { id } = req.params;
      const managerUserId = req.user.id;

      await shopService.cancelSale(id, managerUserId);
      res.json({
        success: true,
        message: 'Vente annulée avec succès'
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new ShopController();
