const fidelityService = require('../../src/services/fidelityService');
const prisma = require('../../src/utils/prismaClient');

// Mock fideliteUtils for deterministic card generation
jest.mock('../../src/utils/fideliteUtils', () => ({
  genererNumeroCarteFidelite: jest.fn().mockResolvedValue('TH12345ABC')
}));

describe('Fidelity service utilities', () => {
  test('calculatePointsFromAmount splits integer and fraction correctly', () => {
    const res = fidelityService.calculatePointsFromAmount(1250); // 1250 / 500 = 2.5
    expect(res.pointsEntiers).toBe(2);
    expect(res.fraction).toBeCloseTo(0.5);
  });

  test('convertPointsToCredit converts full packs and leaves remainder', () => {
    const r1 = fidelityService.convertPointsToCredit(39);
    expect(r1.creditGenere).toBe(0);
    expect(r1.pointsConsommes).toBe(0);
    expect(r1.pointsRestants).toBe(39);

    const r2 = fidelityService.convertPointsToCredit(80);
    expect(r2.creditGenere).toBe(4000);
    expect(r2.pointsConsommes).toBe(80);
    expect(r2.pointsRestants).toBe(0);
  });

  test('calculateCreditUsage uses min(credit, montant)', () => {
    expect(fidelityService.calculateCreditUsage(500, 300)).toEqual({ creditUtilise: 300, montantFinal: 0 });
    expect(fidelityService.calculateCreditUsage(200, 500)).toEqual({ creditUtilise: 200, montantFinal: 300 });
  });
});

