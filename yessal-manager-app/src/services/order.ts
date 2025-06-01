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
  formuleCommande: 'BaseMachine' | 'Detail';
  typeReduction?: 'Etudiant' | 'Ouverture';
  modePaiement?: 'Espece' | 'MobileMoney' | 'Autre';
  options: OrderOptions;
  adresseLivraison?: DeliveryAddress;
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
}

export default OrderService; 