import axios from 'axios';
import { SiteLavage } from './types';

const API_URL = 'http://localhost:4500/api';

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

class AuthService {
  private static TOKEN_KEY = 'auth_token';
  private static REFRESH_TOKEN_KEY = 'refresh_token';
  private static USER_KEY = 'user';

  static async login(identifier: string, password: string): Promise<AuthResponse> {
    try {
      const response = await axios.post<AuthResponse>(`${API_URL}/auth/login`, {
        ...(identifier.includes('@') ? { email: identifier } : { telephone: identifier }),
        password
      });

      if (response.data.success && response.data.data) {
        const { user, accessToken, refreshToken } = response.data.data;
        
        // Vérifier si l'utilisateur est un Manager
        if (user.role !== 'Manager') {
          throw new Error('Accès non autorisé. Cette application est réservée aux managers.');
        }

        // Stocker les informations d'authentification
        this.setTokens(accessToken, refreshToken);
        this.setUser(user);
      }

      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.data) {
        return error.response.data as AuthResponse;
      }
      throw error;
    }
  }

  static async getSitesLavage(): Promise<SiteLavage[]> {
    try {
      const token = this.getToken();
      if (!token) {
        throw new Error('Non authentifié');
      }

      interface SiteLavageResponse {
        success: boolean;
        data: SiteLavage[];
      }

      const response = await axios.get<SiteLavageResponse>(
        `${API_URL}/sites`,
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );

      if (response.data.success) {
        return response.data.data;
      }
      return [];
    } catch (error) {
      console.error('Erreur lors de la récupération des sites:', error);
      return [];
    }
  }

  static async updateManagerSite(siteId: number): Promise<boolean> {
    try {
      const token = this.getToken();
      const user = this.getUser();
      if (!token || !user) {
        throw new Error('Non authentifié');
      }

      const response = await axios.post<{ success: boolean; data: { siteLavagePrincipalGerantId: number } }>(
        `${API_URL}/managers/${user.id}/site`,
        { siteId },
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );

      if (response.data.success) {
        // Mettre à jour l'utilisateur stocké localement
        const updatedUser = { ...user, siteLavagePrincipalGerantId: response.data.data.siteLavagePrincipalGerantId };
        this.setUser(updatedUser);
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
      const token = this.getToken();
      if (!token) {
        throw new Error('Non authentifié');
      }

      const response = await axios.post<{ success: boolean }>(
        `${API_URL}/auth/change-password`,
        { currentPassword, newPassword },
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );

      return response.data.success;
    } catch (error) {
      console.error('Erreur lors du changement de mot de passe:', error);
      return false;
    }
  }

  static logout(): void {
    localStorage.removeItem(this.TOKEN_KEY);
    localStorage.removeItem(this.REFRESH_TOKEN_KEY);
    localStorage.removeItem(this.USER_KEY);
  }

  static getToken(): string | null {
    return localStorage.getItem(this.TOKEN_KEY);
  }

  static getRefreshToken(): string | null {
    return localStorage.getItem(this.REFRESH_TOKEN_KEY);
  }

  static getUser(): User | null {
    const userStr = localStorage.getItem(this.USER_KEY);
    return userStr ? JSON.parse(userStr) : null;
  }

  static isAuthenticated(): boolean {
    return !!this.getToken() && !!this.getUser();
  }

  private static setTokens(accessToken: string, refreshToken: string): void {
    localStorage.setItem(this.TOKEN_KEY, accessToken);
    localStorage.setItem(this.REFRESH_TOKEN_KEY, refreshToken);
  }

  private static setUser(user: User): void {
    localStorage.setItem(this.USER_KEY, JSON.stringify(user));
  }
}

export default AuthService; 