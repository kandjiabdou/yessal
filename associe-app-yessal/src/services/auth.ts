import axios from 'axios';
import { API_URL } from '@/config/env';

export interface User {
  id: number;
  role: string;
  nom: string;
  prenom: string;
  email: string | null;
  telephone: string | null;
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
  /**
   * Connexion utilisateur
   */
  static async login(credentials: LoginCredentials): Promise<LoginResponse> {
    try {
      const response = await axios.post<LoginResponse>(
        `${API_URL}/auth/login`, 
        {
          ...(credentials.email.includes('@') ? { email: credentials.email } : { telephone: credentials.email }),
          password: credentials.password
        }
      );
      
      // Vérifier que l'utilisateur est soit Associe soit Admin
      if (response.data.success && response.data.data?.user) {
        const userRole = response.data.data.user.role;
        if (userRole !== 'ASSOCIE' && userRole !== 'ADMIN') {
          return {
            success: false,
            message: 'Accès non autorisé. Seuls les Associés et Administrateurs peuvent accéder à cette application.'
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

  /**
   * Récupère le token JWT
   */
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

  /**
   * Récupère l'utilisateur connecté
   */
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

  /**
   * Vérifie si l'utilisateur est authentifié
   */
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

  /**
   * Vérifie si l'utilisateur est un associé
   */
  static isAssocie(): boolean {
    const user = this.getUser();
    return user?.role === 'ASSOCIE';
  }

  /**
   * Vérifie si l'utilisateur est un admin
   */
  static isAdmin(): boolean {
    const user = this.getUser();
    return user?.role === 'ADMIN';
  }

  /**
   * Déconnexion
   */
  static logout(): void {
    localStorage.removeItem('auth-storage');
  }
}

export default AuthService;
 