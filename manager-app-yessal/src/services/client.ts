import axios from 'axios';
import apiClient from '@/lib/axios';
import AuthService from './auth';
import { API_URL } from '@/config/env';

// Interface Client pour la recherche et sélection de clients (page Search)
export interface Client {
  id: number;
  nom: string;
  prenom: string;
  email: string | null;
  telephone: string | null;
  adresseText: string | null;
  typeClient: 'Standard' | 'Premium';
  carteNumero: string | null;
  estEtudiant: boolean;
  mensuelleUsage?: number;
  coordonnees?: {
    latitude: number;
    longitude: number;
  };
  fidelite?: {
    numeroCarteFidelite: string;
    nombreLavageTotal: number;
    poidsTotalLaveKg: number;
    lavagesGratuits6kgRestants: number;
    lavagesGratuits20kgRestants: number;
  };
  abonnementPremium?: {
    id: number;
    annee: number;
    mois: number;
    limiteKg: number;
    kgUtilises: number;
  };
}

// Interface User pour la gestion des clients (page Clients)
export interface User {
  id: number;
  role: 'Client' | 'Manager';
  nom: string;
  prenom: string;
  email: string | null;
  telephone: string | null;
  adresseText: string | null;
  latitude: number | null;
  longitude: number | null;
  aGeolocalisationEnregistree: boolean;
  typeClient: 'Standard' | 'Premium' | null;
  siteLavagePrincipalGerantId: number | null;
  createdAt: string;
  updatedAt: string;
  estEtudiant?: boolean;
  fidelite?: {
    numeroCarteFidelite: string;
    nombreLavageTotal: number;
    poidsTotalLaveKg: number;
    lavagesGratuits6kgRestants: number;
    lavagesGratuits20kgRestants: number;
  };
  abonnementsPremium?: {
    id: number;
    annee: number;
    mois: number;
    limiteKg: number;
    kgUtilises: number;
    createdAt: string;
  }[];
}

// Interface ClientInvite pour les invités avec propriété creerCompte
export interface ClientInvite {
  id?: number;
  nom: string | null;
  prenom: string | null;
  telephone: string | null;
  email: string | null;
  adresseText: string | null;
  estEtudiant?: boolean;
  creerCompte?: boolean; // Propriété pour savoir si le client veut créer un compte
  password?: string;
}

export interface CreateUserData {
  role: 'Client';
  nom: string;
  prenom: string;
  email?: string | null;
  telephone?: string | null;
  password: string;
  adresseText?: string | null;
  latitude?: number;
  longitude?: number;
  typeClient: 'Standard' | 'Premium';
  estEtudiant?: boolean;
  siteLavagePrincipalGerantId?: number;
}

export interface UpdateUserData {
  nom?: string;
  prenom?: string;
  email?: string;
  telephone?: string;
  adresseText?: string;
  latitude?: number;
  longitude?: number;
  typeClient?: 'Standard' | 'Premium';
  estEtudiant?: boolean;
  siteLavagePrincipalGerantId?: number;
}

export interface CreateClientInviteData {
  nom?: string;
  prenom?: string;
  telephone?: string;
  email?: string;
  adresseText?: string;
}

export interface ClientsResponse {
  users: User[];
  clientsInvites: ClientInvite[];
  totalUsers: number;
  totalInvites: number;
  page: number;
  limit: number;
  totalPages: number;
}

class ClientService {
  // ========== MÉTHODES POUR LA PAGE SEARCH ==========
  
  /**
   * Rechercher des clients pour la page Search
   */
  static async searchClients(query: string): Promise<Client[]> {
    try {
      const response = await apiClient.get<{ success: boolean; data: any[] }>(
        `/clients/search?q=${encodeURIComponent(query)}`
      );

      // Mapper les données pour inclure carteNumero
      const mappedClients: Client[] = response.data.data.map((client: any) => ({
        ...client,
        carteNumero: client.fidelite?.numeroCarteFidelite || null
      }));

      return mappedClients;
    } catch (error) {
      console.error('Erreur lors de la recherche de clients:', error);
      return [];
    }
  }

  /**
   * Obtenir les détails d'un client pour la page Search
   */
  static async getClientDetails(clientId: number): Promise<Client | null> {
    try {
      const response = await apiClient.get<{ success: boolean; data: any }>(
        `/clients/${clientId}`
      );

      // Mapper les données pour inclure carteNumero
      const client = response.data.data;
      const mappedClient: Client = {
        ...client,
        carteNumero: client.fidelite?.numeroCarteFidelite || null
      };

      return mappedClient;
    } catch (error) {
      console.error('Erreur lors de la récupération des détails du client:', error);
      return null;
    }
  }

