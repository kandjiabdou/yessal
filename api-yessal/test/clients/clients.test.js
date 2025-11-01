const request = require('supertest');
const app = require('../../src/app');
const prisma = require('../../src/utils/prismaClient');

describe('Clients API', () => {
  describe('POST /api/clients/check', () => {
    test('returns 400 when telephone and email are empty (controller-level message)', async () => {
      const res = await request(app)
        .post('/api/clients/check')
        .set('x-test-user', JSON.stringify({ id: 1, role: 'Manager' }))
        .send({ telephone: '' });

      expect(res.status).toBe(400);
      // The controller returns { exists: false, message: 'Téléphone ou email requis pour la vérification' }
      expect(res.body).toHaveProperty('exists', false);
      expect(res.body).toHaveProperty('message');
      expect(res.body.message).toMatch(/Téléphone ou email requis/);
    });

    test('returns exists true when a matching client is found', async () => {
      // Arrange: mock prisma.user.findFirst to return a client
      prisma.user.findFirst.mockResolvedValue({
        id: 42,
        nom: 'Sow',
        prenom: 'Awa',
        telephone: '+221771234567',
        email: 'awa@example.com'
      });

      const payload = { telephone: '+221771234567' };

      const res = await request(app)
        .post('/api/clients/check')
        .set('x-test-user', JSON.stringify({ id: 1, role: 'Manager' }))
        .send(payload);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('exists', true);
      expect(res.body).toHaveProperty('message');
      expect(res.body).toHaveProperty('client');
      expect(res.body.client).toHaveProperty('telephone', payload.telephone);
    });
  });
});
