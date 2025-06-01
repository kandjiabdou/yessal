import axios from 'axios';
import AuthService from './auth';

const API_URL = 'http://localhost:4500/api';

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
    nombreLavageTotal: number;
    poidsTotalLaveKg: number;
    lavagesGratuits6kgRestants: number;
  };
}

export interface ClientInvite {
  nom: string;
  prenom: string;
  telephone: string;
  email?: string;
  adresseText?: string;
  souhaiteCreerCompte?: boolean;
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

      const response = await axios.get<{ success: boolean; data: Client[] }>(
        `${API_URL}/clients/search?q=${encodeURIComponent(query)}`,
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );

      return response.data.data;
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

      const response = await axios.get<{ success: boolean; data: Client }>(
        `${API_URL}/clients/${clientId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );

      return response.data.data;
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
}

export default ClientService; 