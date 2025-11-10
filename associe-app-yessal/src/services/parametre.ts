import apiClient from '@/lib/axios';

export interface Entreprise {
  id: number;
  nom: string;
  adresse: string | null;
  ville: string | null;
  telephone: string | null;
  email: string | null;
  devise: 'FCFA' | 'EUR';
  tauxConversion: number;
}

export interface Associe {
  id: number;
  nom: string;
  prenom: string;
  email: string | null;
  telephone: string | null;
  pourcentageParts: number;
}

export interface UserInfo {
  id: number;
  role: string;
  nom: string;
  prenom: string;
  email: string | null;
  telephone: string | null;
  pourcentageParts: number;
  devisePreference: 'FCFA' | 'EUR';
}

class ParametreService {
  /**
   * Récupère les informations de l'entreprise
   */
  async getEntrepriseInfo(): Promise<Entreprise> {
    const response = await apiClient.get<{ success: boolean; data: Entreprise }>(
      '/parametres/entreprise'
    );
    return response.data.data;
  }

  /**
   * Récupère les informations de l'utilisateur connecté
   */
  async getUserInfo(): Promise<UserInfo> {
    const response = await apiClient.get<{ success: boolean; data: UserInfo }>(
      '/parametres/user'
    );
    return response.data.data;
  }

  /**
   * Met à jour la préférence de devise de l'utilisateur
   */
  async updateDevisePreference(devise: 'FCFA' | 'EUR'): Promise<void> {
    await apiClient.put('/parametres/devise-preference', { devise });
  }

  /**
   * Liste tous les associés
   */
  async listAssocies(): Promise<Associe[]> {
    const response = await apiClient.get<{ success: boolean; data: Associe[] }>(
      '/parametres/associes'
    );
    return response.data.data;
  }
}

export default new ParametreService();
