import axios from 'axios';
import AuthService from './auth';
import { ClientInvite } from './client';

const API_URL = 'http://localhost:4500/api';

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
      const token = AuthService.getToken();
      if (!token) {
        throw new Error('Non authentifié');
      }

      const response = await axios.post<{ success: boolean; data: { order: Order } }>(
        `${API_URL}/orders`,
        orderData,
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
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
   * Obtenir la liste des commandes
   */
  static async getOrders(): Promise<Order[]> {
    try {
      const token = AuthService.getToken();
      if (!token) {
        throw new Error('Non authentifié');
      }

      const response = await axios.get<{ success: boolean; data: Order[] }>(
        `${API_URL}/orders`,
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );

      return response.data.data;
    } catch (error) {
      console.error('Erreur lors de la récupération des commandes:', error);
      return [];
    }
  }

  /**
   * Obtenir les détails d'une commande
   */
  static async getOrderDetails(orderId: number): Promise<Order | null> {
    try {
      const token = AuthService.getToken();
      if (!token) {
        throw new Error('Non authentifié');
      }

      const response = await axios.get<{ success: boolean; data: Order }>(
        `${API_URL}/orders/${orderId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );

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
      const token = AuthService.getToken();
      if (!token) {
        throw new Error('Non authentifié');
      }

      const response = await axios.put<{ success: boolean; data: Order }>(
        `${API_URL}/orders/${orderId}`,
        updateData,
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
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
      const token = AuthService.getToken();
      if (!token) {
        throw new Error('Non authentifié');
      }

      const response = await axios.post<{ success: boolean; data: any }>(
        `${API_URL}/orders/${orderId}/payment`,
        paymentData,
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
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
      const token = AuthService.getToken();
      if (!token) {
        throw new Error('Non authentifié');
      }

      await axios.delete(
        `${API_URL}/orders/${orderId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );

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
      const token = AuthService.getToken();
      if (!token) {
        throw new Error('Non authentifié');
      }

      // Construire les paramètres de requête
      const params = new URLSearchParams();
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          params.append(key, value.toString());
        }
      });

      const response = await axios.get<{ 
        success: boolean; 
        data: {
          orders: Order[];
          total: number;
          page: number;
          limit: number;
        }
      }>(
        `${API_URL}/orders?${params.toString()}`,
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );

      return response.data.data;
    } catch (error) {
      console.error('Erreur lors de la récupération des commandes filtrées:', error);
      return null;
    }
  }
}

export default OrderService; 