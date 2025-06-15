import axios from 'axios';
import AuthService from './auth';
import { API_URL } from '@/config/env';

export interface Livreur {
  id: number;
  nom: string;
  prenom: string;
  email?: string;
  telephone?: string;
  adresseText?: string;
  moyenLivraison?: string;
  statutDisponibilite: boolean;
  createdAt: string;
  updatedAt: string;
}

class LivreurService {
  /**
   * Obtenir la liste des livreurs
   */
  static async getLivreurs(): Promise<Livreur[]> {
    try {
      const token = AuthService.getToken();
      if (!token) {
        throw new Error('Non authentifié');
      }

      const response = await axios.get<{ success: boolean; data: Livreur[] }>(
        `${API_URL}/livreurs`,
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );

      return response.data.data;
    } catch (error) {
      console.error('Erreur lors de la récupération des livreurs:', error);
      return [];
    }
  }

  /**
   * Obtenir les livreurs disponibles
   */
  static async getAvailableLivreurs(): Promise<Livreur[]> {
    try {
      const livreurs = await this.getLivreurs();
      return livreurs.filter(livreur => livreur.statutDisponibilite);
    } catch (error) {
      console.error('Erreur lors de la récupération des livreurs disponibles:', error);
      return [];
    }
  }

  /**
   * Obtenir un livreur par ID
   */
  static async getLivreurById(id: number): Promise<Livreur | null> {
    try {
      const token = AuthService.getToken();
      if (!token) {
        throw new Error('Non authentifié');
      }

      const response = await axios.get<{ success: boolean; data: Livreur }>(
        `${API_URL}/livreurs/${id}`,
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );

      return response.data.data;
    } catch (error) {
      console.error('Erreur lors de la récupération du livreur:', error);
      return null;
    }
  }
}

export default LivreurService; 