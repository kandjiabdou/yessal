import axios from 'axios';

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