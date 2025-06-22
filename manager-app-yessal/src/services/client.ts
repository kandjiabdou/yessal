import axios from 'axios';
import apiClient from '@/lib/axios';
import AuthService from './auth';
import { API_URL } from '@/config/env';

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

export interface ClientInvite {
  nom: string;
  prenom: string;
  telephone: string;
  email?: string;
  adresseText?: string;
  estEtudiant?: boolean;
  creerCompte?: boolean;
  password?: string;
}

class ClientService {
  /**
   * Rechercher des clients
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
   * Obtenir les détails d'un client
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
}

export default ClientService; 