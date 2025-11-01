const request = require('supertest');
const app = require('../../src/app');
const prisma = require('../../src/utils/prismaClient');
const clientUtils = require('../../src/utils/clientUtils');

describe('Order controller - getOrderById', () => {
  afterEach(() => jest.clearAllMocks());

  test('GET /api/orders/:id returns 404 when order not found', async () => {
    prisma.commande.findUnique.mockResolvedValue(null);

    const res = await request(app)
      .get('/api/orders/999')
      .set('x-test-user', JSON.stringify({ id: 1, role: 'Manager' }));

    expect(res.status).toBe(404);
    expect(res.body).toHaveProperty('success', false);
  });

  test('GET /api/orders/:id returns 200 when order found', async () => {
    const order = {
      id: 10,
      clientUserId: 5,
      clientUser: { id: 5, nom: 'Test', prenom: 'User', email: 't@example.com', telephone: '+221700000000', typeClient: 'Standard', estEtudiant: false },
      masseVerifieeKg: null,
      prixTotal: 1500,
      flag: true
    };

    prisma.commande.findUnique.mockResolvedValue(order);
    // Ensure enrichClientWithPremiumData returns the same base client (avoid heavy logic)
    jest.spyOn(clientUtils, 'enrichClientWithPremiumData').mockImplementation(async (c) => c);

    const res = await request(app)
      .get(`/api/orders/${order.id}`)
      .set('x-test-user', JSON.stringify({ id: 1, role: 'Manager' }));

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('success', true);
    expect(res.body.data).toHaveProperty('id', order.id);
  });
});
