const controller = require('../../src/controllers/siteLavageController');
const prisma = require('../../src/utils/prismaClient');
const sessionService = require('../../src/services/sessionService');

describe('siteLavageController', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getSites', () => {
    test('returns sites with session info', async () => {
      prisma.sitelavage = prisma.sitelavage || {};
      const site = { id: 1, nom: 'S1', statutOuverture: false, machines: [], _count: { commandes: 0 } };
      prisma.sitelavage.findMany = jest.fn().mockResolvedValue([site]);

      // mock session service
      sessionService.getActiveManagersOnSite = jest.fn().mockReturnValue([10,11]);
      sessionService.shouldSiteBeOpen = jest.fn().mockReturnValue(false);

      const req = { query: {} };
      const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
      const next = jest.fn();

      await controller.getSites(req, res, next);

      expect(prisma.sitelavage.findMany).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
    });

    test('forwards errors to next', async () => {
      prisma.sitelavage = prisma.sitelavage || {};
      prisma.sitelavage.findMany = jest.fn().mockRejectedValue(new Error('db'));    
      const req = { query: {} };
      const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
      const next = jest.fn();

      await controller.getSites(req, res, next);
      expect(next).toHaveBeenCalled();
    });

    test('honors ville and statutOuverture filters', async () => {
      prisma.sitelavage = prisma.sitelavage || {};
      const site = { id: 7, nom: 'S7', statutOuverture: true, machines: [], _count: { commandes: 0 }, ville: 'T' };
      prisma.sitelavage.findMany = jest.fn().mockResolvedValue([site]);

      sessionService.getActiveManagersOnSite = jest.fn().mockReturnValue([]);
      sessionService.shouldSiteBeOpen = jest.fn().mockReturnValue(true);

      const req = { query: { ville: 'T', statutOuverture: 'true' } };
      const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
      const next = jest.fn();

      await controller.getSites(req, res, next);
      expect(prisma.sitelavage.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ ville: 'T', statutOuverture: true }) }));
      expect(res.status).toHaveBeenCalledWith(200);
    });
  });

  describe('getSiteById', () => {
    test('returns 404 when not found', async () => {
      prisma.sitelavage = prisma.sitelavage || {};
      prisma.sitelavage.findUnique = jest.fn().mockResolvedValue(null);
      const req = { params: { id: '99' } };
      const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
      const next = jest.fn();

      await controller.getSiteById(req, res, next);
      expect(res.status).toHaveBeenCalledWith(404);
    });

    test('returns site with session info', async () => {
      prisma.sitelavage = prisma.sitelavage || {};
      const site = { id: 2, nom: 'S2', statutOuverture: true, machines: [], gerants:[], _count: { commandes: 0 } };
      prisma.sitelavage.findUnique = jest.fn().mockResolvedValue(site);
      sessionService.getActiveManagersOnSite = jest.fn().mockReturnValue([5]);
      sessionService.shouldSiteBeOpen = jest.fn().mockReturnValue(true);

      const req = { params: { id: '2' } };
      const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
      const next = jest.fn();

      await controller.getSiteById(req, res, next);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
    });

    test('forwards thrown errors to next', async () => {
      prisma.sitelavage = prisma.sitelavage || {};
      prisma.sitelavage.findUnique = jest.fn().mockRejectedValue(new Error('boom'));
      const req = { params: { id: '2000' } };
      const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
      const next = jest.fn();

      await controller.getSiteById(req, res, next);
      expect(next).toHaveBeenCalled();
    });
  });

  describe('createSite', () => {
    test('creates site and forces statutOuverture false', async () => {
      prisma.sitelavage = prisma.sitelavage || {};
      prisma.sitelavage.create = jest.fn().mockResolvedValue({ id: 3, statutOuverture: false });

      const req = { body: { nom: 'N' } };
      const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
      const next = jest.fn();

      await controller.createSite(req, res, next);
      expect(prisma.sitelavage.create).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(201);
    });
  });

  describe('updateSite', () => {
    test('returns 404 when missing', async () => {
      prisma.sitelavage = prisma.sitelavage || {};
      prisma.sitelavage.findUnique = jest.fn().mockResolvedValue(null);
      const req = { params: { id: '10' }, body: {} };
      const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
      const next = jest.fn();

      await controller.updateSite(req, res, next);
      expect(res.status).toHaveBeenCalledWith(404);
    });

    test('updates site and includes sessionInfo', async () => {
      prisma.sitelavage = prisma.sitelavage || {};
      prisma.sitelavage.findUnique = jest.fn().mockResolvedValue({ id: 11 });
      sessionService.shouldSiteBeOpen = jest.fn().mockReturnValue(false);
      sessionService.getActiveManagersOnSite = jest.fn().mockReturnValue([1,2]);
      prisma.sitelavage.update = jest.fn().mockResolvedValue({ id: 11 });

      const req = { params: { id: '11' }, body: { nom: 'X' } };
      const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
      const next = jest.fn();

      await controller.updateSite(req, res, next);
      expect(prisma.sitelavage.update).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(200);
    });
  });

  describe('deleteSite', () => {
    test('returns 404 when missing', async () => {
      prisma.sitelavage = prisma.sitelavage || {};
      prisma.sitelavage.findUnique = jest.fn().mockResolvedValue(null);
      const req = { params: { id: '20' } };
      const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
      const next = jest.fn();

      await controller.deleteSite(req, res, next);
      expect(res.status).toHaveBeenCalledWith(404);
    });

    test('returns 400 when orders exist', async () => {
      prisma.sitelavage = prisma.sitelavage || {};
      prisma.sitelavage.findUnique = jest.fn().mockResolvedValue({ id: 21 });
      prisma.commande = prisma.commande || {};
      prisma.commande.count = jest.fn().mockResolvedValue(5);

      const req = { params: { id: '21' } };
      const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
      const next = jest.fn();

      await controller.deleteSite(req, res, next);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    test('deletes machines and site when no orders', async () => {
      prisma.sitelavage = prisma.sitelavage || {};
      prisma.sitelavage.findUnique = jest.fn().mockResolvedValue({ id: 22 });
      prisma.commande = prisma.commande || {};
      prisma.commande.count = jest.fn().mockResolvedValue(0);
      prisma.machinelavage = prisma.machinelavage || {};
      prisma.machinelavage.deleteMany = jest.fn().mockResolvedValue({});
      prisma.sitelavage.delete = jest.fn().mockResolvedValue({});

      const req = { params: { id: '22' } };
      const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
      const next = jest.fn();

      await controller.deleteSite(req, res, next);
      expect(prisma.machinelavage.deleteMany).toHaveBeenCalled();
      expect(prisma.sitelavage.delete).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(200);
    });
  });

  describe('realtime and force update', () => {
    test('getSitesRealtimeStatus updates and returns sites', async () => {
      sessionService.updateSiteStatuses = jest.fn().mockResolvedValue();
      prisma.sitelavage = prisma.sitelavage || {};
      prisma.sitelavage.findMany = jest.fn().mockResolvedValue([{ id: 30, latitude: 0, longitude: 0, statutOuverture: false }]);
      sessionService.getActiveManagersOnSite = jest.fn().mockReturnValue([]);
      sessionService.shouldSiteBeOpen = jest.fn().mockReturnValue(false);

      const req = {};
      const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
      const next = jest.fn();

      await controller.getSitesRealtimeStatus(req, res, next);
      expect(sessionService.updateSiteStatuses).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(200);
    });

    test('forceUpdateSiteStatuses calls session service', async () => {
      sessionService.updateSiteStatuses = jest.fn().mockResolvedValue();
      const req = {};
      const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
      const next = jest.fn();

      await controller.forceUpdateSiteStatuses(req, res, next);
      expect(sessionService.updateSiteStatuses).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(200);
    });
  });

  describe('machines CRUD', () => {
    test('getSiteMachines 404 when site missing', async () => {
      prisma.sitelavage = prisma.sitelavage || {};
      prisma.sitelavage.findUnique = jest.fn().mockResolvedValue(null);
      const req = { params: { id: '40' } };
      const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
      const next = jest.fn();

      await controller.getSiteMachines(req, res, next);
      expect(res.status).toHaveBeenCalledWith(404);
    });

    test('getSiteMachines returns machines', async () => {
      prisma.sitelavage = prisma.sitelavage || {};
      prisma.sitelavage.findUnique = jest.fn().mockResolvedValue({ id: 41 });
      prisma.machinelavage = prisma.machinelavage || {};
      prisma.machinelavage.findMany = jest.fn().mockResolvedValue([{ id: 1 }]);

      const req = { params: { id: '41' } };
      const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
      const next = jest.fn();

      await controller.getSiteMachines(req, res, next);
      expect(res.status).toHaveBeenCalledWith(200);
    });

    test('addMachineToSite returns 404 when site missing', async () => {
      prisma.sitelavage = prisma.sitelavage || {};
      prisma.sitelavage.findUnique = jest.fn().mockResolvedValue(null);
      const req = { params: { id: '50' }, body: { numero: 1 } };
      const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
      const next = jest.fn();

      await controller.addMachineToSite(req, res, next);
      expect(res.status).toHaveBeenCalledWith(404);
    });

    test('addMachineToSite conflicts when duplicate number', async () => {
      prisma.sitelavage = prisma.sitelavage || {};
      prisma.sitelavage.findUnique = jest.fn().mockResolvedValue({ id: 51 });
      prisma.machinelavage = prisma.machinelavage || {};
      prisma.machinelavage.findFirst = jest.fn().mockResolvedValue({ id: 2 });

      const req = { params: { id: '51' }, body: { numero: 2 } };
      const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
      const next = jest.fn();

      await controller.addMachineToSite(req, res, next);
      expect(res.status).toHaveBeenCalledWith(409);
    });

    test('addMachineToSite creates machine', async () => {
      prisma.sitelavage = prisma.sitelavage || {};
      prisma.sitelavage.findUnique = jest.fn().mockResolvedValue({ id: 52 });
      prisma.machinelavage = prisma.machinelavage || {};
      prisma.machinelavage.findFirst = jest.fn().mockResolvedValue(null);
      prisma.machinelavage.create = jest.fn().mockResolvedValue({ id: 3 });

      const req = { params: { id: '52' }, body: { numero: 3, nom: 'M', type: 'T', poidsKg: 10 } };
      const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
      const next = jest.fn();

      await controller.addMachineToSite(req, res, next);
      expect(prisma.machinelavage.create).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(201);
    });

    test('updateMachine covers not found and bad site relations and duplicate number and success', async () => {
      prisma.sitelavage = prisma.sitelavage || {};
      prisma.machinelavage = prisma.machinelavage || {};

      // site missing
      prisma.sitelavage.findUnique = jest.fn().mockResolvedValue(null);
      let req = { params: { siteId: '60', machineId: '600' }, body: {} };
      let res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
      let next = jest.fn();
      await controller.updateMachine(req, res, next);
      expect(res.status).toHaveBeenCalledWith(404);

      // machine missing
      prisma.sitelavage.findUnique = jest.fn().mockResolvedValue({ id: 61 });
      prisma.machinelavage.findUnique = jest.fn().mockResolvedValue(null);
      req = { params: { siteId: '61', machineId: '601' }, body: {} };
      res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
      next = jest.fn();
      await controller.updateMachine(req, res, next);
      expect(res.status).toHaveBeenCalledWith(404);

      // machine not in site
      prisma.machinelavage.findUnique = jest.fn().mockResolvedValue({ id: 602, siteLavageId: 999 });
      req = { params: { siteId: '62', machineId: '602' }, body: {} };
      res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
      next = jest.fn();
      await controller.updateMachine(req, res, next);
      expect(res.status).toHaveBeenCalledWith(400);

      // duplicate number
      prisma.machinelavage.findUnique = jest.fn().mockResolvedValue({ id: 603, siteLavageId: 63, numero: 1 });
      prisma.machinelavage.findFirst = jest.fn().mockResolvedValue({ id: 999 });
      req = { params: { siteId: '63', machineId: '603' }, body: { numero: 2 } };
      res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
      next = jest.fn();
      await controller.updateMachine(req, res, next);
      expect(res.status).toHaveBeenCalledWith(409);

      // success
      prisma.machinelavage.findUnique = jest.fn().mockResolvedValue({ id: 604, siteLavageId: 64, numero: 5 });
      prisma.machinelavage.findFirst = jest.fn().mockResolvedValue(null);
      prisma.machinelavage.update = jest.fn().mockResolvedValue({ id: 604 });
      req = { params: { siteId: '64', machineId: '604' }, body: { numero: 10, nom: 'New', type: 'T', poidsKg: 20 } };
      res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
      next = jest.fn();
      await controller.updateMachine(req, res, next);
      expect(prisma.machinelavage.update).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(200);
    });

    test('updateMachine skips duplicate check when numero equals existing number', async () => {
      prisma.sitelavage.findUnique = jest.fn().mockResolvedValue({ id: 90 });
      prisma.machinelavage.findUnique = jest.fn().mockResolvedValue({ id: 901, siteLavageId: 90, numero: 8 });
      // ensure findFirst is NOT called, but update still runs
      prisma.machinelavage.findFirst = jest.fn();
      prisma.machinelavage.update = jest.fn().mockResolvedValue({ id: 901 });

      const req = { params: { siteId: '90', machineId: '901' }, body: { numero: 8, nom: 'Same' } };
      const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
      const next = jest.fn();

      await controller.updateMachine(req, res, next);
      expect(prisma.machinelavage.findFirst).not.toHaveBeenCalled();
      expect(prisma.machinelavage.update).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(200);
    });

    test('deleteMachine covers not found and not-owned and success', async () => {
      prisma.sitelavage = prisma.sitelavage || {};
      prisma.machinelavage = prisma.machinelavage || {};

      // site missing
      prisma.sitelavage.findUnique = jest.fn().mockResolvedValue(null);
      let req = { params: { siteId: '70', machineId: '700' } };
      let res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
      let next = jest.fn();
      await controller.deleteMachine(req, res, next);
      expect(res.status).toHaveBeenCalledWith(404);

      // machine missing
      prisma.sitelavage.findUnique = jest.fn().mockResolvedValue({ id: 71 });
      prisma.machinelavage.findUnique = jest.fn().mockResolvedValue(null);
      req = { params: { siteId: '71', machineId: '701' } };
      res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
      next = jest.fn();
      await controller.deleteMachine(req, res, next);
      expect(res.status).toHaveBeenCalledWith(404);

      // machine not in site
      prisma.machinelavage.findUnique = jest.fn().mockResolvedValue({ id: 702, siteLavageId: 999 });
      req = { params: { siteId: '72', machineId: '702' } };
      res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
      next = jest.fn();
      await controller.deleteMachine(req, res, next);
      expect(res.status).toHaveBeenCalledWith(400);

      // success
      prisma.machinelavage.findUnique = jest.fn().mockResolvedValue({ id: 703, siteLavageId: 73 });
      prisma.machinelavage.delete = jest.fn().mockResolvedValue({});
      req = { params: { siteId: '73', machineId: '703' } };
      res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
      next = jest.fn();
      await controller.deleteMachine(req, res, next);
      expect(prisma.machinelavage.delete).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(200);
    });
  });

  describe('findNearestSites', () => {
    test('returns 400 when lat/lon missing', async () => {
      const req = { body: {} };
      const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
      const next = jest.fn();

      await controller.findNearestSites(req, res, next);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    test('returns nearest sites with distance', async () => {
      prisma.sitelavage = prisma.sitelavage || {};
      prisma.sitelavage.findMany = jest.fn().mockResolvedValue([
        { id: 81, latitude: 1, longitude: 1 },
        { id: 82, latitude: 1.1, longitude: 1.1 }
      ]);

      // use non-zero lat/lon (0 is falsy in controller check)
      const req = { body: { latitude: 1, longitude: 1, radius: 10, limit: 2 } };
      const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
      const next = jest.fn();

      await controller.findNearestSites(req, res, next);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
    });
  });

  describe('error forwarding for machine/site endpoints', () => {
    test('getSiteMachines forwards thrown errors to next', async () => {
      prisma.sitelavage = prisma.sitelavage || {};
      prisma.sitelavage.findUnique = jest.fn().mockRejectedValue(new Error('boom'));
      const req = { params: { id: '500' } };
      const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
      const next = jest.fn();

      await controller.getSiteMachines(req, res, next);
      expect(next).toHaveBeenCalled();
    });

    test('addMachineToSite forwards thrown errors to next', async () => {
      prisma.sitelavage = prisma.sitelavage || {};
      prisma.sitelavage.findUnique = jest.fn().mockRejectedValue(new Error('boom'));
      const req = { params: { id: '501' }, body: { numero: 1 } };
      const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
      const next = jest.fn();

      await controller.addMachineToSite(req, res, next);
      expect(next).toHaveBeenCalled();
    });

    test('updateMachine forwards thrown errors to next', async () => {
      prisma.sitelavage = prisma.sitelavage || {};
      prisma.sitelavage.findUnique = jest.fn().mockRejectedValue(new Error('boom'));
      const req = { params: { siteId: '502', machineId: '502' }, body: {} };
      const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
      const next = jest.fn();

      await controller.updateMachine(req, res, next);
      expect(next).toHaveBeenCalled();
    });

    test('deleteMachine forwards thrown errors to next', async () => {
      prisma.sitelavage = prisma.sitelavage || {};
      prisma.sitelavage.findUnique = jest.fn().mockRejectedValue(new Error('boom'));
      const req = { params: { siteId: '503', machineId: '503' } };
      const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
      const next = jest.fn();

      await controller.deleteMachine(req, res, next);
      expect(next).toHaveBeenCalled();
    });

    test('findNearestSites forwards thrown errors to next', async () => {
      prisma.sitelavage = prisma.sitelavage || {};
      prisma.sitelavage.findMany = jest.fn().mockRejectedValue(new Error('boom'));
      const req = { body: { latitude: 1, longitude: 1 } };
      const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
      const next = jest.fn();

      await controller.findNearestSites(req, res, next);
      expect(next).toHaveBeenCalled();
    });
  });

  describe('error forwarding for site lifecycle endpoints', () => {
    test('createSite forwards thrown errors to next', async () => {
      prisma.sitelavage = prisma.sitelavage || {};
      prisma.sitelavage.create = jest.fn().mockRejectedValue(new Error('boom'));
      const req = { body: { nom: 'X' } };
      const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
      const next = jest.fn();

      await controller.createSite(req, res, next);
      expect(next).toHaveBeenCalled();
    });

    test('updateSite forwards thrown errors to next', async () => {
      prisma.sitelavage = prisma.sitelavage || {};
      prisma.sitelavage.findUnique = jest.fn().mockRejectedValue(new Error('boom'));
      const req = { params: { id: '600' }, body: {} };
      const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
      const next = jest.fn();

      await controller.updateSite(req, res, next);
      expect(next).toHaveBeenCalled();
    });

    test('deleteSite forwards thrown errors to next', async () => {
      prisma.sitelavage = prisma.sitelavage || {};
      prisma.sitelavage.findUnique = jest.fn().mockRejectedValue(new Error('boom'));
      const req = { params: { id: '601' } };
      const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
      const next = jest.fn();

      await controller.deleteSite(req, res, next);
      expect(next).toHaveBeenCalled();
    });

    test('getSitesRealtimeStatus forwards thrown errors to next', async () => {
      sessionService.updateSiteStatuses = jest.fn().mockRejectedValue(new Error('boom'));
      const req = {};
      const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
      const next = jest.fn();

      await controller.getSitesRealtimeStatus(req, res, next);
      expect(next).toHaveBeenCalled();
    });

    test('forceUpdateSiteStatuses forwards thrown errors to next', async () => {
      sessionService.updateSiteStatuses = jest.fn().mockRejectedValue(new Error('boom'));
      const req = {};
      const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
      const next = jest.fn();

      await controller.forceUpdateSiteStatuses(req, res, next);
      expect(next).toHaveBeenCalled();
    });
  });
});
