import axios from 'axios';
import apiClient from '@/lib/axios';
import { SiteLavage } from './types';
import { API_URL } from '@/config/env';

export interface User {
  id: number;
  role: string;
  nom: string;
  prenom: string;
  email: string | null;
  telephone: string | null;
  adresseText: string | null;
  siteLavagePrincipalGerantId: number | null;
}

export interface AuthResponse {
  success: boolean;
  message: string;
  data?: {
    user: User;
    accessToken: string;
    refreshToken: string;
  };
}

interface LoginCredentials {
  email: string;
  password: string;
}

interface LoginResponse {
  success: boolean;
  message?: string;
  data?: {
    user: User;
    accessToken: string;
    refreshToken: string;
  };
}

class AuthService {
  static async login(credentials: LoginCredentials): Promise<LoginResponse> {
    try {
      const response = await axios.post<LoginResponse>(
        `${API_URL}/auth/login`, 
        {
          ...(credentials.email.includes('@') ? { email: credentials.email } : { telephone: credentials.email }),
          password: credentials.password
        }
      );
      
      // Vérifier que l'utilisateur est soit Manager soit Admin
      if (response.data.success && response.data.data?.user) {
        const userRole = response.data.data.user.role;
        if (userRole !== 'Manager' && userRole !== 'Admin') {
          return {
            success: false,
            message: 'Accès non autorisé. Seuls les Managers et Administrateurs peuvent accéder à cette application.'
          };
        }
      }
      
      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error) && error.response) {
        return error.response.data;
      }
      throw error;
    }
  }

  static async getSitesLavage(): Promise<SiteLavage[]> {
    try {
      interface SiteLavageResponse {
        success: boolean;
        data: SiteLavage[];
      }

      const response = await apiClient.get<SiteLavageResponse>('/sites');

      if (response.data.success) {
        return response.data.data;
      }
      return [];
    } catch (error) {
      console.error('Erreur lors de la récupération des sites:', error);
      return [];
    }
  }

  static getToken(): string | null {
    try {
      const auth = localStorage.getItem('auth-storage');
      if (auth) {
        const { state } = JSON.parse(auth);
        return state.token;
      }
    } catch (error) {
      console.error('Erreur lors de la lecture du token:', error);
    }
    return null;
  }

  static getUser(): User | null {
    try {
      const auth = localStorage.getItem('auth-storage');
      if (auth) {
        const { state } = JSON.parse(auth);
        return state.user;
      }
    } catch (error) {
      console.error('Erreur lors de la lecture des données utilisateur:', error);
    }
    return null;
  }

  static isAuthenticated(): boolean {
    try {
      const auth = localStorage.getItem('auth-storage');
      if (auth) {
        const { state } = JSON.parse(auth);
        return state.isAuthenticated && !!state.token && !!state.user;
      }
    } catch (error) {
      console.error('Erreur lors de la vérification de l\'authentification:', error);
    }
    return false;
  }

  static isManager(): boolean {
    const user = this.getUser();
    return user?.role === 'Manager';
  }

  static isAdmin(): boolean {
    const user = this.getUser();
    return user?.role === 'Admin';
  }

  static canAccessAdminFeatures(): boolean {
    return this.isAdmin();
  }

  static async updateManagerSite(siteId: number): Promise<boolean> {
    try {
      const user = this.getUser();
      if (!user) {
        throw new Error('Non authentifié');
      }

      const response = await apiClient.post<{ success: boolean; data: { siteLavagePrincipalGerantId: number } }>(
        `/managers/${user.id}/site`,
        { siteId }
      );

      if (response.data.success) {
        // Mettre à jour l'utilisateur dans le stockage Zustand
        const auth = localStorage.getItem('auth-storage');
        if (auth) {
          const data = JSON.parse(auth);
          data.state.user = {
            ...data.state.user,
            siteLavagePrincipalGerantId: response.data.data.siteLavagePrincipalGerantId
          };
          localStorage.setItem('auth-storage', JSON.stringify(data));
        }
        return true;
      }
      return false;
    } catch (error) {
      console.error('Erreur lors de la mise à jour du site:', error);
      return false;
    }
  }

  static async changePassword(currentPassword: string, newPassword: string): Promise<boolean> {
    try {
      const response = await apiClient.post<{ success: boolean }>(
        '/auth/change-password',
        { currentPassword, newPassword }
      );

      return response.data.success;
    } catch (error) {
      console.error('Erreur lors du changement de mot de passe:', error);
      return false;
    }
  }

  static async updateSiteStatus(siteId: number, statutOuverture: boolean, siteData: SiteLavage): Promise<boolean> {
    try {
      // S'assurer que le champ ville n'est pas vide (validation backend)
      const ville = siteData.ville && siteData.ville.trim() !== '' ? siteData.ville : 'Non spécifiée';
      
      const response = await apiClient.put<{ success: boolean }>(
        `/sites/${siteId}`,
        {
          nom: siteData.nom,
          adresseText: siteData.adresseText,
          ville: ville,
          latitude: siteData.latitude || 0,
          longitude: siteData.longitude || 0,
          telephone: siteData.telephone,
          heureOuverture: siteData.heureOuverture || "09:00",
          heureFermeture: siteData.heureFermeture || "20:00",
          statutOuverture
        }
      );

      return response.data.success;
    } catch (error) {
      console.error('Erreur lors de la mise à jour du statut du site:', error);
      return false;
    }
  }

  static logout(): void {
    localStorage.removeItem('auth-storage');
  }
}

export default AuthService; 