import axios from 'axios';
import apiClient from '@/lib/axios';
import AuthService from './auth';
import { ClientInvite } from './client';
import { API_URL } from '@/config/env';

export interface OrderOptions {
  aOptionRepassage: boolean;
  aOptionSechage: boolean;
  aOptionLivraison: boolean;
  aOptionExpress: boolean;
}

export interface DeliveryAddress {
  adresseText: string;
  latitude?: number;
  longitude?: number;
}

export interface OrderData {
  clientUserId?: number;
  clientInvite?: ClientInvite;
  siteLavageId: number;
  estEnLivraison: boolean;
  adresseLivraison?: DeliveryAddress;
  masseClientIndicativeKg: number;
  formuleCommande: 'BaseMachine' | 'Detail';
  typeReduction?: 'Etudiant' | 'Ouverture';
  options: OrderOptions;
  modePaiement: 'Espece' | 'MobileMoney' | 'Autre';
  // Prix calculés côté frontend
  prixCalcule: {
    prixBase: number;
    prixOptions: number;
    prixSousTotal: number;
    prixFinal: number;
    formule: 'BaseMachine' | 'Detail';
    options: {
      livraison?: number;
      sechage?: {
        prix: number;
        prixParKg: number;
        poids: number;
      };
      express?: number;
    };
    reduction?: {
      tauxReduction: number;
      montantReduction: number;
      raisonReduction: string | null;
    };
    repartitionMachines?: {
      machine20kg: number;
      machine6kg: number;
    };
    premiumDetails?: {
      quotaMensuel: number;
      cumulMensuel: number;
      quotaRestant: number;
      poidsCouvert: number;
      surplus: number;
      estCouvertParAbonnement: boolean;
    };
  };
}

export interface Order {
  id: number;
  clientUserId?: number;
  clientInviteId?: number;
  siteLavageId: number;
  gerantCreationUserId: number;
  gerantReceptionUserId?: number;
  livreurId?: number;
  dateHeureCommande: string;
  dateDernierStatutChange: string;
  statut: 'PrisEnCharge' | 'LavageEnCours' | 'Repassage' | 'Collecte' | 'Livraison' | 'Livre';
  masseClientIndicativeKg: number;
  masseVerifieeKg?: number;
  estEnLivraison: boolean;
  prixTotal?: number;
  formuleCommande: 'BaseMachine' | 'Detail';
  typeReduction?: 'Etudiant' | 'Ouverture';
  modePaiement?: 'Espece' | 'MobileMoney' | 'Autre';
  createdAt: string;
  updatedAt: string;
  
  // Relations
  clientUser?: {
    id: number;
    nom: string;
    prenom: string;
    email: string | null;
    telephone: string | null;
    typeClient: 'Standard' | 'Premium';
    carteNumero?: string | null;
  };
  clientInvite?: {
    id: number;
    nom: string | null;
    telephone: string | null;
    email: string | null;
  };
  siteLavage?: {
    id: number;
    nom: string;
    adresseText: string;
    ville: string;
  };
  gerantCreation?: {
    id: number;
    nom: string;
    prenom: string;
  };
  gerantReception?: {
    id: number;
    nom: string;
    prenom: string;
  };
  livreur?: {
    id: number;
    nom: string;
    prenom: string;
    telephone: string | null;
    moyenLivraison: string | null;
  };
  options: OrderOptions;
  adresseLivraison?: DeliveryAddress[];
  paiements?: {
    id: number;
    montant: number;
    mode: 'Espece' | 'MobileMoney' | 'Autre';
    datePaiement: string;
    statut: 'EnAttente' | 'Paye' | 'Echoue';
  }[];
  historiqueStatuts?: {
    id: number;
    statut: 'PrisEnCharge' | 'LavageEnCours' | 'Repassage' | 'Collecte' | 'Livraison' | 'Livre';
    dateHeureChangement: string;
  }[];
  repartitionMachines?: {
    id: number;
    typeMachine: string;
    quantite: number;
    prixUnitaire: number;
  }[];
  priceDetails?: {
    basePrice: number;
    reductionAmount: number;
    deliveryPrice: number;
    ironingPrice: number;
    dryingPrice: number;
    totalPrice: number;
    breakdown: any;
  };
}

class OrderService {
  /**
   * Créer une nouvelle commande
   */
  static async createOrder(orderData: OrderData): Promise<{ success: boolean; order?: Order }> {
    try {
      const response = await apiClient.post<{ success: boolean; data: { order: Order } }>(
        '/orders',
        orderData
      );

      return {
        success: true,
        order: response.data.data.order
      };
    } catch (error) {
      console.error('Erreur lors de la création de la commande:', error);
      return { success: false };
    }
  }

