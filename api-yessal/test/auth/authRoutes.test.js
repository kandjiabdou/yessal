const request = require('supertest');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

// Mock fidelity utils (used in register)
jest.mock('../../src/utils/fideliteUtils', () => ({
  genererNumeroCarteFidelite: jest.fn().mockResolvedValue('CARD_TEST_123')
}));

// Mock google auth library to avoid external calls
jest.mock('google-auth-library', () => ({
  OAuth2Client: jest.fn().mockImplementation(() => ({
    verifyIdToken: jest.fn().mockResolvedValue({
      getPayload: () => ({
        email: 'test.google@example.com',
        given_name: 'Test',
        family_name: 'Google',
        sub: 'GOOGLE_SUB_1'
      })
    })
  }))
}));

const app = require('../../src/app');
const prisma = require('../../src/utils/prismaClient');

describe('Auth routes (integration, with mocked Prisma)', () => {
  beforeEach(() => {
    // ensure optional prisma methods exist on the test mock
    prisma.$transaction = prisma.$transaction || jest.fn();
    prisma.user.update = prisma.user.update || jest.fn();
    prisma.user.create = prisma.user.create || jest.fn();
    prisma.fidelite.create = prisma.fidelite.create || jest.fn();
    prisma.abonnementpremiummensuel = prisma.abonnementpremiummensuel || {};
    prisma.abonnementpremiummensuel.create = prisma.abonnementpremiummensuel.create || jest.fn();
    prisma.user.findFirst = prisma.user.findFirst || jest.fn();
    prisma.user.findUnique = prisma.user.findUnique || jest.fn();
  });
  afterEach(() => {
    jest.clearAllMocks();
  });

  test('POST /api/auth/register - validation error when required fields missing', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({});

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('message');
    expect(res.body.success).toBe(false);
  });

  test('POST /api/auth/register - successful client registration', async () => {
    // No existing user
    prisma.user.findFirst.mockResolvedValue(null);

    // $transaction should execute the callback with the prisma mock (tx)
    prisma.$transaction.mockImplementation(async (cb) => cb(prisma));

  const newUser = { id: 10, nom: 'Dupont', prenom: 'Jean', email: null, telephone: '771234567' };
    prisma.user.create.mockResolvedValue(newUser);
    prisma.fidelite.create.mockResolvedValue({ id: 1 });
    prisma.abonnementpremiummensuel.create.mockResolvedValue({ id: 1 });

    const payload = {
      role: 'Client',
      nom: 'Dupont',
      prenom: 'Jean',
      telephone: '771234567',
      password: 'secretpw',
      typeClient: 'Standard'
    };

    const res = await request(app)
      .post('/api/auth/register')
      .send(payload);

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveProperty('user');
    expect(res.body.data.user.id).toBe(newUser.id);
  });

  test('POST /api/auth/login - success with telephone/password', async () => {
    const plain = 'mypassword';
    const hashed = await bcrypt.hash(plain, 8);

    prisma.user.findFirst.mockResolvedValue({
      id: 20,
      nom: 'User',
      prenom: 'Test',
      telephone: '700000000',
      motDePasseHash: hashed
    });

    const res = await request(app)
      .post('/api/auth/login')
      .send({ telephone: '700000000', password: plain });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveProperty('accessToken');
    expect(res.body.data).toHaveProperty('refreshToken');
  });

  test('POST /api/auth/google - creates or logs in user (mocked Google)', async () => {
    // Simulate not found then create
    prisma.user.findFirst.mockResolvedValue(null);
    prisma.user.create.mockResolvedValue({ id: 30, nom: 'Google', prenom: 'Test', email: 'test.google@example.com' });
    prisma.fidelite.create.mockResolvedValue({ id: 2 });

    const res = await request(app)
      .post('/api/auth/google')
      .send({ googleToken: 'FAKE_TOKEN' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.user.email).toBe('test.google@example.com');
  });

  test('POST /api/auth/refresh - returns new access token when refresh token valid', async () => {
    // Spy on jwt.verify to simulate a valid decoded refresh token
    const verifySpy = jest.spyOn(jwt, 'verify').mockImplementation(() => ({ userId: 20 }));

    prisma.user.findUnique.mockResolvedValue({ id: 20 });

    const res = await request(app)
      .post('/api/auth/refresh')
      .send({ refreshToken: 'anytoken' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveProperty('accessToken');

    verifySpy.mockRestore();
  });

  test('POST /api/auth/change-password - change when correct current password', async () => {
    // Setup: the authenticate middleware in test setup respects x-test-user header
    const userId = 50;
    const oldPass = 'oldpw';
    const hashed = await bcrypt.hash(oldPass, 8);

    prisma.user.findUnique.mockResolvedValue({ id: userId, motDePasseHash: hashed });
    prisma.user.update.mockResolvedValue({ id: userId });

    const res = await request(app)
      .post('/api/auth/change-password')
      .set('x-test-user', JSON.stringify({ id: userId }))
      .send({ currentPassword: oldPass, newPassword: 'newpw123' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(prisma.user.update).toHaveBeenCalled();
  });
});
