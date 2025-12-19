/// <reference types="jest" />
import DashboardService, { DashboardData, DashboardStats, ChartData } from '../src/services/dashboard';
import apiClient from '../src/lib/axios';

jest.mock('../src/lib/axios');
jest.mock('../src/config/env', () => ({
  API_URL: 'http://localhost:3000',
  SOCKET_URL: 'http://localhost:3000',
}));

const mockedApiClient = apiClient as jest.Mocked<typeof apiClient>;

describe('DashboardService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getDashboardData', () => {
    it('devrait retourner les données du dashboard', async () => {
      const mockData: DashboardData = {
        todayStats: {
          totalCommandes: 10,
          totalRevenue: 50000,
          totalPoidsKg: 200,
          totalLivraisons: 5,
          totalCreditUtilise: 1000,
        },
        periodStats: {
          totalCommandes: 50,
          totalRevenue: 250000,
          totalPoidsKg: 1000,
          totalLivraisons: 25,
          totalCreditUtilise: 5000,
        },
        recentOrders: [],
        siteName: 'Site Test',
        periodInfo: {
          startDate: '2024-01-01',
          endDate: '2024-01-07',
          offset: 0,
          period: 'week',
          isCurrentPeriod: true,
        },
      };

      mockedApiClient.get.mockResolvedValue({
        data: { success: true, data: mockData },
      });

      const result = await DashboardService.getDashboardData(1);

      expect(mockedApiClient.get).toHaveBeenCalledWith('/dashboard/1?period=week&offset=0');
      expect(result).toEqual(mockData);
    });

    it('devrait gérer les paramètres offset et period', async () => {
      const mockData: DashboardData = {
        todayStats: {
          totalCommandes: 0,
          totalRevenue: 0,
          totalPoidsKg: 0,
          totalLivraisons: 0,
          totalCreditUtilise: 0,
        },
        periodStats: {
          totalCommandes: 100,
          totalRevenue: 500000,
          totalPoidsKg: 2000,
          totalLivraisons: 50,
          totalCreditUtilise: 10000,
        },
        recentOrders: [],
        siteName: 'Site Test',
        periodInfo: {
          startDate: '2024-01-01',
          endDate: '2024-01-31',
          offset: 1,
          period: 'month',
          isCurrentPeriod: false,
        },
      };

      mockedApiClient.get.mockResolvedValue({
        data: { success: true, data: mockData },
      });

      const result = await DashboardService.getDashboardData(2, 1, 'month');

      expect(mockedApiClient.get).toHaveBeenCalledWith('/dashboard/2?period=month&offset=1');
      expect(result).toEqual(mockData);
    });

    it('devrait retourner null en cas d\'erreur', async () => {
      mockedApiClient.get.mockRejectedValue(new Error('Network error'));

      const result = await DashboardService.getDashboardData(1);

      expect(result).toBeNull();
    });
  });

  describe('getTodayData', () => {
    it('devrait retourner les données d\'aujourd\'hui', async () => {
      const mockData = {
        todayStats: {
          totalCommandes: 5,
          totalRevenue: 25000,
          totalPoidsKg: 100,
          totalLivraisons: 2,
          totalCreditUtilise: 500,
        },
        recentOrders: [
          {
            id: 1,
            clientName: 'Client Test',
            prixPaye: 5000,
            masseClientIndicativeKg: 20,
            statut: 'PrisEnCharge',
            dateHeureCommande: '2024-01-01T10:00:00',
          },
        ],
        siteName: 'Site Test',
      };

      mockedApiClient.get.mockResolvedValue({
        data: { success: true, data: mockData },
      });

      const result = await DashboardService.getTodayData(1);

      expect(mockedApiClient.get).toHaveBeenCalledWith('/dashboard/1/today');
      expect(result).toEqual(mockData);
    });

    it('devrait retourner null en cas d\'erreur', async () => {
      mockedApiClient.get.mockRejectedValue(new Error('Network error'));

      const result = await DashboardService.getTodayData(1);

      expect(result).toBeNull();
    });
  });

  describe('getPeriodData', () => {
    it('devrait retourner les données de la période', async () => {
      const mockData = {
        periodStats: {
          totalCommandes: 30,
          totalRevenue: 150000,
          totalPoidsKg: 600,
          totalLivraisons: 15,
          totalCreditUtilise: 3000,
          totalAbonnementsCreated: 5,
          totalAbonnementMontant: 50000,
        },
        periodInfo: {
          startDate: '2024-01-01',
          endDate: '2024-01-07',
          offset: 0,
          period: 'week' as const,
          isCurrentPeriod: true,
        },
        siteName: 'Site Test',
      };

      mockedApiClient.get.mockResolvedValue({
        data: { success: true, data: mockData },
      });

      const result = await DashboardService.getPeriodData(1);

      expect(mockedApiClient.get).toHaveBeenCalledWith('/dashboard/1/period?period=week&offset=0');
      expect(result).toEqual(mockData);
    });

    it('devrait gérer period day', async () => {
      const mockData = {
        periodStats: {
          totalCommandes: 10,
          totalRevenue: 50000,
          totalPoidsKg: 200,
          totalLivraisons: 5,
          totalCreditUtilise: 1000,
        },
        periodInfo: {
          startDate: '2024-01-01',
          endDate: '2024-01-01',
          offset: 0,
          period: 'day' as const,
          isCurrentPeriod: true,
        },
        siteName: 'Site Test',
      };

      mockedApiClient.get.mockResolvedValue({
        data: { success: true, data: mockData },
      });

      const result = await DashboardService.getPeriodData(1, 0, 'day');

      expect(mockedApiClient.get).toHaveBeenCalledWith('/dashboard/1/period?period=day&offset=0');
      expect(result?.periodInfo.period).toBe('day');
    });

    it('devrait retourner null en cas d\'erreur', async () => {
      mockedApiClient.get.mockRejectedValue(new Error('Network error'));

      const result = await DashboardService.getPeriodData(1);

      expect(result).toBeNull();
    });
  });

  describe('getChartData', () => {
    it('devrait retourner les données du graphique', async () => {
      const mockData: ChartData = {
        chartData: [
          {
            date: '2024-01-01',
            dateLabel: 'Lun',
            revenue: 10000,
            orders: 5,
            newClients: 2,
          },
          {
            date: '2024-01-02',
            dateLabel: 'Mar',
            revenue: 15000,
            orders: 7,
            newClients: 3,
          },
        ],
        siteName: 'Site Test',
        periodInfo: {
          startDate: '2024-01-01',
          endDate: '2024-01-07',
          offset: 0,
          period: 'week',
          isCurrentPeriod: true,
        },
      };

      mockedApiClient.get.mockResolvedValue({
        data: { success: true, data: mockData },
      });

      const result = await DashboardService.getChartData(1);

      expect(mockedApiClient.get).toHaveBeenCalledWith('/dashboard/1/chart-data?period=week&offset=0');
      expect(result).toEqual(mockData);
      expect(result?.chartData).toHaveLength(2);
    });

    it('devrait gérer period month', async () => {
      const mockData: ChartData = {
        chartData: [],
        siteName: 'Site Test',
        periodInfo: {
          startDate: '2024-01-01',
          endDate: '2024-01-31',
          offset: 1,
          period: 'month',
          isCurrentPeriod: false,
        },
      };

      mockedApiClient.get.mockResolvedValue({
        data: { success: true, data: mockData },
      });

      const result = await DashboardService.getChartData(1, 1, 'month');

      expect(mockedApiClient.get).toHaveBeenCalledWith('/dashboard/1/chart-data?period=month&offset=1');
      expect(result?.periodInfo.period).toBe('month');
    });

    it('devrait retourner null en cas d\'erreur', async () => {
      mockedApiClient.get.mockRejectedValue(new Error('Network error'));

      const result = await DashboardService.getChartData(1);

      expect(result).toBeNull();
    });
  });
});
