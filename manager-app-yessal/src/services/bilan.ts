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

export interface BilanRecettesBoutique {
  ventes: BilanMontant;
  total: number;
}

export interface BilanSite {
  estLaverie: boolean;
  estBoutique: boolean;
  estVirtuel: boolean;
}

export interface BilanRecettes {
  laverie?: BilanRecettesLaverie;
  boutique?: BilanRecettesBoutique;
  fluxFinanciers: BilanMontant;
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

// Bilan par activité (P&L direct costing)
export interface BilanActiviteRecettes {
  commandes?: BilanMontant;
  abonnements?: BilanMontant;
  ventes?: BilanMontant;
  autres: BilanMontant;
  total: number;
}

export interface BilanActivite {
  recettes: BilanActiviteRecettes;
  depenses: BilanMontant;
  resultat: BilanResultat;
}

export interface BilanParActivite {
  laverie: BilanActivite | null;
  boutique: BilanActivite | null;
  commun: {
    depenses: BilanMontant;
    recettes: BilanMontant;
  };
}

export interface BilanData {
  periode: BilanPeriode;
  site: BilanSite;
  recettes: BilanRecettes;
  depenses: BilanDepenses;
  resultat: BilanResultat;
  parActivite?: BilanParActivite;
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
