/// <reference types="jest" />
import OrderService, { Order, OrderData, OrderOptions, DeliveryAddress } from '../src/services/order';
import apiClient from '../src/lib/axios';

jest.mock('../src/lib/axios');
jest.mock('../src/services/auth');
jest.mock('../src/config/env', () => ({
  API_URL: 'http://localhost:3000',
  SOCKET_URL: 'http://localhost:3000',
}));

const mockedApiClient = apiClient as jest.Mocked<typeof apiClient>;

describe('OrderService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const mockOrderOptions: OrderOptions = {
    aOptionRepassage: true,
    aOptionSechage: true,
    aOptionLivraison: false,
    aOptionExpress: false
  };

  const mockOrderData: OrderData = {
    clientUserId: 1,
    siteLavageId: 1,
    estEnLivraison: false,
    masseClientIndicativeKg: 15,
    formuleCommande: 'BaseMachine',
    options: mockOrderOptions,
    modePaiement: 'Espece',
    prixCalcule: {
      prixBase: 5000,
      prixOptions: 1000,
      prixSousTotal: 6000,
      prixFinal: 6000,
      prixApresReduction: 6000,
      prixPaye: 6000,
      formule: 'BaseMachine',
      options: {
        livraison: 0,
        repassage: 500,
        express: 500
      }
    }
  };

  const mockOrder: Order = {
    id: 1,
    clientUserId: 1,
    siteLavageId: 1,
    gerantCreationUserId: 1,
    dateHeureCommande: '2024-01-01T10:00:00Z',
    dateDernierStatutChange: '2024-01-01T10:00:00Z',
    statut: 'PrisEnCharge',
    masseClientIndicativeKg: 15,
    estEnLivraison: false,
    formuleCommande: 'BaseMachine',
    modePaiement: 'Espece',
    flag: false,
    createdAt: '2024-01-01T10:00:00Z',
    updatedAt: '2024-01-01T10:00:00Z',
    options: mockOrderOptions,
    prixTotal: 6000,
    prixPaye: 6000
  };

  describe('createOrder', () => {
    it('devrait créer une nouvelle commande', async () => {
      mockedApiClient.post.mockResolvedValue({
        data: { success: true, data: { order: mockOrder } }
      });

      const result = await OrderService.createOrder(mockOrderData);

      expect(result.success).toBe(true);
      expect(result.order).toEqual(mockOrder);
      expect(mockedApiClient.post).toHaveBeenCalledWith('/orders', mockOrderData);
    });

    it('devrait gérer les erreurs lors de la création', async () => {
      mockedApiClient.post.mockRejectedValue(new Error('API Error'));

      const result = await OrderService.createOrder(mockOrderData);

      expect(result.success).toBe(false);
      expect(result.order).toBeUndefined();
    });
  });

  describe('getOrders', () => {
    it('devrait récupérer la liste des commandes avec pagination', async () => {
      const mockResponse = {
        data: {
          success: true,
          data: [mockOrder],
          meta: {
            total: 1,
            page: 1,
            limit: 10,
            totalPages: 1
          }
        }
      };

      mockedApiClient.get.mockResolvedValue(mockResponse);

      const result = await OrderService.getOrders(1, 10);

      expect(result.orders).toEqual([mockOrder]);
      expect(result.total).toBe(1);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(10);
      expect(result.totalPages).toBe(1);
      expect(mockedApiClient.get).toHaveBeenCalledWith('/orders?page=1&limit=10');
    });

    it('devrait filtrer par statut', async () => {
      const mockResponse = {
        data: {
          success: true,
          data: [mockOrder],
          meta: { total: 1, page: 1, limit: 10, totalPages: 1 }
        }
      };

      mockedApiClient.get.mockResolvedValue(mockResponse);

      await OrderService.getOrders(1, 10, 'PrisEnCharge');

      expect(mockedApiClient.get).toHaveBeenCalledWith('/orders?page=1&limit=10&status=PrisEnCharge');
    });

    it('ne devrait pas ajouter le filtre statut si "all"', async () => {
      const mockResponse = {
        data: {
          success: true,
          data: [mockOrder],
          meta: { total: 1, page: 1, limit: 10, totalPages: 1 }
        }
      };

      mockedApiClient.get.mockResolvedValue(mockResponse);

      await OrderService.getOrders(1, 10, 'all');

      expect(mockedApiClient.get).toHaveBeenCalledWith('/orders?page=1&limit=10');
    });

    it('devrait filtrer par siteLavageId', async () => {
      const mockResponse = {
        data: {
          success: true,
          data: [mockOrder],
          meta: { total: 1, page: 1, limit: 10, totalPages: 1 }
        }
      };

      mockedApiClient.get.mockResolvedValue(mockResponse);

      await OrderService.getOrders(1, 10, undefined, 2);

      expect(mockedApiClient.get).toHaveBeenCalledWith('/orders?page=1&limit=10&siteLavageId=2');
    });

    it('devrait filtrer par recherche', async () => {
      const mockResponse = {
        data: {
          success: true,
          data: [mockOrder],
          meta: { total: 1, page: 1, limit: 10, totalPages: 1 }
        }
      };

      mockedApiClient.get.mockResolvedValue(mockResponse);

      await OrderService.getOrders(1, 10, undefined, undefined, 'John');

      expect(mockedApiClient.get).toHaveBeenCalledWith('/orders?page=1&limit=10&search=John');
    });

    it('devrait encoder correctement la recherche', async () => {
      const mockResponse = {
        data: {
          success: true,
          data: [mockOrder],
          meta: { total: 1, page: 1, limit: 10, totalPages: 1 }
        }
      };

      mockedApiClient.get.mockResolvedValue(mockResponse);

      await OrderService.getOrders(1, 10, undefined, undefined, 'Jean Dupont');

      expect(mockedApiClient.get).toHaveBeenCalledWith('/orders?page=1&limit=10&search=Jean%20Dupont');
    });

    it('ne devrait pas ajouter la recherche si vide', async () => {
      const mockResponse = {
        data: {
          success: true,
          data: [mockOrder],
          meta: { total: 1, page: 1, limit: 10, totalPages: 1 }
        }
      };

      mockedApiClient.get.mockResolvedValue(mockResponse);

      await OrderService.getOrders(1, 10, undefined, undefined, '  ');

      expect(mockedApiClient.get).toHaveBeenCalledWith('/orders?page=1&limit=10');
    });

    it('devrait combiner tous les filtres', async () => {
      const mockResponse = {
        data: {
          success: true,
          data: [mockOrder],
          meta: { total: 1, page: 1, limit: 10, totalPages: 1 }
        }
      };

      mockedApiClient.get.mockResolvedValue(mockResponse);

      await OrderService.getOrders(2, 20, 'LavageEnCours', 3, 'test');

      expect(mockedApiClient.get).toHaveBeenCalledWith(
        '/orders?page=2&limit=20&status=LavageEnCours&siteLavageId=3&search=test'
      );
    });

    it('devrait gérer les erreurs', async () => {
      mockedApiClient.get.mockRejectedValue(new Error('API Error'));

      const result = await OrderService.getOrders();

      expect(result.orders).toEqual([]);
      expect(result.total).toBe(0);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(10);
      expect(result.totalPages).toBe(0);
    });
  });

  describe('getOrderDetails', () => {
    it('devrait récupérer les détails d\'une commande', async () => {
      mockedApiClient.get.mockResolvedValue({
        data: { success: true, data: mockOrder }
      });

      const result = await OrderService.getOrderDetails(1);

      expect(result).toEqual(mockOrder);
      expect(mockedApiClient.get).toHaveBeenCalledWith('/orders/1');
    });

    it('devrait gérer les erreurs', async () => {
      mockedApiClient.get.mockRejectedValue(new Error('API Error'));

      const result = await OrderService.getOrderDetails(1);

      expect(result).toBeNull();
    });
  });

  describe('updateOrder', () => {
    it('devrait mettre à jour une commande', async () => {
      const updateData = {
        masseVerifieeKg: 16,
        statut: 'LavageEnCours' as const
      };

      mockedApiClient.put.mockResolvedValue({
        data: { success: true, data: { ...mockOrder, ...updateData } }
      });

      const result = await OrderService.updateOrder(1, updateData);

      expect(result.success).toBe(true);
      expect(result.order?.masseVerifieeKg).toBe(16);
      expect(mockedApiClient.put).toHaveBeenCalledWith('/orders/1', updateData);
    });

    it('devrait mettre à jour le statut', async () => {
      const updateData = { statut: 'Livre' as const };

      mockedApiClient.put.mockResolvedValue({
        data: { success: true, data: { ...mockOrder, ...updateData } }
      });

      const result = await OrderService.updateOrder(1, updateData);

      expect(result.success).toBe(true);
      expect(result.order?.statut).toBe('Livre');
    });

    it('devrait mettre à jour le livreur', async () => {
      const updateData = { livreurId: 5 };

      mockedApiClient.put.mockResolvedValue({
        data: { success: true, data: { ...mockOrder, ...updateData } }
      });

      const result = await OrderService.updateOrder(1, updateData);

      expect(result.success).toBe(true);
      expect(mockedApiClient.put).toHaveBeenCalledWith('/orders/1', updateData);
    });

    it('devrait mettre à jour les options', async () => {
      const updateData = {
        options: {
          aOptionRepassage: false
        }
      };

      mockedApiClient.put.mockResolvedValue({
        data: { success: true, data: mockOrder }
      });

      const result = await OrderService.updateOrder(1, updateData);

      expect(result.success).toBe(true);
    });

    it('devrait mettre à jour l\'ajustement de prix', async () => {
      const updateData = {
        ajustementType: 'Augmentation' as const,
        ajustementMethode: 'Pourcentage' as const,
        ajustementValeur: 10,
        ajustementRaison: 'Service supplémentaire'
      };

      mockedApiClient.put.mockResolvedValue({
        data: { success: true, data: mockOrder }
      });

      const result = await OrderService.updateOrder(1, updateData);

      expect(result.success).toBe(true);
      expect(mockedApiClient.put).toHaveBeenCalledWith('/orders/1', updateData);
    });

    it('devrait gérer les erreurs', async () => {
      mockedApiClient.put.mockRejectedValue(new Error('API Error'));

      const result = await OrderService.updateOrder(1, { masseVerifieeKg: 16 });

      expect(result.success).toBe(false);
      expect(result.order).toBeUndefined();
    });
  });

  describe('updateOrderFields', () => {
    it('devrait mettre à jour la masse', async () => {
      const orderData: Partial<OrderData> = {
        masseClientIndicativeKg: 20
      };

      mockedApiClient.put.mockResolvedValue({
        data: { success: true, data: mockOrder }
      });

      const result = await OrderService.updateOrderFields(1, orderData);

      expect(result.success).toBe(true);
      expect(mockedApiClient.put).toHaveBeenCalledWith(
        '/orders/1',
        expect.objectContaining({
          masseVerifieeKg: 20
        })
      );
    });

    it('devrait mettre à jour le mode de paiement', async () => {
      const orderData: Partial<OrderData> = {
        modePaiement: 'MobileMoney'
      };

      mockedApiClient.put.mockResolvedValue({
        data: { success: true, data: mockOrder }
      });

      const result = await OrderService.updateOrderFields(1, orderData);

      expect(result.success).toBe(true);
      expect(mockedApiClient.put).toHaveBeenCalledWith(
        '/orders/1',
        expect.objectContaining({
          modePaiement: 'MobileMoney'
        })
      );
    });

    it('devrait mettre à jour la réduction', async () => {
      const orderData: Partial<OrderData> = {
        typeReduction: 'Etudiant'
      };

      mockedApiClient.put.mockResolvedValue({
        data: { success: true, data: mockOrder }
      });

      const result = await OrderService.updateOrderFields(1, orderData);

      expect(result.success).toBe(true);
      expect(mockedApiClient.put).toHaveBeenCalledWith(
        '/orders/1',
        expect.objectContaining({
          typeReduction: 'Etudiant'
        })
      );
    });

    it('devrait permettre de supprimer la réduction', async () => {
      const orderData: Partial<OrderData> = {
        typeReduction: undefined
      };

      mockedApiClient.put.mockResolvedValue({
        data: { success: true, data: mockOrder }
      });

      const result = await OrderService.updateOrderFields(1, orderData);

      expect(result.success).toBe(true);
      // Les ajustements sont toujours inclus (null pour suppression)
      expect(mockedApiClient.put).toHaveBeenCalledWith(
        '/orders/1',
        expect.objectContaining({
          ajustementType: null,
          ajustementMethode: null,
          ajustementValeur: null,
          ajustementRaison: null
        })
      );
    });

    it('devrait mettre à jour les options et synchroniser estEnLivraison', async () => {
      const orderData: Partial<OrderData> = {
        options: {
          aOptionRepassage: true,
          aOptionSechage: true,
          aOptionLivraison: true,
          aOptionExpress: false
        }
      };

      mockedApiClient.put.mockResolvedValue({
        data: { success: true, data: mockOrder }
      });

      const result = await OrderService.updateOrderFields(1, orderData);

      expect(result.success).toBe(true);
      expect(mockedApiClient.put).toHaveBeenCalledWith(
        '/orders/1',
        expect.objectContaining({
          options: {
            aOptionRepassage: true,
            aOptionSechage: true,
            aOptionLivraison: true,
            aOptionExpress: false
          },
          estEnLivraison: true
        })
      );
    });

    it('devrait nettoyer les ajustements avec null', async () => {
      const orderData: Partial<OrderData> = {
        ajustementType: undefined,
        ajustementMethode: undefined,
        ajustementValeur: undefined,
        ajustementRaison: undefined
      };

      mockedApiClient.put.mockResolvedValue({
        data: { success: true, data: mockOrder }
      });

      const result = await OrderService.updateOrderFields(1, orderData);

      expect(result.success).toBe(true);
      expect(mockedApiClient.put).toHaveBeenCalledWith(
        '/orders/1',
        expect.objectContaining({
          ajustementType: null,
          ajustementMethode: null,
          ajustementValeur: null,
          ajustementRaison: null
        })
      );
    });

    it('devrait inclure les prix calculés', async () => {
      const orderData: Partial<OrderData> = {
        prixCalcule: {
          prixBase: 8000,
          prixOptions: 2000,
          prixSousTotal: 10000,
          prixFinal: 10000,
          prixApresReduction: 10000,
          prixPaye: 10000,
          formule: 'Detail',
          options: {}
        }
      };

      mockedApiClient.put.mockResolvedValue({
        data: { success: true, data: mockOrder }
      });

      const result = await OrderService.updateOrderFields(1, orderData);

      expect(result.success).toBe(true);
      expect(mockedApiClient.put).toHaveBeenCalledWith(
        '/orders/1',
        expect.objectContaining({
          prixCalcule: orderData.prixCalcule
        })
      );
    });

    it('devrait gérer les erreurs', async () => {
      mockedApiClient.put.mockRejectedValue(new Error('API Error'));

      const result = await OrderService.updateOrderFields(1, {});

      expect(result.success).toBe(false);
      expect(result.order).toBeUndefined();
    });
  });

  describe('addPayment', () => {
    it('devrait ajouter un paiement', async () => {
      const paymentData = {
        montant: 6000,
        mode: 'Espece' as const
      };

      const mockPayment = {
        id: 1,
        montant: 6000,
        mode: 'Espece',
        datePaiement: '2024-01-01T10:00:00Z',
        statut: 'Paye'
      };

      mockedApiClient.post.mockResolvedValue({
        data: { success: true, data: mockPayment }
      });

      const result = await OrderService.addPayment(1, paymentData);

      expect(result.success).toBe(true);
      expect(result.payment).toEqual(mockPayment);
      expect(mockedApiClient.post).toHaveBeenCalledWith('/orders/1/payment', paymentData);
    });

    it('devrait ajouter un paiement MobileMoney', async () => {
      const paymentData = {
        montant: 5000,
        mode: 'MobileMoney' as const,
        statut: 'EnAttente' as const
      };

      mockedApiClient.post.mockResolvedValue({
        data: { success: true, data: {} }
      });

      const result = await OrderService.addPayment(1, paymentData);

      expect(result.success).toBe(true);
      expect(mockedApiClient.post).toHaveBeenCalledWith('/orders/1/payment', paymentData);
    });

    it('devrait gérer les erreurs', async () => {
      mockedApiClient.post.mockRejectedValue(new Error('API Error'));

      const result = await OrderService.addPayment(1, {
        montant: 6000,
        mode: 'Espece'
      });

      expect(result.success).toBe(false);
      expect(result.payment).toBeUndefined();
    });
  });

  describe('deleteOrder', () => {
    it('devrait supprimer une commande', async () => {
      mockedApiClient.delete.mockResolvedValue({
        data: { success: true }
      });

      const result = await OrderService.deleteOrder(1);

      expect(result.success).toBe(true);
      expect(mockedApiClient.delete).toHaveBeenCalledWith('/orders/1');
    });

    it('devrait gérer les erreurs', async () => {
      mockedApiClient.delete.mockRejectedValue(new Error('API Error'));

      const result = await OrderService.deleteOrder(1);

      expect(result.success).toBe(false);
    });
  });

  describe('getOrdersWithFilters', () => {
    it('devrait récupérer les commandes sans filtres', async () => {
      const mockResponse = {
        data: {
          success: true,
          data: {
            orders: [mockOrder],
            total: 1,
            page: 1,
            limit: 10
          }
        }
      };

      mockedApiClient.get.mockResolvedValue(mockResponse);

      const result = await OrderService.getOrdersWithFilters();

      expect(result).toEqual({
        orders: [mockOrder],
        total: 1,
        page: 1,
        limit: 10
      });
      expect(mockedApiClient.get).toHaveBeenCalledWith('/orders?');
    });

    it('devrait filtrer par statut', async () => {
      const mockResponse = {
        data: {
          success: true,
          data: {
            orders: [mockOrder],
            total: 1,
            page: 1,
            limit: 10
          }
        }
      };

      mockedApiClient.get.mockResolvedValue(mockResponse);

      await OrderService.getOrdersWithFilters({ status: 'PrisEnCharge' });

      expect(mockedApiClient.get).toHaveBeenCalledWith(
        expect.stringContaining('status=PrisEnCharge')
      );
    });

    it('devrait filtrer par clientId', async () => {
      const mockResponse = {
        data: {
          success: true,
          data: {
            orders: [mockOrder],
            total: 1,
            page: 1,
            limit: 10
          }
        }
      };

      mockedApiClient.get.mockResolvedValue(mockResponse);

      await OrderService.getOrdersWithFilters({ clientId: 5 });

      expect(mockedApiClient.get).toHaveBeenCalledWith(
        expect.stringContaining('clientId=5')
      );
    });

    it('devrait filtrer par siteLavageId', async () => {
      const mockResponse = {
        data: {
          success: true,
          data: {
            orders: [mockOrder],
            total: 1,
            page: 1,
            limit: 10
          }
        }
      };

      mockedApiClient.get.mockResolvedValue(mockResponse);

      await OrderService.getOrdersWithFilters({ siteLavageId: 2 });

      expect(mockedApiClient.get).toHaveBeenCalledWith(
        expect.stringContaining('siteLavageId=2')
      );
    });

    it('devrait filtrer par gerantId', async () => {
      const mockResponse = {
        data: {
          success: true,
          data: {
            orders: [mockOrder],
            total: 1,
            page: 1,
            limit: 10
          }
        }
      };

      mockedApiClient.get.mockResolvedValue(mockResponse);

      await OrderService.getOrdersWithFilters({ gerantId: 3 });

      expect(mockedApiClient.get).toHaveBeenCalledWith(
        expect.stringContaining('gerantId=3')
      );
    });

    it('devrait filtrer par livreurId', async () => {
      const mockResponse = {
        data: {
          success: true,
          data: {
            orders: [mockOrder],
            total: 1,
            page: 1,
            limit: 10
          }
        }
      };

      mockedApiClient.get.mockResolvedValue(mockResponse);

      await OrderService.getOrdersWithFilters({ livreurId: 4 });

      expect(mockedApiClient.get).toHaveBeenCalledWith(
        expect.stringContaining('livreurId=4')
      );
    });

    it('devrait filtrer par dates', async () => {
      const mockResponse = {
        data: {
          success: true,
          data: {
            orders: [mockOrder],
            total: 1,
            page: 1,
            limit: 10
          }
        }
      };

      mockedApiClient.get.mockResolvedValue(mockResponse);

      await OrderService.getOrdersWithFilters({
        dateFrom: '2024-01-01',
        dateTo: '2024-01-31'
      });

      const call = mockedApiClient.get.mock.calls[0][0];
      expect(call).toContain('dateFrom=2024-01-01');
      expect(call).toContain('dateTo=2024-01-31');
    });

    it('devrait filtrer par estEnLivraison', async () => {
      const mockResponse = {
        data: {
          success: true,
          data: {
            orders: [mockOrder],
            total: 1,
            page: 1,
            limit: 10
          }
        }
      };

      mockedApiClient.get.mockResolvedValue(mockResponse);

      await OrderService.getOrdersWithFilters({ estEnLivraison: true });

      expect(mockedApiClient.get).toHaveBeenCalledWith(
        expect.stringContaining('estEnLivraison=true')
      );
    });

    it('devrait utiliser la pagination', async () => {
      const mockResponse = {
        data: {
          success: true,
          data: {
            orders: [mockOrder],
            total: 1,
            page: 2,
            limit: 20
          }
        }
      };

      mockedApiClient.get.mockResolvedValue(mockResponse);

      await OrderService.getOrdersWithFilters({ page: 2, limit: 20 });

      const call = mockedApiClient.get.mock.calls[0][0];
      expect(call).toContain('page=2');
      expect(call).toContain('limit=20');
    });

    it('devrait combiner plusieurs filtres', async () => {
      const mockResponse = {
        data: {
          success: true,
          data: {
            orders: [mockOrder],
            total: 1,
            page: 1,
            limit: 10
          }
        }
      };

      mockedApiClient.get.mockResolvedValue(mockResponse);

      await OrderService.getOrdersWithFilters({
        status: 'Livre',
        clientId: 5,
        siteLavageId: 2,
        page: 1,
        limit: 10
      });

      const call = mockedApiClient.get.mock.calls[0][0];
      expect(call).toContain('status=Livre');
      expect(call).toContain('clientId=5');
      expect(call).toContain('siteLavageId=2');
    });

    it('ne devrait pas ajouter les valeurs undefined ou null', async () => {
      const mockResponse = {
        data: {
          success: true,
          data: {
            orders: [mockOrder],
            total: 1,
            page: 1,
            limit: 10
          }
        }
      };

      mockedApiClient.get.mockResolvedValue(mockResponse);

      await OrderService.getOrdersWithFilters({
        status: undefined,
        clientId: null as any,
        siteLavageId: 2
      });

      const call = mockedApiClient.get.mock.calls[0][0];
      expect(call).not.toContain('status=');
      expect(call).not.toContain('clientId=');
      expect(call).toContain('siteLavageId=2');
    });

    it('devrait gérer les erreurs', async () => {
      mockedApiClient.get.mockRejectedValue(new Error('API Error'));

      const result = await OrderService.getOrdersWithFilters();

      expect(result).toBeNull();
    });
  });
});
