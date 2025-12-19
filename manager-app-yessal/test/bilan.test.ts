/// <reference types="jest" />
import BilanService, { BilanResponse, BilanData } from '../src/services/bilan';
import apiClient from '../src/lib/axios';

jest.mock('../src/lib/axios');
jest.mock('../src/config/env', () => ({
  API_URL: 'http://localhost:3000',
}));

const mockedApiClient = apiClient as jest.Mocked<typeof apiClient>;

describe('BilanService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getBilan', () => {
    it('devrait récupérer le bilan d\'une laverie', async () => {
      const mockData: BilanData = {
        periode: {
          mois: '2024-01',
          debut: '2024-01-01',
          fin: '2024-01-31',
        },
        recettes: {
          laverie: {
            commandes: { montant: 100000, nombre: 50 },
            abonnements: { montant: 50000, nombre: 10 },
            total: 150000,
          },
          fluxFinanciers: { montant: 0, nombre: 0 },
          boutique: { montant: 0, nombre: 0 },
          total: 150000,
        },
        depenses: {
          fluxFinanciers: { montant: 50000, nombre: 5 },
          total: 50000,
        },
        resultat: {
          montant: 100000,
          pourcentage: 66.67,
          type: 'benefice',
        },
      };

      mockedApiClient.get.mockResolvedValue({
        data: { success: true, data: mockData },
      });

      const result = await BilanService.getBilan(1, '2024-01');

      expect(mockedApiClient.get).toHaveBeenCalledWith('/bilan/laverie/1', {
        params: { month: '2024-01' },
      });
      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockData);
    });

    it('devrait récupérer le bilan sans spécifier le mois', async () => {
      const mockData: BilanData = {
        periode: { mois: '2024-12', debut: '2024-12-01', fin: '2024-12-31' },
        recettes: {
          laverie: {
            commandes: { montant: 50000, nombre: 25 },
            abonnements: { montant: 25000, nombre: 5 },
            total: 75000,
          },
          fluxFinanciers: { montant: 0, nombre: 0 },
          boutique: { montant: 0, nombre: 0 },
          total: 75000,
        },
        depenses: {
          fluxFinanciers: { montant: 25000, nombre: 3 },
          total: 25000,
        },
        resultat: {
          montant: 50000,
          pourcentage: 66.67,
          type: 'benefice',
        },
      };

      mockedApiClient.get.mockResolvedValue({
        data: { success: true, data: mockData },
      });

      const result = await BilanService.getBilan(1);

      expect(mockedApiClient.get).toHaveBeenCalledWith('/bilan/laverie/1', {
        params: {},
      });
      expect(result.success).toBe(true);
    });

    it('devrait gérer les erreurs', async () => {
      mockedApiClient.get.mockRejectedValue({
        response: { data: { message: 'Erreur serveur' } },
      });

      const result = await BilanService.getBilan(1);

      expect(result.success).toBe(false);
      expect(result.message).toBe('Erreur serveur');
    });

    it('devrait gérer les erreurs sans message', async () => {
      mockedApiClient.get.mockRejectedValue(new Error('Network error'));

      const result = await BilanService.getBilan(1);

      expect(result.success).toBe(false);
      expect(result.message).toBe('Erreur lors de la récupération du bilan');
    });
  });
});
