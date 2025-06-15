import axios from 'axios';
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
      const token = AuthService.getToken();
      if (!token) {
        throw new Error('Non authentifié');
      }

      const response = await axios.get<{ success: boolean; data: any[] }>(
        `${API_URL}/clients/search?q=${encodeURIComponent(query)}`,
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
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
      const token = AuthService.getToken();
      if (!token) {
        throw new Error('Non authentifié');
      }

      const response = await axios.get<{ success: boolean; data: any }>(
        `${API_URL}/clients/${clientId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
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
      const token = AuthService.getToken();
      if (!token) {
        throw new Error('Non authentifié');
      }

      const response = await axios.post<{ success: boolean; data: { id: number } }>(
        `${API_URL}/clients/guest`,
        clientData,
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
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

      const response = await axios.post<{ success: boolean; data: { id: number } }>(
        `${API_URL}/clients`,
        clientData,
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
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
      const token = AuthService.getToken();
      if (!token) {
        throw new Error('Non authentifié');
      }

      const response = await axios.post(`${API_URL}/clients/check`, {
        telephone,
        email
      }, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      return response.data;
    } catch (error) {
      console.error('Erreur lors de la vérification du client:', error);
      throw error;
    }
  }

  static async createClient(clientData: ClientInvite): Promise<{ success: boolean; client?: Client; message: string }> {
    try {
      const token = AuthService.getToken();
      if (!token) {
        throw new Error('Non authentifié');
      }

      // Extraire seulement les champs autorisés par l'API (sans creerCompte)
      const apiPayload = {
        nom: clientData.nom,
        prenom: clientData.prenom,
        telephone: clientData.telephone,
        email: clientData.email || undefined,
        adresseText: clientData.adresseText || undefined
      };

      const response = await axios.post(`${API_URL}/clients`, apiPayload, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

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