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
   * Récupérer uniquement les statistiques "aujourd'hui" (cartes et commandes récentes).
   */
  static async getTodayData(siteId: number): Promise<{
    todayStats: DashboardStats;
    recentOrders: RecentOrder[];
    siteName: string;
  } | null> {
    try {
      const response = await apiClient.get<{ success: boolean; data: { todayStats: DashboardStats; recentOrders: RecentOrder[]; siteName: string } }>(
        `/dashboard/${siteId}/today`
      );

      return response.data.data;
    } catch (error) {
      console.error('Erreur lors de la récupération des données today du dashboard:', error);
      return null;
    }
  }

  /**
   * Récupérer uniquement les statistiques pour la période demandée (week/month/day)
   */
  static async getPeriodData(siteId: number, offset: number = 0, period: 'day'|'week'|'month' = 'week') : Promise<{
    periodStats: DashboardStats;
    periodInfo: PeriodInfo;
    siteName: string;
  } | null> {
    try {
      const response = await apiClient.get<{ success: boolean; data: { periodStats: DashboardStats; periodInfo: PeriodInfo; siteName: string } }>(
        `/dashboard/${siteId}/period?period=${period}&offset=${offset}`
      );

      return response.data.data;
    } catch (error) {
      console.error('Erreur lors de la récupération des données period du dashboard:', error);
      return null;
    }
  }
}

export default DashboardService; 