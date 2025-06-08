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
    localStorage.removeItem('auth-storage');
  }
}

export default AuthService; 