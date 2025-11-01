jest.resetModules();

const mockUserFindUnique = jest.fn();
const mockSiteFindUnique = jest.fn();
const mockSiteFindMany = jest.fn();
const mockSiteUpdate = jest.fn();

jest.mock('../../src/utils/prismaClient', () => ({
  user: { findUnique: mockUserFindUnique },
  sitelavage: {
    findUnique: mockSiteFindUnique,
    findMany: mockSiteFindMany,
    update: mockSiteUpdate
  }
}));

describe('SessionService', () => {
  afterEach(() => {
    jest.resetModules();
    mockUserFindUnique.mockReset();
    mockSiteFindUnique.mockReset();
    mockSiteFindMany.mockReset();
    mockSiteUpdate.mockReset();
    jest.clearAllMocks();
  });

  test('setManagerSession returns false when manager not found', async () => {
    mockUserFindUnique.mockResolvedValueOnce(null);
    const sessionService = require('../../src/services/sessionService');

    const res = await sessionService.setManagerSession(1, 2);
    expect(res).toBe(false);
  });

  test('setManagerSession returns false when site not found', async () => {
    mockUserFindUnique.mockResolvedValueOnce({ id: 1 });
    mockSiteFindUnique.mockResolvedValueOnce(null);
    const sessionService = require('../../src/services/sessionService');

    const res = await sessionService.setManagerSession(1, 999);
    expect(res).toBe(false);
  });

  test('setManagerSession sets session and updates site statuses', async () => {
    mockUserFindUnique.mockResolvedValueOnce({ id: 10 });
    mockSiteFindUnique.mockResolvedValueOnce({ id: 20 });
    // findMany returns one site that currently has statutOuverture false
    mockSiteFindMany.mockResolvedValueOnce([{ id: 20, statutOuverture: false }]);
    mockSiteUpdate.mockResolvedValueOnce({ id: 20, statutOuverture: true });

    const sessionService = require('../../src/services/sessionService');

    const ok = await sessionService.setManagerSession(10, 20);
    expect(ok).toBe(true);
    // session should be set
    expect(sessionService.getManagerSession(10)).toBe(20);
    // updateSiteStatuses should have called findMany and update
    expect(mockSiteFindMany).toHaveBeenCalled();
    expect(mockSiteUpdate).toHaveBeenCalledWith({ where: { id: 20 }, data: { statutOuverture: true } });
  });

  test('setManagerSession with null siteId removes session', async () => {
    mockUserFindUnique.mockResolvedValue({ id: 5 });
    const sessionService = require('../../src/services/sessionService');

    // seed an existing session
    sessionService.activeSessions.set(5, 11);
    sessionService.lastActivity.set(5, Date.now());

    const ok = await sessionService.setManagerSession(5, null);
    expect(ok).toBe(true);
    expect(sessionService.getManagerSession(5)).toBeNull();
  });

  test('getActiveManagersOnSite and shouldSiteBeOpen', () => {
    const sessionService = require('../../src/services/sessionService');
    sessionService.activeSessions.set(101, 50);
    sessionService.activeSessions.set(102, 50);
    sessionService.activeSessions.set(103, 51);

    const active = sessionService.getActiveManagersOnSite(50);
    expect(active).toContain(101);
    expect(active).toContain(102);
    expect(sessionService.shouldSiteBeOpen(50)).toBe(true);
    expect(sessionService.shouldSiteBeOpen(999)).toBe(false);
  });

  test('cleanExpiredSessions removes expired entries', () => {
    const sessionService = require('../../src/services/sessionService');
    // set a session and a very old lastActivity
    sessionService.activeSessions.set(201, 60);
    sessionService.lastActivity.set(201, Date.now() - (sessionService.sessionTimeout + 1000));

    sessionService.cleanExpiredSessions();
    expect(sessionService.getManagerSession(201)).toBeNull();
  });

  test('updateManagerActivity refreshes timestamp only when session exists', () => {
    const sessionService = require('../../src/services/sessionService');
    sessionService.activeSessions.set(301, 70);
    const old = Date.now() - 10000;
    sessionService.lastActivity.set(301, old);

    sessionService.updateManagerActivity(301);
    expect(sessionService.lastActivity.get(301)).toBeGreaterThan(old);
  });

  test('getAllActiveSessions returns sessions with details and skips missing ones', async () => {
    mockUserFindUnique.mockImplementation(async (opts) => {
      if (opts.where.id === 401) return { id: 401, nom: 'M', prenom: 'A', email: 'a@example.com' };
      return null;
    });
    mockSiteFindUnique.mockImplementation(async (opts) => {
      if (opts.where.id === 402) return { id: 402, nom: 'Site', adresseText: 'Adr' };
      return null;
    });

    const sessionService = require('../../src/services/sessionService');
  sessionService.activeSessions.set(401, 402);
  sessionService.lastActivity.set(401, Date.now());

    const sessions = await sessionService.getAllActiveSessions();
    expect(Array.isArray(sessions)).toBe(true);
    expect(sessions.length).toBe(1);
    expect(sessions[0].managerId).toBe(401);
    expect(sessions[0].siteId).toBe(402);
    expect(sessions[0].manager).toBeDefined();
    expect(sessions[0].site).toBeDefined();
  });

  test('updateSiteStatuses handles errors gracefully', async () => {
    mockSiteFindMany.mockImplementation(() => { throw new Error('boom'); });
    const sessionService = require('../../src/services/sessionService');
    const spy = jest.spyOn(console, 'error').mockImplementation(() => {});

    await sessionService.updateSiteStatuses();
    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });
});
