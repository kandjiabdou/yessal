/// <reference types="jest" />
import ClientService, { Client, User, ClientInvite, CreateUserData, UpdateUserData } from '../src/services/client';
import apiClient from '../src/lib/axios';
import AuthService from '../src/services/auth';

jest.mock('../src/lib/axios');
jest.mock('../src/services/auth');
jest.mock('../src/config/env', () => ({
  API_URL: 'http://localhost:3000',
  SOCKET_URL: 'http://localhost:3000',
}));

const mockedApiClient = apiClient as jest.Mocked<typeof apiClient>;
const mockedAuthService = AuthService as jest.Mocked<typeof AuthService>;

describe('ClientService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('searchClients', () => {
    it('devrait rechercher des clients', async () => {
      const mockClients: Client[] = [
        {
          id: 1,
          nom: 'Doe',
          prenom: 'John',
          email: 'john@test.com',
          telephone: '123456789',
          adresseText: '123 rue Test',
          typeClient: 'Standard',
          carteNumero: null,
          estEtudiant: false
        }
      ];

      mockedApiClient.get.mockResolvedValue({
        data: { success: true, data: mockClients }
      });

      const result = await ClientService.searchClients('John');
      expect(result).toEqual(mockClients);
      expect(mockedApiClient.get).toHaveBeenCalledWith('/manager/clients/search?query=John');
    });

    it('devrait gérer les erreurs de recherche', async () => {
      mockedApiClient.get.mockRejectedValue(new Error('API Error'));
      await expect(ClientService.searchClients('John')).rejects.toThrow('API Error');
    });
  });

  describe('getClientDetails', () => {
    it('devrait récupérer les détails d\'un client', async () => {
      const mockClient: Client = {
        id: 1,
        nom: 'Doe',
        prenom: 'John',
        email: 'john@test.com',
        telephone: '123456789',
        adresseText: '123 rue Test',
        typeClient: 'Premium',
        carteNumero: 'CARD-001',
        estEtudiant: false,
        fidelite: {
          numeroCarteFidelite: 'FID-001',
          nombreLavageTotal: 10,
          poidsTotalLaveKg: 50.5,
          prixTotalPaye: 25000,
          pointsDisponible: 100,
          pointsFraction: 0.5,
          creditDisponible: 5000
        }
      };

      mockedApiClient.get.mockResolvedValue({
        data: { success: true, client: mockClient }
      });

      const result = await ClientService.getClientDetails(1);
      expect(result).toEqual(mockClient);
      expect(mockedApiClient.get).toHaveBeenCalledWith('/manager/clients/1');
    });

    it('devrait gérer un client non trouvé', async () => {
      mockedApiClient.get.mockResolvedValue({
        data: { success: true, client: null }
      });

      const result = await ClientService.getClientDetails(999);
      expect(result).toBeNull();
    });

    it('devrait gérer les erreurs', async () => {
      mockedApiClient.get.mockRejectedValue(new Error('API Error'));
      await expect(ClientService.getClientDetails(1)).rejects.toThrow('API Error');
    });
  });

  describe('checkClientExists', () => {
    it('devrait vérifier qu\'un client existe par téléphone', async () => {
      mockedApiClient.get.mockResolvedValue({
        data: { success: true, exists: true, message: 'Client exists' }
      });

      const result = await ClientService.checkClientExists('123456789');
      expect(result).toEqual({ exists: true, message: 'Client exists' });
      expect(mockedApiClient.get).toHaveBeenCalledWith('/manager/clients/check?telephone=123456789');
    });

    it('devrait vérifier qu\'un client existe par email', async () => {
      mockedApiClient.get.mockResolvedValue({
        data: { success: true, exists: false, message: 'Client not found' }
      });

      const result = await ClientService.checkClientExists(undefined, 'john@test.com');
      expect(result).toEqual({ exists: false, message: 'Client not found' });
      expect(mockedApiClient.get).toHaveBeenCalledWith('/manager/clients/check?email=john@test.com');
    });

    it('devrait gérer les erreurs', async () => {
      mockedApiClient.get.mockRejectedValue(new Error('API Error'));
      await expect(ClientService.checkClientExists('123')).rejects.toThrow('API Error');
    });
  });

  describe('createClient', () => {
    it('devrait créer un client', async () => {
      const clientData: ClientInvite = {
        nom: 'Doe',
        prenom: 'Jane',
        telephone: '987654321',
        email: 'jane@test.com',
        adresseText: '123 Main St'
      };

      const mockResponse = {
        success: true,
        client: {
          id: 2,
          ...clientData,
          adresseText: null,
          typeClient: 'Standard' as const,
          carteNumero: null,
          estEtudiant: false
        },
        message: 'Client créé'
      };

      mockedApiClient.post.mockResolvedValue({
        data: mockResponse
      });

      const result = await ClientService.createClient(clientData);
      expect(result).toEqual(mockResponse);
      expect(mockedApiClient.post).toHaveBeenCalledWith('/manager/clients', clientData);
    });

    it('devrait gérer les erreurs de création', async () => {
      mockedApiClient.post.mockRejectedValue(new Error('API Error'));
      await expect(ClientService.createClient({} as ClientInvite)).rejects.toThrow('API Error');
    });
  });

  describe('createGuestClient', () => {
    it('devrait créer un client invité', async () => {
      const clientData: ClientInvite = {
        nom: 'Guest',
        prenom: 'User',
        telephone: '111222333',
        email: null,
        adresseText: null
      };

      mockedApiClient.post.mockResolvedValue({
        data: { success: true, clientId: 3 }
      });

      const result = await ClientService.createGuestClient(clientData);
      expect(result).toEqual({ success: true, clientId: 3 });
      expect(mockedApiClient.post).toHaveBeenCalledWith('/manager/clients/guest', clientData);
    });

    it('devrait gérer les erreurs', async () => {
      mockedApiClient.post.mockRejectedValue(new Error('API Error'));
      await expect(ClientService.createGuestClient({} as ClientInvite)).rejects.toThrow('API Error');
    });
  });

  describe('createClientAccount', () => {
    it('devrait créer un compte client', async () => {
      const clientData: ClientInvite = {
        nom: 'Account',
        prenom: 'User',
        telephone: '444555666',
        email: 'account@test.com',
        adresseText: '456 Street'
      };

      mockedAuthService.getToken.mockReturnValue('mock-token');

      (global.fetch as jest.Mock) = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ success: true, clientId: 4 })
      });

      const result = await ClientService.createClientAccount(clientData);
      expect(result).toEqual({ success: true, clientId: 4 });
    });

    it('devrait gérer les erreurs de création de compte', async () => {
      mockedAuthService.getToken.mockReturnValue('mock-token');
      
      (global.fetch as jest.Mock) = jest.fn().mockRejectedValue(new Error('Network Error'));

      await expect(ClientService.createClientAccount({} as ClientInvite)).rejects.toThrow('Network Error');
    });
  });

  describe('getUsers', () => {
    it('devrait récupérer la liste des utilisateurs', async () => {
      const mockResponse = {
        data: [
          {
            id: 1,
            role: 'CLIENT' as const,
            nom: 'User1',
            prenom: 'Test',
            email: 'user1@test.com',
            telephone: '123',
            adresseText: null,
            latitude: null,
            longitude: null,
            aGeolocalisationEnregistree: false,
            typeClient: 'Standard' as const,
            siteLavagePrincipalGerantId: null,
            createdByUserId: null,
            createdAt: '2025-01-01T00:00:00Z',
            updatedAt: '2025-01-01T00:00:00Z'
          }
        ],
        meta: {
          total: 1,
          page: 1,
          limit: 10,
          totalPages: 1
        }
      };

      mockedApiClient.get.mockResolvedValue({
        data: { success: true, ...mockResponse }
      });

      const result = await ClientService.getUsers();
      expect(result).toEqual({
        users: mockResponse.data,
        total: 1,
        page: 1,
        limit: 10,
        totalPages: 1
      });
      expect(mockedApiClient.get).toHaveBeenCalled();
    });

    it('devrait filtrer par type', async () => {
      mockedApiClient.get.mockResolvedValue({
        data: { success: true, data: [], meta: { total: 0, page: 2, limit: 20, totalPages: 0 } }
      });

      await ClientService.getUsers(2, 20, { typeClient: 'Premium' });
      expect(mockedApiClient.get).toHaveBeenCalled();
    });

    it('devrait gérer les erreurs', async () => {
      mockedApiClient.get.mockRejectedValue(new Error('API Error'));
      const result = await ClientService.getUsers();
      expect(result.users).toEqual([]);
      expect(result.total).toBe(0);
    });
  });

  describe('getClientInvites', () => {
    it('devrait récupérer les invitations clients', async () => {
      const mockResponse = {
        data: [
          {
            id: 1,
            nom: 'Invited',
            prenom: 'User',
            telephone: '789',
            email: null,
            adresseText: null,
            createdByUserId: 1,
            createdAt: '2025-01-01T00:00:00Z'
          }
        ],
        meta: {
          total: 1,
          page: 1,
          limit: 10,
          totalPages: 1
        }
      };

      mockedApiClient.get.mockResolvedValue({
        data: { success: true, ...mockResponse }
      });

      const result = await ClientService.getClientInvites();
      expect(result).toEqual({
        clientsInvites: mockResponse.data,
        total: 1,
        page: 1,
        limit: 10,
        totalPages: 1
      });
      expect(mockedApiClient.get).toHaveBeenCalled();
    });

    it('devrait filtrer les invitations', async () => {
      mockedApiClient.get.mockResolvedValue({
        data: { success: true, data: [], meta: { total: 0, page: 2, limit: 20, totalPages: 0 } }
      });

      await ClientService.getClientInvites(2, 20, 'test');
      expect(mockedApiClient.get).toHaveBeenCalled();
    });

    it('devrait gérer les erreurs', async () => {
      mockedApiClient.get.mockRejectedValue(new Error('API Error'));
      const result = await ClientService.getClientInvites();
      expect(result.clientsInvites).toEqual([]);
      expect(result.total).toBe(0);
    });
  });

  describe('createUser', () => {
    it('devrait créer un utilisateur', async () => {
      const userData: CreateUserData = {
        nom: 'NewUser',
        prenom: 'Test',
        telephone: '999888777',
        email: 'newuser@test.com',
        role: 'CLIENT',
        typeClient: 'Standard',
        password: 'password123'
      };

      const mockUser: User = {
        id: 5,
        nom: userData.nom,
        prenom: userData.prenom,
        telephone: userData.telephone,
        email: userData.email,
        role: userData.role,
        typeClient: userData.typeClient,
        adresseText: null,
        latitude: null,
        longitude: null,
        aGeolocalisationEnregistree: false,
        siteLavagePrincipalGerantId: null,
        createdByUserId: null,
        createdAt: '2025-01-01T00:00:00Z',
        updatedAt: '2025-01-01T00:00:00Z'
      };

      mockedApiClient.post.mockResolvedValue({
        data: { success: true, user: mockUser, message: 'User created' }
      });

      const result = await ClientService.createUser(userData);
      expect(result).toEqual({ success: true, user: mockUser, message: 'User created' });
      expect(mockedApiClient.post).toHaveBeenCalledWith('/manager/users', userData);
    });

    it('devrait gérer les erreurs', async () => {
      mockedApiClient.post.mockRejectedValue(new Error('API Error'));
      await expect(ClientService.createUser({} as CreateUserData)).rejects.toThrow('API Error');
    });
  });

  describe('getUserById', () => {
    it('devrait récupérer un utilisateur par ID', async () => {
      const mockUser: User = {
        id: 1,
        role: 'CLIENT',
        nom: 'User',
        prenom: 'Test',
        email: 'user@test.com',
        telephone: '123',
        adresseText: null,
        latitude: null,
        longitude: null,
        aGeolocalisationEnregistree: false,
        typeClient: 'Standard',
        siteLavagePrincipalGerantId: null,
        createdByUserId: null,
        createdAt: '2025-01-01T00:00:00Z',
        updatedAt: '2025-01-01T00:00:00Z'
      };

      mockedApiClient.get.mockResolvedValue({
        data: { success: true, user: mockUser }
      });

      const result = await ClientService.getUserById(1);
      expect(result).toEqual(mockUser);
      expect(mockedApiClient.get).toHaveBeenCalledWith('/manager/users/1');
    });

    it('devrait gérer un utilisateur non trouvé', async () => {
      mockedApiClient.get.mockResolvedValue({
        data: { success: true, user: null }
      });

      const result = await ClientService.getUserById(999);
      expect(result).toBeNull();
    });

    it('devrait gérer les erreurs', async () => {
      mockedApiClient.get.mockRejectedValue(new Error('API Error'));
      await expect(ClientService.getUserById(1)).rejects.toThrow('API Error');
    });
  });

  describe('updateUser', () => {
    it('devrait mettre à jour un utilisateur', async () => {
      const updateData: UpdateUserData = {
        nom: 'UpdatedName',
        email: 'updated@test.com'
      };

      const mockUser: User = {
        id: 1,
        role: 'CLIENT',
        nom: 'UpdatedName',
        prenom: 'Test',
        email: 'updated@test.com',
        telephone: '123',
        adresseText: null,
        latitude: null,
        longitude: null,
        aGeolocalisationEnregistree: false,
        typeClient: 'Standard',
        siteLavagePrincipalGerantId: null,
        createdByUserId: null,
        createdAt: '2025-01-01T00:00:00Z',
        updatedAt: '2025-01-01T00:00:00Z'
      };

      mockedApiClient.put.mockResolvedValue({
        data: { success: true, user: mockUser, message: 'User updated' }
      });

      const result = await ClientService.updateUser(1, updateData);
      expect(result).toEqual({ success: true, user: mockUser, message: 'User updated' });
      expect(mockedApiClient.put).toHaveBeenCalledWith('/manager/users/1', updateData);
    });

    it('devrait gérer les erreurs', async () => {
      mockedApiClient.put.mockRejectedValue(new Error('API Error'));
      await expect(ClientService.updateUser(1, {})).rejects.toThrow('API Error');
    });
  });

  describe('deleteUser', () => {
    it('devrait supprimer un utilisateur', async () => {
      mockedApiClient.delete.mockResolvedValue({
        data: { success: true, message: 'User deleted' }
      });

      const result = await ClientService.deleteUser(1);
      expect(result).toEqual({ success: true, message: 'User deleted' });
      expect(mockedApiClient.delete).toHaveBeenCalledWith('/manager/users/1');
    });

    it('devrait gérer les erreurs', async () => {
      mockedApiClient.delete.mockRejectedValue(new Error('API Error'));
      await expect(ClientService.deleteUser(1)).rejects.toThrow('API Error');
    });
  });

  describe('getSites', () => {
    it('devrait récupérer la liste des sites', async () => {
      const mockSites = [
        { id: 1, nom: 'Site 1', ville: 'Ville 1' },
        { id: 2, nom: 'Site 2', ville: 'Ville 2' }
      ];

      mockedApiClient.get.mockResolvedValue({
        data: { success: true, sites: mockSites }
      });

      const result = await ClientService.getSites();
      expect(result).toEqual(mockSites);
      expect(mockedApiClient.get).toHaveBeenCalledWith('/manager/sites');
    });

    it('devrait gérer les erreurs', async () => {
      mockedApiClient.get.mockRejectedValue(new Error('API Error'));
      await expect(ClientService.getSites()).rejects.toThrow('API Error');
    });
  });

  describe('createAbonnementsPremium', () => {
    it('devrait créer un abonnement premium', async () => {
      const abonnementData = {
        siteLavageId: 1,
        start: 'this' as const,
        count: 3,
        limiteKg: 100
      };

      const mockAbonnement = [{
        id: 1,
        annee: 2025,
        mois: 1,
        limiteKg: 100,
        kgUtilises: 0,
        montant: 50000
      }];

      mockedApiClient.post.mockResolvedValue({
        data: { success: true, data: mockAbonnement, message: 'Abonnement créé' }
      });

      const result = await ClientService.createAbonnementsPremium(1, abonnementData);
      expect(result).toEqual({ success: true, data: mockAbonnement, message: 'Abonnement créé' });
      expect(mockedApiClient.post).toHaveBeenCalledWith('/users/1/abonnement-premium', abonnementData);
    });

    it('devrait gérer les erreurs', async () => {
      mockedApiClient.post.mockRejectedValue({
        response: { data: { message: 'API Error' } }
      });
      
      const result = await ClientService.createAbonnementsPremium(1, { siteLavageId: 1, limiteKg: 100 });
      expect(result.success).toBe(false);
    });
  });

  describe('updateAbonnementsPremium', () => {
    it('devrait mettre à jour un abonnement premium', async () => {
      const updateData = {
        limiteKg: 150,
        kgUtilises: 20
      };

      mockedApiClient.put.mockResolvedValue({
        data: { success: true, message: 'Abonnement mis à jour' }
      });

      const result = await ClientService.updateAbonnementsPremium(1, updateData);
      expect(result).toEqual({ success: true, message: 'Abonnement mis à jour' });
      expect(mockedApiClient.put).toHaveBeenCalledWith('/users/abonnement-premium/1', updateData);
    });

    it('devrait gérer les erreurs', async () => {
      mockedApiClient.put.mockRejectedValue({
        response: { data: { message: 'API Error' } }
      });
      
      const result = await ClientService.updateAbonnementsPremium(1, {});
      expect(result.success).toBe(false);
    });
  });

  describe('deleteAbonnementsPremium', () => {
    it('devrait supprimer un abonnement premium', async () => {
      mockedApiClient.delete.mockResolvedValue({
        data: { success: true, message: 'Abonnement supprimé' }
      });

      const result = await ClientService.deleteAbonnementsPremium(1);
      expect(result).toEqual({ success: true, message: 'Abonnement supprimé' });
      expect(mockedApiClient.delete).toHaveBeenCalledWith('/users/abonnement-premium/1');
    });

    it('devrait gérer les erreurs', async () => {
      mockedApiClient.delete.mockRejectedValue({
        response: { data: { message: 'API Error' } }
      });
      
      const result = await ClientService.deleteAbonnementsPremium(1);
      expect(result.success).toBe(false);
    });
  });
});