  /**
   * Vérifier si un client existe déjà
   */
  static async checkClientExists(telephone?: string, email?: string): Promise<{ exists: boolean; message: string }> {
    try {
      const response = await apiClient.post('/clients/check', {
        telephone,
        email
      });
      return response.data;
    } catch (error) {
      console.error('Erreur lors de la vérification du client:', error);
      throw error;
    }
  }

  /**
   * Créer un compte client
   */
  static async createClient(clientData: ClientInvite): Promise<{ success: boolean; client?: Client; message: string }> {
    try {
      // Extraire seulement les champs autorisés par l'API (sans creerCompte)
      const apiPayload = {
        nom: clientData.nom,
        prenom: clientData.prenom,
        telephone: clientData.telephone,
        email: clientData.email || undefined,
        adresseText: clientData.adresseText || undefined
      };

      const response = await apiClient.post('/clients', apiPayload);

      // Transformer la réponse pour correspondre à l'interface attendue
      const createdClient = response.data.data;
      const mappedClient: Client = {
        ...createdClient,
        carteNumero: null // Sera mis à jour après initialisation de la fidélité
      };

      return {
        success: true,
        client: mappedClient,
        message: 'Compte client créé avec succès'
      };
    } catch (error) {
      console.error('Erreur lors de la création du client:', error);
      
      // Extraire le message d'erreur de la réponse
      if (axios.isAxiosError(error) && error.response?.data?.message) {
        return {
          success: false,
          message: error.response.data.message
        };
      }
      
      return {
        success: false,
        message: 'Erreur lors de la création du compte client'
      };
    }
  }

  /**
   * Créer un client invité
   */
  static async createGuestClient(clientData: ClientInvite): Promise<{ success: boolean; clientId?: number }> {
    try {
      const response = await apiClient.post<{ success: boolean; data: { id: number } }>(
        '/clients/guest',
        clientData
      );

      return {
        success: true,
        clientId: response.data.data.id
      };
    } catch (error) {
      console.error('Erreur lors de la création du client invité:', error);
      return { success: false };
    }
  }

  /**
   * Créer un compte client
   */
  static async createClientAccount(clientData: ClientInvite): Promise<{ success: boolean; clientId?: number }> {
    try {
      const token = AuthService.getToken();
      if (!token) {
        throw new Error('Non authentifié');
      }

      const response = await apiClient.post<{ success: boolean; data: { id: number } }>(
        '/clients',
        clientData
      );

      return {
        success: true,
        clientId: response.data.data.id
      };
    } catch (error) {
      console.error('Erreur lors de la création du compte client:', error);
      return { success: false };
    }
  }

  // ========== MÉTHODES POUR LA PAGE CLIENTS ==========