  /**
   * Obtenir la liste des commandes avec pagination et filtrage par statut, site et recherche
   */
  static async getOrders(page: number = 1, limit: number = 10, status?: string, siteLavageId?: number, search?: string): Promise<{
    orders: Order[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    try {
      let url = `/orders?page=${page}&limit=${limit}`;
      
      // Ajouter le filtre de statut si fourni et différent de 'all'
      if (status && status !== 'all') {
        url += `&status=${status}`;
      }

      // Ajouter le filtre de site de lavage si fourni
      if (siteLavageId) {
        url += `&siteLavageId=${siteLavageId}`;
      }

      // Ajouter le paramètre de recherche si fourni
      if (search && search.trim()) {
        url += `&search=${encodeURIComponent(search.trim())}`;
      }

      const response = await apiClient.get<{ 
        success: boolean; 
        data: Order[];
        meta: {
          total: number;
          page: number;
          limit: number;
          totalPages: number;
        }
      }>(url);

      return {
        orders: response.data.data,
        total: response.data.meta.total,
        page: response.data.meta.page,
        limit: response.data.meta.limit,
        totalPages: response.data.meta.totalPages
      };
    } catch (error) {
      console.error('Erreur lors de la récupération des commandes:', error);
      return {
        orders: [],
        total: 0,
        page: 1,
        limit: 10,
        totalPages: 0
      };
    }
  }

  /**
   * Obtenir les détails d'une commande
   */
  static async getOrderDetails(orderId: number): Promise<Order | null> {
    try {
      const response = await apiClient.get<{ success: boolean; data: Order }>(`/orders/${orderId}`);

      return response.data.data;
    } catch (error) {
      console.error('Erreur lors de la récupération des détails de la commande:', error);
      return null;
    }
  }

  /**
   * Mettre à jour une commande
   */
  static async updateOrder(orderId: number, updateData: {
    masseVerifieeKg?: number;
    statut?: 'PrisEnCharge' | 'LavageEnCours' | 'Repassage' | 'Collecte' | 'Livraison' | 'Livre';
    livreurId?: number;
    gerantReceptionUserId?: number;
    modePaiement?: 'Espece' | 'MobileMoney' | 'Autre';
    typeReduction?: 'Etudiant' | 'Ouverture';
    options?: Partial<OrderOptions>;
  }): Promise<{ success: boolean; order?: Order }> {
    try {
      const response = await apiClient.put<{ success: boolean; data: Order }>(
        `/orders/${orderId}`,
        updateData
      );

      return {
        success: true,
        order: response.data.data
      };
    } catch (error) {
      console.error('Erreur lors de la mise à jour de la commande:', error);
      return { success: false };
    }
  }

  /**
   * Ajouter un paiement à une commande
   */
  static async addPayment(orderId: number, paymentData: {
    montant: number;
    mode: 'Espece' | 'MobileMoney' | 'Autre';
    statut?: 'EnAttente' | 'Paye' | 'Echoue';
  }): Promise<{ success: boolean; payment?: any }> {
    try {
      const response = await apiClient.post<{ success: boolean; data: any }>(
        `/orders/${orderId}/payment`,
        paymentData
      );

      return {
        success: true,
        payment: response.data.data
      };
    } catch (error) {
      console.error('Erreur lors de l\'ajout du paiement:', error);
      return { success: false };
    }
  }

  /**
   * Supprimer une commande
   */
  static async deleteOrder(orderId: number): Promise<{ success: boolean }> {
    try {
      await apiClient.delete(`/orders/${orderId}`);

      return { success: true };
    } catch (error) {
      console.error('Erreur lors de la suppression de la commande:', error);
      return { success: false };
    }
  }

  /**
   * Obtenir les commandes avec filtres
   */
  static async getOrdersWithFilters(filters: {
    status?: string;
    clientId?: number;
    siteLavageId?: number;
    gerantId?: number;
    livreurId?: number;
    dateFrom?: string;
    dateTo?: string;
    estEnLivraison?: boolean;
    page?: number;
    limit?: number;
  } = {}): Promise<{
    orders: Order[];
    total: number;
    page: number;
    limit: number;
  } | null> {
    try {
      // Construire les paramètres de requête
      const params = new URLSearchParams();
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          params.append(key, value.toString());
        }
      });

      const response = await apiClient.get<{ 
        success: boolean; 
        data: {
          orders: Order[];
          total: number;
          page: number;
          limit: number;
        }
      }>(`/orders?${params.toString()}`);

      return response.data.data;
    } catch (error) {
      console.error('Erreur lors de la récupération des commandes filtrées:', error);
      return null;
    }
  }
}

export default OrderService; 