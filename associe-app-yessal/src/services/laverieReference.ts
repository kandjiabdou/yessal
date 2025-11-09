import apiClient from '@/lib/axios';

export interface LaverieReferenceSimple {
  id: string;
  sourceLaverieId: number;
  nom: string;
  adresse?: string;
  ville?: string;
}

export interface LaverieReferenceListResponse {
  success: boolean;
  message?: string;
  data?: LaverieReferenceSimple[];
}

class LaverieReferenceService {
  /**
   * Récupère toutes les laveries disponibles
   */
  static async getAllLaveries(): Promise<LaverieReferenceListResponse> {
    try {
      const response = await apiClient.get<LaverieReferenceListResponse>('/laverie-reference');
      return response.data;
    } catch (error) {
      console.error('Erreur lors de la récupération des laveries:', error);
      return {
        success: false,
        message: 'Erreur lors de la récupération des laveries',
        data: []
      };
    }
  }
}

export default LaverieReferenceService;
