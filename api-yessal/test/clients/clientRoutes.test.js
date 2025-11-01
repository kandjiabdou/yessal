const request = require('supertest');
const app = require('../../src/app');
const prisma = require('../../src/utils/prismaClient');

describe('Client routes (detailed)', () => {
  describe('GET /api/clients/:id', () => {
    test('returns 404 when client is not found', async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      const res = await request(app)
        .get('/api/clients/123')
        .set('x-test-user', JSON.stringify({ id: 1, role: 'Manager' }));

      expect(res.status).toBe(404);
      expect(res.body).toHaveProperty('success', false);
      expect(res.body).toHaveProperty('message');
      expect(res.body.message).toMatch(/Client non trouv/i);
    });

    test('returns 200 and client data when found', async () => {
      // Mock the user findUnique to return a client
      const fakeClient = {
        id: 7,
        nom: 'Diallo',
        prenom: 'Moussa',
        email: 'moussa@example.com',
        telephone: '+221700000000',
        adresseText: 'Rue Test',
        typeClient: 'Standard',
        estEtudiant: false,
        latitude: null,
        longitude: null,
        fidelite: null
      };

      prisma.user.findUnique.mockResolvedValue(fakeClient);
      // No premium subscription
      prisma.abonnementpremiummensuel.findFirst.mockResolvedValue(null);
      // No orders in last 6 months
      prisma.commande.aggregate.mockResolvedValue({ _sum: { masseVerifieeKg: 0 }, _count: { id: 0 } });

      const res = await request(app)
        .get(`/api/clients/${fakeClient.id}`)
        .set('x-test-user', JSON.stringify({ id: 1, role: 'Manager' }));

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('success', true);
      expect(res.body).toHaveProperty('data');
      expect(res.body.data).toHaveProperty('id', fakeClient.id);
      expect(res.body.data).toHaveProperty('stats6mois');
    });
  });

  describe('POST /api/clients/guest', () => {
    test('creates a guest client and returns 201', async () => {
      const created = { id: 55, nom: 'Test', prenom: 'Guest', telephone: '+221788888888', email: null, adresseText: null };
      prisma.clientinvite.create.mockResolvedValue(created);

      const payload = { nom: 'Test', prenom: 'Guest', telephone: '+221788888888' };

      const res = await request(app)
        .post('/api/clients/guest')
        .set('x-test-user', JSON.stringify({ id: 1, role: 'Manager' }))
        .send(payload);

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('success', true);
      expect(res.body).toHaveProperty('data');
      expect(res.body.data).toHaveProperty('id', created.id);
    });
  });

  describe('POST /api/clients (create account)', () => {
    test('returns 400 when telephone already exists', async () => {
      // Simulate existing user by telephone
      prisma.user.findFirst.mockResolvedValue({ id: 2, telephone: '+221711111111' });

      const payload = { nom: 'Dup', prenom: 'User', telephone: '+221711111111' };

      const res = await request(app)
        .post('/api/clients')
        .set('x-test-user', JSON.stringify({ id: 1, role: 'Manager' }))
        .send(payload);

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty('success', false);
      expect(res.body).toHaveProperty('message');
      expect(res.body.message).toMatch(/téléphone/i);
    });

    test('creates a client account when data is valid', async () => {
      // No existing user by phone or email
      prisma.user.findFirst.mockResolvedValue(null);
      const createdUser = { id: 99, nom: 'New', prenom: 'Client', telephone: '+221799999999', email: null, adresseText: null, typeClient: 'Standard', estEtudiant: false };
      prisma.user.create.mockResolvedValue(createdUser);

      // Ensure fidelity initialization flow can run: mock findUnique to return the created user
      prisma.user.findUnique.mockResolvedValue(createdUser);
      // Mock fidelite not existing and create flow
      prisma.fidelite.findUnique.mockResolvedValue(null);
      prisma.fidelite.create.mockResolvedValue({ id: 101, clientUserId: createdUser.id, numeroCarteFidelite: 'TH00000ABC' });

      const payload = { nom: 'New', prenom: 'Client', telephone: '+221799999999' };

      const res = await request(app)
        .post('/api/clients')
        .set('x-test-user', JSON.stringify({ id: 1, role: 'Manager' }))
        .send(payload);

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('success', true);
      expect(res.body.data).toHaveProperty('id', 99);
    });
  });
});