  /**
   * Obtenir la liste des utilisateurs clients avec pagination et filtres
   */
  static async getUsers(
    page: number = 1, 
    limit: number = 10, 
    filters: {
      search?: string;
      typeClient?: 'Standard' | 'Premium';
      siteLavageId?: number;
      estEtudiant?: boolean;
    } = {}
  ): Promise<{
    users: User[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    try {
      let url = `/users?role=Client&page=${page}&limit=${limit}`;
      
      if (filters.search) {
        url += `&search=${encodeURIComponent(filters.search)}`;
      }
      
      if (filters.typeClient) {
        url += `&typeClient=${filters.typeClient}`;
      }
      
      if (filters.siteLavageId) {
        url += `&siteLavageId=${filters.siteLavageId}`;
      }
      
      if (filters.estEtudiant !== undefined) {
        url += `&estEtudiant=${filters.estEtudiant}`;
      }

      const response = await apiClient.get<{
        success: boolean;
        data: User[];
        meta: {
          total: number;
          page: number;
          limit: number;
          totalPages: number;
        };
      }>(url);

      return {
        users: response.data.data,
        total: response.data.meta.total,
        page: response.data.meta.page,
        limit: response.data.meta.limit,
        totalPages: response.data.meta.totalPages
      };
    } catch (error) {
      console.error('Erreur lors de la récupération des clients:', error);
      return {
        users: [],
        total: 0,
        page: 1,
        limit: 10,
        totalPages: 0
      };
    }
  }

  /**
   * Obtenir la liste des clients invités
   */
  static async getClientInvites(
    page: number = 1,
    limit: number = 10,
    search?: string
  ): Promise<{
    clientsInvites: ClientInvite[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    try {
      let url = `/users/invites?page=${page}&limit=${limit}`;
      
      if (search) {
        url += `&search=${encodeURIComponent(search)}`;
      }

      const response = await apiClient.get<{
        success: boolean;
        data: ClientInvite[];
        meta: {
          total: number;
          page: number;
          limit: number;
          totalPages: number;
        };
      }>(url);

      return {
        clientsInvites: response.data.data,
        total: response.data.meta.total,
        page: response.data.meta.page,
        limit: response.data.meta.limit,
        totalPages: response.data.meta.totalPages
      };
    } catch (error) {
      console.error('Erreur lors de la récupération des clients invités:', error);
      return {
        clientsInvites: [],
        total: 0,
        page: 1,
        limit: 10,
        totalPages: 0
      };
    }
  }

  /**
   * Créer un nouveau client (utilisateur)
   */
  static async createUser(userData: CreateUserData): Promise<{ success: boolean; user?: User; message?: string }> {
    try {
      const response = await apiClient.post<{
        success: boolean;
        data: User;
        message: string;
      }>('/auth/register', {
        ...userData,
        role: 'Client'
      });

      return {
        success: true,
        user: response.data.data,
        message: response.data.message
      };
    } catch (error: any) {
      console.error('Erreur lors de la création du client:', error);
      return {
        success: false,
        message: error.response?.data?.message || 'Erreur lors de la création du client'
      };
    }
  }

  /**
   * Obtenir les détails d'un client
   */
  static async getUserById(userId: number): Promise<User | null> {
    try {
      const response = await apiClient.get<{
        success: boolean;
        data: User;
      }>(`/users/${userId}`);

      return response.data.data;
    } catch (error) {
      console.error('Erreur lors de la récupération du client:', error);
      return null;
    }
  }

  /**
   * Mettre à jour un client
   */
  static async updateUser(userId: number, userData: UpdateUserData): Promise<{ success: boolean; user?: User; message?: string }> {
    try {
      const response = await apiClient.put<{
        success: boolean;
        data: User;
        message: string;
      }>(`/users/${userId}`, userData);

      return {
        success: true,
        user: response.data.data,
        message: response.data.message
      };
    } catch (error: any) {
      console.error('Erreur lors de la mise à jour du client:', error);
      return {
        success: false,
        message: error.response?.data?.message || 'Erreur lors de la mise à jour du client'
      };
    }
  }

  /**
   * Supprimer un client
   */
  static async deleteUser(userId: number): Promise<{ success: boolean; message?: string }> {
    try {
      const response = await apiClient.delete<{
        success: boolean;
        message: string;
      }>(`/users/${userId}`);

      return {
        success: true,
        message: response.data.message
      };
    } catch (error: any) {
      console.error('Erreur lors de la suppression du client:', error);
      return {
        success: false,
        message: error.response?.data?.message || 'Erreur lors de la suppression du client'
      };
    }
  }

  /**
   * Obtenir la liste des sites de lavage (pour les filtres)
   */
  static async getSites(): Promise<Array<{ id: number; nom: string; ville: string }>> {
    try {
      const response = await apiClient.get<{
        success: boolean;
        data: Array<{ id: number; nom: string; ville: string }>;
      }>('/sites');

      return response.data.data;
    } catch (error) {
      console.error('Erreur lors de la récupération des sites:', error);
      return [];
    }
  }

  /**
   * Créer un abonnement premium pour un client
   */
  static async createAbonnementPremium(clientId: number, data: {
    annee: number;
    mois: number;
    limiteKg: number;
  }): Promise<{ success: boolean; message?: string; data?: any }> {
    try {
      const response = await apiClient.post(`/users/${clientId}/abonnement-premium`, data);
      
      return {
        success: true,
        message: response.data.message,
        data: response.data.data
      };
    } catch (error: any) {
      console.error('Erreur lors de la création de l\'abonnement premium:', error);
      return {
        success: false,
        message: error.response?.data?.message || 'Erreur lors de la création de l\'abonnement premium'
      };
    }
  }

  /**
   * Mettre à jour un abonnement premium
   */
  static async updateAbonnementPremium(abonnementId: number, data: {
    limiteKg?: number;
    kgUtilises?: number;
  }): Promise<{ success: boolean; message?: string }> {
    try {
      const response = await apiClient.put(`/users/abonnement-premium/${abonnementId}`, data);
      
      return {
        success: true,
        message: response.data.message
      };
    } catch (error: any) {
      console.error('Erreur lors de la mise à jour de l\'abonnement premium:', error);
      return {
        success: false,
        message: error.response?.data?.message || 'Erreur lors de la mise à jour de l\'abonnement premium'
      };
    }
  }

  /**
   * Supprimer un abonnement premium
   */
  static async deleteAbonnementPremium(abonnementId: number): Promise<{ success: boolean; message?: string }> {
    try {
      const response = await apiClient.delete(`/users/abonnement-premium/${abonnementId}`);
      
      return {
        success: true,
        message: response.data.message
      };
    } catch (error: any) {
      console.error('Erreur lors de la suppression de l\'abonnement premium:', error);
      return {
        success: false,
        message: error.response?.data?.message || 'Erreur lors de la suppression de l\'abonnement premium'
      };
    }
  }
}

export default ClientService;