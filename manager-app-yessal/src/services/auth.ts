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

// Interface pour les sessions de travail
export interface WorkSession {
  managerId: number;
  currentSessionSiteId: number | null;
  isActive: boolean;
  site?: SiteLavage;
}

// Interface pour les informations de session d'un site
export interface SiteSessionInfo {
  activeManagersCount: number;
  activeManagerIds: number[];
  shouldBeOpen: boolean;
  isStatusCorrect: boolean;
}

// Interface pour un site avec informations de session
export interface SiteLavageWithSession extends SiteLavage {
  sessionInfo: SiteSessionInfo;
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
        if (userRole !== 'MANAGER' && userRole !== 'ADMIN') {
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

  /**
   * Récupère les sites avec leurs informations de session en temps réel
   */
  static async getSitesWithSessionInfo(): Promise<SiteLavageWithSession[]> {
    try {
      interface SiteLavageSessionResponse {
        success: boolean;
        data: SiteLavageWithSession[];
      }

      const response = await apiClient.get<SiteLavageSessionResponse>('/sites/realtime-status');

      if (response.data.success) {
        return response.data.data;
      }
      return [];
    } catch (error) {
      console.error('Erreur lors de la récupération des sites avec sessions:', error);
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
    return user?.role === 'MANAGER';
  }

  static isAdmin(): boolean {
    const user = this.getUser();
    return user?.role === 'ADMIN';
  }

  static canAccessAdminFeatures(): boolean {
    return this.isAdmin();
  }

  /**
   * Récupère l'ID du site de lavage principal du manager connecté
   * @returns ID du site de lavage ou null si non défini
   */
  static getCurrentSiteLavageId(): number | null {
    const user = this.getUser();
    return user?.siteLavagePrincipalGerantId || null;
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

  /**
   * Démarre ou met à jour une session de travail pour le manager connecté
   * @param siteId - ID du site (null pour "Hors site - Fermer")
   */
  static async setWorkSession(siteId: number | null): Promise<boolean> {
    try {
      const user = this.getUser();
      if (!user) {
        throw new Error('Non authentifié');
      }

      const response = await apiClient.post<{ 
        success: boolean; 
        data: { managerId: number; currentSessionSiteId: number | null } 
      }>(
        `/managers/${user.id}/work-session`,
        { siteId }
      );

      // Mettre à jour l'utilisateur local si siteId n'est pas null
      if (response.data.success && siteId !== null) {
        const auth = localStorage.getItem('auth-storage');
        if (auth) {
          const data = JSON.parse(auth);
          data.state.user = {
            ...data.state.user,
            siteLavagePrincipalGerantId: siteId
          };
          localStorage.setItem('auth-storage', JSON.stringify(data));
        }
      }

      // Mettre à jour le cache de session
      if (response.data.success) {
        const session = await this.getWorkSession();
        if (session) {
          this.cacheWorkSession(session);
        }
      } else {
        this.cacheWorkSession(null);
      }

      return response.data.success;
    } catch (error) {
      console.error('Erreur lors de la mise à jour de la session de travail:', error);
      return false;
    }
  }

  /**
   * Récupère la session de travail actuelle du manager connecté
   */
  static async getWorkSession(): Promise<WorkSession | null> {
    try {
      const user = this.getUser();
      if (!user) {
        throw new Error('Non authentifié');
      }

      const response = await apiClient.get<{ 
        success: boolean; 
        data: WorkSession 
      }>(`/managers/${user.id}/work-session`);

      if (response.data.success) {
        const session = response.data.data;
        
        // Si la session est inactive et qu'il n'y a pas de site, charger le site principal
        if (!session.isActive && !session.site && user.siteLavagePrincipalGerantId) {
          try {
            const sites = await this.getSitesLavage();
            const principalSite = sites.find(s => s.id === user.siteLavagePrincipalGerantId);
            if (principalSite) {
              session.site = principalSite;

            }
          } catch (error) {
            console.error('[AuthService] Erreur lors du chargement du site principal:', error);
          }
        }
        
        // Mettre en cache la session enrichie
        this.cacheWorkSession(session);
        return session;
      }
      
      // Si l'API échoue, essayer le cache
      return this.getCachedWorkSession();
    } catch (error) {
      console.error('Erreur lors de la récupération de la session de travail:', error);
      // En cas d'erreur, retourner la session en cache
      return this.getCachedWorkSession();
    }
  }

  /**
   * Met en cache la session de travail dans localStorage
   */
  private static cacheWorkSession(session: WorkSession | null): void {
    try {
      if (session) {
        localStorage.setItem('work-session-cache', JSON.stringify(session));
      } else {
        localStorage.removeItem('work-session-cache');
      }
    } catch (error) {
      console.error('Erreur lors de la mise en cache de la session:', error);
    }
  }

  /**
   * Récupère la session de travail depuis le cache
   */
  private static getCachedWorkSession(): WorkSession | null {
    try {
      const cached = localStorage.getItem('work-session-cache');
      if (cached) {
        return JSON.parse(cached);
      }
    } catch (error) {
      console.error('Erreur lors de la lecture du cache de session:', error);
    }
    return null;
  }

  /**
   * Met à jour l'activité du manager pour éviter l'expiration de session
   */
  static async updateActivity(): Promise<boolean> {
    try {
      const user = this.getUser();
      if (!user) {
        return false;
      }

      const response = await apiClient.put<{ success: boolean }>(
        `/managers/${user.id}/activity`
      );

      return response.data.success;
    } catch (error) {
      console.error('Erreur lors de la mise à jour de l\'activité:', error);
      return false;
    }
  }

  /**
   * Force la mise à jour des statuts de tous les sites
   */
  static async forceUpdateSiteStatuses(): Promise<boolean> {
    try {
      const response = await apiClient.post<{ success: boolean }>(
        '/sites/force-update-status'
      );

      return response.data.success;
    } catch (error) {
      console.error('Erreur lors de la mise à jour forcée des statuts:', error);
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

  /**
   * Met à jour les informations d'un site (SANS le statut d'ouverture qui est maintenant automatique)
   * @param siteId - ID du site
   * @param siteData - Données du site (statutOuverture sera ignoré)
   */
  static async updateSiteInfo(siteId: number, siteData: SiteLavage): Promise<boolean> {
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
          // statutOuverture est maintenant calculé automatiquement côté backend
        }
      );

      return response.data.success;
    } catch (error) {
      console.error('Erreur lors de la mise à jour des informations du site:', error);
      return false;
    }
  }

  /**
   * @deprecated Utilisez setWorkSession() à la place pour gérer les sessions de travail
   * Cette fonction est conservée pour la compatibilité mais ne modifie plus le statut d'ouverture
   */
  static async updateSiteStatus(siteId: number, statutOuverture: boolean, siteData: SiteLavage): Promise<boolean> {
    console.warn('updateSiteStatus est déprécié. Le statut d\'ouverture est maintenant géré automatiquement par les sessions de travail.');
    // Ne fait que mettre à jour les informations du site, pas le statut
    return this.updateSiteInfo(siteId, siteData);
  }

  static logout(): void {
    localStorage.removeItem('auth-storage');
    localStorage.removeItem('work-session-cache');
  }
}

export default AuthService; 