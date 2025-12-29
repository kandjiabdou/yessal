import apiClient from '@/lib/axios';

// ============================================
// TYPES & INTERFACES
// ============================================

export interface Category {
  id: number;
  nom: string;
  description: string | null;
  _count?: {
    produits: number;
  };
}

export interface Product {
  id: number;
  nom: string;
  description: string | null;
  codeBarres: string | null;
  categorieId: number;
  prixReference: number;
  image: string | null;
  imageUrl?: string | null;
  prixVente?: number;
  categorie: Category;
  packsVenteGros?: WholesalePack[];
}

export interface WholesalePack {
  id: number;
  produitId: number;
  nom: string;
  quantiteUnites: number;
  prixPack: number;
  actif: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Stock {
  produitId: number;
  siteLavageId: number;
  quantiteDisponible: number;
  seuilAlerte: number;
  prixVente: number;
  produit: Product;
}

export interface SaleLine {
  produitId: number;
  quantite: number;
  prixUnitaire: number;
  typeVente?: 'Detail' | 'Gros';
  packVenteGrosId?: number | null;
}

export interface Sale {
  id: number;
  numeroFacture: string;
  siteLavageId: number;
  managerUserId: number;
  clientUserId: number | null;
  dateVente: string;
  montantTotal: number;
  montantPaye: number | null;
  modePaiement: 'Espece' | 'MobileMoney' | 'Autre';
  nombreArticles: number;
  ajustementMethode?: 'Pourcentage' | 'Absolu' | null;
  ajustementRaison?: string | null;
  ajustementType?: 'Augmentation' | 'Diminution' | null;
  ajustementValeur?: number | null;
  flag: boolean;
  lignesVente: SaleLineDetail[];
  clientUser?: {
    id: number;
    nom: string;
    prenom: string;
    telephone: string | null;
  } | null;
  manager: {
    id: number;
    nom: string;
    prenom: string;
  };
}

export interface SaleLineDetail {
  id: number;
  venteId: number;
  produitId: number;
  quantite: number;
  prixUnitaire: number;
  typeVente: 'Detail' | 'Gros';
  packVenteGrosId?: number | null;
  packVenteGros?: WholesalePack | null;
  produit: Product;
}

export interface StockMovement {
  id: number;
  produitId: number;
  siteLavageId: number;
  type: 'entree' | 'sortie' | 'ajustement' | 'vente';
  quantite: number;
  dateMouvement: string;
  motif: string | null;
  produit: Product;
}

export interface SalesStats {
  ventesCount: number;
  totalRevenue: number;
  lowStockCount: number;
  totalProducts: number;
}

export interface ShopTodayStats {
  ventesCount: number;
  totalRevenue: number;
}

export interface ShopPeriodStats {
  ventesCount: number;
  totalRevenue: number;
}

export interface ShopTodayData {
  todayStats: ShopTodayStats;
  recentSales: Sale[];
  siteName: string;
}

export interface ShopPeriodData {
  periodStats: ShopPeriodStats;
  siteName: string;
  periodInfo: {
    startDate: string;
    endDate: string;
    offset: number;
    period: 'day' | 'week' | 'month';
    isCurrentPeriod: boolean;
  };
}

export interface CreateProductData {
  nom: string;
  description?: string;
  codeBarres?: string;
  categorieId: number;
  prixVente: number;
  imageUrl?: string;
  actif?: boolean;
}

export interface UpdateProductData {
  nom?: string;
  description?: string;
  codeBarres?: string;
  categorieId?: number;
  prixVente?: number;
  imageUrl?: string;
  actif?: boolean;
}

export interface CreateCategoryData {
  nom: string;
  description?: string;
}

export interface UpdateCategoryData {
  nom?: string;
  description?: string;
}

export interface UpdateStockData {
  quantite: number;
  seuilAlerte?: number;
  motif?: string;
}

export interface AdjustStockData {
  quantite: number;
  motif?: string;
}

export interface CreateSaleData {
  siteLavageId: number;
  clientUserId?: number | null;
  modePaiement: 'Espece' | 'MobileMoney' | 'Autre';
  lignes: SaleLine[];
  ajustementMethode?: 'Pourcentage' | 'Absolu';
  ajustementRaison?: string;
  ajustementType?: 'Augmentation' | 'Diminution';
  ajustementValeur?: number;
}

export interface SalesResponse {
  ventes: Sale[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// ============================================
// SERVICE
// ============================================

class ShopService {
  // ============================================
  // CATÉGORIES
  // ============================================

  static async getCategories(): Promise<Category[]> {
    try {
      const response = await apiClient.get<{ success: boolean; data: Category[] }>(
        '/shop/categories'
      );
      return response.data.data;
    } catch (error) {
      console.error('Erreur lors de la récupération des catégories:', error);
      throw error;
    }
  }

  static async createCategory(data: CreateCategoryData): Promise<Category> {
    try {
      const response = await apiClient.post<{ success: boolean; data: Category }>(
        '/shop/categories',
        data
      );
      return response.data.data;
    } catch (error) {
      console.error('Erreur lors de la création de la catégorie:', error);
      throw error;
    }
  }

  static async updateCategory(id: number, data: UpdateCategoryData): Promise<Category> {
    try {
      const response = await apiClient.put<{ success: boolean; data: Category }>(
        `/shop/categories/${id}`,
        data
      );
      return response.data.data;
    } catch (error) {
      console.error('Erreur lors de la mise à jour de la catégorie:', error);
      throw error;
    }
  }

  static async deleteCategory(id: number): Promise<void> {
    try {
      await apiClient.delete(`/shop/categories/${id}`);
    } catch (error) {
      console.error('Erreur lors de la suppression de la catégorie:', error);
      throw error;
    }
  }

  // ============================================
  // PRODUITS
  // ============================================

  static async getProducts(filters?: {
    categorieId?: number;
    search?: string;
    actif?: boolean;
  }): Promise<Product[]> {
    try {
      const params = new URLSearchParams();
      if (filters?.categorieId) params.append('categorieId', filters.categorieId.toString());
      if (filters?.search) params.append('search', filters.search);
      if (filters?.actif !== undefined) params.append('actif', filters.actif.toString());

      const response = await apiClient.get<{ success: boolean; data: Product[] }>(
        `/shop/products?${params.toString()}`
      );
      return response.data.data;
    } catch (error) {
      console.error('Erreur lors de la récupération des produits:', error);
      throw error;
    }
  }

  static async getProductById(id: number): Promise<Product> {
    try {
      const response = await apiClient.get<{ success: boolean; data: Product }>(
        `/shop/products/${id}`
      );
      return response.data.data;
    } catch (error) {
      console.error('Erreur lors de la récupération du produit:', error);
      throw error;
    }
  }

  static async createProduct(data: CreateProductData): Promise<Product> {
    try {
      const response = await apiClient.post<{ success: boolean; data: Product }>(
        '/shop/products',
        data
      );
      return response.data.data;
    } catch (error) {
      console.error('Erreur lors de la création du produit:', error);
      throw error;
    }
  }

  static async updateProduct(id: number, data: UpdateProductData): Promise<Product> {
    try {
      const response = await apiClient.put<{ success: boolean; data: Product }>(
        `/shop/products/${id}`,
        data
      );
      return response.data.data;
    } catch (error) {
      console.error('Erreur lors de la mise à jour du produit:', error);
      throw error;
    }
  }

  static async deleteProduct(id: number): Promise<void> {
    try {
      await apiClient.delete(`/shop/products/${id}`);
    } catch (error) {
      console.error('Erreur lors de la suppression du produit:', error);
      throw error;
    }
  }

  // ============================================
  // STOCK
  // ============================================

  static async getSiteStock(
    siteLavageId: number,
    filters?: {
      lowStock?: boolean;
      categorieId?: number;
      search?: string;
    }
  ): Promise<Stock[]> {
    try {
      const params = new URLSearchParams();
      if (filters?.lowStock !== undefined) params.append('lowStock', filters.lowStock.toString());
      if (filters?.categorieId) params.append('categorieId', filters.categorieId.toString());
      if (filters?.search) params.append('search', filters.search);

      const response = await apiClient.get<{ success: boolean; data: Stock[] }>(
        `/shop/sites/${siteLavageId}/stock?${params.toString()}`
      );
      return response.data.data;
    } catch (error) {
      console.error('Erreur lors de la récupération du stock:', error);
      throw error;
    }
  }

  static async getProductStock(produitId: number, siteLavageId: number): Promise<Stock> {
    try {
      const response = await apiClient.get<{ success: boolean; data: Stock }>(
        `/shop/sites/${siteLavageId}/products/${produitId}/stock`
      );
      return response.data.data;
    } catch (error) {
      console.error('Erreur lors de la récupération du stock du produit:', error);
      throw error;
    }
  }

  static async initializeStock(
    produitId: number,
    siteLavageId: number,
    data: UpdateStockData
  ): Promise<Stock> {
    try {
      const response = await apiClient.post<{ success: boolean; data: Stock }>(
        `/shop/sites/${siteLavageId}/products/${produitId}/stock`,
        data
      );
      return response.data.data;
    } catch (error) {
      console.error('Erreur lors de l\'initialisation du stock:', error);
      throw error;
    }
  }

  static async updateStock(
    produitId: number,
    siteLavageId: number,
    data: UpdateStockData
  ): Promise<Stock> {
    try {
      const response = await apiClient.put<{ success: boolean; data: Stock }>(
        `/shop/sites/${siteLavageId}/products/${produitId}/stock`,
        data
      );
      return response.data.data;
    } catch (error) {
      console.error('Erreur lors de la mise à jour du stock:', error);
      throw error;
    }
  }

  static async adjustStock(
    produitId: number,
    siteLavageId: number,
    data: AdjustStockData
  ): Promise<Stock> {
    try {
      const response = await apiClient.post<{ success: boolean; data: Stock }>(
        `/shop/sites/${siteLavageId}/products/${produitId}/stock/adjust`,
        data
      );
      return response.data.data;
    } catch (error) {
      console.error('Erreur lors de l\'ajustement du stock:', error);
      throw error;
    }
  }

  static async getStockMovements(
    siteLavageId: number,
    filters?: {
      produitId?: number;
      type?: string;
      startDate?: string;
      endDate?: string;
    }
  ): Promise<StockMovement[]> {
    try {
      const params = new URLSearchParams();
      if (filters?.produitId) params.append('produitId', filters.produitId.toString());
      if (filters?.type) params.append('type', filters.type);
      if (filters?.startDate) params.append('startDate', filters.startDate);
      if (filters?.endDate) params.append('endDate', filters.endDate);

      const response = await apiClient.get<{ success: boolean; data: StockMovement[] }>(
        `/shop/sites/${siteLavageId}/stock/movements?${params.toString()}`
      );
      return response.data.data;
    } catch (error) {
      console.error('Erreur lors de la récupération des mouvements de stock:', error);
      throw error;
    }
  }

  // ============================================
  // VENTES
  // ============================================

  static async createSale(data: CreateSaleData): Promise<Sale> {
    try {
      const response = await apiClient.post<{ success: boolean; data: Sale }>(
        '/shop/sales',
        data
      );
      return response.data.data;
    } catch (error) {
      console.error('Erreur lors de la création de la vente:', error);
      throw error;
    }
  }

  static async getSales(
    siteLavageId: number,
    filters?: {
      startDate?: string;
      endDate?: string;
      clientUserId?: number;
      managerUserId?: number;
      page?: number;
      limit?: number;
    }
  ): Promise<SalesResponse> {
    try {
      const params = new URLSearchParams();
      if (filters?.startDate) params.append('startDate', filters.startDate);
      if (filters?.endDate) params.append('endDate', filters.endDate);
      if (filters?.clientUserId) params.append('clientUserId', filters.clientUserId.toString());
      if (filters?.managerUserId) params.append('managerUserId', filters.managerUserId.toString());
      if (filters?.page) params.append('page', filters.page.toString());
      if (filters?.limit) params.append('limit', filters.limit.toString());

      const response = await apiClient.get<{ success: boolean; data: SalesResponse }>(
        `/shop/sites/${siteLavageId}/sales?${params.toString()}`
      );
      return response.data.data;
    } catch (error) {
      console.error('Erreur lors de la récupération des ventes:', error);
      throw error;
    }
  }

  static async getSaleById(id: number): Promise<Sale> {
    try {
      const response = await apiClient.get<{ success: boolean; data: Sale }>(
        `/shop/sales/${id}`
      );
      return response.data.data;
    } catch (error) {
      console.error('Erreur lors de la récupération de la vente:', error);
      throw error;
    }
  }

  static async cancelSale(id: number): Promise<void> {
    try {
      await apiClient.post(`/shop/sales/${id}/cancel`);
    } catch (error) {
      console.error('Erreur lors de l\'annulation de la vente:', error);
      throw error;
    }
  }

  static async getSalesStats(
    siteLavageId: number,
    filters?: {
      startDate?: string;
      endDate?: string;
    }
  ): Promise<SalesStats> {
    try {
      const params = new URLSearchParams();
      if (filters?.startDate) params.append('startDate', filters.startDate);
      if (filters?.endDate) params.append('endDate', filters.endDate);

      const response = await apiClient.get<{ success: boolean; data: SalesStats }>(
        `/shop/sites/${siteLavageId}/sales/stats?${params.toString()}`
      );
      return response.data.data;
    } catch (error) {
      console.error('Erreur lors de la récupération des statistiques:', error);
      throw error;
    }
  }

  static async getTodayShopData(siteLavageId: number): Promise<ShopTodayData> {
    try {
      const response = await apiClient.get<{ success: boolean; data: ShopTodayData }>(
        `/shop/sites/${siteLavageId}/today`
      );
      return response.data.data;
    } catch (error) {
      console.error('Erreur lors de la récupération des données du jour:', error);
      throw error;
    }
  }

  static async getPeriodShopData(
    siteLavageId: number,
    offset: number = 0,
    period: 'day' | 'week' | 'month' = 'week'
  ): Promise<ShopPeriodData> {
    try {
      const response = await apiClient.get<{ success: boolean; data: ShopPeriodData }>(
        `/shop/sites/${siteLavageId}/period?period=${period}&offset=${offset}`
      );
      return response.data.data;
    } catch (error) {
      console.error('Erreur lors de la récupération des données de période:', error);
      throw error;
    }
  }
}

export default ShopService;
