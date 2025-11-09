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
  prets: BilanMontant;
  boutique: BilanRecettesBoutique;
  total: number;
}

export interface BilanDepenses {
  fluxFinanciers: BilanMontant;
  emprunts: BilanMontant;
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

export interface BilanGroupedItem extends BilanData {
  laverieRefId: string | null;
  laverie: {
    id: number;
    nom: string;
    adresse?: string;
    ville?: string;
  } | null;
}

export interface BilanGroupedResponse {
  success: boolean;
  data?: BilanGroupedItem[];
  message?: string;
}

class BilanService {
  /**
   * Récupérer les bilans groupés par laverie pour un mois donné
   * @param month - Mois au format YYYY-MM (optionnel, mois en cours par défaut)
   * @param laverieIds - IDs des laveries à inclure (optionnel)
   */
  async getBilansGrouped(month?: string, laverieIds?: number[]): Promise<BilanGroupedResponse> {
    try {
      const params: any = {};
      if (month) params.month = month;
      if (laverieIds && laverieIds.length > 0) {
        params.laverieIds = laverieIds.join(',');
      }

      const response = await apiClient.get('/bilan', { params });
      return response.data;
    } catch (error: any) {
      console.error('Erreur getBilansGrouped:', error);
      return {
        success: false,
        message: error.response?.data?.message || 'Erreur lors de la récupération des bilans'
      };
    }
  }
}

export default new BilanService();