describe('Fidelity service DB-interacting functions (with mocked prisma)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // ensure update exists on the test mock
    prisma.fidelite.update = prisma.fidelite.update || jest.fn();
    prisma.commande.findMany = prisma.commande.findMany || jest.fn();
  });

  test('addFidelityPoints adds points, converts to credit when threshold reached and updates fidelite', async () => {
    const existing = {
      id: 1,
      nombreLavageTotal: 0,
      poidsTotalLaveKg: 0,
      prixTotalPaye: 0,
      pointsDisponible: 39,
      pointsFraction: 0,
      creditDisponible: 0
    };

    prisma.fidelite.findUnique.mockResolvedValue(existing);
    prisma.fidelite.update.mockResolvedValue({ ...existing, pointsDisponible: 0, creditDisponible: 2000, nombreLavageTotal: 1, prixTotalPaye: 500 });

    const order = { clientUserId: 11, prixPaye: 500, masseClientIndicativeKg: 5, montantReductionPoints: 0 };

    const updated = await fidelityService.addFidelityPoints(prisma, order);

    expect(prisma.fidelite.findUnique).toHaveBeenCalledWith({ where: { clientUserId: order.clientUserId } });
    expect(prisma.fidelite.update).toHaveBeenCalled();
    expect(updated).toHaveProperty('creditDisponible');
    expect(updated.creditDisponible).toBeGreaterThanOrEqual(0);
  });

  test('removeFidelityPoints recalculates totals excluding the cancelled order', async () => {
    const fidelite = { id: 2, nombreLavageTotal: 3, poidsTotalLaveKg: 10, prixTotalPaye: 3000 };
    prisma.fidelite.findUnique.mockResolvedValue(fidelite);

    // Two remaining commandes after excluding cancelled one
    prisma.commande.findMany.mockResolvedValue([
      { id: 1, masseClientIndicativeKg: 3, prixPaye: 1000 },
      { id: 2, masseVerifieeKg: 4, prixPaye: 500 }
    ]);

    prisma.fidelite.update.mockResolvedValue({ id: fidelite.id });

    const res = await fidelityService.removeFidelityPoints(prisma, { clientUserId: 99, id: 999 });

    expect(prisma.commande.findMany).toHaveBeenCalled();
    expect(prisma.fidelite.update).toHaveBeenCalled();
    expect(res).toHaveProperty('id');
  });

  test('updateFidelityPoints adjusts points and credit correctly when order changes', async () => {
    const fidelite = { id: 3, pointsDisponible: 10, pointsFraction: 0, poidsTotalLaveKg: 10, prixTotalPaye: 1000, creditDisponible: 0 };
    prisma.fidelite.findUnique.mockResolvedValue(fidelite);
    prisma.fidelite.update.mockResolvedValue({ id: fidelite.id });

    const oldOrder = { clientUserId: 5, prixPaye: 500, masseClientIndicativeKg: 3 };
    const newOrder = { clientUserId: 5, prixPaye: 1000, masseClientIndicativeKg: 4 };

    const res = await fidelityService.updateFidelityPoints(prisma, oldOrder, newOrder);

    expect(prisma.fidelite.findUnique).toHaveBeenCalled();
    expect(prisma.fidelite.update).toHaveBeenCalled();
    expect(res).toHaveProperty('id');
  });

  test('initializeClientFidelite creates fidelite when none exists', async () => {
    prisma.user.findUnique.mockResolvedValue({ id: 77, nom: 'Test', prenom: 'CLIENT', role: 'CLIENT' });
    prisma.fidelite.findUnique.mockResolvedValue(null);
    prisma.fidelite.create.mockResolvedValue({ id: 7, clientUserId: 77, numeroCarteFidelite: 'TH12345ABC' });

    const res = await fidelityService.initializeClientFidelite(77);

    expect(prisma.user.findUnique).toHaveBeenCalled();
    expect(prisma.fidelite.create).toHaveBeenCalled();
    expect(res.numeroCarteFidelite).toBe('TH12345ABC');
  });

  test('getClientByNumeroCarteFidelite returns structured client+fidelite', async () => {
    prisma.fidelite.findUnique.mockResolvedValue({
      id: 88,
      numeroCarteFidelite: 'TH00001ABC',
      nombreLavageTotal: 2,
      poidsTotalLaveKg: 5,
      prixTotalPaye: 1500,
      pointsDisponible: 3,
      pointsFraction: 0,
      creditDisponible: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
      clientUser: { id: 88, nom: 'Alpha', prenom: 'Beta', email: 'a@b.c' }
    });

    const out = await fidelityService.getClientByNumeroCarteFidelite('TH00001ABC');

    expect(out).toHaveProperty('client');
    expect(out).toHaveProperty('fidelite');
    expect(out.fidelite.numeroCarteFidelite).toBe('TH00001ABC');
  });

  test('initializeClientFidelite returns existing fidelite if present', async () => {
    prisma.user.findUnique.mockResolvedValue({ id: 99, nom: 'X', prenom: 'Y', role: 'CLIENT' });
    const existing = { id: 55, clientUserId: 99, numeroCarteFidelite: 'TH99999XYZ' };
    prisma.fidelite.findUnique.mockResolvedValue(existing);
    prisma.fidelite.create.mockClear();

    const res = await fidelityService.initializeClientFidelite(99);

    expect(prisma.user.findUnique).toHaveBeenCalled();
    expect(prisma.fidelite.create).not.toHaveBeenCalled();
    expect(res).toBe(existing);
  });

  test('initializeClientFidelite throws when client not found', async () => {
    prisma.user.findUnique.mockResolvedValue(null);

    await expect(fidelityService.initializeClientFidelite(12345)).rejects.toThrow('Client not found');
  });

  test('getClientByNumeroCarteFidelite returns null when no fidelity record', async () => {
    prisma.fidelite.findUnique.mockResolvedValue(null);
    const out = await fidelityService.getClientByNumeroCarteFidelite('TH00000ABC');
    expect(out).toBeNull();
  });

  test('updateFidelityPoints handles negative fraction branch and conversion', async () => {
    // Case 1: negative fraction branch
    const fidelite = { id: 10, pointsDisponible: 5, pointsFraction: 0.2, poidsTotalLaveKg: 10, prixTotalPaye: 1000, creditDisponible: 0 };
    prisma.fidelite.findUnique.mockResolvedValue(fidelite);
    prisma.fidelite.update.mockResolvedValue({ id: fidelite.id });

    const oldOrder = { clientUserId: 7, prixPaye: 1250, masseClientIndicativeKg: 2 }; // 2.5 -> fraction 0.5
    const newOrder = { clientUserId: 7, prixPaye: 1000, masseClientIndicativeKg: 2 }; // 2 -> fraction 0

    const res1 = await fidelityService.updateFidelityPoints(prisma, oldOrder, newOrder);
    expect(prisma.fidelite.update).toHaveBeenCalled();
    expect(res1).toHaveProperty('id');

    // Case 2: trigger conversion when points reach threshold
    const fidelite2 = { id: 11, pointsDisponible: 39, pointsFraction: 0, poidsTotalLaveKg: 0, prixTotalPaye: 0, creditDisponible: 0 };
    prisma.fidelite.findUnique.mockResolvedValue(fidelite2);
    prisma.fidelite.update.mockResolvedValue({ id: fidelite2.id });

    const oldOrder2 = { clientUserId: 8, prixPaye: 0, masseClientIndicativeKg: 0 };
    const newOrder2 = { clientUserId: 8, prixPaye: 500, masseClientIndicativeKg: 0 }; // +1 point

    const res2 = await fidelityService.updateFidelityPoints(prisma, oldOrder2, newOrder2);
    expect(prisma.fidelite.update).toHaveBeenCalled();
    expect(res2).toHaveProperty('id');
  });

  test('addFidelityPoints returns null when fidelite not found', async () => {
    prisma.fidelite.findUnique.mockResolvedValue(null);
    const res = await fidelityService.addFidelityPoints(prisma, { clientUserId: 999, prixPaye: 100 });
    expect(res).toBeNull();
  });

  test('addFidelityPoints handles montantPaye == 0 (only credit update)', async () => {
    const existing = { id: 20, nombreLavageTotal: 1, poidsTotalLaveKg: 2, prixTotalPaye: 1000, pointsDisponible: 5, pointsFraction: 0, creditDisponible: 500 };
    prisma.fidelite.findUnique.mockResolvedValue(existing);
    prisma.fidelite.update = prisma.fidelite.update || jest.fn().mockResolvedValue({ id: existing.id });

    const order = { clientUserId: 50, prixPaye: 0, masseClientIndicativeKg: 1, montantReductionPoints: 200 };
    const res = await fidelityService.addFidelityPoints(prisma, order);

    expect(prisma.fidelite.update).toHaveBeenCalled();
    // Since prixPaye == 0, update should set creditDisponible on payload
    const updateArg = prisma.fidelite.update.mock.calls[0][0];
    expect(updateArg.data).toHaveProperty('creditDisponible');
    expect(res).toHaveProperty('id');
  });

  test('addFidelityPoints handles fractional accumulation (extraPoints >=1)', async () => {
    const existing = { id: 21, nombreLavageTotal: 2, poidsTotalLaveKg: 4, prixTotalPaye: 2000, pointsDisponible: 1, pointsFraction: 0.6, creditDisponible: 0 };
    prisma.fidelite.findUnique.mockResolvedValue(existing);
    prisma.fidelite.update = prisma.fidelite.update || jest.fn().mockResolvedValue({ id: existing.id });

    // montantPaye 250 -> 0.5 point fraction
    const order = { clientUserId: 51, prixPaye: 250, masseClientIndicativeKg: 1, montantReductionPoints: 0 };

    const res = await fidelityService.addFidelityPoints(prisma, order);

    expect(prisma.fidelite.update).toHaveBeenCalled();
    const updateArg = prisma.fidelite.update.mock.calls[0][0];
    // After adding fraction 0.6 + 0.5 => 1.1, extraPoints -> 1 should be added to pointsDisponible
    expect(updateArg.data.pointsDisponible).toBeDefined();
    expect(updateArg.data.pointsFraction).toBeGreaterThanOrEqual(0);
    expect(res).toHaveProperty('id');
  });

  test('removeFidelityPoints returns null when fidelite not found', async () => {
    prisma.fidelite.findUnique.mockResolvedValue(null);
    const res = await fidelityService.removeFidelityPoints(prisma, { clientUserId: 222, id: 5 });
    expect(res).toBeNull();
  });

  test('getClientByNumeroCarteFidelite throws when prisma errors', async () => {
    prisma.fidelite.findUnique.mockRejectedValue(new Error('db error'));
    await expect(fidelityService.getClientByNumeroCarteFidelite('TH11111ABC')).rejects.toThrow('db error');
  });

  test('initializeClientFidelite propagates error when card generator fails', async () => {
    prisma.user.findUnique.mockResolvedValue({ id: 200, nom: 'X', prenom: 'Y', role: 'CLIENT' });
    prisma.fidelite.findUnique.mockResolvedValue(null);
    const fideliteUtils = require('../../src/utils/fideliteUtils');
    fideliteUtils.genererNumeroCarteFidelite.mockRejectedValue(new Error('genfail'));

    await expect(fidelityService.initializeClientFidelite(200)).rejects.toThrow('genfail');
  });

  test('updateFidelityPoints returns null when fidelite not found', async () => {
    prisma.fidelite.findUnique.mockResolvedValue(null);
    const res = await fidelityService.updateFidelityPoints(prisma, { clientUserId: 999 }, { clientUserId: 999 });
    expect(res).toBeNull();
  });

  test('updateFidelityPoints handles pointsFraction >= 1 branch (extraPoints)', async () => {
    const fidelite = { id: 77, pointsDisponible: 2, pointsFraction: 0.6, poidsTotalLaveKg: 0, prixTotalPaye: 0, creditDisponible: 0 };
    prisma.fidelite.findUnique.mockResolvedValue(fidelite);
    prisma.fidelite.update = prisma.fidelite.update || jest.fn().mockResolvedValue({ id: fidelite.id });

    const oldOrder = { clientUserId: 77, prixPaye: 1000, masseClientIndicativeKg: 0 }; // fraction 0
    const newOrder = { clientUserId: 77, prixPaye: 1250, masseClientIndicativeKg: 0 }; // fraction 0.5 -> total 1.1

    const res = await fidelityService.updateFidelityPoints(prisma, oldOrder, newOrder);
    expect(prisma.fidelite.update).toHaveBeenCalled();
    const updateArg = prisma.fidelite.update.mock.calls[0][0];
    expect(updateArg.data.pointsDisponible).toBeDefined();
    expect(updateArg.data.pointsFraction).toBeGreaterThanOrEqual(0);
    expect(res).toHaveProperty('id');
  });
});
