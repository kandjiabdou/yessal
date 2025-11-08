const controller = require('../../src/controllers/livreurController');
const prisma = require('../../src/utils/prismaClient');

describe('livreurController', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Ensure nested prisma namespaces exist to avoid TypeErrors when tests set mocks
    prisma.livreur = prisma.livreur || {};
    prisma.commande = prisma.commande || {};
    prisma.logadminaction = prisma.logadminaction || {};
  });

  describe('getLivreurs', () => {
    test('returns list and meta', async () => {
      prisma.livreur.findMany = jest.fn().mockResolvedValue([{ id: 1, nom: 'A' }]);
      prisma.livreur.count = jest.fn().mockResolvedValue(1);

      const req = { query: { page: 1, limit: 10 } };
      const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
      const next = jest.fn();

      await controller.getLivreurs(req, res, next);

      expect(prisma.livreur.findMany).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true, data: expect.any(Array) }));
    });

    test('accepts search and available filters', async () => {
      prisma.livreur.findMany = jest.fn().mockResolvedValue([]);
      prisma.livreur.count = jest.fn().mockResolvedValue(0);

      const req = { query: { search: 'bob', available: 'true' } };
      const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
      const next = jest.fn();

      await controller.getLivreurs(req, res, next);

      expect(prisma.livreur.findMany).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(200);
    });

    test('numeric search and pagination', async () => {
      prisma.livreur.findMany = jest.fn().mockResolvedValue([]);
      prisma.livreur.count = jest.fn().mockResolvedValue(0);

      const req = { query: { search: '123', available: 'false', page: 2, limit: 5 } };
      const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
      const next = jest.fn();

      await controller.getLivreurs(req, res, next);

      expect(prisma.livreur.findMany).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(200);
    });

    test('combined where + search and date range and estEnLivraison', async () => {
      // Add clientId to where and a numeric search to force AND branch
      prisma.livreur.findMany = jest.fn().mockResolvedValue([]);
      prisma.livreur.count = jest.fn().mockResolvedValue(0);

      const req = { query: { clientId: '10', search: '100', dateFrom: new Date().toISOString(), dateTo: new Date().toISOString(), estEnLivraison: 'true' } };
      const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
      const next = jest.fn();

      await controller.getLivreurs(req, res, next);

      expect(prisma.livreur.findMany).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(200);
    });
  });

  describe('getLivreurById', () => {
    test('404 when not found', async () => {
      prisma.livreur.findUnique = jest.fn().mockResolvedValue(null);
      const req = { params: { id: '5' } };
      const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
      const next = jest.fn();

      await controller.getLivreurById(req, res, next);

      expect(res.status).toHaveBeenCalledWith(404);
    });

    test('200 when found', async () => {
      prisma.livreur.findUnique = jest.fn().mockResolvedValue({ id: 5, nom: 'X' });
      const req = { params: { id: '5' } };
      const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
      const next = jest.fn();

      await controller.getLivreurById(req, res, next);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true, data: { id: 5, nom: 'X' } }));
    });
  });

  describe('createLivreur', () => {
    test('403 for non-manager', async () => {
      const req = { user: { role: 'CLIENT' }, body: {} };
      const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
      const next = jest.fn();

      await controller.createLivreur(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
    });

    test('201 for manager', async () => {
      prisma.livreur.create = jest.fn().mockResolvedValue({ id: 7, nom: 'New' });
      prisma.logadminaction = prisma.logadminaction || {};
      prisma.logadminaction.create = jest.fn().mockResolvedValue({});

      const req = { user: { role: 'MANAGER', id: 2, nom: 'M', prenom: 'G' }, body: { nom: 'New', prenom: 'P' } };
      const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
      const next = jest.fn();

      await controller.createLivreur(req, res, next);

      expect(prisma.livreur.create).toHaveBeenCalled();
      expect(prisma.logadminaction.create).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(201);
    });
  });

  describe('updateLivreur', () => {
    test('403 for non-manager', async () => {
      const req = { params: { id: '1' }, user: { role: 'CLIENT' }, body: {} };
      const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
      const next = jest.fn();

      await controller.updateLivreur(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
    });

    test('404 when not exists', async () => {
      prisma.livreur.findUnique = jest.fn().mockResolvedValue(null);
      const req = { params: { id: '9' }, user: { role: 'MANAGER' }, body: {} };
      const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
      const next = jest.fn();

      await controller.updateLivreur(req, res, next);

      expect(res.status).toHaveBeenCalledWith(404);
    });

    test('200 on success', async () => {
      prisma.livreur.findUnique = jest.fn().mockResolvedValue({ id: 9, nom: 'Old' });
      prisma.livreur.update = jest.fn().mockResolvedValue({ id: 9, nom: 'Updated' });
      prisma.logadminaction = prisma.logadminaction || {};
      prisma.logadminaction.create = jest.fn().mockResolvedValue({});

      const req = { params: { id: '9' }, user: { role: 'MANAGER', id: 2, nom: 'M', prenom: 'G' }, body: { nom: 'Updated' } };
      const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
      const next = jest.fn();

      await controller.updateLivreur(req, res, next);

      expect(prisma.livreur.update).toHaveBeenCalled();
      expect(prisma.logadminaction.create).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(200);
    });
  });

  describe('deleteLivreur', () => {
    test('403 for non-manager', async () => {
      const req = { params: { id: '3' }, user: { role: 'CLIENT' } };
      const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
      const next = jest.fn();

      await controller.deleteLivreur(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
    });

    test('404 when not found', async () => {
      prisma.livreur.findUnique = jest.fn().mockResolvedValue(null);
      const req = { params: { id: '4' }, user: { role: 'MANAGER' } };
      const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
      const next = jest.fn();

      await controller.deleteLivreur(req, res, next);

      expect(res.status).toHaveBeenCalledWith(404);
    });

    test('400 when related orders exist', async () => {
      prisma.livreur.findUnique = jest.fn().mockResolvedValue({ id: 5, nom: 'X' });
      prisma.commande.count = jest.fn().mockResolvedValue(2);
      const req = { params: { id: '5' }, user: { role: 'MANAGER' } };
      const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
      const next = jest.fn();

      await controller.deleteLivreur(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    test('200 when deleted', async () => {
      prisma.livreur.findUnique = jest.fn().mockResolvedValue({ id: 6, nom: 'ToDel', prenom: 'P' });
      prisma.commande.count = jest.fn().mockResolvedValue(0);
      prisma.livreur.delete = jest.fn().mockResolvedValue({});
      prisma.logadminaction = prisma.logadminaction || {};
      prisma.logadminaction.create = jest.fn().mockResolvedValue({});

      const req = { params: { id: '6' }, user: { role: 'MANAGER', id: 2, nom: 'M', prenom: 'G' } };
      const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
      const next = jest.fn();

      await controller.deleteLivreur(req, res, next);

      expect(prisma.livreur.delete).toHaveBeenCalled();
      expect(prisma.logadminaction.create).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(200);
    });
  });

  describe('updateAvailability', () => {
    test('403 for non-manager', async () => {
      // include body to avoid destructuring errors inside controller
      const req = { params: { id: '1' }, user: { role: 'CLIENT' }, body: {} };
      const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
      const next = jest.fn();

      await controller.updateAvailability(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
    });

    test('404 when not found', async () => {
      prisma.livreur.findUnique = jest.fn().mockResolvedValue(null);
      const req = { params: { id: '10' }, user: { role: 'MANAGER' }, body: { statutDisponibilite: true } };
      const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
      const next = jest.fn();

      await controller.updateAvailability(req, res, next);

      expect(res.status).toHaveBeenCalledWith(404);
    });

    test('200 when updated', async () => {
      prisma.livreur.findUnique = jest.fn().mockResolvedValue({ id: 10, nom: 'A' });
      prisma.livreur.update = jest.fn().mockResolvedValue({ id: 10, statutDisponibilite: false });
      prisma.logadminaction = prisma.logadminaction || {};
      prisma.logadminaction.create = jest.fn().mockResolvedValue({});

      const req = { params: { id: '10' }, user: { role: 'MANAGER', id: 2, nom: 'M', prenom: 'G' }, body: { statutDisponibilite: false } };
      const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
      const next = jest.fn();

      await controller.updateAvailability(req, res, next);

      expect(prisma.livreur.update).toHaveBeenCalled();
      expect(prisma.logadminaction.create).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(200);
    });
  });

  describe('getLivreurOrders', () => {
    test('404 if livreur not found', async () => {
      prisma.livreur.findUnique = jest.fn().mockResolvedValue(null);
      const req = { params: { id: '20' }, query: {} };
      const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
      const next = jest.fn();

      await controller.getLivreurOrders(req, res, next);

      expect(res.status).toHaveBeenCalledWith(404);
    });

    test('200 returns orders and meta', async () => {
      prisma.livreur.findUnique = jest.fn().mockResolvedValue({ id: 21 });
      prisma.commande.findMany = jest.fn().mockResolvedValue([{ id: 1 }]);
      prisma.commande.count = jest.fn().mockResolvedValue(1);

      const req = { params: { id: '21' }, query: { page: 1, limit: 10 } };
      const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
      const next = jest.fn();

      await controller.getLivreurOrders(req, res, next);

      expect(prisma.commande.findMany).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(200);
    });

    test('200 with status filter', async () => {
      prisma.livreur.findUnique = jest.fn().mockResolvedValue({ id: 30 });
      prisma.commande.findMany = jest.fn().mockResolvedValue([{ id: 2 }]);
      prisma.commande.count = jest.fn().mockResolvedValue(1);

      const req = { params: { id: '30' }, query: { status: 'Delivered', page: 1, limit: 10 } };
      const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
      const next = jest.fn();

      await controller.getLivreurOrders(req, res, next);

      expect(prisma.commande.findMany).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(200);
    });

    test('calls next on error in getLivreurOrders', async () => {
      prisma.livreur.findUnique = jest.fn().mockResolvedValue({ id: 40 });
      prisma.commande.findMany = jest.fn().mockRejectedValue(new Error('db'));

      const req = { params: { id: '40' }, query: {} };
      const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
      const next = jest.fn();

      await controller.getLivreurOrders(req, res, next);

      expect(next).toHaveBeenCalledWith(expect.any(Error));
    });
  });

  describe('error paths', () => {
    test('getLivreurs next on error', async () => {
      prisma.livreur.findMany = jest.fn().mockRejectedValue(new Error('boom'));
      prisma.livreur.count = jest.fn().mockResolvedValue(0);
      const req = { query: {} };
      const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
      const next = jest.fn();

      await controller.getLivreurs(req, res, next);
      expect(next).toHaveBeenCalledWith(expect.any(Error));
    });

    test('getLivreurById next on error', async () => {
      prisma.livreur.findUnique = jest.fn().mockRejectedValue(new Error('boom'));
      const req = { params: { id: '1' }, user: {} };
      const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
      const next = jest.fn();

      await controller.getLivreurById(req, res, next);
      expect(next).toHaveBeenCalledWith(expect.any(Error));
    });

    test('createLivreur next on error', async () => {
      prisma.livreur.create = jest.fn().mockRejectedValue(new Error('boom'));
      const req = { user: { role: 'MANAGER', id: 1, nom: 'A', prenom: 'B' }, body: {} };
      const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
      const next = jest.fn();

      await controller.createLivreur(req, res, next);
      expect(next).toHaveBeenCalledWith(expect.any(Error));
    });

    test('updateLivreur next on error', async () => {
      prisma.livreur.findUnique = jest.fn().mockResolvedValue({ id: 2 });
      prisma.livreur.update = jest.fn().mockRejectedValue(new Error('boom'));
      const req = { params: { id: '2' }, user: { role: 'MANAGER' }, body: {} };
      const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
      const next = jest.fn();

      await controller.updateLivreur(req, res, next);
      expect(next).toHaveBeenCalledWith(expect.any(Error));
    });

    test('deleteLivreur next on error', async () => {
      prisma.livreur.findUnique = jest.fn().mockResolvedValue({ id: 3 });
      prisma.commande.count = jest.fn().mockResolvedValue(0);
      prisma.livreur.delete = jest.fn().mockRejectedValue(new Error('boom'));
      const req = { params: { id: '3' }, user: { role: 'MANAGER' } };
      const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
      const next = jest.fn();

      await controller.deleteLivreur(req, res, next);
      expect(next).toHaveBeenCalledWith(expect.any(Error));
    });

    test('updateAvailability next on error', async () => {
      prisma.livreur.findUnique = jest.fn().mockResolvedValue({ id: 4 });
      prisma.livreur.update = jest.fn().mockRejectedValue(new Error('boom'));
      const req = { params: { id: '4' }, user: { role: 'MANAGER' }, body: { statutDisponibilite: true } };
      const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
      const next = jest.fn();

      await controller.updateAvailability(req, res, next);
      expect(next).toHaveBeenCalledWith(expect.any(Error));
    });

    test('getLivreurOrders next on error when findUnique fails', async () => {
      prisma.livreur.findUnique = jest.fn().mockRejectedValue(new Error('boom'));
      const req = { params: { id: '50' }, query: {} };
      const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
      const next = jest.fn();

      await controller.getLivreurOrders(req, res, next);
      expect(next).toHaveBeenCalledWith(expect.any(Error));
    });
  });
});
