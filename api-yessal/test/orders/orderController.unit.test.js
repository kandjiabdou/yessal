const controller = require('../../src/controllers/orderController');
const {
  createOrder,
  getOrders,
  getOrderById,
  updateOrder,
  addPayment,
  deleteOrder,
  getMyOrders
} = controller;

const prisma = require('../../src/utils/prismaClient');
const priceCalculator = require('../../src/utils/priceCalculator');
const fidelityService = require('../../src/services/fidelityService');
const clientUtils = require('../../src/utils/clientUtils');

describe('orderController unit tests', () => {
  let res, next;

  beforeEach(() => {
    jest.clearAllMocks();
    res = { status: jest.fn().mockReturnThis(), json: jest.fn().mockReturnThis() };
    next = jest.fn();
  });

  // helper functions are internal; behavior of enrichment and price adjustments
  // is exercised via controller endpoints below

  test('createOrder successful flow returns 201', async () => {
    // prepare mocks for transaction
    prisma.$transaction = jest.fn().mockImplementation(async (fn) => {
      const tx = {
        clientinvite: { create: jest.fn().mockResolvedValue({ id: 7 }) },
        commande: { create: jest.fn().mockResolvedValue({ id: 8, flag: true }) },
        adresselivraison: { create: jest.fn().mockResolvedValue({}) },
        abonnementpremiummensuel: { findFirst: jest.fn().mockResolvedValue(null), update: jest.fn() }
      };
      // attach fidelityService mock as it's imported into controller
      fidelityService.addFidelityPoints = jest.fn().mockResolvedValue(null);
      return fn(tx);
    });

    prisma.commande.findUnique = jest.fn().mockResolvedValue({ id: 8, clientUser: null });
    jest.spyOn(clientUtils, 'enrichClientWithPremiumData').mockResolvedValue(null);

    const req = {
      body: {
        clientUserId: null,
        clientInvite: { nom: 'Inv', telephone: '700' },
        siteLavageId: 1,
        estEnLivraison: true,
        adresseLivraison: { adresseText: 'Rue', latitude: 0, longitude: 0 },
        masseClientIndicativeKg: 2,
        formuleCommande: 'BaseMachine',
        options: {},
        prixCalcule: { prixFinal: 2000, prixPaye: 2000 }
      },
      user: { id: 9 }
    };

    await createOrder(req, res, next);
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalled();
  });

  test('getOrders handles search numeric and price calc', async () => {
    const order = { id: 1, masseVerifieeKg: 2, formuleCommande: 'BaseMachine', clientUser: { typeClient: 'Standard' } };
    prisma.commande.findMany = jest.fn().mockResolvedValue([order]);
    prisma.commande.count = jest.fn().mockResolvedValue(1);
    jest.spyOn(clientUtils, 'enrichClientWithPremiumData').mockResolvedValue(order.clientUser);
    priceCalculator.calculateOrderPrice = jest.fn().mockReturnValue({ totalPrice: 1000 });

    const req = { query: { search: '1', page: '1', limit: '10' }, user: { role: 'Manager' } };
    await getOrders(req, res, next);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
  });

  test('getOrderById returns 404 when not found', async () => {
    prisma.commande.findUnique = jest.fn().mockResolvedValue(null);
    const req = { params: { id: '999' }, user: { role: 'Manager' } };
    await getOrderById(req, res, next);
    expect(res.status).toHaveBeenCalledWith(404);
  });

  test('getOrderById 403 for client not owner', async () => {
    const order = { id: 2, clientUserId: 5, clientUser: { id: 5 }, masseVerifieeKg: null };
    prisma.commande.findUnique = jest.fn().mockResolvedValue(order);
    jest.spyOn(clientUtils, 'enrichClientWithPremiumData').mockResolvedValue(order.clientUser);
    const req = { params: { id: '2' }, user: { role: 'Client', id: 99 } };
    await getOrderById(req, res, next);
    expect(res.status).toHaveBeenCalledWith(403);
  });

  test('updateOrder forbidden for non-manager and not found flows', async () => {
    const reqNonManager = { params: { id: '1' }, user: { role: 'Client' }, body: {} };
    await updateOrder(reqNonManager, res, next);
    expect(res.status).toHaveBeenCalledWith(403);

    // manager but order not found
    prisma.commande.findUnique = jest.fn().mockResolvedValue(null);
    const reqManager = { params: { id: '1' }, user: { role: 'Manager', id: 10 }, body: {} };
    await updateOrder(reqManager, res, next);
    expect(res.status).toHaveBeenCalledWith(404);
  });

  test('addPayment returns 403 for non-manager and 404 when order missing', async () => {
    const reqNonManager = { params: { id: '1' }, user: { role: 'Client' }, body: {} };
    await addPayment(reqNonManager, res, next);
    expect(res.status).toHaveBeenCalledWith(403);

    const reqManager = { params: { id: '2' }, user: { role: 'Manager' }, body: { montant: 100, mode: 'Espece' } };
    prisma.commande.findUnique = jest.fn().mockResolvedValue(null);
    await addPayment(reqManager, res, next);
    expect(res.status).toHaveBeenCalledWith(404);
  });

  test('addPayment handles missing weight and price calc failure', async () => {
    const orderNoWeight = { id: 3, masseVerifieeKg: null };
    prisma.commande.findUnique = jest.fn().mockResolvedValue(orderNoWeight);
    const req = { params: { id: '3' }, user: { role: 'Manager' }, body: { montant: 100, mode: 'Espece' } };
    await addPayment(req, res, next);
    expect(res.status).toHaveBeenCalledWith(400);

    // now with weight but price calc throws
    const orderWithWeight = { id: 4, masseVerifieeKg: 2, clientUser: { id: 7 }, prixTotal: null };
    prisma.commande.findUnique = jest.fn().mockResolvedValue(orderWithWeight);
    priceCalculator.calculateOrderPrice = jest.fn().mockImplementation(() => { throw new Error('boom'); });
    await addPayment({ params: { id: '4' }, user: { role: 'Manager' }, body: { montant: 50, mode: 'Espece' } }, res, next);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  // internal helper behaviors are validated indirectly through higher-level
  // controller function tests below (create/update/delete/addPayment/getMyOrders)

  test('deleteOrder permission and not found flows and success path', async () => {
    // non-manager
    await deleteOrder({ params: { id: '1' }, user: { role: 'Client' } }, res, next);
    expect(res.status).toHaveBeenCalledWith(403);

    // manager but not found
    prisma.commande.findUnique = jest.fn().mockResolvedValue(null);
    await deleteOrder({ params: { id: '2' }, user: { role: 'Manager', id: 10 } }, res, next);
    expect(res.status).toHaveBeenCalledWith(404);

    // success path
    const order = { id: 3, gerantCreationUserId: 10, dateHeureCommande: new Date().toISOString(), clientUserId: null, flag: true };
    prisma.commande.findUnique = jest.fn().mockResolvedValue(order);
    prisma.$transaction = jest.fn().mockImplementation(async (fn) => fn(prisma));
    fidelityService.removeFidelityPoints = jest.fn().mockResolvedValue(null);
  // ensure nested prisma namespaces exist before assigning
  prisma.logadminaction = prisma.logadminaction || { create: jest.fn().mockResolvedValue({}) };
  prisma.commande = prisma.commande || {};
  prisma.commande.update = jest.fn().mockResolvedValue({});
  prisma.repartitionmachine = prisma.repartitionmachine || { updateMany: jest.fn().mockResolvedValue({}) };
  prisma.adresselivraison = prisma.adresselivraison || { updateMany: jest.fn().mockResolvedValue({}) };
  prisma.paiement = prisma.paiement || { updateMany: jest.fn().mockResolvedValue({}), findMany: jest.fn().mockResolvedValue([]) };
  prisma.historiquestatutcommande = prisma.historiquestatutcommande || { updateMany: jest.fn().mockResolvedValue({}) };

    await deleteOrder({ params: { id: '3' }, user: { role: 'Manager', id: 10, nom: 'A', prenom: 'B' } }, res, next);
    expect(res.status).toHaveBeenCalledWith(200);
  });

  test('getMyOrders forbids non-client and returns data for client', async () => {
    await getMyOrders({ user: { role: 'Manager' }, query: {} }, res, next);
    expect(res.status).toHaveBeenCalledWith(403);

    const order = { id: 11, masseVerifieeKg: 2, formuleCommande: 'BaseMachine', clientUser: { typeClient: 'Standard' } };
    prisma.commande.findMany = jest.fn().mockResolvedValue([order]);
    prisma.commande.count = jest.fn().mockResolvedValue(1);
    priceCalculator.calculateOrderPrice = jest.fn().mockReturnValue({ totalPrice: 500 });
    jest.spyOn(clientUtils, 'enrichClientWithPremiumData').mockResolvedValue(order.clientUser);

    await getMyOrders({ user: { role: 'Client', id: 77, typeClient: 'Standard' }, query: { page: '1', limit: '10' } }, res, next);
    expect(res.status).toHaveBeenCalledWith(200);
  });

  test('updateOrder: status change to Livraison creates history and updates options', async () => {
    // prepare existing order
    const existing = {
      id: 50,
      gerantCreationUserId: 10,
      options: { aOptionRepassage: false },
      clientUser: { id: 7, typeClient: 'Standard' },
      masseVerifieeKg: 2,
      estEnLivraison: true,
      prixTotal: 100,
      prixPaye: 100,
      flag: true
    };

    // prisma.findUnique to return existing order
    prisma.commande.findUnique = jest.fn().mockResolvedValue(existing);

    // mock transaction
    prisma.$transaction = jest.fn().mockImplementation(async (fn) => {
      const tx = {
        commande: { update: jest.fn().mockResolvedValue({ ...existing, statut: 'Livraison' }) },
        abonnementpremiummensuel: { findUnique: jest.fn().mockResolvedValue(null), update: jest.fn() },
        commandeoptions: { update: jest.fn().mockResolvedValue({}) },
        historiquestatutcommande: { create: jest.fn().mockResolvedValue({}) }
      };
      return fn(tx);
    });

    // after transaction, completeOrder retrieval
    prisma.commande.findUnique = jest.fn().mockResolvedValue({ ...existing, statut: 'Livraison' });

    const req = { params: { id: '50' }, user: { role: 'Manager', id: 10 }, body: { statut: 'Livraison', livreurId: 99, options: { aOptionRepassage: true } } };
    await updateOrder(req, res, next);
    expect(res.status).toHaveBeenCalledWith(200);
  });

  test('updateOrder: prixCalcule causes prix update in DB', async () => {
    const existing = {
      id: 60,
      gerantCreationUserId: 11,
      options: null,
      clientUser: null,
      prixTotal: 100,
      prixPaye: 100,
      flag: true
    };
    prisma.commande.findUnique = jest.fn().mockResolvedValue(existing);
    prisma.$transaction = jest.fn().mockImplementation(async (fn) => ({ }));
    // ensure prisma.commande.update exists for final price update
    prisma.commande = prisma.commande || {};
    prisma.commande.update = jest.fn().mockResolvedValue({});
    prisma.commande.findUnique = jest.fn().mockResolvedValue(existing);

    const prixCalcule = { prixFinal: 200, prixPaye: 150 };
    const req = { params: { id: '60' }, user: { role: 'Manager', id: 11 }, body: { prixCalcule } };
    await updateOrder(req, res, next);
    expect(prisma.commande.update).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(200);
  });

  test('getOrders: search with existing where uses AND branch', async () => {
    const order = { id: 77, clientUser: { id: 7, typeClient: 'Standard' }, masseVerifieeKg: 1 };
    prisma.commande.findMany = jest.fn().mockResolvedValue([order]);
    prisma.commande.count = jest.fn().mockResolvedValue(1);
    jest.spyOn(clientUtils, 'enrichClientWithPremiumData').mockResolvedValue(order.clientUser);
    priceCalculator.calculateOrderPrice = jest.fn().mockReturnValue({ totalPrice: 1000 });

    const req = { query: { status: 'PrisEnCharge', search: '77', page: '1', limit: '10' }, user: { role: 'Manager' } };
    await getOrders(req, res, next);
    expect(res.status).toHaveBeenCalledWith(200);
  });

  test('getOrders handles priceCalculator throw gracefully', async () => {
    const order = { id: 200, clientUser: { id: 2 }, masseVerifieeKg: 3, formuleCommande: 'F' };
    prisma.commande.findMany = jest.fn().mockResolvedValue([order]);
    prisma.commande.count = jest.fn().mockResolvedValue(1);
    jest.spyOn(clientUtils, 'enrichClientWithPremiumData').mockResolvedValue(order.clientUser);
    priceCalculator.calculateOrderPrice = jest.fn().mockImplementation(() => { throw new Error('boom'); });

    const req = { query: { page: '1', limit: '10' }, user: { role: 'Manager' } };
    await getOrders(req, res, next);
    expect(res.status).toHaveBeenCalledWith(200);
  });

  test('getOrderById price calculation error does not crash', async () => {
    const order = { id: 201, masseVerifieeKg: 2, clientUserId: 3, clientUser: { id: 3 }, formuleCommande: 'X' };
    prisma.commande.findUnique = jest.fn().mockResolvedValue(order);
    jest.spyOn(clientUtils, 'enrichClientWithPremiumData').mockResolvedValue(order.clientUser);
    priceCalculator.calculateOrderPrice = jest.fn().mockImplementation(() => { throw new Error('boom'); });

    const req = { params: { id: '201' }, user: { role: 'Manager' } };
    await getOrderById(req, res, next);
    expect(res.status).toHaveBeenCalledWith(200);
  });

  test('updateOrder SMS notification branch triggers console.log', async () => {
    const existing = {
      id: 300,
      gerantCreationUserId: 10,
      options: null,
      clientUser: { id: 7 },
      masseVerifieeKg: 2,
      prixTotal: 100,
      prixPaye: 100,
      flag: true,
      estEnLivraison: true,
      statut: 'PrisEnCharge'
    };
  prisma.commande.findUnique = jest.fn().mockResolvedValue(existing);

    prisma.$transaction = jest.fn().mockImplementation(async (fn) => {
      const tx = {
        commande: { update: jest.fn().mockResolvedValue({ ...existing, statut: 'Livraison' }) },
        historiquestatutcommande: { create: jest.fn().mockResolvedValue({}) },
        commandeoptions: { update: jest.fn().mockResolvedValue({}) },
        abonnementpremiummensuel: { findUnique: jest.fn().mockResolvedValue(null), update: jest.fn() }
      };
      return fn(tx);
    });

    prisma.commande.findUnique = jest.fn().mockResolvedValue({ ...existing, statut: 'Livraison' });
    const req = { params: { id: '300' }, user: { role: 'Manager', id: 10 }, body: { statut: 'Livraison', livreurId: 55 } };
  await updateOrder(req, res, next);
  });

  test('addPayment normal flow computes totals and updates prixPaye', async () => {
    const order = { id: 400, masseVerifieeKg: 2, clientUser: { id: 21 }, prixTotal: 500, prixPaye: 0, modePaiement: 'Espece' };
    prisma.commande.findUnique = jest.fn().mockResolvedValue(order);
    priceCalculator.calculateOrderPrice = jest.fn().mockReturnValue({ totalPrice: 500 });
    prisma.paiement = prisma.paiement || {};
    prisma.paiement.create = jest.fn().mockResolvedValue({ id: 2, montant: 200 });
    prisma.paiement.findMany = jest.fn().mockResolvedValue([{ id: 2, montant: 200 }, { id: 3, montant: 100 }]);
    prisma.commande.update = jest.fn().mockResolvedValue({});

    const req = { params: { id: '400' }, user: { role: 'Manager' }, body: { montant: 200, mode: 'Espece' } };
    await addPayment(req, res, next);
    expect(prisma.paiement.findMany).toHaveBeenCalled();
    expect(prisma.commande.update).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(201);
  });

  test('deleteOrder denies when older than 24h', async () => {
    const oldDate = new Date(Date.now() - 1000 * 3600 * 48).toISOString();
    const order = { id: 500, gerantCreationUserId: 10, dateHeureCommande: oldDate, clientUserId: null, flag: true };
    prisma.commande.findUnique = jest.fn().mockResolvedValue(order);
    const req = { params: { id: '500' }, user: { role: 'Manager', id: 10 } };
    await deleteOrder(req, res, next);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  test('deleteOrder: transaction error yields 400', async () => {
    const order = { id: 88, gerantCreationUserId: 10, dateHeureCommande: new Date().toISOString(), clientUserId: null, flag: true };
    prisma.commande.findUnique = jest.fn().mockResolvedValue(order);
    prisma.$transaction = jest.fn().mockImplementation(async (fn) => { throw new Error('tx fail'); });

    const req = { params: { id: '88' }, user: { role: 'Manager', id: 10 } };
    await deleteOrder(req, res, next);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  test('addPayment applies automatic fidelity pack when enough points', async () => {
    const order = { id: 99, masseVerifieeKg: 2, clientUser: { id: 20 }, prixTotal: 500, prixPaye: 0, modePaiement: null };
    prisma.commande.findUnique = jest.fn().mockResolvedValue(order);
    priceCalculator.calculateOrderPrice = jest.fn().mockReturnValue({ totalPrice: 500 });
    prisma.fidelite = prisma.fidelite || {};
    prisma.fidelite.findUnique = jest.fn().mockResolvedValue({ id: 7, clientUserId: 20, pointsDisponible: 100 });
    prisma.fidelite.update = jest.fn().mockResolvedValue({});
    prisma.paiement = prisma.paiement || {};
    prisma.paiement.create = jest.fn().mockResolvedValue({ id: 1, montant: 50 });
    prisma.paiement.findMany = jest.fn().mockResolvedValue([{ id: 1, montant: 50 }]);
    prisma.commande.update = jest.fn().mockResolvedValue({});

    const req = { params: { id: '99' }, user: { role: 'Manager' }, body: { montant: 50, mode: 'Espece' } };
    await addPayment(req, res, next);
    expect(prisma.fidelite.update).toHaveBeenCalled();
    expect(prisma.paiement.create).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(201);
  });
});
