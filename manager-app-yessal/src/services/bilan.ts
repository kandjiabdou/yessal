import apiClient from '@/lib/axios';

export interface BilanPeriode {
  mois: string;
  debut: string;
  fin: string;
}

export interface BilanMontant {
  montant: number;
  nombre: number;
}

export interface BilanRecettesLaverie {
  commandes: BilanMontant;
  abonnements: BilanMontant;
  total: number;
}

export interface BilanRecettesBoutique extends BilanMontant {
  aVenir?: boolean;
}

export interface BilanRecettes {
  laverie: BilanRecettesLaverie;
  fluxFinanciers: BilanMontant;
  boutique: BilanRecettesBoutique;
  total: number;
}

export interface BilanDepenses {
  fluxFinanciers: BilanMontant;
  total: number;
}

export interface BilanResultat {
  montant: number;
  pourcentage: number;
  type: 'benefice' | 'perte';
}

export interface BilanData {
  periode: BilanPeriode;
  recettes: BilanRecettes;
  depenses: BilanDepenses;
  resultat: BilanResultat;
}

export interface BilanResponse {
  success: boolean;
  data?: BilanData;
  message?: string;
}

class BilanService {
  /**
   * Récupérer le bilan d'une laverie pour un mois donné
   * @param laverieId - ID de la laverie
   * @param month - Mois au format YYYY-MM (optionnel, mois en cours par défaut)
   */
  async getBilan(laverieId: number, month?: string): Promise<BilanResponse> {
    try {
      const params = month ? { month } : {};
      const response = await apiClient.get(`/bilan/laverie/${laverieId}`, { params });
      return response.data;
    } catch (error: any) {
      console.error('Erreur getBilan:', error);
      return {
        success: false,
        message: error.response?.data?.message || 'Erreur lors de la récupération du bilan'
      };
    }
  }
}

export default new BilanService();
