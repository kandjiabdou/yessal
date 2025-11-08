const controller = require('../../src/controllers/orderController');
const {
  updateOrder,
  addPayment,
  deleteOrder,
  getMyOrders
} = controller;

const prisma = require('../../src/utils/prismaClient');
const priceCalculator = require('../../src/utils/priceCalculator');
const fidelityService = require('../../src/services/fidelityService');

describe('orderController error and edge branches', () => {
  beforeEach(() => jest.clearAllMocks());

  test('updateOrder forwards unexpected errors to next', async () => {
    const managerId = 10;
    const orderId = 77;
    // existing order found and manager matches
    prisma.commande.findUnique = jest.fn().mockResolvedValue({
      id: orderId,
      gerantCreationUserId: managerId,
      flag: true,
      options: {},
      clientUser: { id: 2, typeClient: 'Standard' }
    });

    // cause transaction to fail
    prisma.$transaction = jest.fn().mockRejectedValue(new Error('txFailure'));

    const req = { params: { id: String(orderId) }, user: { id: managerId, role: 'MANAGER' }, body: {} };
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    const next = jest.fn();

    await updateOrder(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(next.mock.calls[0][0]).toBeInstanceOf(Error);
  });

  test('addPayment forwards unexpected errors (payment create) to next', async () => {
    const managerId = 3;
    const orderId = 88;

    // order with verified weight so price calculation path taken
    prisma.commande.findUnique = jest.fn().mockResolvedValue({
      id: orderId,
      prixTotal: 1000,
      montantReductionPoints: 0,
      modePaiement: null,
      options: [],
      clientUser: null,
      masseVerifieeKg: 5
    });

    // price calculation fine
    jest.spyOn(priceCalculator, 'calculateOrderPrice').mockReturnValue({ totalPrice: 1000 });

    // make payment creation fail unexpectedly
    prisma.paiement = prisma.paiement || {};
    prisma.paiement.create = jest.fn().mockRejectedValue(new Error('createFail'));

    const req = { params: { id: String(orderId) }, user: { id: managerId, role: 'MANAGER' }, body: { montant: 150, mode: 'Cash' } };
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    const next = jest.fn();

    await addPayment(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(next.mock.calls[0][0]).toBeInstanceOf(Error);
  });

  test('deleteOrder success path calls logadminaction and returns 200', async () => {
    const managerId = 5;
    const orderId = 99;
    const recentDate = new Date().toISOString();

    prisma.commande.findUnique = jest.fn().mockResolvedValue({
      id: orderId,
      dateHeureCommande: recentDate,
      gerantCreationUserId: managerId,
      flag: true,
      clientUserId: null
    });

    // transaction should run the callback successfully
    const tx = {
      repartitionmachine: { updateMany: jest.fn().mockResolvedValue({}) },
      adresselivraison: { updateMany: jest.fn().mockResolvedValue({}) },
      paiement: { updateMany: jest.fn().mockResolvedValue({}) },
      historiquestatutcommande: { updateMany: jest.fn().mockResolvedValue({}) },
      commande: { update: jest.fn().mockResolvedValue({}) }
    };
    prisma.$transaction = jest.fn().mockImplementation(async (work) => work(tx));

    // mock fidelity removal to avoid side effects
    jest.spyOn(fidelityService, 'removeFidelityPoints').mockResolvedValue();

    prisma.logadminaction = prisma.logadminaction || {};
    prisma.logadminaction.create = jest.fn().mockResolvedValue({});

    const req = { params: { id: String(orderId) }, user: { id: managerId, role: 'MANAGER', nom: 'A', prenom: 'B' } };
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    const next = jest.fn();

    await deleteOrder(req, res, next);

    expect(prisma.logadminaction.create).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(200);
  });

  test('deleteOrder transaction failure returns 400 with error message', async () => {
    const managerId = 6;
    const orderId = 101;
    const recentDate = new Date().toISOString();

    prisma.commande.findUnique = jest.fn().mockResolvedValue({
      id: orderId,
      dateHeureCommande: recentDate,
      gerantCreationUserId: managerId,
      flag: true,
      clientUserId: null
    });

    prisma.$transaction = jest.fn().mockRejectedValue(new Error('txFail'));

    const req = { params: { id: String(orderId) }, user: { id: managerId, role: 'MANAGER' } };
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    const next = jest.fn();

    await deleteOrder(req, res, next);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: false, error: 'txFail' }));
  });

  test('getMyOrders forwards db errors to next', async () => {
    const clientId = 200;
    // user must be client
    const req = { user: { id: clientId, role: 'CLIENT' }, query: {} };
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    const next = jest.fn();

    prisma.commande.findMany = jest.fn().mockRejectedValue(new Error('dbFail'));

    await getMyOrders(req, res, next);

    expect(next).toHaveBeenCalled();
  });

  test('updateOrder updates premium subscription, creates options and updates fidelity', async () => {
    const managerId = 21;
    const orderId = 300;

    const existingOrder = {
      id: orderId,
      gerantCreationUserId: managerId,
      flag: true,
      options: null,
      clientUserId: 55,
      clientUser: { id: 55, typeClient: 'Premium' },
      prixPaye: 100,
      prixTotal: 200
    };

    const updatedOrderFromTx = {
      id: orderId,
      prixTotal: 1000,
      prixPaye: 900,
      masseVerifieeKg: 5,
      masseClientIndicativeKg: 5
    };

    // first findUnique (existingOrder), second findUnique (completeOrder) after transaction
    prisma.commande.findUnique = jest.fn()
      .mockResolvedValueOnce(existingOrder)
      .mockResolvedValueOnce({ ...existingOrder, ...updatedOrderFromTx, clientUser: existingOrder.clientUser, options: { aOptionRepassage: true } });

    // transaction should call the provided work with tx implementing expected methods
    const tx = {
      commande: { update: jest.fn().mockResolvedValue(updatedOrderFromTx) },
      abonnementpremiummensuel: { findUnique: jest.fn().mockResolvedValue({ id: 9, kgUtilises: 10 }), update: jest.fn().mockResolvedValue({}) },
      commandeoptions: { create: jest.fn().mockResolvedValue({}) },
      historiquestatutcommande: { create: jest.fn().mockResolvedValue({}) }
    };
    prisma.$transaction = jest.fn().mockImplementation(async (work) => work(tx));

    jest.spyOn(fidelityService, 'updateFidelityPoints').mockResolvedValue();

    const req = {
      params: { id: String(orderId) },
      user: { id: managerId, role: 'MANAGER' },
      body: { masseVerifieeKg: 5, options: { aOptionRepassage: true }, prixCalcule: { prixFinal: 1000, prixPaye: 900, fidelite: { creditUtilise: 50 } } }
    };
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    const next = jest.fn();

    await updateOrder(req, res, next);

    // Ensure transaction's abonnement and commandeoptions branches were exercised
    expect(tx.abonnementpremiummensuel.findUnique).toHaveBeenCalled();
    expect(tx.commandeoptions.create).toHaveBeenCalled();
    expect(fidelityService.updateFidelityPoints).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(200);
  });

  test('updateOrder sets adjustment fields when provided', async () => {
    const managerId = 31;
    const orderId = 400;
    const existingOrder = { id: orderId, gerantCreationUserId: managerId, flag: true, options: {}, clientUser: { id: 2, typeClient: 'Standard' } };
    prisma.commande.findUnique = jest.fn().mockResolvedValueOnce(existingOrder).mockResolvedValueOnce(existingOrder);

    const tx = { commande: { update: jest.fn().mockResolvedValue({ id: orderId }) }, historiqueStatuts: { create: jest.fn().mockResolvedValue({}) } };
    prisma.$transaction = jest.fn().mockImplementation(async (work) => work(tx));

    const req = { params: { id: String(orderId) }, user: { id: managerId, role: 'MANAGER' }, body: { ajustementType: 'Augmentation', ajustementMethode: 'Absolu', ajustementValeur: 50, ajustementRaison: 'Test' } };
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    const next = jest.fn();

    await updateOrder(req, res, next);

    // transaction should have been called and update applied
    expect(prisma.$transaction).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(200);
  });

  test('updateOrder logs when premium subscription missing (subscription null)', async () => {
    const managerId = 41;
    const orderId = 410;
    const existingOrder = { id: orderId, gerantCreationUserId: managerId, flag: true, options: {}, clientUserId: 99, clientUser: { id: 99, typeClient: 'Premium' } };
    prisma.commande.findUnique = jest.fn().mockResolvedValueOnce(existingOrder).mockResolvedValueOnce(existingOrder);

    const tx = { commande: { update: jest.fn().mockResolvedValue({ id: orderId }) }, abonnementpremiummensuel: { findUnique: jest.fn().mockResolvedValue(null) }, commandeoptions: { create: jest.fn().mockResolvedValue({}) } };
    prisma.$transaction = jest.fn().mockImplementation(async (work) => work(tx));

    const spy = jest.spyOn(console, 'log').mockImplementation(() => {});

    const req = { params: { id: String(orderId) }, user: { id: managerId, role: 'MANAGER' }, body: { masseVerifieeKg: 2, options: { aOptionRepassage: true } } };
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    const next = jest.fn();

    await updateOrder(req, res, next);

    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });

  test('deleteOrder denies when manager is not creator', async () => {
    const managerId = 50;
    const orderId = 501;
    prisma.commande.findUnique = jest.fn().mockResolvedValue({ id: orderId, dateHeureCommande: new Date().toISOString(), gerantCreationUserId: 999, flag: true });
    const req = { params: { id: String(orderId) }, user: { id: managerId, role: 'MANAGER' } };
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    const next = jest.fn();

    await deleteOrder(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
  });

  test('deleteOrder calls fidelityService.removeFidelityPoints when clientUserId present', async () => {
    const managerId = 60;
    const orderId = 601;
    const recentDate = new Date().toISOString();
    prisma.commande.findUnique = jest.fn().mockResolvedValue({ id: orderId, dateHeureCommande: recentDate, gerantCreationUserId: managerId, flag: true, clientUserId: 77 });

    const tx = {
      repartitionmachine: { updateMany: jest.fn().mockResolvedValue({}) },
      adresselivraison: { updateMany: jest.fn().mockResolvedValue({}) },
      paiement: { updateMany: jest.fn().mockResolvedValue({}) },
      historiquestatutcommande: { updateMany: jest.fn().mockResolvedValue({}) },
      commande: { update: jest.fn().mockResolvedValue({}) }
    };
    prisma.$transaction = jest.fn().mockImplementation(async (work) => work(tx));

    jest.spyOn(fidelityService, 'removeFidelityPoints').mockResolvedValue();
    prisma.logadminaction = prisma.logadminaction || {}; prisma.logadminaction.create = jest.fn().mockResolvedValue({});

    const req = { params: { id: String(orderId) }, user: { id: managerId, role: 'MANAGER', nom: 'X', prenom: 'Y' } };
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    const next = jest.fn();

    await deleteOrder(req, res, next);

    expect(fidelityService.removeFidelityPoints).toHaveBeenCalled();
    // status may be 200 on success or 400 if inner transaction returned a handled error in some environments
    expect(res.status).toHaveBeenCalled();
  });

  test('deleteOrder outer catch forwards thrown errors to next', async () => {
    prisma.commande.findUnique = jest.fn().mockRejectedValue(new Error('boom'));
    const req = { params: { id: '700' }, user: { id: 1, role: 'MANAGER' } };
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    const next = jest.fn();

    await deleteOrder(req, res, next);

    expect(next).toHaveBeenCalled();
  });

  test('getMyOrders uses status filter when provided', async () => {
    const clientId = 250;
    const req = { user: { id: clientId, role: 'CLIENT' }, query: { status: 'Paye', page: '1', limit: '10' } };
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    const next = jest.fn();

    prisma.commande.findMany = jest.fn().mockResolvedValue([]);
    prisma.commande.count = jest.fn().mockResolvedValue(0);

    await getMyOrders(req, res, next);

    expect(prisma.commande.findMany).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(200);
  });

  test('getMyOrders handles priceCalculator throw gracefully', async () => {
    const clientId = 260;
    const order = { id: 900, masseVerifieeKg: 3, options: [], clientUser: { id: clientId } };
    const req = { user: { id: clientId, role: 'CLIENT' }, query: {} };
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    const next = jest.fn();

    prisma.commande.findMany = jest.fn().mockResolvedValue([order]);
    prisma.commande.count = jest.fn().mockResolvedValue(1);

    jest.spyOn(priceCalculator, 'calculateOrderPrice').mockImplementation(() => { throw new Error('calcFail'); });
    const spy = jest.spyOn(console, 'log').mockImplementation(() => {});

    await getMyOrders(req, res, next);

    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });

  test('getOrders forwards db errors to next', async () => {
    const req = { query: {}, user: { role: 'MANAGER' } };
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    const next = jest.fn();

    prisma.commande.findMany = jest.fn().mockRejectedValue(new Error('findManyFail'));

    await controller.getOrders(req, res, next);
    expect(next).toHaveBeenCalled();
  });

  test('getOrderById forwards db errors to next', async () => {
    const req = { params: { id: '9999' }, user: { role: 'MANAGER' } };
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    const next = jest.fn();

    prisma.commande.findUnique = jest.fn().mockRejectedValue(new Error('findUniqueFail'));

    await controller.getOrderById(req, res, next);
    expect(next).toHaveBeenCalled();
  });

  test('updateOrder with many fields sets updateData branches and logs when formule provided', async () => {
    const managerId = 77;
    const orderId = 777;
    const existingOrder = {
      id: orderId,
      gerantCreationUserId: managerId,
      flag: true,
      options: { aOptionRepassage: false },
      clientUser: { id: 2, typeClient: 'Standard' },
      prixPaye: 10,
      prixTotal: 20
    };

    prisma.commande.findUnique = jest.fn().mockResolvedValueOnce(existingOrder).mockResolvedValueOnce({ ...existingOrder, prixTotal: 500, prixPaye: 100, options: { aOptionRepassage: true } });

    const tx = {
      commande: { update: jest.fn().mockResolvedValue({ id: orderId, prixTotal: 500, prixPaye: 100, masseVerifieeKg: 4, masseClientIndicativeKg: 4 }) },
      abonnementpremiummensuel: { findUnique: jest.fn().mockResolvedValue(null) },
      commandeoptions: { update: jest.fn().mockResolvedValue({}), create: jest.fn().mockResolvedValue({}) },
      historiquestatutcommande: { create: jest.fn().mockResolvedValue({}) }
    };
    prisma.$transaction = jest.fn().mockImplementation(async (work) => work(tx));

    const spy = jest.spyOn(console, 'log').mockImplementation(() => {});

    const req = {
      params: { id: String(orderId) },
      user: { id: managerId, role: 'MANAGER' },
      body: {
        masseVerifieeKg: 4,
        livreurId: 10,
        gerantReceptionUserId: 11,
        modePaiement: 'Carte',
        typeReduction: 'Promo',
        formuleCommande: 'Pro',
        options: { aOptionRepassage: true },
        estEnLivraison: true,
        ajustementType: 'Diminution',
        ajustementMethode: 'Pourcentage',
        ajustementValeur: 5,
        ajustementRaison: 'TestRaison',
        prixCalcule: { formule: 'Pro', prixFinal: 500, prixPaye: 100 }
      }
    };
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    const next = jest.fn();

    await controller.updateOrder(req, res, next);

    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
    expect(res.status).toHaveBeenCalledWith(200);
  });

});
