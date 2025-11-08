// Mock validation middleware (routes expect validate(schemas.idParam, 'params') but we want to
// bypass Joi validation in controller tests to focus on controller logic).
jest.mock('../../src/middleware/validation', () => ({
  validate: () => (req, res, next) => next(),
  schemas: { idParam: {} }
}));

const request = require('supertest');
const prisma = require('../../src/utils/prismaClient');
const fidelityService = require('../../src/services/fidelityService');
const app = require('../../src/app');

describe('Fidelite controller', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('GET /api/fidelite/client/:clientId - 404 when user not found', async () => {
    prisma.user.findUnique.mockResolvedValue(null);

    const res = await request(app)
      .get('/api/fidelite/client/1')
      .set('x-test-user', JSON.stringify({ id: 999, role: 'MANAGER' }));

    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
  });

  test('GET /api/fidelite/client/:clientId - 403 when client requests other client info', async () => {
    prisma.user.findUnique.mockResolvedValue({ id: 5, nom: 'A', prenom: 'B', typeClient: 'Standard' });

    const res = await request(app)
      .get('/api/fidelite/client/5')
      .set('x-test-user', JSON.stringify({ id: 999, role: 'CLIENT' })); // client id mismatch

    expect(res.status).toBe(403);
  });

  test('GET /api/fidelite/client/:clientId - success includes premium info', async () => {
    const user = { id: 6, nom: 'P', prenom: 'Q', typeClient: 'Premium' };
  prisma.user.findUnique.mockResolvedValue(user);
    prisma.fidelite.findUnique.mockResolvedValue({ id: 60, pointsDisponible: 3, pointsFraction: 0, nombreLavageTotal: 2 });
    prisma.abonnementpremiummensuel.findFirst.mockResolvedValue({ id: 700, limiteKg: 50, kgUtilises: 10 });
    prisma.commande.count.mockResolvedValue(4);

    const res = await request(app)
      .get('/api/fidelite/client/6')
      .set('x-test-user', JSON.stringify({ id: 6, role: 'CLIENT' }));

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveProperty('fidelite');
    expect(res.body.data).toHaveProperty('premium');
  });

  test('GET /api/fidelite/search/:numeroCarteFidelite - 400 on bad format', async () => {
    const res = await request(app)
      .get('/api/fidelite/search/BADFORMAT')
      .set('x-test-user', JSON.stringify({ id: 1, role: 'MANAGER' }));

    expect(res.status).toBe(400);
  });

  test('GET /api/fidelite/search/:numeroCarteFidelite - 404 when service returns null', async () => {
    // Mock underlying prisma result used by the service to return null
    prisma.fidelite.findUnique.mockResolvedValue(null);

    const res = await request(app)
      .get('/api/fidelite/search/TH00000ABC')
      .set('x-test-user', JSON.stringify({ id: 1, role: 'MANAGER' }));

    expect(res.status).toBe(404);
  });

  test('POST /api/fidelite/client/:clientId/adjust - 403 for non-manager', async () => {
    const res = await request(app)
      .post('/api/fidelite/client/2/adjust')
      .send({ pointsDisponible: 5 })
      .set('x-test-user', JSON.stringify({ id: 2, role: 'CLIENT' }));

    expect(res.status).toBe(403);
  });

  test('POST /api/fidelite/client/:clientId/adjust - success for manager', async () => {
    prisma.user.findUnique.mockResolvedValue({ id: 3, nom: 'AA', prenom: 'BB' });
    prisma.fidelite.findUnique.mockResolvedValue({ id: 33, clientUserId: 3 });
    prisma.fidelite.update = prisma.fidelite.update || jest.fn().mockResolvedValue({ id: 33 });
    prisma.logadminaction = prisma.logadminaction || {};
    prisma.logadminaction.create = prisma.logadminaction.create || jest.fn().mockResolvedValue({ id: 1 });

    const res = await request(app)
      .post('/api/fidelite/client/3/adjust')
      .send({ pointsDisponible: 7, reason: 'test' })
      .set('x-test-user', JSON.stringify({ id: 10, role: 'MANAGER', nom: 'M', prenom: 'N' }));

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  test('POST /api/fidelite/client/:clientId/adjust - update multiple fields', async () => {
    prisma.user.findUnique.mockResolvedValue({ id: 66, nom: 'AA', prenom: 'BB' });
    prisma.fidelite.findUnique.mockResolvedValue({ id: 66, clientUserId: 66 });
    prisma.fidelite.update = prisma.fidelite.update || jest.fn().mockResolvedValue({ id: 66 });
    prisma.logadminaction = prisma.logadminaction || {}; prisma.logadminaction.create = prisma.logadminaction.create || jest.fn().mockResolvedValue({ id: 1 });

    const res = await request(app)
      .post('/api/fidelite/client/66/adjust')
      .send({ nombreLavageTotal: 5, poidsTotalLaveKg: 10, prixTotalPaye: 2000, pointsDisponible: 3, pointsFraction: 0.2 })
      .set('x-test-user', JSON.stringify({ id: 10, role: 'MANAGER', nom: 'M', prenom: 'N' }));

    expect(res.status).toBe(200);
    expect(prisma.fidelite.update).toHaveBeenCalled();
  });

  test('POST /api/fidelite/client/:clientId/premium - 403 for non-manager', async () => {
    const res = await request(app)
      .post('/api/fidelite/client/10/premium')
      .send({ annee: 2025, mois: 10, limiteKg: 50 })
      .set('x-test-user', JSON.stringify({ id: 10, role: 'CLIENT' }));

    expect(res.status).toBe(403);
  });

  test('POST /api/fidelite/client/:clientId/premium - create and update paths', async () => {
    // client exists and is not premium -> should update type and create subscription
    prisma.user.findUnique.mockResolvedValueOnce({ id: 11, nom: 'C', prenom: 'D', typeClient: 'Standard', estEtudiant: true });
    prisma.user.update = prisma.user.update || jest.fn().mockResolvedValue({ id: 11, typeClient: 'Premium' });
    prisma.abonnementpremiummensuel.findFirst.mockResolvedValue(null);
    prisma.abonnementpremiummensuel.create = prisma.abonnementpremiummensuel.create || jest.fn().mockResolvedValue({ id: 100 });
    prisma.logadminaction = prisma.logadminaction || {}; prisma.logadminaction.create = prisma.logadminaction.create || jest.fn().mockResolvedValue({ id: 1 });

    const resCreate = await request(app)
      .post('/api/fidelite/client/11/premium')
      .send({ annee: 2025, mois: 11, limiteKg: 40 })
      .set('x-test-user', JSON.stringify({ id: 20, role: 'MANAGER', nom: 'M', prenom: 'N' }));

    expect(resCreate.status).toBe(200);

    // Now test update path: existing subscription present
    prisma.user.findUnique.mockResolvedValueOnce({ id: 11, nom: 'C', prenom: 'D', typeClient: 'Premium', estEtudiant: false });
    prisma.abonnementpremiummensuel.findFirst.mockResolvedValue({ id: 101, kgUtilises: 0, limiteKg: 20 });
    prisma.abonnementpremiummensuel.update = prisma.abonnementpremiummensuel.update || jest.fn().mockResolvedValue({ id: 101 });

    const resUpdate = await request(app)
      .post('/api/fidelite/client/11/premium')
      .send({ annee: 2025, mois: 11, limiteKg: 60, kgUtilises: 5 })
      .set('x-test-user', JSON.stringify({ id: 20, role: 'MANAGER', nom: 'M', prenom: 'N' }));

    expect(resUpdate.status).toBe(200);
  });

  test('POST /api/fidelite/client/:clientId/premium - 404 when client not found', async () => {
    prisma.user.findUnique.mockResolvedValue(null);

    const res = await request(app)
      .post('/api/fidelite/client/999/premium')
      .send({ annee: 2025, mois: 12, limiteKg: 10 })
      .set('x-test-user', JSON.stringify({ id: 20, role: 'MANAGER', nom: 'M', prenom: 'N' }));

    expect(res.status).toBe(404);
  });

  test('GET /api/fidelite/premium - 403 for non-manager and success for manager', async () => {
    const resForbidden = await request(app)
      .get('/api/fidelite/premium')
      .set('x-test-user', JSON.stringify({ id: 10, role: 'CLIENT' }));
    expect(resForbidden.status).toBe(403);

  prisma.abonnementpremiummensuel.findMany = prisma.abonnementpremiummensuel.findMany || jest.fn();
  prisma.abonnementpremiummensuel.findMany.mockResolvedValue([{ id: 1, limiteKg: 10, kgUtilises: 2 }]);
  prisma.abonnementpremiummensuel.count = prisma.abonnementpremiummensuel.count || jest.fn().mockResolvedValue(1);

    const res = await request(app)
      .get('/api/fidelite/premium?annee=2025&mois=11')
      .set('x-test-user', JSON.stringify({ id: 30, role: 'MANAGER' }));

    expect(res.status).toBe(200);
    expect(res.body.meta).toBeDefined();
  });

  test('GET /api/fidelite/client/:clientId/history - 403 for non-manager and success for manager', async () => {
    const resForbidden = await request(app)
      .get('/api/fidelite/client/50/history')
      .set('x-test-user', JSON.stringify({ id: 50, role: 'CLIENT' }));
    expect(resForbidden.status).toBe(403);

  prisma.user.findUnique.mockResolvedValue({ id: 50, nom: 'H', prenom: 'I', email: 'a@b.c', telephone: '123', typeClient: 'Standard' });
  prisma.fidelite.findUnique.mockResolvedValue({ id: 500 });
  prisma.commande.findMany = prisma.commande.findMany || jest.fn();
  prisma.commande.findMany.mockResolvedValue([]);
  prisma.abonnementpremiummensuel.findMany = prisma.abonnementpremiummensuel.findMany || jest.fn();
  prisma.abonnementpremiummensuel.findMany.mockResolvedValue([]);

    const res = await request(app)
      .get('/api/fidelite/client/50/history')
      .set('x-test-user', JSON.stringify({ id: 40, role: 'MANAGER' }));

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  test('GET /api/fidelite/me - 403 when not a client', async () => {
    const res = await request(app)
      .get('/api/fidelite/me')
      .set('x-test-user', JSON.stringify({ id: 1, role: 'MANAGER' }));

    expect(res.status).toBe(403);
  });

  test('GET /api/fidelite/me - success when client has fidelite', async () => {
    prisma.fidelite.findUnique.mockResolvedValue({ id: 99, nombreLavageTotal: 2 });
    prisma.commande.findMany.mockResolvedValue([]);

    const res = await request(app)
      .get('/api/fidelite/me')
      .set('x-test-user', JSON.stringify({ id: 99, role: 'CLIENT', typeClient: 'Standard' }));

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  test('GET /api/fidelite/me - 404 when fidelite not found', async () => {
    prisma.fidelite.findUnique.mockResolvedValue(null);

    const res = await request(app)
      .get('/api/fidelite/me')
      .set('x-test-user', JSON.stringify({ id: 120, role: 'CLIENT', typeClient: 'Standard' }));

    expect(res.status).toBe(404);
  });

  test('GET /api/fidelite/me - includes premium when user is Premium', async () => {
    prisma.fidelite.findUnique.mockResolvedValue({ id: 121, nombreLavageTotal: 1 });
    prisma.commande.findMany.mockResolvedValue([]);
    prisma.abonnementpremiummensuel.findFirst = prisma.abonnementpremiummensuel.findFirst || jest.fn();
    prisma.abonnementpremiummensuel.findFirst.mockResolvedValue({ id: 301, limiteKg: 50, kgUtilises: 5 });

    const res = await request(app)
      .get('/api/fidelite/me')
      .set('x-test-user', JSON.stringify({ id: 121, role: 'CLIENT', typeClient: 'Premium' }));

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveProperty('premium');
  });

  test('GET /api/fidelite/search/:numeroCarteFidelite - success returns client data', async () => {
    prisma.fidelite.findUnique.mockResolvedValue({ id: 400, numeroCarteFidelite: 'TH11111ABC', clientUser: { id: 400, nom: 'Z' } });

    const res = await request(app)
      .get('/api/fidelite/search/TH11111ABC')
      .set('x-test-user', JSON.stringify({ id: 1, role: 'MANAGER' }));

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toBeDefined();
  });

  describe('controller error propagation (next)', () => {
    const fideliteController = require('../../src/controllers/fideliteController');

    const makeRes = () => ({ status: jest.fn().mockReturnThis(), json: jest.fn().mockReturnThis() });

    test('getClientFidelite forwards errors to next', async () => {
      prisma.user.findUnique.mockRejectedValue(new Error('boom'));
      const req = { params: { clientId: '1' }, user: { id: 1, role: 'MANAGER' } };
      const res = makeRes();
      const next = jest.fn();

      await fideliteController.getClientFidelite(req, res, next);
      expect(next).toHaveBeenCalled();
    });

    test('getClientFideliteHistory forwards errors to next', async () => {
      prisma.user.findUnique.mockRejectedValue(new Error('err'));
      const req = { params: { clientId: '2' }, user: { id: 2, role: 'MANAGER' } };
      const res = makeRes();
      const next = jest.fn();

      await fideliteController.getClientFideliteHistory(req, res, next);
      expect(next).toHaveBeenCalled();
    });

    test('adjustFidelitePoints forwards errors to next', async () => {
      prisma.user.findUnique.mockRejectedValue(new Error('err2'));
      const req = { params: { clientId: '3' }, user: { id: 3, role: 'MANAGER' }, body: {} };
      const res = makeRes();
      const next = jest.fn();

      await fideliteController.adjustFidelitePoints(req, res, next);
      expect(next).toHaveBeenCalled();
    });

    test('managePremiumSubscription forwards errors to next', async () => {
      prisma.user.findUnique.mockRejectedValue(new Error('err3'));
      const req = { params: { clientId: '4' }, user: { id: 4, role: 'MANAGER' }, body: { annee: 2025, mois: 1, limiteKg: 10 } };
      const res = makeRes();
      const next = jest.fn();

      await fideliteController.managePremiumSubscription(req, res, next);
      expect(next).toHaveBeenCalled();
    });

    test('getAllPremiumSubscriptions forwards errors to next', async () => {
      prisma.abonnementpremiummensuel.findMany.mockRejectedValue(new Error('err4'));
      const req = { query: {}, user: { id: 5, role: 'MANAGER' } };
      const res = makeRes();
      const next = jest.fn();

      await fideliteController.getAllPremiumSubscriptions(req, res, next);
      expect(next).toHaveBeenCalled();
    });

    test('getMyFidelite forwards errors to next', async () => {
      prisma.fidelite.findUnique.mockRejectedValue(new Error('err5'));
      const req = { user: { id: 6, role: 'CLIENT', typeClient: 'Standard' } };
      const res = makeRes();
      const next = jest.fn();

      await fideliteController.getMyFidelite(req, res, next);
      expect(next).toHaveBeenCalled();
    });

    test('getClientByNumeroCarteFidelite forwards errors to next', async () => {
      // invalid or service error
      const req = { params: { numeroCarteFidelite: 'TH00000ABC' }, user: { id: 1, role: 'MANAGER' } };
      const res = makeRes();
      const next = jest.fn();
      // make service throw via prisma
      prisma.fidelite.findUnique.mockRejectedValue(new Error('err6'));

      await fideliteController.getClientByNumeroCarteFidelite(req, res, next);
      expect(next).toHaveBeenCalled();
    });
  });

  describe('controller direct-call branch coverage', () => {
    const fideliteController = require('../../src/controllers/fideliteController');
    const makeRes = () => ({ status: jest.fn().mockReturnThis(), json: jest.fn().mockReturnThis() });

    test('getClientFidelite returns 404 when user not found (direct)', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      const req = { params: { clientId: '999' }, user: { id: 2, role: 'MANAGER' } };
      const res = makeRes();
      const next = jest.fn();

      await fideliteController.getClientFidelite(req, res, next);
      expect(res.status).toHaveBeenCalledWith(404);
    });

    test('getClientFidelite returns 404 when fidelite missing (direct)', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: 3, nom: 'Aa', prenom: 'Bb', typeClient: 'Standard' });
      prisma.fidelite.findUnique.mockResolvedValue(null);

      const req = { params: { clientId: '3' }, user: { id: 3, role: 'MANAGER' } };
      const res = makeRes();
      const next = jest.fn();

      await fideliteController.getClientFidelite(req, res, next);
      expect(res.status).toHaveBeenCalledWith(404);
    });

    test('adjustFidelitePoints returns 404 when client not found (direct)', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      const req = { params: { clientId: '444' }, user: { id: 10, role: 'MANAGER' }, body: {} };
      const res = makeRes();
      const next = jest.fn();

      await fideliteController.adjustFidelitePoints(req, res, next);
      expect(res.status).toHaveBeenCalledWith(404);
    });

    test('adjustFidelitePoints returns 404 when fidelite missing (direct)', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: 445, nom: 'X', prenom: 'Y', role: 'CLIENT' });
      prisma.fidelite.findUnique.mockResolvedValue(null);

      const req = { params: { clientId: '445' }, user: { id: 10, role: 'MANAGER' }, body: {} };
      const res = makeRes();
      const next = jest.fn();

      await fideliteController.adjustFidelitePoints(req, res, next);
      expect(res.status).toHaveBeenCalledWith(404);
    });

    test('getClientFideliteHistory returns 404 when client not found (direct)', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      const req = { params: { clientId: '900' }, user: { id: 1, role: 'MANAGER' } };
      const res = makeRes();
      const next = jest.fn();

      await fideliteController.getClientFideliteHistory(req, res, next);
      expect(res.status).toHaveBeenCalledWith(404);
    });

    test('getClientFideliteHistory returns 404 when fidelite missing (direct)', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: 901, nom: 'C' });
      prisma.fidelite.findUnique.mockResolvedValue(null);
      const req = { params: { clientId: '901' }, user: { id: 1, role: 'MANAGER' } };
      const res = makeRes();
      const next = jest.fn();

      await fideliteController.getClientFideliteHistory(req, res, next);
      expect(res.status).toHaveBeenCalledWith(404);
    });
  });
});
