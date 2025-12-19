/// <reference types="jest" />
import ShopService, { 
  Category, 
  Product, 
  Stock, 
  Sale,
  SaleLine,
  SaleLineDetail,
  StockMovement,
  SalesStats,
  CreateProductData,
  UpdateProductData,
  CreateCategoryData,
  UpdateCategoryData,
  UpdateStockData,
  AdjustStockData,
  CreateSaleData,
  SalesResponse
} from '../src/services/shop';
import apiClient from '../src/lib/axios';

jest.mock('../src/lib/axios');
jest.mock('../src/config/env', () => ({
  API_URL: 'http://localhost:3000',
}));

const mockedApiClient = apiClient as jest.Mocked<typeof apiClient>;

describe('ShopService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Categories', () => {
    describe('getCategories', () => {
      it('devrait retourner toutes les catégories', async () => {
        const mockCategories: Category[] = [
          { id: 1, nom: 'Détergents', description: 'Produits de nettoyage' },
          { id: 2, nom: 'Accessoires', description: null },
        ];

        mockedApiClient.get.mockResolvedValue({
          data: { success: true, data: mockCategories },
        });

        const result = await ShopService.getCategories();

        expect(mockedApiClient.get).toHaveBeenCalledWith('/shop/categories');
        expect(result).toEqual(mockCategories);
      });

      it('devrait propager les erreurs', async () => {
        mockedApiClient.get.mockRejectedValue(new Error('Network error'));

        await expect(ShopService.getCategories()).rejects.toThrow('Network error');
      });
    });

    describe('createCategory', () => {
      it('devrait créer une catégorie', async () => {
        const newCategory = { nom: 'Nouvelle catégorie', description: 'Test' };
        const mockResponse: Category = { id: 1, ...newCategory };

        mockedApiClient.post.mockResolvedValue({
          data: { success: true, data: mockResponse },
        });

        const result = await ShopService.createCategory(newCategory);

        expect(mockedApiClient.post).toHaveBeenCalledWith('/shop/categories', newCategory);
        expect(result).toEqual(mockResponse);
      });
    });

    describe('updateCategory', () => {
      it('devrait mettre à jour une catégorie', async () => {
        const updateData = { nom: 'Catégorie modifiée' };
        const mockResponse: Category = { id: 1, nom: 'Catégorie modifiée', description: null };

        mockedApiClient.put.mockResolvedValue({
          data: { success: true, data: mockResponse },
        });

        const result = await ShopService.updateCategory(1, updateData);

        expect(mockedApiClient.put).toHaveBeenCalledWith('/shop/categories/1', updateData);
        expect(result).toEqual(mockResponse);
      });
    });

    describe('deleteCategory', () => {
      it('devrait supprimer une catégorie', async () => {
        mockedApiClient.delete.mockResolvedValue({ data: { success: true } });

        await ShopService.deleteCategory(1);

        expect(mockedApiClient.delete).toHaveBeenCalledWith('/shop/categories/1');
      });
    });
  });

  describe('Products', () => {
    describe('getProducts', () => {
      it('devrait retourner tous les produits', async () => {
        const mockProducts: Product[] = [
          {
            id: 1,
            nom: 'Produit 1',
            description: 'Test',
            codeBarres: '123',
            categorieId: 1,
            prixReference: 5000,
            image: null,
            categorie: { id: 1, nom: 'Cat1', description: null },
          },
        ];

        mockedApiClient.get.mockResolvedValue({
          data: { success: true, data: mockProducts },
        });

        const result = await ShopService.getProducts();

        expect(mockedApiClient.get).toHaveBeenCalledWith('/shop/products?');
        expect(result).toEqual(mockProducts);
      });

      it('devrait filtrer par catégorie', async () => {
        mockedApiClient.get.mockResolvedValue({
          data: { success: true, data: [] },
        });

        await ShopService.getProducts({ categorieId: 2 });

        expect(mockedApiClient.get).toHaveBeenCalledWith('/shop/products?categorieId=2');
      });

      it('devrait filtrer par recherche et actif', async () => {
        mockedApiClient.get.mockResolvedValue({
          data: { success: true, data: [] },
        });

        await ShopService.getProducts({ search: 'test', actif: true });

        expect(mockedApiClient.get).toHaveBeenCalledWith('/shop/products?search=test&actif=true');
      });
    });

    describe('getProductById', () => {
      it('devrait retourner un produit par ID', async () => {
        const mockProduct: Product = {
          id: 1,
          nom: 'Produit',
          description: null,
          codeBarres: null,
          categorieId: 1,
          prixReference: 3000,
          image: null,
          categorie: { id: 1, nom: 'Cat', description: null },
        };

        mockedApiClient.get.mockResolvedValue({
          data: { success: true, data: mockProduct },
        });

        const result = await ShopService.getProductById(1);

        expect(mockedApiClient.get).toHaveBeenCalledWith('/shop/products/1');
        expect(result).toEqual(mockProduct);
      });
    });

    describe('createProduct', () => {
      it('devrait créer un produit', async () => {
        const newProduct = {
          nom: 'Nouveau produit',
          categorieId: 1,
          prixVente: 5000,
        };

        const mockResponse: Product = {
          id: 1,
          nom: 'Nouveau produit',
          description: null,
          codeBarres: null,
          categorieId: 1,
          prixReference: 5000,
          image: null,
          categorie: { id: 1, nom: 'Cat', description: null },
        };

        mockedApiClient.post.mockResolvedValue({
          data: { success: true, data: mockResponse },
        });

        const result = await ShopService.createProduct(newProduct);

        expect(mockedApiClient.post).toHaveBeenCalledWith('/shop/products', newProduct);
        expect(result).toEqual(mockResponse);
      });
    });

    describe('updateProduct', () => {
      it('devrait mettre à jour un produit', async () => {
        const updateData = { nom: 'Produit modifié', prixVente: 6000 };
        const mockResponse: Product = {
          id: 1,
          nom: 'Produit modifié',
          description: null,
          codeBarres: null,
          categorieId: 1,
          prixReference: 6000,
          image: null,
          categorie: { id: 1, nom: 'Cat', description: null },
        };

        mockedApiClient.put.mockResolvedValue({
          data: { success: true, data: mockResponse },
        });

        const result = await ShopService.updateProduct(1, updateData);

        expect(mockedApiClient.put).toHaveBeenCalledWith('/shop/products/1', updateData);
        expect(result).toEqual(mockResponse);
      });
    });

    describe('deleteProduct', () => {
      it('devrait supprimer un produit', async () => {
        mockedApiClient.delete.mockResolvedValue({ data: { success: true } });

        await ShopService.deleteProduct(1);

        expect(mockedApiClient.delete).toHaveBeenCalledWith('/shop/products/1');
      });
    });
  });

  describe('Stock', () => {
    describe('getSiteStock', () => {
      it('devrait retourner le stock d\'un site', async () => {
        const mockStock: Stock[] = [
          {
            produitId: 1,
            siteLavageId: 1,
            quantiteDisponible: 10,
            seuilAlerte: 5,
            prixVente: 3000,
            produit: {
              id: 1,
              nom: 'Produit',
              description: null,
              codeBarres: null,
              categorieId: 1,
              prixReference: 3000,
              image: null,
              categorie: { id: 1, nom: 'Cat', description: null },
            },
          },
        ];

        mockedApiClient.get.mockResolvedValue({
          data: { success: true, data: mockStock },
        });

        const result = await ShopService.getSiteStock(1);

        expect(mockedApiClient.get).toHaveBeenCalledWith('/shop/sites/1/stock?');
        expect(result).toEqual(mockStock);
      });

      it('devrait filtrer le stock faible', async () => {
        mockedApiClient.get.mockResolvedValue({
          data: { success: true, data: [] },
        });

        await ShopService.getSiteStock(1, { lowStock: true });

        expect(mockedApiClient.get).toHaveBeenCalledWith('/shop/sites/1/stock?lowStock=true');
      });

      it('devrait filtrer par catégorie et recherche', async () => {
        mockedApiClient.get.mockResolvedValue({
          data: { success: true, data: [] },
        });

        await ShopService.getSiteStock(1, { categorieId: 2, search: 'test' });

        expect(mockedApiClient.get).toHaveBeenCalledWith('/shop/sites/1/stock?categorieId=2&search=test');
      });

      it('devrait gérer les erreurs', async () => {
        mockedApiClient.get.mockRejectedValue(new Error('API Error'));

        await expect(ShopService.getSiteStock(1)).rejects.toThrow('API Error');
      });
    });

    describe('getProductStock', () => {
      it('devrait récupérer le stock d\'un produit', async () => {
        const mockStock: Stock = {
          produitId: 1,
          siteLavageId: 1,
          quantiteDisponible: 50,
          seuilAlerte: 10,
          prixVente: 5000,
          produit: {
            id: 1,
            nom: 'Produit',
            description: null,
            codeBarres: null,
            categorieId: 1,
            prixReference: 5000,
            image: null,
            categorie: { id: 1, nom: 'Cat', description: null },
          }
        };

        mockedApiClient.get.mockResolvedValue({
          data: { success: true, data: mockStock }
        });

        const result = await ShopService.getProductStock(1, 1);
        expect(result).toEqual(mockStock);
        expect(mockedApiClient.get).toHaveBeenCalledWith('/shop/sites/1/products/1/stock');
      });

      it('devrait gérer les erreurs', async () => {
        mockedApiClient.get.mockRejectedValue(new Error('API Error'));
        await expect(ShopService.getProductStock(1, 1)).rejects.toThrow('API Error');
      });
    });

    describe('initializeStock', () => {
      it('devrait initialiser le stock', async () => {
        const stockData: UpdateStockData = { quantite: 100, seuilAlerte: 20 };
        const mockStock: Stock = {
          produitId: 1,
          siteLavageId: 1,
          quantiteDisponible: 100,
          seuilAlerte: 20,
          prixVente: 5000,
          produit: {
            id: 1,
            nom: 'Produit',
            description: null,
            codeBarres: null,
            categorieId: 1,
            prixReference: 5000,
            image: null,
            categorie: { id: 1, nom: 'Cat', description: null },
          }
        };

        mockedApiClient.post.mockResolvedValue({
          data: { success: true, data: mockStock }
        });

        const result = await ShopService.initializeStock(1, 1, stockData);
        expect(result).toEqual(mockStock);
        expect(mockedApiClient.post).toHaveBeenCalledWith('/shop/sites/1/products/1/stock', stockData);
      });

      it('devrait gérer les erreurs', async () => {
        mockedApiClient.post.mockRejectedValue(new Error('API Error'));
        await expect(ShopService.initializeStock(1, 1, { quantite: 100 })).rejects.toThrow('API Error');
      });
    });

    describe('updateStock', () => {
      it('devrait mettre à jour le stock', async () => {
        const stockData: UpdateStockData = { quantite: 150, seuilAlerte: 25 };
        const mockStock: Stock = {
          produitId: 1,
          siteLavageId: 1,
          quantiteDisponible: 150,
          seuilAlerte: 25,
          prixVente: 5500,
          produit: {
            id: 1,
            nom: 'Produit',
            description: null,
            codeBarres: null,
            categorieId: 1,
            prixReference: 5500,
            image: null,
            categorie: { id: 1, nom: 'Cat', description: null },
          }
        };

        mockedApiClient.put.mockResolvedValue({
          data: { success: true, data: mockStock }
        });

        const result = await ShopService.updateStock(1, 1, stockData);
        expect(result).toEqual(mockStock);
        expect(mockedApiClient.put).toHaveBeenCalledWith('/shop/sites/1/products/1/stock', stockData);
      });

      it('devrait gérer les erreurs', async () => {
        mockedApiClient.put.mockRejectedValue(new Error('API Error'));
        await expect(ShopService.updateStock(1, 1, { quantite: 150 })).rejects.toThrow('API Error');
      });
    });

    describe('adjustStock', () => {
      it('devrait ajuster le stock', async () => {
        const adjustData: AdjustStockData = { quantite: 10, motif: 'Réapprovisionnement' };
        const mockStock: Stock = {
          produitId: 1,
          siteLavageId: 1,
          quantiteDisponible: 110,
          seuilAlerte: 20,
          prixVente: 5000,
          produit: {
            id: 1,
            nom: 'Produit',
            description: null,
            codeBarres: null,
            categorieId: 1,
            prixReference: 5000,
            image: null,
            categorie: { id: 1, nom: 'Cat', description: null },
          }
        };

        mockedApiClient.post.mockResolvedValue({
          data: { success: true, data: mockStock }
        });

        const result = await ShopService.adjustStock(1, 1, adjustData);
        expect(result).toEqual(mockStock);
        expect(mockedApiClient.post).toHaveBeenCalledWith('/shop/sites/1/products/1/stock/adjust', adjustData);
      });

      it('devrait gérer les erreurs', async () => {
        mockedApiClient.post.mockRejectedValue(new Error('API Error'));
        await expect(ShopService.adjustStock(1, 1, { quantite: 10, motif: 'Test' })).rejects.toThrow('API Error');
      });
    });

    describe('getStockMovements', () => {
      it('devrait récupérer les mouvements de stock', async () => {
        const mockMovements: StockMovement[] = [
          {
            id: 1,
            produitId: 1,
            siteLavageId: 1,
            type: 'entree',
            quantite: 50,
            dateMouvement: '2025-01-01T00:00:00Z',
            motif: 'Réapprovisionnement',
            produit: {
              id: 1,
              nom: 'Produit',
              description: null,
              codeBarres: null,
              categorieId: 1,
              prixReference: 5000,
              image: null,
              categorie: { id: 1, nom: 'Cat', description: null },
            }
          }
        ];

        mockedApiClient.get.mockResolvedValue({
          data: { success: true, data: mockMovements }
        });

        const result = await ShopService.getStockMovements(1);
        expect(result).toEqual(mockMovements);
        expect(mockedApiClient.get).toHaveBeenCalledWith('/shop/sites/1/stock/movements?');
      });

      it('devrait filtrer les mouvements', async () => {
        mockedApiClient.get.mockResolvedValue({
          data: { success: true, data: [] }
        });

        await ShopService.getStockMovements(1, {
          produitId: 1,
          type: 'entree',
          startDate: '2025-01-01',
          endDate: '2025-12-31'
        });
        expect(mockedApiClient.get).toHaveBeenCalledWith('/shop/sites/1/stock/movements?produitId=1&type=entree&startDate=2025-01-01&endDate=2025-12-31');
      });

      it('devrait gérer les erreurs', async () => {
        mockedApiClient.get.mockRejectedValue(new Error('API Error'));
        await expect(ShopService.getStockMovements(1)).rejects.toThrow('API Error');
      });
    });
  });

  describe('Ventes', () => {
    describe('createSale', () => {
      it('devrait créer une vente', async () => {
        const saleData: CreateSaleData = {
          siteLavageId: 1,
          clientUserId: 1,
          modePaiement: 'Espece',
          lignes: [{ produitId: 1, quantite: 2, prixUnitaire: 8000 }]
        };

        const mockSale: Sale = {
          id: 1,
          numeroFacture: 'FAC-001',
          siteLavageId: 1,
          managerUserId: 1,
          clientUserId: 1,
          dateVente: '2025-01-01T00:00:00Z',
          montantTotal: 16000,
          montantPaye: 16000,
          modePaiement: 'Espece',
          nombreArticles: 2,
          flag: false,
          lignesVente: [
            {
              id: 1,
              venteId: 1,
              produitId: 1,
              quantite: 2,
              prixUnitaire: 8000,
              produit: {
                id: 1,
                nom: 'Produit Test',
                description: 'Description',
                codeBarres: null,
                categorieId: 1,
                prixReference: 8000,
                image: null,
                categorie: { id: 1, nom: 'Cat', description: null }
              }
            }
          ],
          manager: {
            id: 1,
            nom: 'Manager',
            prenom: 'Test'
          }
        };

        mockedApiClient.post.mockResolvedValue({
          data: { success: true, data: mockSale }
        });

        const result = await ShopService.createSale(saleData);
        expect(result).toEqual(mockSale);
        expect(mockedApiClient.post).toHaveBeenCalledWith('/shop/sales', saleData);
      });

      it('devrait gérer les erreurs', async () => {
        mockedApiClient.post.mockRejectedValue(new Error('API Error'));
        await expect(ShopService.createSale({} as CreateSaleData)).rejects.toThrow('API Error');
      });
    });

    describe('getSales', () => {
      it('devrait récupérer les ventes', async () => {
        const mockResponse: SalesResponse = {
          ventes: [
            {
              id: 1,
              numeroFacture: 'FAC-001',
              siteLavageId: 1,
              managerUserId: 1,
              clientUserId: 1,
              dateVente: '2025-01-01T00:00:00Z',
              montantTotal: 16000,
              montantPaye: 16000,
              modePaiement: 'Espece',
              nombreArticles: 2,
              flag: false,
              lignesVente: [],
              manager: {
                id: 1,
                nom: 'Manager',
                prenom: 'Test'
              }
            }
          ],
          total: 1,
          page: 1,
          limit: 10,
          totalPages: 1
        };

        mockedApiClient.get.mockResolvedValue({
          data: { success: true, data: mockResponse }
        });

        const result = await ShopService.getSales(1);
        expect(result).toEqual(mockResponse);
        expect(mockedApiClient.get).toHaveBeenCalledWith('/shop/sites/1/sales?');
      });

      it('devrait filtrer les ventes', async () => {
        mockedApiClient.get.mockResolvedValue({
          data: { success: true, data: { ventes: [], total: 0, page: 1, limit: 10, totalPages: 0 } }
        });

        await ShopService.getSales(1, {
          startDate: '2025-01-01',
          endDate: '2025-12-31',
          clientUserId: 1,
          managerUserId: 1,
          page: 1,
          limit: 20
        });
        expect(mockedApiClient.get).toHaveBeenCalledWith('/shop/sites/1/sales?startDate=2025-01-01&endDate=2025-12-31&clientUserId=1&managerUserId=1&page=1&limit=20');
      });

      it('devrait gérer les erreurs', async () => {
        mockedApiClient.get.mockRejectedValue(new Error('API Error'));
        await expect(ShopService.getSales(1)).rejects.toThrow('API Error');
      });
    });

    describe('getSaleById', () => {
      it('devrait récupérer une vente par ID', async () => {
        const mockSale: Sale = {
          id: 1,
          numeroFacture: 'FAC-001',
          siteLavageId: 1,
          managerUserId: 1,
          clientUserId: 1,
          dateVente: '2025-01-01T00:00:00Z',
          montantTotal: 16000,
          montantPaye: 16000,
          modePaiement: 'Espece',
          nombreArticles: 2,
          flag: false,
          lignesVente: [],
          manager: {
            id: 1,
            nom: 'Manager',
            prenom: 'Test'
          }
        };

        mockedApiClient.get.mockResolvedValue({
          data: { success: true, data: mockSale }
        });

        const result = await ShopService.getSaleById(1);
        expect(result).toEqual(mockSale);
        expect(mockedApiClient.get).toHaveBeenCalledWith('/shop/sales/1');
      });

      it('devrait gérer les erreurs', async () => {
        mockedApiClient.get.mockRejectedValue(new Error('API Error'));
        await expect(ShopService.getSaleById(1)).rejects.toThrow('API Error');
      });
    });

    describe('cancelSale', () => {
      it('devrait annuler une vente', async () => {
        mockedApiClient.post.mockResolvedValue({
          data: { success: true }
        });

        await ShopService.cancelSale(1);
        expect(mockedApiClient.post).toHaveBeenCalledWith('/shop/sales/1/cancel');
      });

      it('devrait gérer les erreurs', async () => {
        mockedApiClient.post.mockRejectedValue(new Error('API Error'));
        await expect(ShopService.cancelSale(1)).rejects.toThrow('API Error');
      });
    });

    describe('getSalesStats', () => {
      it('devrait récupérer les statistiques', async () => {
        const mockStats: SalesStats = {
          ventesCount: 10,
          totalRevenue: 100000,
          lowStockCount: 3,
          totalProducts: 50
        };

        mockedApiClient.get.mockResolvedValue({
          data: { success: true, data: mockStats }
        });

        const result = await ShopService.getSalesStats(1);
        expect(result).toEqual(mockStats);
        expect(mockedApiClient.get).toHaveBeenCalledWith('/shop/sites/1/sales/stats?');
      });

      it('devrait filtrer par dates', async () => {
        mockedApiClient.get.mockResolvedValue({
          data: { 
            success: true, 
            data: { 
              ventesCount: 0,
              totalRevenue: 0,
              lowStockCount: 0,
              totalProducts: 0
            } 
          }
        });

        await ShopService.getSalesStats(1, {
          startDate: '2025-01-01',
          endDate: '2025-12-31'
        });
        expect(mockedApiClient.get).toHaveBeenCalledWith('/shop/sites/1/sales/stats?startDate=2025-01-01&endDate=2025-12-31');
      });

      it('devrait gérer les erreurs', async () => {
        mockedApiClient.get.mockRejectedValue(new Error('API Error'));
        await expect(ShopService.getSalesStats(1)).rejects.toThrow('API Error');
      });
    });
  });
});
