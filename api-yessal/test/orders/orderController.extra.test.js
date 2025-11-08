const controller = require('../../src/controllers/orderController');
const prisma = require('../../src/utils/prismaClient');
const clientUtils = require('../../src/utils/clientUtils');

describe('orderController additional branches', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('updateOrder - triggers SMS logging when status changes to Livraison', async () => {
    // prepare mocks
    const managerId = 77;
    const orderId = 11;
    const existingOrder = {
      id: orderId,
      gerantCreationUserId: managerId,
      estEnLivraison: true,
      flag: true
    };

    // findUnique called first to fetch existingOrder
    prisma.commande.findUnique = jest.fn()
      .mockResolvedValueOnce(existingOrder) // initial check
      .mockResolvedValueOnce({ // final fetch returning "completeOrder"
        ...existingOrder,
        clientUser: { id: 1, nom: 'A', prenom: 'B' }
      });

    // mock transaction to call the callback with a tx object having historiqueStatuts.create
    const tx = {
      // controller may use either name for history tables in transactions; provide both
      historiqueStatuts: { create: jest.fn().mockResolvedValue({}) },
      historiquestatutcommande: { create: jest.fn().mockResolvedValue({}) },
      commande: { update: jest.fn().mockResolvedValue({ id: orderId }) }
    };

    prisma.$transaction = jest.fn().mockImplementation(async (work) => {
      return work(tx);
    });

    // spy console.log for SMS
    const spyLog = jest.spyOn(console, 'log').mockImplementation(() => {});

    const req = {
      params: { id: String(orderId) },
      user: { id: managerId, role: 'MANAGER' },
      body: { statut: 'Livraison', livreurId: 12 }
    };

    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    const next = jest.fn();

    await controller.updateOrder(req, res, next);

  expect(prisma.commande.findUnique).toHaveBeenCalled();
  // transaction should have created a history entry using historiquestatutcommande
  expect(tx.historiquestatutcommande.create).toHaveBeenCalled();
  expect(tx.commande.update).toHaveBeenCalled();
  expect(spyLog).toHaveBeenCalled();

    spyLog.mockRestore();
  });

  test('deleteOrder - denies deletion when older than 24 hours', async () => {
    const managerId = 8;
    const orderId = 99;

    // Create an order older than 48 hours
    const pastDate = new Date(Date.now() - 1000 * 3600 * 48).toISOString();
    prisma.commande.findUnique = jest.fn().mockResolvedValue({
      id: orderId,
      dateHeureCommande: pastDate,
      gerantCreationUserId: managerId,
      flag: true
    });

    const req = { params: { id: String(orderId) }, user: { id: managerId, role: 'MANAGER' } };
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    const next = jest.fn();

    await controller.deleteOrder(req, res, next);

    // Should respond with 400 (cannot deactivate after 24h)
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalled();
  });

  test('addPayment - updates commande.prixPaye to sum of payments', async () => {
    const managerId = 3;
    const orderId = 55;

    // Return an order with verified weight so calculateOrderPrice is used
    prisma.commande.findUnique = jest.fn().mockResolvedValue({
      id: orderId,
      prixTotal: 1000,
      montantReductionPoints: 0,
      modePaiement: null,
      options: [],
      clientUser: { id: 12 },
      masseVerifieeKg: 5
    });

    // Ensure nested namespaces exist in the central prisma mock
    prisma.paiement = prisma.paiement || {};
    prisma.fidelite = prisma.fidelite || {};

    // No fidelity pack applied
    prisma.fidelite.findUnique = jest.fn().mockResolvedValue(null);

    // When creating payment, return created payment object
    prisma.paiement.create = jest.fn().mockResolvedValue({ id: 1, montant: 150 });

    // findMany returns two money payments used to compute totalPaid
    prisma.paiement.findMany = jest.fn().mockResolvedValue([{ montant: 200 }, { montant: 150 }]);

    // Mock priceCalculator to return a totalPrice for the order
    const priceCalculator = require('../../src/utils/priceCalculator');
    jest.spyOn(priceCalculator, 'calculateOrderPrice').mockReturnValue({ totalPrice: 1000 });

    prisma.commande.update = jest.fn().mockResolvedValue({ id: orderId, prixPaye: 350 });

    const req = { params: { id: String(orderId) }, user: { id: managerId, role: 'MANAGER' }, body: { montant: 150, mode: 'Cash' } };
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    const next = jest.fn();

    await controller.addPayment(req, res, next);

    // Ensure update called with prixPaye equal to sum of payments
    expect(prisma.commande.update).toHaveBeenCalledWith({ where: { id: orderId }, data: { prixPaye: 350 } });
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalled();
  });

  test('updateOrder - updates DB prices when prixCalcule differs', async () => {
    const managerId = 44;
    const orderId = 202;

    const existingOrder = {
      id: orderId,
      gerantCreationUserId: managerId,
      flag: true,
      options: {},
      clientUser: { id: 2 }
    };

    // initial findUnique returns existingOrder
    // final findUnique (after transaction) returns enrichedOrder with different prices
    prisma.commande.findUnique = jest.fn()
      .mockResolvedValueOnce(existingOrder) // initial
      .mockResolvedValueOnce({ // after transaction fetch (completeOrder) - different prices to force DB update
        ...existingOrder,
        clientUser: { id: 2 },
        prixTotal: 1000,
        prixPaye: 50
      });

    // Mock transaction update
    const tx = { commande: { update: jest.fn().mockResolvedValue({ id: orderId }) } };
    prisma.$transaction = jest.fn().mockImplementation(async (work) => work(tx));

    // Ensure prisma.commande.update is spied for the post-prixCalcule update
    prisma.commande.update = jest.fn().mockResolvedValue({ id: orderId });

    const req = {
      params: { id: String(orderId) },
      user: { id: managerId, role: 'MANAGER' },
      body: { prixCalcule: { prixFinal: 5000, prixPaye: 500 } }
    };
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    const next = jest.fn();

    await controller.updateOrder(req, res, next);

    // Should attempt to persist new prices because the fetched complete order has different values
    expect(prisma.commande.update).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(200);
  });

  test('getOrders - logs and continues when priceCalculator throws', async () => {
    // Make findMany return one order with masseVerifieeKg so price calc attempted
    const order = { id: 77, masseVerifieeKg: 3, options: [], clientUser: { id: 1 } };
    prisma.commande.findMany = jest.fn().mockResolvedValue([order]);
    prisma.commande.count = jest.fn().mockResolvedValue(1);

    // Make priceCalculator throw
    const priceCalculator = require('../../src/utils/priceCalculator');
    jest.spyOn(priceCalculator, 'calculateOrderPrice').mockImplementation(() => { throw new Error('boom'); });

    const spyLog = jest.spyOn(console, 'log').mockImplementation(() => {});

    const req = { query: {}, user: { role: 'MANAGER' } };
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    const next = jest.fn();

    await controller.getOrders(req, res, next);

    expect(prisma.commande.findMany).toHaveBeenCalled();
    expect(spyLog).toHaveBeenCalled();

    spyLog.mockRestore();
  });

  test('addPayment - applies automatic fidelity pack conversion', async () => {
    const managerId = 6;
    const orderId = 66;

    prisma.commande.findUnique = jest.fn().mockResolvedValue({
      id: orderId,
      options: [],
      clientUser: { id: 99 },
      masseVerifieeKg: 2,
      prixTotal: 1200,
      prixPaye: 0,
      montantReductionPoints: 0,
      modePaiement: null
    });

  // Mock price calculation so the flow continues
  const priceCalculator = require('../../src/utils/priceCalculator');
  jest.spyOn(priceCalculator, 'calculateOrderPrice').mockReturnValue({ totalPrice: 1200 });

  // Provide a fidelity entry with enough points
    prisma.fidelite = prisma.fidelite || {};
    prisma.fidelite.findUnique = jest.fn().mockResolvedValue({ id: 3, clientUserId: 99, pointsDisponible: 1000 });
    prisma.fidelite.update = jest.fn().mockResolvedValue({});

    // Ensure paiement.create exists and returns created payment
    prisma.paiement = prisma.paiement || {};
    prisma.paiement.create = jest.fn().mockResolvedValue({ id: 2, montant: 0 });

    // commande.update for points deduction and later prixPaye update
    prisma.commande.update = jest.fn().mockResolvedValue({ id: orderId });

    const req = { params: { id: String(orderId) }, user: { id: managerId, role: 'MANAGER' }, body: { montant: 100, mode: 'Cash' } };
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    const next = jest.fn();

    await controller.addPayment(req, res, next);

    expect(prisma.fidelite.findUnique).toHaveBeenCalled();
    expect(prisma.fidelite.update).toHaveBeenCalled();
    expect(prisma.paiement.create).toHaveBeenCalled();
    expect(prisma.commande.update).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(201);
  });
});
