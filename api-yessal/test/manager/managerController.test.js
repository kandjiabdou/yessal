const controller = require('../../src/controllers/managerController');
const prisma = require('../../src/utils/prismaClient');
const sessionService = require('../../src/services/sessionService');

describe('managerController', () => {
  beforeEach(() => jest.clearAllMocks());

  describe('updateManagerSite', () => {
    test('returns 404 if manager not found', async () => {
      prisma.user.findUnique = jest.fn().mockResolvedValue(null);
      const req = { params: { id: '1' }, body: { siteId: 2 }, user: { id: 1 } };
      const res = { json: jest.fn() };
      const next = jest.fn();

      await controller.updateManagerSite(req, res, next);
      expect(next).toHaveBeenCalled();
    });

    test('returns 404 if site not found', async () => {
  prisma.user.findUnique = jest.fn().mockResolvedValue({ id: 1, role: 'MANAGER' });
  prisma.sitelavage = prisma.sitelavage || {};
  prisma.sitelavage.findUnique = jest.fn().mockResolvedValue(null);
      const req = { params: { id: '1' }, body: { siteId: 2 }, user: { id: 1 } };
      const res = { json: jest.fn() };
      const next = jest.fn();

      await controller.updateManagerSite(req, res, next);
      expect(next).toHaveBeenCalled();
    });

    test('returns 403 if authenticated user is not the manager', async () => {
  prisma.user.findUnique = jest.fn().mockResolvedValue({ id: 1, role: 'MANAGER' });
  prisma.sitelavage = prisma.sitelavage || {};
  prisma.sitelavage.findUnique = jest.fn().mockResolvedValue({ id: 2 });
      const req = { params: { id: '1' }, body: { siteId: 2 }, user: { id: 999 } };
      const res = { json: jest.fn() };
      const next = jest.fn();

      await controller.updateManagerSite(req, res, next);
      expect(next).toHaveBeenCalled();
    });

    test('updates manager site on success', async () => {
  prisma.user.findUnique = jest.fn().mockResolvedValue({ id: 1, role: 'MANAGER' });
  prisma.sitelavage = prisma.sitelavage || {};
  prisma.sitelavage.findUnique = jest.fn().mockResolvedValue({ id: 2 });
      prisma.user.update = jest.fn().mockResolvedValue({ id: 1, siteLavagePrincipalGerantId: 2 });

      const req = { params: { id: '1' }, body: { siteId: 2 }, user: { id: 1 } };
      const res = { json: jest.fn() };
      const next = jest.fn();

      await controller.updateManagerSite(req, res, next);

      expect(prisma.user.update).toHaveBeenCalledWith({ where: { id: 1 }, data: { siteLavagePrincipalGerantId: 2 } });
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
      expect(next).not.toHaveBeenCalled();
    });
  });

  describe('setWorkSession', () => {
    test('forbids modifying another manager session', async () => {
      const req = { params: { id: '5' }, body: { siteId: 2 }, user: { id: 6 } };
      const res = { json: jest.fn() };
      const next = jest.fn();

      await controller.setWorkSession(req, res, next);
      expect(next).toHaveBeenCalled();
    });

    test('returns error when sessionService.setManagerSession fails', async () => {
      sessionService.setManagerSession = jest.fn().mockResolvedValue(false);
      const req = { params: { id: '2' }, body: { siteId: 3 }, user: { id: 2 } };
      const res = { json: jest.fn() };
      const next = jest.fn();

      await controller.setWorkSession(req, res, next);
      expect(next).toHaveBeenCalled();
    });

    test('sets session and updates user when siteId provided', async () => {
      sessionService.setManagerSession = jest.fn().mockResolvedValue(true);
      sessionService.getManagerSession = jest.fn().mockReturnValue(3);
      prisma.user.update = jest.fn().mockResolvedValue({ id: 2, siteLavagePrincipalGerantId: 3 });

      const req = { params: { id: '2' }, body: { siteId: 3 }, user: { id: 2 } };
      const res = { json: jest.fn() };
      const next = jest.fn();

      await controller.setWorkSession(req, res, next);

      expect(sessionService.setManagerSession).toHaveBeenCalledWith(2, 3);
      expect(prisma.user.update).toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
    });

    test('closes session when siteId is null', async () => {
      sessionService.setManagerSession = jest.fn().mockResolvedValue(true);
      sessionService.getManagerSession = jest.fn().mockReturnValue(null);

      const req = { params: { id: '2' }, body: { siteId: null }, user: { id: 2 } };
      const res = { json: jest.fn() };
      const next = jest.fn();

      await controller.setWorkSession(req, res, next);

      expect(sessionService.setManagerSession).toHaveBeenCalledWith(2, null);
      expect(prisma.user.update).not.toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
    });
  });

  describe('getWorkSession', () => {
    test('forbids other manager', async () => {
      const req = { params: { id: '3' }, user: { id: 4 } };
      const res = { json: jest.fn() };
      const next = jest.fn();

      await controller.getWorkSession(req, res, next);
      expect(next).toHaveBeenCalled();
    });

    test('returns session data with site details when active', async () => {
  sessionService.getManagerSession = jest.fn().mockReturnValue(10);
  prisma.sitelavage = prisma.sitelavage || {};
  prisma.sitelavage.findUnique = jest.fn().mockResolvedValue({ id: 10, nom: 'X' });

      const req = { params: { id: '10' }, user: { id: 10 } };
      const res = { json: jest.fn() };
      const next = jest.fn();

      await controller.getWorkSession(req, res, next);

      expect(prisma.sitelavage.findUnique).toHaveBeenCalledWith({ where: { id: 10 }, select: expect.any(Object) });
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true, data: expect.any(Object) }));
    });

    test('returns session data when inactive', async () => {
      sessionService.getManagerSession = jest.fn().mockReturnValue(null);
      const req = { params: { id: '11' }, user: { id: 11 } };
      const res = { json: jest.fn() };
      const next = jest.fn();

      await controller.getWorkSession(req, res, next);

      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true, data: expect.any(Object) }));
    });
  });

  describe('updateActivity', () => {
    test('forbids updating another manager activity', async () => {
      const req = { params: { id: '20' }, user: { id: 21 } };
      const res = { json: jest.fn() };
      const next = jest.fn();

      await controller.updateActivity(req, res, next);
      expect(next).toHaveBeenCalled();
    });

    test('updates activity successfully', async () => {
      sessionService.updateManagerActivity = jest.fn();
      const req = { params: { id: '30' }, user: { id: 30 } };
      const res = { json: jest.fn() };
      const next = jest.fn();

      await controller.updateActivity(req, res, next);
      expect(sessionService.updateManagerActivity).toHaveBeenCalledWith(30);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
    });
  });

  describe('getAllActiveSessions', () => {
    test('returns sessions', async () => {
      sessionService.getAllActiveSessions = jest.fn().mockReturnValue([{ managerId: 1, siteId: 2 }]);
      const req = {};
      const res = { json: jest.fn() };
      const next = jest.fn();

      await controller.getAllActiveSessions(req, res, next);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true, data: expect.any(Array) }));
    });

    test('forwards errors from sessionService to next', async () => {
      sessionService.getAllActiveSessions = jest.fn().mockImplementation(() => { throw new Error('boom'); });
      const req = {};
      const res = { json: jest.fn() };
      const next = jest.fn();

      await controller.getAllActiveSessions(req, res, next);
      expect(next).toHaveBeenCalled();
    });
  });
});
