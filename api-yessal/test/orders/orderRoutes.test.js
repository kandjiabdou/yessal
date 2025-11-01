const request = require('supertest');
const app = require('../../src/app');
const prisma = require('../../src/utils/prismaClient');

describe('Order routes', () => {
  test('POST /api/orders returns 400 when payload invalid (validation middleware)', async () => {
    const res = await request(app)
      .post('/api/orders')
      .set('x-test-user', JSON.stringify({ id: 1, role: 'Manager' }))
      .send({}); // empty body should fail validation

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('success', false);
    expect(res.body).toHaveProperty('message', 'Validation error');
  });

  test('GET /api/orders returns 200 with list (mocked prisma)', async () => {
    // Arrange: mock prisma.commande.findMany and count
    prisma.commande.findMany.mockResolvedValue([]);
    prisma.commande.count.mockResolvedValue(0);

    const res = await request(app)
      .get('/api/orders')
      .set('x-test-user', JSON.stringify({ id: 1, role: 'Manager' }));

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('success', true);
    expect(res.body).toHaveProperty('data');
  });
});
