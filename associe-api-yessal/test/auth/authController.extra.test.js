const prisma = require('../../src/utils/prismaClient');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

jest.mock('../../src/utils/fideliteUtils', () => ({
  genererNumeroCarteFidelite: jest.fn().mockResolvedValue('FC-TEST-0002')
}));

const authController = require('../../src/controllers/authController');

describe('authController extra branches', () => {
  let res;
  let next;

  beforeEach(() => {
    jest.clearAllMocks();
    res = { status: jest.fn().mockReturnThis(), json: jest.fn().mockReturnThis() };
    next = jest.fn();
  });

  test('register premium computes montant with student discount', async () => {
    prisma.user.findFirst = jest.fn().mockResolvedValue(null);
    bcrypt.hash = jest.fn().mockResolvedValue('hpwd');

    // capture tx to later assert montant
    let capturedTx;
    prisma.$transaction = jest.fn().mockImplementation(async (fn) => {
      const tx = {
        user: { create: jest.fn().mockResolvedValue({ id: 333, motDePasseHash: 'hpwd' }) },
        fidelite: { create: jest.fn().mockResolvedValue({}) },
        abonnementpremiummensuel: { create: jest.fn().mockResolvedValue({}) }
      };
      capturedTx = tx;
      return fn(tx);
    });

    const req = { body: { role: 'CLIENT', nom: 'S', email: 's@a', password: 'pwd', typeClient: 'Premium', estEtudiant: true } };
    await authController.register(req, res, next);

    expect(res.status).toHaveBeenCalledWith(201);
    expect(capturedTx).toBeDefined();
    const callArg = capturedTx.abonnementpremiummensuel.create.mock.calls[0][0];
    expect(callArg.data).toHaveProperty('montant', 13500);
  });

  test('googleAuth updates existing user when loginGoogleId missing', async () => {
    // fresh module with mocked OAuth2Client
    jest.resetModules();
    const mockVerify = jest.fn().mockResolvedValue({ getPayload: () => ({ email: 'u@a', given_name: 'G', family_name: 'F', sub: 'gid-upd' }) });
    jest.doMock('google-auth-library', () => ({ OAuth2Client: jest.fn().mockImplementation(() => ({ verifyIdToken: mockVerify })) }));
    // use same prisma but set findFirst to simulate existing user without loginGoogleId
    const prismaFresh = require('../../src/utils/prismaClient');
    prismaFresh.user.findFirst = jest.fn().mockResolvedValue({ id: 444, email: 'u@a', loginGoogleId: null });
    prismaFresh.user.update = jest.fn().mockResolvedValue({ id: 444, email: 'u@a', loginGoogleId: 'gid-upd' });

    const freshAuthController = require('../../src/controllers/authController');
    const req = { body: { googleToken: 'tok-upd' } };
    await freshAuthController.googleAuth(req, res, next);

    expect(prismaFresh.user.update).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(200);
  });

  test('refreshToken returns 401 on JsonWebTokenError', async () => {
    jest.spyOn(jwt, 'verify').mockImplementation(() => { const e = new Error('bad'); e.name = 'JsonWebTokenError'; throw e; });
    const req = { body: { refreshToken: 'bad' } };
    await authController.refreshToken(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
  });

  test('refreshToken forwards unknown error to next', async () => {
    jest.spyOn(jwt, 'verify').mockImplementation(() => { throw new Error('boom'); });
    const req = { body: { refreshToken: 'boom' } };
    await authController.refreshToken(req, res, next);
    expect(next).toHaveBeenCalled();
  });

  test('changePassword returns 401 when current password incorrect', async () => {
    prisma.user.findUnique = jest.fn().mockResolvedValue({ id: 99, motDePasseHash: 'hash' });
    bcrypt.compare = jest.fn().mockResolvedValue(false);
    const req = { body: { currentPassword: 'wrong', newPassword: 'new' }, user: { id: 99 } };
    await authController.changePassword(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
  });

  test('register forwards thrown error from findFirst to next (covers catch next at register)', async () => {
    // make prisma.user.findFirst throw synchronously
    prisma.user.findFirst = jest.fn().mockImplementation(() => { throw new Error('findFirst boom'); });
    const req = { body: { email: 'a@b.com', nom: 'X' } };
    await authController.register(req, res, next);
    expect(next).toHaveBeenCalled();
    const err = next.mock.calls[0][0];
    expect(err).toBeInstanceOf(Error);
    expect(err.message).toMatch(/findFirst boom/);
  });

  test('refreshToken returns 401 when jwt verifies but user not found (Invalid refresh token)', async () => {
    jest.spyOn(jwt, 'verify').mockImplementation(() => ({ userId: 9999 }));
    prisma.user.findUnique = jest.fn().mockResolvedValue(null);
    const req = { body: { refreshToken: 'ok' } };
    await authController.refreshToken(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: false, message: 'Invalid refresh token' }));
  });

  test('login forwards errors to next (covers catch in login)', async () => {
    prisma.user.findFirst = jest.fn().mockImplementation(() => { throw new Error('login boom'); });
    const req = { body: { email: 'b@b', password: 'x' } };
    await authController.login(req, res, next);
    expect(next).toHaveBeenCalled();
    const err = next.mock.calls[0][0];
    expect(err).toBeInstanceOf(Error);
    expect(err.message).toMatch(/login boom/);
  });
});
