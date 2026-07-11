const request = require('supertest');
const app = require('../src/app');

describe('App configuration and middleware', () => {
  describe('CORS configuration', () => {
    test('allows requests with no origin using OPTIONS', (done) => {
      request(app)
        .options('/api/auth')
        .expect((res) => {
          // OPTIONS request should succeed with CORS headers
          expect(res.status).toBeLessThan(500);
        })
        .end(done);
    });

    test('allows development origins using OPTIONS', (done) => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';
      
      request(app)
        .options('/api/auth')
        .set('Origin', 'http://localhost:4510')
        .expect((res) => {
          expect(res.headers['access-control-allow-origin']).toBe('http://localhost:4510');
        })
        .end((err) => {
          process.env.NODE_ENV = originalEnv;
          done(err);
        });
    });

    test('allows production origins when NODE_ENV is production using OPTIONS', (done) => {
      const originalEnv = process.env.NODE_ENV;
      const originalCorsOrigin = process.env.CORS_ORIGIN;
      process.env.NODE_ENV = 'production';
      process.env.CORS_ORIGIN = 'https://manager.yessal.sn';
      jest.resetModules();
      const freshApp = require('../src/app');
      
      request(freshApp)
        .options('/api/auth')
        .set('Origin', 'https://manager.yessal.sn')
        .expect((res) => {
          expect(res.headers['access-control-allow-origin']).toBe('https://manager.yessal.sn');
        })
        .end((err) => {
          process.env.NODE_ENV = originalEnv;
          process.env.CORS_ORIGIN = originalCorsOrigin;
          done(err);
        });
    });

    test('rejects disallowed origins using OPTIONS', (done) => {
      request(app)
        .options('/api/auth')
        .set('Origin', 'http://malicious-site.com')
        .expect((res) => {
          // Should get CORS error for disallowed origin
          expect(res.status).toBeGreaterThanOrEqual(400);
        })
        .end(done);
    });
  });

  describe('404 handler', () => {
    test('returns 404 for non-existent routes', async () => {
      const response = await request(app)
        .get('/api/non-existent-route')
        .expect(404);
      
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Cannot GET /api/non-existent-route');
    });

    test('returns 404 for non-existent POST routes', async () => {
      const response = await request(app)
        .post('/api/invalid-endpoint')
        .expect(404);
      
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Cannot POST /api/invalid-endpoint');
    });
  });
});