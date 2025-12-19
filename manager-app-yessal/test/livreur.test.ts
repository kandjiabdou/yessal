/// <reference types="jest" />
import LivreurService, { Livreur } from '../src/services/livreur';
import apiClient from '../src/lib/axios';

// Mock modules
jest.mock('../src/lib/axios');
jest.mock('../src/services/auth');
jest.mock('../src/config/env', () => ({
  API_URL: 'http://localhost:3000',
  SOCKET_URL: 'http://localhost:3000',
}));

const mockedApiClient = apiClient as jest.Mocked<typeof apiClient>;

describe('LivreurService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getLivreurs', () => {
    it('devrait retourner la liste des livreurs', async () => {
      const mockLivreurs: Livreur[] = [
        {
          id: 1,
          nom: 'Diop',
          prenom: 'Moussa',
          email: 'moussa@test.com',
          telephone: '+221771234567',
          adresseText: 'Dakar',
          moyenLivraison: 'Moto',
          statutDisponibilite: true,
          createdAt: '2024-01-01',
          updatedAt: '2024-01-01',
        },
        {
          id: 2,
          nom: 'Fall',
          prenom: 'Fatou',
          telephone: '+221779876543',
          moyenLivraison: 'Voiture',
          statutDisponibilite: false,
          createdAt: '2024-01-02',
          updatedAt: '2024-01-02',
        },
      ];

      mockedApiClient.get.mockResolvedValue({
        data: { success: true, data: mockLivreurs },
      });

      const result = await LivreurService.getLivreurs();

      expect(mockedApiClient.get).toHaveBeenCalledWith('/livreurs');
      expect(result).toEqual(mockLivreurs);
      expect(result).toHaveLength(2);
    });

    it('devrait retourner un tableau vide en cas d\'erreur', async () => {
      mockedApiClient.get.mockRejectedValue(new Error('Network error'));

      const result = await LivreurService.getLivreurs();

      expect(result).toEqual([]);
    });
  });

  describe('getAvailableLivreurs', () => {
    it('devrait retourner uniquement les livreurs disponibles', async () => {
      const mockLivreurs: Livreur[] = [
        {
          id: 1,
          nom: 'Diop',
          prenom: 'Moussa',
          statutDisponibilite: true,
          createdAt: '2024-01-01',
          updatedAt: '2024-01-01',
        },
        {
          id: 2,
          nom: 'Fall',
          prenom: 'Fatou',
          statutDisponibilite: false,
          createdAt: '2024-01-02',
          updatedAt: '2024-01-02',
        },
        {
          id: 3,
          nom: 'Ndiaye',
          prenom: 'Awa',
          statutDisponibilite: true,
          createdAt: '2024-01-03',
          updatedAt: '2024-01-03',
        },
      ];

      mockedApiClient.get.mockResolvedValue({
        data: { success: true, data: mockLivreurs },
      });

      const result = await LivreurService.getAvailableLivreurs();

      expect(result).toHaveLength(2);
      expect(result.every(l => l.statutDisponibilite)).toBe(true);
      expect(result[0].id).toBe(1);
      expect(result[1].id).toBe(3);
    });

    it('devrait retourner un tableau vide si aucun livreur disponible', async () => {
      const mockLivreurs: Livreur[] = [
        {
          id: 1,
          nom: 'Diop',
          prenom: 'Moussa',
          statutDisponibilite: false,
          createdAt: '2024-01-01',
          updatedAt: '2024-01-01',
        },
      ];

      mockedApiClient.get.mockResolvedValue({
        data: { success: true, data: mockLivreurs },
      });

      const result = await LivreurService.getAvailableLivreurs();

      expect(result).toEqual([]);
    });

    it('devrait retourner un tableau vide en cas d\'erreur', async () => {
      mockedApiClient.get.mockRejectedValue(new Error('Network error'));

      const result = await LivreurService.getAvailableLivreurs();

      expect(result).toEqual([]);
    });
  });

  describe('getLivreurById', () => {
    it('devrait retourner un livreur par son ID', async () => {
      const mockLivreur: Livreur = {
        id: 1,
        nom: 'Diop',
        prenom: 'Moussa',
        email: 'moussa@test.com',
        telephone: '+221771234567',
        adresseText: 'Dakar',
        moyenLivraison: 'Moto',
        statutDisponibilite: true,
        createdAt: '2024-01-01',
        updatedAt: '2024-01-01',
      };

      mockedApiClient.get.mockResolvedValue({
        data: { success: true, data: mockLivreur },
      });

      const result = await LivreurService.getLivreurById(1);

      expect(mockedApiClient.get).toHaveBeenCalledWith('/livreurs/1');
      expect(result).toEqual(mockLivreur);
    });

    it('devrait retourner null en cas d\'erreur', async () => {
      mockedApiClient.get.mockRejectedValue(new Error('Not found'));

      const result = await LivreurService.getLivreurById(999);

      expect(result).toBeNull();
    });

    it('devrait gérer les IDs différents', async () => {
      const mockLivreur: Livreur = {
        id: 42,
        nom: 'Test',
        prenom: 'User',
        statutDisponibilite: true,
        createdAt: '2024-01-01',
        updatedAt: '2024-01-01',
      };

      mockedApiClient.get.mockResolvedValue({
        data: { success: true, data: mockLivreur },
      });

      const result = await LivreurService.getLivreurById(42);

      expect(mockedApiClient.get).toHaveBeenCalledWith('/livreurs/42');
      expect(result?.id).toBe(42);
    });
  });
});
