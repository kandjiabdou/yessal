import apiClient from '@/lib/axios';

export interface DashboardStats {
  totalCommandes: number;
  totalRevenue: number;
  totalPoidsKg: number;
  totalLivraisons: number;
  // subscription stats
  totalAbonnementsCreated?: number;
  totalAbonnementMontant?: number;
  // nombre d'abonnements actifs durant la période (utile pour le filtre mois)
  totalAbonnementsEnCours?: number;
  // nouveaux clients pendant la période
  totalNewClients?: number;
}

export interface RecentOrder {
  id: number;
  clientName: string;
  prixPaye: number;
  masseClientIndicativeKg: number;
  statut: string;
  dateHeureCommande: string;
}

export interface PeriodInfo {
  startDate: string;
  endDate: string;
  offset: number;
  period: 'day' | 'week' | 'month';
  isCurrentPeriod: boolean;
}

export interface DashboardData {
  todayStats: DashboardStats;
  periodStats: DashboardStats;
  recentOrders: RecentOrder[];
  siteName: string;
  periodInfo: PeriodInfo;
}

class DashboardService {
  /**
   * Récupérer les statistiques du dashboard pour un site
   */
  static async getDashboardData(siteId: number, offset: number = 0, period: 'day'|'week'|'month' = 'week'): Promise<DashboardData | null> {
    try {
      const response = await apiClient.get<{ success: boolean; data: DashboardData }>(
        `/dashboard/${siteId}?period=${period}&offset=${offset}`
      );

      return response.data.data;
    } catch (error) {
      console.error('Erreur lors de la récupération des données du dashboard:', error);
      return null;
    }
  }

  /**
   * Récupérer les statistiques d'un site pour une période donnée
   */
  static async getSiteStats(siteId: number, dateDebut?: string, dateFin?: string): Promise<{
    stats: any[];
    totaux: DashboardStats;
  } | null> {
    try {
      const params = new URLSearchParams();
      if (dateDebut) params.append('dateDebut', dateDebut);
      if (dateFin) params.append('dateFin', dateFin);

      const response = await apiClient.get<{ success: boolean; data: { stats: any[]; totaux: DashboardStats } }>(
        `/sites/${siteId}/stats?${params.toString()}`
      );

      return response.data.data;
    } catch (error) {
      console.error('Erreur lors de la récupération des statistiques du site:', error);
      return null;
    }
  }
}

export default DashboardService; 