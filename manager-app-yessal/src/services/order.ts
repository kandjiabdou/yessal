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
  id?: number; // Pour les commandes existantes (modification/suppression)
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
  // Ajustement de prix manuel
  ajustementType?: 'Augmentation' | 'Diminution';
  ajustementMethode?: 'Pourcentage' | 'Absolu';
  ajustementValeur?: number;
  ajustementRaison?: string;
  // Timestamps pour les commandes existantes
  createdAt?: string;
  dateHeureCommande?: string;
  // Prix calculés côté frontend
  prixCalcule: {
    prixBase: number;
    prixOptions: number;
    prixSousTotal: number;
    prixFinal: number;
    prixApresReduction: number;
    prixPaye: number; // Prix final après ajustements ET fidélité
    formule: 'BaseMachine' | 'Detail';
    options: {
      livraison?: number;
      sechage?: {
        prix: number;
        prixParKg: number;
        poids: number;
      };
      express?: number;
      repassage?: number;
    };
    reduction?: {
      tauxReduction: number;
      montantReduction: number;
      raisonReduction: string | null;
      prixApresReduction: number;
    };
    ajustement?: {
      type: 'Augmentation' | 'Diminution';
      methode: 'Pourcentage' | 'Absolu';
      valeur: number;
      montant: number;
      raison?: string;
    };
    fidelite?: {
      pointsDisponibles: number;
      pointsFraction: number;
      creditDisponible: number; // Crédit disponible en FCFA
      creditUtilise: number; // Crédit utilisé pour cette commande
      pointsRestants: number; // Points restants (affichage uniquement)
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
  statut: 'PrisEnCharge' | 'LavageEnCours' | 'Repassage' | 'Livraison' | 'Livre';
  masseClientIndicativeKg: number;
  masseVerifieeKg?: number;
  estEnLivraison: boolean;
  prixTotal?: number;
  prixPaye?: number;
  pointsUtilises?: number;
  montantReductionPoints?: number;
  formuleCommande: 'BaseMachine' | 'Detail';
  typeReduction?: 'Etudiant' | 'Ouverture';
  modePaiement?: 'Espece' | 'MobileMoney' | 'Autre';
  ajustementType?: 'Augmentation' | 'Diminution';
  ajustementMethode?: 'Pourcentage' | 'Absolu';
  ajustementValeur?: number;
  ajustementRaison?: string;
  flag: boolean;
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
    estEtudiant: boolean;
    carteNumero?: string | null;
    abonnementPremium?: {
      id: number;
      annee: number;
      mois: number;
      limiteKg: number;
      kgUtilises: number;
    } | null;
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
    statut: 'PrisEnCharge' | 'LavageEnCours' | 'Repassage' | 'Livraison' | 'Livre';
    dateHeureChangement: string;
  }[];
  repartitionMachines?: {
    id: number;
    typeMachine: string;
    quantite: number;
    prixUnitaire: number;
  }[];
  priceDetails?: {
    prixBase: number;
    prixOptions: number;
    prixSousTotal: number;
    prixFinal: number;
    prixApresReduction: number;
    prixPaye: number;
    options?: {
      livraison?: number;
      sechage?: {
        prix: number;
        prixParKg: number;
        nombreUtilisations: number;
      };
      express?: number;
      repassage?: number;
    };
    reduction?: {
      tauxReduction: number;
      montantReduction: number;
      raisonReduction: string | null;
      prixApresReduction: number;
    };
    ajustement?: {
      type: 'Augmentation' | 'Diminution';
      methode: 'Pourcentage' | 'Absolu';
      valeur: number;
      montant: number;
      raison?: string;
    };
    fidelite?: {
      pointsDisponibles: number;
      pointsFraction: number;
      creditDisponible: number;
      creditUtilise: number;
      pointsRestants: number;
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
      surplusDetails?: {
        formule: 'BaseMachine' | 'Detail';
        obligatoire: boolean;
        choixPossible?: ('BaseMachine' | 'Detail')[];
      };
    };
    inclus?: string[];
    // Anciens champs pour compatibilité
    basePrice?: number;
    reductionAmount?: number;
    deliveryPrice?: number;
    ironingPrice?: number;
    dryingPrice?: number;
    totalPrice?: number;
    breakdown?: any;
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
    statut?: 'PrisEnCharge' | 'LavageEnCours' | 'Repassage' | 'Livraison' | 'Livre';
    livreurId?: number;
    gerantReceptionUserId?: number;
    modePaiement?: 'Espece' | 'MobileMoney' | 'Autre';
    typeReduction?: 'Etudiant' | 'Ouverture';
    options?: Partial<OrderOptions>;
    ajustementType?: 'Augmentation' | 'Diminution';
    ajustementMethode?: 'Pourcentage' | 'Absolu';
    ajustementValeur?: number;
    ajustementRaison?: string;
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
   * Mettre à jour une commande avec les champs disponibles
   */
  static async updateOrderFields(orderId: number, orderData: Partial<OrderData>): Promise<{ success: boolean; order?: Order }> {
    try {
      // Préparer les données pour l'endpoint existant
      const updateData: any = {};
      
      if (orderData.masseClientIndicativeKg) {
        updateData.masseVerifieeKg = orderData.masseClientIndicativeKg;
      }
      
      if (orderData.modePaiement) {
        updateData.modePaiement = orderData.modePaiement;
      }
      
      if (orderData.typeReduction !== undefined) {
        updateData.typeReduction = orderData.typeReduction;
      }
      
      if (orderData.options) {
        // Nettoyer les options - garder seulement les champs autorisés
        updateData.options = {
          aOptionRepassage: orderData.options.aOptionRepassage,
          aOptionSechage: orderData.options.aOptionSechage,
          aOptionLivraison: orderData.options.aOptionLivraison,
          aOptionExpress: orderData.options.aOptionExpress
        };
        
        // Synchroniser estEnLivraison avec aOptionLivraison
        updateData.estEnLivraison = orderData.options.aOptionLivraison;
      }

      // Ajustement de prix manuel - TOUJOURS inclure ces champs pour permettre la suppression
      // Si undefined, on envoie null pour nettoyer la base de données
      updateData.ajustementType = orderData.ajustementType || null;
      updateData.ajustementMethode = orderData.ajustementMethode || null;
      updateData.ajustementValeur = orderData.ajustementValeur || null;
      updateData.ajustementRaison = orderData.ajustementRaison || null;

      // NOUVEAU: Inclure les prix calculés côté frontend
      if (orderData.prixCalcule) {
        updateData.prixCalcule = orderData.prixCalcule;
      }

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