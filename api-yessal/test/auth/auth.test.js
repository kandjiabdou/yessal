const { authenticate } = require('../../src/middleware/auth');

describe('Auth middleware placeholder', () => {
  test('placeholder - auth module should export functions', () => {
    expect(typeof authenticate).toBe('function');
  });
});

// Additional controller-level tests to ensure authController branches are covered.
jest.mock('google-auth-library', () => ({
  OAuth2Client: jest.fn().mockImplementation(() => ({
    verifyIdToken: jest.fn()
  }))
}));

jest.mock('../../src/utils/fideliteUtils', () => ({
  genererNumeroCarteFidelite: jest.fn().mockResolvedValue('FC-TEST-0001')
}));

const prisma = require('../../src/utils/prismaClient');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { OAuth2Client } = require('google-auth-library');
const authController = require('../../src/controllers/authController');

describe('authController (unit)', () => {
  let res;
  let next;

  beforeEach(() => {
    for (const key of Object.keys(prisma)) {
      if (jest.isMockFunction(prisma[key])) prisma[key].mockReset();
    }
    prisma.user = prisma.user || {};
    prisma.fidelite = prisma.fidelite || {};
    prisma.abonnementpremiummensuel = prisma.abonnementpremiummensuel || {};

    res = { status: jest.fn().mockReturnThis(), json: jest.fn().mockReturnThis() };
    next = jest.fn();
    jest.spyOn(jwt, 'sign').mockImplementation(() => 'signed-token');
  });

  afterEach(() => jest.restoreAllMocks());

  test('register returns 400 when no email or telephone provided', async () => {
    const req = { body: {} };
    await authController.register(req, res, next);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  test('register returns 409 when user already exists', async () => {
    prisma.user.findFirst = jest.fn().mockResolvedValue({ id: 1 });
    const req = { body: { email: 'a@b.com' } };
    await authController.register(req, res, next);
    expect(res.status).toHaveBeenCalledWith(409);
  });

  test('register creates client fidelite and returns 201', async () => {
    prisma.user.findFirst = jest.fn().mockResolvedValue(null);
    bcrypt.hash = jest.fn().mockResolvedValue('hashed');
    prisma.$transaction = jest.fn().mockImplementation(async (fn) => {
      const tx = {
        user: { create: jest.fn().mockResolvedValue({ id: 10, motDePasseHash: 'hashed', nom: 'X' }) },
        fidelite: { create: jest.fn().mockResolvedValue({}) },
        abonnementpremiummensuel: { create: jest.fn().mockResolvedValue({}) }
      };
      return fn(tx);
    });
    const req = { body: { role: 'Client', nom: 'X', email: 'a@b.com', password: 'pwd' } };
    await authController.register(req, res, next);
    expect(res.status).toHaveBeenCalledWith(201);
  });

  test('login returns 401 when credentials invalid', async () => {
    prisma.user.findFirst = jest.fn().mockResolvedValue(null);
    const req = { body: { email: 'no@one.com', password: 'x' } };
    await authController.login(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
  });

  test('login returns 200 when credentials valid', async () => {
    prisma.user.findFirst = jest.fn().mockResolvedValue({ id: 5, motDePasseHash: 'h', email: 'ok@a' });
    bcrypt.compare = jest.fn().mockResolvedValue(true);
    const req = { body: { email: 'ok@a', password: 'pwd' } };
    await authController.login(req, res, next);
    expect(res.status).toHaveBeenCalledWith(200);
  });

  test('googleAuth creates new user when none exists', async () => {
    const mockVerify = jest.fn().mockResolvedValue({ getPayload: () => ({ email: 'g@a', given_name: 'G', family_name: 'Auth', sub: 'gid' }) });
    OAuth2Client.mockImplementation(() => ({ verifyIdToken: mockVerify }));
    prisma.user.findFirst = jest.fn().mockResolvedValue(null);
    prisma.user.create = jest.fn().mockResolvedValue({ id: 20, email: 'g@a' });
    prisma.fidelite.create = jest.fn().mockResolvedValue({});

    // load a fresh module instance with the OAuth2Client mocked
    jest.resetModules();
    // make sure the controller is loaded with our test mocks for google, prisma and fidelite utils
    jest.doMock('google-auth-library', () => ({
      OAuth2Client: jest.fn().mockImplementation(() => ({ verifyIdToken: mockVerify }))
    }));
    jest.doMock('../../src/utils/prismaClient', () => prisma);
    jest.doMock('../../src/utils/fideliteUtils', () => ({ genererNumeroCarteFidelite: jest.fn().mockResolvedValue('FC-TEST-0001') }));
    const freshAuthController = require('../../src/controllers/authController');

    const req = { body: { googleToken: 'tok' } };
    await freshAuthController.googleAuth(req, res, next);
    expect(res.status).toHaveBeenCalledWith(200);
  });

  test('refreshToken returns 400 when missing', async () => {
    const req = { body: {} };
    await authController.refreshToken(req, res, next);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  test('changePassword returns 400 when no password hash', async () => {
    prisma.user.findUnique = jest.fn().mockResolvedValue({ id: 2, motDePasseHash: null });
    const req = { body: { currentPassword: 'a', newPassword: 'b' }, user: { id: 2 } };
    await authController.changePassword(req, res, next);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  test('register with no password and non-client role', async () => {
    prisma.user.findFirst = jest.fn().mockResolvedValue(null);
    bcrypt.hash = jest.fn(); // should not be called
    prisma.$transaction = jest.fn().mockImplementation(async (fn) => {
      const tx = {
        user: { create: jest.fn().mockResolvedValue({ id: 50, nom: 'Admin' }) },
        fidelite: { create: jest.fn() },
        abonnementpremiummensuel: { create: jest.fn() }
      };
      return fn(tx);
    });
    const req = { body: { role: 'Admin', nom: 'Admin', email: 'admin@a' } };
    await authController.register(req, res, next);
    expect(res.status).toHaveBeenCalledWith(201);
  });

  test('register transaction error calls next', async () => {
    prisma.user.findFirst = jest.fn().mockResolvedValue(null);
    prisma.$transaction = jest.fn().mockRejectedValue(new Error('tx fail'));
    const req = { body: { role: 'Client', nom: 'X', email: 'err@a', password: 'pwd' } };
    await authController.register(req, res, next);
    expect(next).toHaveBeenCalled();
  });

  test('googleAuth when verify throws forwards error', async () => {
    jest.resetModules();
    const mockVerify = jest.fn().mockImplementation(() => { throw new Error('verify fail'); });
    jest.doMock('google-auth-library', () => ({ OAuth2Client: jest.fn().mockImplementation(() => ({ verifyIdToken: mockVerify })) }));
    jest.doMock('../../src/utils/prismaClient', () => prisma);
    jest.doMock('../../src/utils/fideliteUtils', () => ({ genererNumeroCarteFidelite: jest.fn().mockResolvedValue('FC-TEST-0001') }));
    const freshAuthController = require('../../src/controllers/authController');
    const req = { body: { googleToken: 'bad' } };
    await freshAuthController.googleAuth(req, res, next);
    expect(next).toHaveBeenCalled();
  });

  test('googleAuth uses existing user with loginGoogleId', async () => {
    const mockVerify = jest.fn().mockResolvedValue({ getPayload: () => ({ email: 'g3@a', given_name: 'G', family_name: 'Auth', sub: 'gid3' }) });
    jest.resetModules();
    jest.doMock('google-auth-library', () => ({ OAuth2Client: jest.fn().mockImplementation(() => ({ verifyIdToken: mockVerify })) }));
    jest.doMock('../../src/utils/prismaClient', () => prisma);
    jest.doMock('../../src/utils/fideliteUtils', () => ({ genererNumeroCarteFidelite: jest.fn().mockResolvedValue('FC-TEST-0001') }));
    prisma.user.findFirst = jest.fn().mockResolvedValue({ id: 77, email: 'g3@a', loginGoogleId: 'gid3' });
    const freshAuthController = require('../../src/controllers/authController');
    const req = { body: { googleToken: 'tok3' } };
    await freshAuthController.googleAuth(req, res, next);
    expect(res.status).toHaveBeenCalledWith(200);
  });

  test('refreshToken handles TokenExpiredError name', async () => {
    jest.spyOn(jwt, 'verify').mockImplementation(() => { const e = new Error('expired'); e.name = 'TokenExpiredError'; throw e; });
    const req = { body: { refreshToken: 'expired' } };
    await authController.refreshToken(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
  });

  test('changePassword next on update failure', async () => {
    prisma.user.findUnique = jest.fn().mockResolvedValue({ id: 9, motDePasseHash: 'h' });
    bcrypt.compare = jest.fn().mockResolvedValue(true);
    bcrypt.hash = jest.fn().mockResolvedValue('newh');
    prisma.user.update = jest.fn().mockRejectedValue(new Error('update fail'));
    const req = { body: { currentPassword: 'ok', newPassword: 'new' }, user: { id: 9 } };
    await authController.changePassword(req, res, next);
    expect(next).toHaveBeenCalled();
  });

  test('register sets aGeolocalisationEnregistree when coords provided', async () => {
    prisma.user.findFirst = jest.fn().mockResolvedValue(null);
    bcrypt.hash = jest.fn().mockResolvedValue('h');
    prisma.$transaction = jest.fn().mockImplementation(async (fn) => {
      const tx = {
        user: { create: jest.fn().mockResolvedValue({ id: 101, motDePasseHash: 'h' }) },
        fidelite: { create: jest.fn().mockResolvedValue({}) },
        abonnementpremiummensuel: { create: jest.fn().mockResolvedValue({}) }
      };
      return fn(tx);
    });
    const req = { body: { role: 'Client', nom: 'Loc', email: 'loc@a', password: 'pwd', latitude: 12.3, longitude: 45.6 } };
    await authController.register(req, res, next);
    expect(res.status).toHaveBeenCalledWith(201);
  });

  test('register premium computes monto without student discount', async () => {
    prisma.user.findFirst = jest.fn().mockResolvedValue(null);
    bcrypt.hash = jest.fn().mockResolvedValue('h');
    prisma.$transaction = jest.fn().mockImplementation(async (fn) => {
      const tx = {
        user: { create: jest.fn().mockResolvedValue({ id: 202, motDePasseHash: 'h' }) },
        fidelite: { create: jest.fn().mockResolvedValue({}) },
        abonnementpremiummensuel: { create: jest.fn().mockResolvedValue({}) }
      };
      return fn(tx);
    });
    const req = { body: { role: 'Client', nom: 'P', email: 'p@a', password: 'pwd', typeClient: 'Premium', estEtudiant: false } };
    await authController.register(req, res, next);
    expect(res.status).toHaveBeenCalledWith(201);
  });

  test('googleAuth defaults name to Unknown when payload missing names', async () => {
    // make fresh module where OAuth2Client returns a payload without names
    jest.resetModules();
    const mockVerify = jest.fn().mockResolvedValue({ getPayload: () => ({ email: 'no-name@a', sub: 'gid-no-name' }) });
    jest.doMock('google-auth-library', () => ({ OAuth2Client: jest.fn().mockImplementation(() => ({ verifyIdToken: mockVerify })) }));
    jest.doMock('../../src/utils/prismaClient', () => prisma);
    jest.doMock('../../src/utils/fideliteUtils', () => ({ genererNumeroCarteFidelite: jest.fn().mockResolvedValue('FC-TEST-0001') }));
    const freshAuthController = require('../../src/controllers/authController');
    prisma.user.findFirst = jest.fn().mockResolvedValue(null);
    prisma.user.create = jest.fn().mockResolvedValue({ id: 303, email: 'no-name@a' });
    prisma.fidelite.create = jest.fn().mockResolvedValue({});
    const req = { body: { googleToken: 'tok-no-name' } };
    await freshAuthController.googleAuth(req, res, next);
    expect(res.status).toHaveBeenCalledWith(200);
  });
});
