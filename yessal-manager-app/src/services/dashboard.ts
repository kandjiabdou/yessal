import axios from 'axios';
import apiClient from '@/lib/axios';
import AuthService from './auth';
import { API_URL } from '@/config/env';

export interface DashboardStats {
  totalCommandes: number;
  totalRevenue: number;
  totalPoidsKg: number;
  totalLivraisons: number;
}

export interface RecentOrder {
  id: number;
  clientName: string;
  prixTotal: number;
  masseClientIndicativeKg: number;
  statut: string;
  dateHeureCommande: string;
}

export interface DashboardData {
  todayStats: DashboardStats;
  weekStats: DashboardStats;
  recentOrders: RecentOrder[];
  siteName: string;
}

class DashboardService {
  /**
   * Récupérer les statistiques du dashboard pour un site
   */
  static async getDashboardData(siteId: number): Promise<DashboardData | null> {
    try {
      const response = await apiClient.get<{ success: boolean; data: DashboardData }>(
        `/dashboard/${siteId}`
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