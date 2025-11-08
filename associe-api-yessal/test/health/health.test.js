const request = require('supertest');
const app = require('../../src/app');

describe('Health', () => {
  test('GET / should return 404 JSON with proper message', async () => {
    const res = await request(app).get('/');
    expect(res.status).toBe(404);
    expect(res.body).toHaveProperty('success', false);
    expect(res.body).toHaveProperty('message', 'Cannot GET /');
  });
});
