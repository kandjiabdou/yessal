// Focused tests to increase coverage for clientController.js
jest.mock('../../src/utils/fideliteUtils', () => ({
  validerFormatNumeroCarte: jest.fn()
}));

jest.mock('../../src/utils/clientUtils', () => ({
  enrichClientsWithPremiumData: jest.fn(async (c) => c),
  enrichClientWithPremiumData: jest.fn(async (c) => c)
}));

const request = require('supertest');
const app = require('../../src/app');
const prisma = require('../../src/utils/prismaClient');
const { validerFormatNumeroCarte } = require('../../src/utils/fideliteUtils');
const { enrichClientsWithPremiumData } = require('../../src/utils/clientUtils');
const clientController = require('../../src/controllers/clientController');
const { AppError } = require('../../src/utils/errors');

describe('clientController extra coverage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // ensure prisma nested namespaces exist for assignment
    prisma.fidelite = prisma.fidelite || {};
    prisma.user = prisma.user || {};
    prisma.commande = prisma.commande || {};
    prisma.clientinvite = prisma.clientinvite || {};
    // make sure common methods are mock functions
    prisma.fidelite.findUnique = prisma.fidelite.findUnique || jest.fn();
    prisma.user.findFirst = prisma.user.findFirst || jest.fn();
    prisma.user.findUnique = prisma.user.findUnique || jest.fn();
    prisma.user.create = prisma.user.create || jest.fn();
    prisma.commande.aggregate = prisma.commande.aggregate || jest.fn();
    prisma.clientinvite.create = prisma.clientinvite.create || jest.fn();
  });

  test('GET /api/clients/search returns 400 for short query', async () => {
    const res = await request(app)
      .get('/api/clients/search')
      .set('x-test-user', JSON.stringify({ id: 1, role: 'MANAGER' }))
      .query({ q: 'a' });

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('message');
  });

  test('GET /api/clients/search loyalty-card path handles aggregate failure (fallback stats)', async () => {
    // Simulate loyalty card format
    validerFormatNumeroCarte.mockReturnValue(true);

    // Return a fidelite record with embedded clientUser
    prisma.fidelite.findUnique.mockResolvedValue({
      numeroCarteFidelite: 'TH12345ABC',
      nombreLavageTotal: 2,
      poidsTotalLaveKg: 3,
      prixTotalPaye: 10,
      pointsDisponible: 1,
      pointsFraction: 0,
      creditDisponible: 0,
      clientUser: {
        id: 5,
        nom: 'Test',
        prenom: 'CLIENT',
        email: 'c@example.com',
        telephone: '+221700000000',
        adresseText: null,
        typeClient: 'Standard',
        estEtudiant: false,
        latitude: null,
        longitude: null
      }
    });

    // Ensure enrichment returns the base client array
    enrichClientsWithPremiumData.mockResolvedValueOnce([{ id: 5, nom: 'Test', prenom: 'CLIENT', email: 'c@example.com', telephone: '+221700000000', adresseText: null, typeClient: 'Standard', estEtudiant: false, fidelite: { numeroCarteFidelite: 'TH12345ABC' } }]);

    // Force aggregate to throw to hit the catch branch and produce default stats
    prisma.commande.aggregate.mockRejectedValue(new Error('db fail'));

    const res = await request(app)
      .get('/api/clients/search')
      .set('x-test-user', JSON.stringify({ id: 1, role: 'MANAGER' }))
      .query({ q: 'TH12345ABC' });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('success', true);
    expect(res.body).toHaveProperty('data');
    expect(Array.isArray(res.body.data)).toBe(true);
    const first = res.body.data[0];
    expect(first).toHaveProperty('stats6mois');
    expect(first.stats6mois.poids6mois).toBe(0);
    expect(first.stats6mois.lavages6mois).toBe(0);
    // searchInfo should indicate loyalty card search
    expect(res.body.searchInfo).toHaveProperty('isLoyaltyCardSearch', true);
  });

  test('POST /api/clients/check returns matchedField email when email matches', async () => {
    // Mock findFirst to return a client with an email
    prisma.user.findFirst.mockResolvedValue({ id: 77, nom: 'Email', prenom: 'Match', telephone: null, email: 'match@example.com' });

    const res = await request(app)
      .post('/api/clients/check')
      .set('x-test-user', JSON.stringify({ id: 1, role: 'MANAGER' }))
      .send({ email: 'match@example.com' });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('exists', true);
    expect(res.body).toHaveProperty('message');
    expect(res.body.message).toMatch(/email/);
    expect(res.body).toHaveProperty('client');
    expect(res.body.client).toHaveProperty('email', 'match@example.com');
  });

  test('POST /api/clients returns 400 when email already exists (email branch)', async () => {
    // First call (telephone check) returns null
    prisma.user.findFirst.mockResolvedValueOnce(null).mockResolvedValueOnce({ id: 88, email: 'dup@example.com' });

    const payload = { nom: 'Dup', prenom: 'Email', telephone: '+221700000001', email: 'dup@example.com' };

    const res = await request(app)
      .post('/api/clients')
      .set('x-test-user', JSON.stringify({ id: 1, role: 'MANAGER' }))
      .send(payload);

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('success', false);
    expect(res.body).toHaveProperty('message');
    expect(res.body.message).toMatch(/adresse email/i);
  });

  test('GET /api/clients/search loyalty-card path with no fidelite returns empty results', async () => {
    validerFormatNumeroCarte.mockReturnValue(true);
    prisma.fidelite.findUnique.mockResolvedValue(null);
    enrichClientsWithPremiumData.mockResolvedValueOnce([]);

    const res = await request(app)
      .get('/api/clients/search')
      .set('x-test-user', JSON.stringify({ id: 1, role: 'MANAGER' }))
      .query({ q: 'TH99999ZZZ' });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('success', true);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.length).toBe(0);
    expect(res.body.searchInfo.isLoyaltyCardSearch).toBe(true);
  });

  test('GET /api/clients/search general path returns stats from aggregate', async () => {
    // general search
    validerFormatNumeroCarte.mockReturnValue(false);

    const user = {
      id: 99,
      nom: 'Gen',
      prenom: 'User',
      email: 'g@example.com',
      telephone: '+221700000099',
      adresseText: null,
      typeClient: 'Standard',
      estEtudiant: false,
      latitude: 1,
      longitude: 2,
      fidelite: { numeroCarteFidelite: 'THX' }
    };

    prisma.user.findMany.mockResolvedValue([user]);
    enrichClientsWithPremiumData.mockResolvedValueOnce([user]);
    prisma.commande.aggregate.mockResolvedValue({ _sum: { masseVerifieeKg: 12 }, _count: { id: 3 } });

    const res = await request(app)
      .get('/api/clients/search')
      .set('x-test-user', JSON.stringify({ id: 1, role: 'MANAGER' }))
      .query({ q: 'Gen' });

    expect(res.status).toBe(200);
    expect(res.body.data[0].stats6mois.poids6mois).toBe(12);
    expect(res.body.data[0].stats6mois.lavages6mois).toBe(3);
  });

  test('POST /api/clients/check returns exists false when nothing found', async () => {
    prisma.user.findFirst.mockResolvedValue(null);

    const res = await request(app)
      .post('/api/clients/check')
      .set('x-test-user', JSON.stringify({ id: 1, role: 'MANAGER' }))
      .send({ telephone: '+221700000000' });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('exists', false);
    expect(res.body.message).toMatch(/Aucun client trouvé/);
  });

  test('POST /api/clients/guest returns 400 when required fields missing', async () => {
    const res = await request(app)
      .post('/api/clients/guest')
      .set('x-test-user', JSON.stringify({ id: 1, role: 'MANAGER' }))
      .send({ nom: 'OnlyName' });

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('message');
  });

  test('searchClients forwards error to next when enrichment throws', async () => {
    // Force enrichment to throw so outer catch is exercised
    enrichClientsWithPremiumData.mockRejectedValueOnce(new Error('enrich-fail'));
    validerFormatNumeroCarte.mockReturnValue(false);

    const res = await request(app)
      .get('/api/clients/search')
      .set('x-test-user', JSON.stringify({ id: 1, role: 'MANAGER' }))
      .query({ q: 'test' });

    // Expect server error due to enrichment throwing and being passed to next()
    expect(res.status).toBe(500);
    expect(res.body).toHaveProperty('success', false);
  });

  test('createGuestClient controller calls next with AppError when required fields missing (direct)', async () => {
    const req = { body: { nom: 'OnlyName' } };
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    const next = jest.fn();

    await clientController.createGuestClient(req, res, next);

    expect(next).toHaveBeenCalled();
    const err = next.mock.calls[0][0];
    expect(err).toBeInstanceOf(AppError);
    expect(err.message).toMatch(/Nom, prénom et téléphone/i);
  });

  test('createClientAccount controller calls next with AppError when required fields missing (direct)', async () => {
    const req = { body: { nom: 'OnlyName' } };
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    const next = jest.fn();

    await clientController.createClientAccount(req, res, next);

    expect(next).toHaveBeenCalled();
    const err = next.mock.calls[0][0];
    expect(err).toBeInstanceOf(AppError);
    expect(err.message).toMatch(/Nom, prénom et téléphone/i);
  });

  test('POST /api/clients/check forwards error to next when prisma throws', async () => {
    prisma.user.findFirst.mockRejectedValueOnce(new Error('db boom'));

    const res = await request(app)
      .post('/api/clients/check')
      .set('x-test-user', JSON.stringify({ id: 1, role: 'MANAGER' }))
      .send({ telephone: '+221700000000' });

    expect(res.status).toBe(500);
    expect(res.body).toHaveProperty('success', false);
  });
});
