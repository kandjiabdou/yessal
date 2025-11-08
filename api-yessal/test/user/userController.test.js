const controller = require('../../src/controllers/userController');
const prisma = require('../../src/utils/prismaClient');

describe('userController', () => {
  beforeEach(() => jest.clearAllMocks());

  describe('reconcileTypeClientForUser', () => {
    test('returns early for invalid input', async () => {
      const out = await controller.reconcileTypeClientForUser(null);
      expect(out).toBeNull();
    });

    test('upgrades user to Premium when current abonnement exists', async () => {
      const now = new Date();
      const curY = now.getFullYear();
      const curM = now.getMonth() + 1;
      const user = { id: 5, typeClient: 'Standard', abonnementsPremium: [{ annee: curY, mois: curM }] };

      prisma.user = prisma.user || {};
      prisma.user.update = jest.fn().mockResolvedValue({});

      const out = await controller.reconcileTypeClientForUser(user);

      expect(prisma.user.update).toHaveBeenCalledWith({ where: { id: Number(user.id) }, data: { typeClient: 'Premium' } });
      expect(out.typeClient).toBe('Premium');
    });

    test('downgrades user to Standard when no current abonnement', async () => {
      const user = { id: 6, typeClient: 'Premium', abonnementsPremium: [] };
      prisma.user = prisma.user || {};
      prisma.user.update = jest.fn().mockResolvedValue({});

      const out = await controller.reconcileTypeClientForUser(user);
      expect(prisma.user.update).toHaveBeenCalledWith({ where: { id: Number(user.id) }, data: { typeClient: 'Standard' } });
      expect(out.typeClient).toBe('Standard');
    });
  });

  describe('getUsers', () => {
    test('returns paginated users and reconciles typeClient', async () => {
      // Prepare a user with future and current abonnements
      const now = new Date();
      const curY = now.getFullYear();
      const curM = now.getMonth() + 1;
      const rawUser = {
        id: 10,
        role: 'CLIENT',
        nom: 'A',
        prenom: 'B',
        email: 'a@b',
        telephone: '700',
        typeClient: 'Standard',
        abonnementsPremium: [{ id: 1, annee: curY, mois: curM, createdBy: { prenom: 'X', nom: 'Y' } }]
      };

      prisma.user.findMany = jest.fn().mockResolvedValue([rawUser]);
      prisma.user.count = jest.fn().mockResolvedValue(1);

      // spy update called via reconcile
      prisma.user.update = jest.fn().mockResolvedValue({});

      const req = { query: {}, user: { role: 'MANAGER' } };
      const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
      const next = jest.fn();

      await controller.getUsers(req, res, next);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalled();
    });

    test('forwards errors to next', async () => {
      prisma.user.findMany = jest.fn().mockRejectedValue(new Error('fail'));
      prisma.user.count = jest.fn().mockResolvedValue(0);
      const req = { query: {}, user: { role: 'MANAGER' } };
      const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
      const next = jest.fn();

      await controller.getUsers(req, res, next);
      expect(next).toHaveBeenCalled();
    });
  });

  describe('getUserById and getCurrentUser', () => {
    test('getUserById returns 404 when not found', async () => {
      prisma.user.findUnique = jest.fn().mockResolvedValue(null);
      const req = { params: { id: '999' }, user: { role: 'MANAGER' } };
      const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
      const next = jest.fn();

      await controller.getUserById(req, res, next);
      expect(res.status).toHaveBeenCalledWith(404);
    });

    test('getUserById returns user and reconciles', async () => {
      const now = new Date();
      const curY = now.getFullYear();
      const curM = now.getMonth() + 1;
      const user = { id: 20, typeClient: 'Standard', abonnementsPremium: [{ annee: curY, mois: curM }], createdAt: new Date() };
      prisma.user.findUnique = jest.fn().mockResolvedValue(user);
      prisma.user.update = jest.fn().mockResolvedValue({});

      const req = { params: { id: '20' }, user: { role: 'MANAGER' } };
      const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
      const next = jest.fn();

      await controller.getUserById(req, res, next);
      expect(res.status).toHaveBeenCalledWith(200);
    });

    test('getCurrentUser returns 404 when not found', async () => {
      prisma.user.findUnique = jest.fn().mockResolvedValue(null);
      const req = { user: { id: 999, role: 'CLIENT' } };
      const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
      const next = jest.fn();

      await controller.getCurrentUser(req, res, next);
      expect(res.status).toHaveBeenCalledWith(404);
    });

    test('getCurrentUser returns user and reconciles', async () => {
      const now = new Date();
      const curY = now.getFullYear();
      const curM = now.getMonth() + 1;
      const user = { id: 30, typeClient: 'Standard', abonnementsPremium: [{ annee: curY, mois: curM }], createdAt: new Date() };
      prisma.user.findUnique = jest.fn().mockResolvedValue(user);
      prisma.user.update = jest.fn().mockResolvedValue({});

      const req = { user: { id: 30, role: 'CLIENT', typeClient: 'Standard' } };
      const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
      const next = jest.fn();

      await controller.getCurrentUser(req, res, next);
      expect(res.status).toHaveBeenCalledWith(200);
    });
  });

  describe('updateUser', () => {
    test('forbids unauthorized update', async () => {
      const req = { params: { id: '100' }, user: { id: 1, role: 'CLIENT' }, body: {} };
      const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
      const next = jest.fn();

      await controller.updateUser(req, res, next);
      expect(res.status).toHaveBeenCalledWith(403);
    });

    test('returns 404 when user missing', async () => {
      prisma.user.findUnique = jest.fn().mockResolvedValue(null);
      const req = { params: { id: '200' }, user: { id: 200, role: 'CLIENT' }, body: {} };
      const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
      const next = jest.fn();

      await controller.updateUser(req, res, next);
      expect(res.status).toHaveBeenCalledWith(404);
    });

    test('updates user when allowed', async () => {
      prisma.user.findUnique = jest.fn().mockResolvedValue({ id: 300 });
      prisma.user.update = jest.fn().mockResolvedValue({ id: 300, nom: 'N' });
      const req = { params: { id: '300' }, user: { id: 300, role: 'CLIENT' }, body: { nom: 'N' } };
      const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
      const next = jest.fn();

      await controller.updateUser(req, res, next);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
    });
  });

  describe('deleteUser', () => {
    test('forbids non-manager deletion', async () => {
      const req = { params: { id: '1' }, user: { id: 1, role: 'CLIENT' } };
      const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
      const next = jest.fn();

      await controller.deleteUser(req, res, next);
      expect(res.status).toHaveBeenCalledWith(403);
    });

    test('returns 404 if user not found', async () => {
      prisma.user.findUnique = jest.fn().mockResolvedValue(null);
      const req = { params: { id: '2' }, user: { id: 10, role: 'MANAGER' } };
      const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
      const next = jest.fn();

      await controller.deleteUser(req, res, next);
      expect(res.status).toHaveBeenCalledWith(404);
    });

    test('deletes user and related records in transaction', async () => {
      const userId = 400;
      prisma.user.findUnique = jest.fn().mockResolvedValue({ id: userId });
      const tx = {
        commande: { findMany: jest.fn().mockResolvedValue([]), deleteMany: jest.fn().mockResolvedValue({}) },
        adresselivraison: { deleteMany: jest.fn().mockResolvedValue({}) },
        commandeoptions: { deleteMany: jest.fn().mockResolvedValue({}) },
        repartitionmachine: { deleteMany: jest.fn().mockResolvedValue({}) },
        historiquestatutcommande: { deleteMany: jest.fn().mockResolvedValue({}) },
        paiement: { deleteMany: jest.fn().mockResolvedValue({}) },
        abonnementpremiummensuel: { deleteMany: jest.fn().mockResolvedValue({}) },
        fidelite: { deleteMany: jest.fn().mockResolvedValue({}) },
        user: { delete: jest.fn().mockResolvedValue({}) }
      };
      prisma.$transaction = jest.fn().mockImplementation(async (fn) => fn(tx));

      const req = { params: { id: String(userId) }, user: { id: 10, role: 'MANAGER' } };
      const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
      const next = jest.fn();

      await controller.deleteUser(req, res, next);
      expect(res.status).toHaveBeenCalledWith(200);
    });
  });

  describe('updateUserGeolocation and guest clients', () => {
    test('updateUserGeolocation updates and returns updated user', async () => {
      prisma.user.update = jest.fn().mockResolvedValue({ id: 55, latitude: 1, longitude: 2, adresseText: 'x', aGeolocalisationEnregistree: true });
      const req = { user: { id: 55 }, body: { latitude: 1, longitude: 2, adresseText: 'x', saveAsDefault: true } };
      const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
      const next = jest.fn();

      await controller.updateUserGeolocation(req, res, next);
      expect(res.status).toHaveBeenCalledWith(200);
    });

    test('getGuestClients returns paginated guest clients', async () => {
      prisma.clientinvite = prisma.clientinvite || {};
      prisma.clientinvite.findMany = jest.fn().mockResolvedValue([{ id: 1, nom: 'G' }]);
      prisma.clientinvite.count = jest.fn().mockResolvedValue(1);

      const req = { query: {}, user: { role: 'MANAGER' } };
      const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
      const next = jest.fn();

      await controller.getGuestClients(req, res, next);
      expect(res.status).toHaveBeenCalledWith(200);
    });
  });

  describe('abonnement premium create/update/delete and adjustments', () => {
    test('createAbonnementPremium returns 404 when user not found', async () => {
      prisma.user.findUnique = jest.fn().mockResolvedValue(null);
      const req = { params: { id: '999' }, body: {}, user: { id: 1 } };
      const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
      const next = jest.fn();

      await controller.createAbonnementPremium(req, res, next);
      expect(res.status).toHaveBeenCalledWith(404);
    });

    test('createAbonnementPremium rejects invalid startMonth', async () => {
      prisma.user.findUnique = jest.fn().mockResolvedValue({ id: 2, estEtudiant: false });
      const req = { params: { id: '2' }, body: { startMonth: 'bad-format' }, user: { id: 1 } };
      const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
      const next = jest.fn();

      await controller.createAbonnementPremium(req, res, next);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    test('createAbonnementPremium rejects past startMonth', async () => {
      prisma.user.findUnique = jest.fn().mockResolvedValue({ id: 2, estEtudiant: false });
      const past = new Date(); past.setMonth(past.getMonth() - 2);
      const bad = `${past.getFullYear()}-${String(past.getMonth()+1).padStart(2,'0')}`;
      const req = { params: { id: '2' }, body: { startMonth: bad }, user: { id: 1 } };
      const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
      const next = jest.fn();

      await controller.createAbonnementPremium(req, res, next);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    test('createAbonnementPremium detects conflicts and returns 409', async () => {
      prisma.user.findUnique = jest.fn().mockResolvedValue({ id: 3, estEtudiant: false });
      prisma.abonnementpremiummensuel = prisma.abonnementpremiummensuel || {};
      prisma.abonnementpremiummensuel.findUnique = jest.fn().mockResolvedValue({ id: 7 });

      const req = { params: { id: '3' }, body: { count: 1 }, user: { id: 1 } };
      const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
      const next = jest.fn();

      await controller.createAbonnementPremium(req, res, next);
      expect(res.status).toHaveBeenCalledWith(409);
    });

    test('createAbonnementPremium success creates subscriptions', async () => {
      prisma.user.findUnique = jest.fn().mockResolvedValue({ id: 4, estEtudiant: true });
      prisma.abonnementpremiummensuel = prisma.abonnementpremiummensuel || {};
      prisma.abonnementpremiummensuel.findUnique = jest.fn().mockResolvedValue(null);
      const created = [];
      prisma.$transaction = jest.fn().mockImplementation(async (fn) => {
        const tx = { abonnementpremiummensuel: { create: jest.fn().mockImplementation(async (opts) => { const rec = { ...opts.data }; created.push(rec); return rec; }) } };
        await fn(tx);
      });

      const req = { params: { id: '4' }, body: { count: 1 }, user: { id: 1 } };
      const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
      const next = jest.fn();

      await controller.createAbonnementPremium(req, res, next);
      expect(res.status).toHaveBeenCalledWith(201);
    });

    test('updateAbonnementPremium returns 404 when missing', async () => {
      prisma.abonnementpremiummensuel = prisma.abonnementpremiummensuel || {};
      prisma.abonnementpremiummensuel.findUnique = jest.fn().mockResolvedValue(null);
      const req = { params: { id: '999' }, body: {} };
      const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
      const next = jest.fn();

      await controller.updateAbonnementPremium(req, res, next);
      expect(res.status).toHaveBeenCalledWith(404);
    });

    test('updateAbonnementPremium updates successfully', async () => {
      prisma.abonnementpremiummensuel = prisma.abonnementpremiummensuel || {};
      prisma.abonnementpremiummensuel.findUnique = jest.fn().mockResolvedValue({ id: 10 });
      prisma.abonnementpremiummensuel.update = jest.fn().mockResolvedValue({ id: 10, limiteKg: 20 });
      const req = { params: { id: '10' }, body: { limiteKg: 20 } };
      const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
      const next = jest.fn();

      await controller.updateAbonnementPremium(req, res, next);
      expect(res.status).toHaveBeenCalledWith(200);
    });

    test('deleteAbonnementPremium returns 404 when missing', async () => {
      prisma.abonnementpremiummensuel = prisma.abonnementpremiummensuel || {};
      prisma.abonnementpremiummensuel.findUnique = jest.fn().mockResolvedValue(null);
      const req = { params: { id: '9999' } };
      const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
      const next = jest.fn();

      await controller.deleteAbonnementPremium(req, res, next);
      expect(res.status).toHaveBeenCalledWith(404);
    });

    test('deleteAbonnementPremium deletes successfully', async () => {
      prisma.abonnementpremiummensuel = prisma.abonnementpremiummensuel || {};
      prisma.abonnementpremiummensuel.findUnique = jest.fn().mockResolvedValue({ id: 11 });
      prisma.abonnementpremiummensuel.delete = jest.fn().mockResolvedValue({});
      const req = { params: { id: '11' } };
      const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
      const next = jest.fn();

      await controller.deleteAbonnementPremium(req, res, next);
      expect(res.status).toHaveBeenCalledWith(200);
    });

    test('adjustPremiumSubscriptionKg returns success when subscription exists', async () => {
      prisma.abonnementpremiummensuel = prisma.abonnementpremiummensuel || {};
      prisma.abonnementpremiummensuel.findUnique = jest.fn().mockResolvedValue({ id: 50, kgUtilises: 5 });
      prisma.abonnementpremiummensuel.update = jest.fn().mockResolvedValue({});

      const out = await controller.adjustPremiumSubscriptionKg(77, 3);
      expect(out.success).toBe(true);
      expect(prisma.abonnementpremiummensuel.update).toHaveBeenCalled();
    });

    test('adjustPremiumSubscriptionKg returns false when no subscription', async () => {
      prisma.abonnementpremiummensuel = prisma.abonnementpremiummensuel || {};
      prisma.abonnementpremiummensuel.findUnique = jest.fn().mockResolvedValue(null);
      const out = await controller.adjustPremiumSubscriptionKg(88, 3);
      expect(out.success).toBe(false);
    });
  });

  describe('additional branches', () => {
    test('reconcileTypeClientForUser swallows prisma.update errors', async () => {
      const now = new Date();
      const curY = now.getFullYear();
      const curM = now.getMonth() + 1;
      const user = { id: 500, typeClient: 'Standard', abonnementsPremium: [{ annee: curY, mois: curM }] };

      prisma.user = prisma.user || {};
      prisma.user.update = jest.fn().mockRejectedValue(new Error('boom'));

      const errSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      const out = await controller.reconcileTypeClientForUser(user);

      // Since update threw, function should catch and return the original user without changing typeClient
      expect(out).toBeDefined();
      expect(out.typeClient).toBe('Standard');
      expect(errSpy).toHaveBeenCalled();
      errSpy.mockRestore();
    });

    test('updateUser allows manager to change typeClient, site and estEtudiant and trims empty strings', async () => {
      prisma.user.findUnique = jest.fn().mockResolvedValue({ id: 600 });
      prisma.user.update = jest.fn().mockResolvedValue({ id: 600, nom: 'M' });

      const req = {
        params: { id: '600' },
        user: { id: 999, role: 'MANAGER' },
        body: { email: '', telephone: '', estEtudiant: true, typeClient: 'Premium', siteLavagePrincipalGerantId: 7 }
      };
      const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
      const next = jest.fn();

      await controller.updateUser(req, res, next);

      expect(prisma.user.update).toHaveBeenCalled();
      const calledData = prisma.user.update.mock.calls[0][0].data;
      expect(calledData.email).toBeNull();
      expect(calledData.telephone).toBeNull();
      expect(calledData.typeClient).toBe('Premium');
      expect(calledData.estEtudiant).toBe(true);
      expect(calledData.siteLavagePrincipalGerantId).toBe(7);
      expect(res.status).toHaveBeenCalledWith(200);
    });

    test('deleteUser deletes related records when user has commands', async () => {
      const userId = 700;
      prisma.user.findUnique = jest.fn().mockResolvedValue({ id: userId });

      const tx = {
        commande: { findMany: jest.fn().mockResolvedValue([{ id: 101 }]), deleteMany: jest.fn().mockResolvedValue({}) },
        adresselivraison: { deleteMany: jest.fn().mockResolvedValue({}) },
        commandeoptions: { deleteMany: jest.fn().mockResolvedValue({}) },
        repartitionmachine: { deleteMany: jest.fn().mockResolvedValue({}) },
        historiquestatutcommande: { deleteMany: jest.fn().mockResolvedValue({}) },
        paiement: { deleteMany: jest.fn().mockResolvedValue({}) },
        abonnementpremiummensuel: { deleteMany: jest.fn().mockResolvedValue({}) },
        fidelite: { deleteMany: jest.fn().mockResolvedValue({}) },
        commande_deleteMany: {},
        user: { delete: jest.fn().mockResolvedValue({}) }
      };

      prisma.$transaction = jest.fn().mockImplementation(async (fn) => fn(tx));

      const req = { params: { id: String(userId) }, user: { id: 10, role: 'MANAGER' } };
      const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
      const next = jest.fn();

      await controller.deleteUser(req, res, next);

      // Ensure command-related deleteMany calls were executed
      expect(tx.adresselivraison.deleteMany).toHaveBeenCalled();
      expect(tx.commandeoptions.deleteMany).toHaveBeenCalled();
      expect(tx.repartitionmachine.deleteMany).toHaveBeenCalled();
      expect(tx.historiquestatutcommande.deleteMany).toHaveBeenCalled();
      expect(tx.paiement.deleteMany).toHaveBeenCalled();
      expect(tx.commande.deleteMany).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(200);
    });

    test('createAbonnementPremium with explicit startMonth and multiple count creates entries', async () => {
      prisma.user.findUnique = jest.fn().mockResolvedValue({ id: 800, estEtudiant: false });
      prisma.abonnementpremiummensuel = prisma.abonnementpremiummensuel || {};
      // always return null for conflicts
      prisma.abonnementpremiummensuel.findUnique = jest.fn().mockResolvedValue(null);

      const created = [];
      prisma.$transaction = jest.fn().mockImplementation(async (fn) => {
        const tx = { abonnementpremiummensuel: { create: jest.fn().mockImplementation(async (opts) => { const rec = { ...opts.data }; created.push(rec); return rec; }) } };
        await fn(tx);
      });

      const now = new Date();
      const future = new Date(now.getFullYear(), now.getMonth() + 1, 1);
      const startMonth = `${future.getFullYear()}-${String(future.getMonth()+1).padStart(2,'0')}`;

      const req = { params: { id: '800' }, body: { startMonth, count: 2 }, user: { id: 1 } };
      const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
      const next = jest.fn();

      await controller.createAbonnementPremium(req, res, next);
      expect(prisma.$transaction).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(201);
    });

    test('adjustPremiumSubscriptionKg returns error object when findUnique throws', async () => {
      prisma.abonnementpremiummensuel = prisma.abonnementpremiummensuel || {};
      prisma.abonnementpremiummensuel.findUnique = jest.fn().mockRejectedValue(new Error('db fail'));

      const out = await controller.adjustPremiumSubscriptionKg(900, 5);
      expect(out.success).toBe(false);
      expect(out.message).toMatch(/Error adjusting Premium subscription/);
    });

    test('testPremiumSubscriptionAdjustment runs and returns underlying result', async () => {
      // Prepare underlying adjust to succeed
      prisma.abonnementpremiummensuel = prisma.abonnementpremiummensuel || {};
      prisma.abonnementpremiummensuel.findUnique = jest.fn().mockResolvedValue({ id: 555, kgUtilises: 1 });
      prisma.abonnementpremiummensuel.update = jest.fn().mockResolvedValue({});

      const out = await controller.testPremiumSubscriptionAdjustment(1000, 1, 4);
      expect(out).toBeDefined();
      // The wrapper returns the same result shape as adjustPremiumSubscriptionKg
      expect(out.success).toBe(true);
    });

    describe('catch blocks and error forwarding', () => {
      test('deleteUser forwards thrown errors to next', async () => {
        prisma.user.findUnique = jest.fn().mockRejectedValue(new Error('boom'));
        const req = { params: { id: '9000' }, user: { id: 10, role: 'MANAGER' } };
        const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
        const next = jest.fn();

        await controller.deleteUser(req, res, next);
        expect(next).toHaveBeenCalled();
      });

      test('updateUserGeolocation forwards thrown errors to next', async () => {
        prisma.user.update = jest.fn().mockRejectedValue(new Error('fail'));
        const req = { user: { id: 123 }, body: { latitude: 1, longitude: 2 } };
        const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
        const next = jest.fn();

        await controller.updateUserGeolocation(req, res, next);
        expect(next).toHaveBeenCalled();
      });

      test('getGuestClients forwards thrown errors to next', async () => {
        prisma.clientinvite = prisma.clientinvite || {};
        prisma.clientinvite.findMany = jest.fn().mockRejectedValue(new Error('err'));
        prisma.clientinvite.count = jest.fn().mockResolvedValue(0);

        const req = { query: {}, user: { role: 'MANAGER' } };
        const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
        const next = jest.fn();

        await controller.getGuestClients(req, res, next);
        expect(next).toHaveBeenCalled();
      });

      test('createAbonnementPremium forwards thrown errors to next', async () => {
        prisma.user.findUnique = jest.fn().mockRejectedValue(new Error('boom'));
        const req = { params: { id: '1' }, body: {}, user: { id: 1 } };
        const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
        const next = jest.fn();

        await controller.createAbonnementPremium(req, res, next);
        expect(next).toHaveBeenCalled();
      });

      test('updateAbonnementPremium forwards thrown errors to next', async () => {
        prisma.abonnementpremiummensuel = prisma.abonnementpremiummensuel || {};
        prisma.abonnementpremiummensuel.findUnique = jest.fn().mockRejectedValue(new Error('boom'));
        const req = { params: { id: '2' }, body: {} };
        const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
        const next = jest.fn();

        await controller.updateAbonnementPremium(req, res, next);
        expect(next).toHaveBeenCalled();
      });

      test('deleteAbonnementPremium forwards thrown errors to next', async () => {
        prisma.abonnementpremiummensuel = prisma.abonnementpremiummensuel || {};
        prisma.abonnementpremiummensuel.findUnique = jest.fn().mockRejectedValue(new Error('boom'));
        const req = { params: { id: '3' } };
        const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
        const next = jest.fn();

        await controller.deleteAbonnementPremium(req, res, next);
        expect(next).toHaveBeenCalled();
      });

      test('testPremiumSubscriptionAdjustment catch block is covered when console.log throws', async () => {
        // force a console.log to throw to hit the catch in the wrapper
        const logSpy = jest.spyOn(console, 'log').mockImplementation(() => { throw new Error('boom'); });
        const out = await controller.testPremiumSubscriptionAdjustment(1, 1, 2);
        expect(out.success).toBe(false);
        logSpy.mockRestore();
      });
    });

    describe('missing branches', () => {
      test('getUsers honors role/search/typeClient/siteLavageId/estEtudiant filters', async () => {
        const now = new Date();
        const curY = now.getFullYear();
        const curM = now.getMonth() + 1;
        const rawUser = {
          id: 1100,
          role: 'CLIENT',
          nom: 'A',
          prenom: 'B',
          email: 'a@b',
          telephone: '700',
          typeClient: 'Premium',
          estEtudiant: true,
          siteLavagePrincipalGerantId: 5,
          abonnementsPremium: [{ id: 1, annee: curY, mois: curM, createdBy: null }]
        };

        prisma.user.findMany = jest.fn().mockResolvedValue([rawUser]);
        prisma.user.count = jest.fn().mockResolvedValue(1);
        prisma.user.update = jest.fn().mockResolvedValue({});

        const req = { query: { role: 'CLIENT', search: 'A', typeClient: 'Premium', siteLavageId: '5', estEtudiant: 'true' }, user: { role: 'MANAGER' } };
        const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
        const next = jest.fn();

        await controller.getUsers(req, res, next);
        expect(res.status).toHaveBeenCalledWith(200);
      });

      test('getUsers honors hasFidelityCredit filter for clients with available credit', async () => {
        const rawUser = {
          id: 1101,
          role: 'CLIENT',
          nom: 'CLIENT',
          prenom: 'Fidele',
          email: 'fidele@test.com',
          telephone: '777123456',
          typeClient: 'Standard',
          estEtudiant: false,
          siteLavagePrincipalGerantId: 1,
          creditFidelite: 500, // Client avec crédit de fidélité disponible
          abonnementsPremium: []
        };

        prisma.user.findMany = jest.fn().mockResolvedValue([rawUser]);
        prisma.user.count = jest.fn().mockResolvedValue(1);
        prisma.user.update = jest.fn().mockResolvedValue({});

        const req = { 
          query: { 
            hasFidelityCredit: 'true' 
          }, 
          user: { role: 'MANAGER' } 
        };
        const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
        const next = jest.fn();

        await controller.getUsers(req, res, next);
        
        expect(prisma.user.findMany).toHaveBeenCalledWith(
          expect.objectContaining({
            where: expect.objectContaining({
              fidelite: { creditDisponible: { gt: 0 } }
            })
          })
        );
        expect(res.status).toHaveBeenCalledWith(200);
      });

      test('getUsers sorts abonnements with past and future entries', async () => {
        const now = new Date();
        const curY = now.getFullYear();
        const curM = now.getMonth() + 1;
        const past = { id: 1, annee: curY, mois: Math.max(1, curM - 2), createdBy: null };
        const future = { id: 2, annee: curY, mois: curM + 2, createdBy: null };
        const rawUser = { id: 1200, abonnementsPremium: [past, future] };

        prisma.user.findMany = jest.fn().mockResolvedValue([rawUser]);
        prisma.user.count = jest.fn().mockResolvedValue(1);
        prisma.user.update = jest.fn().mockResolvedValue({});

        const req = { query: {}, user: { role: 'MANAGER' } };
        const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
        const next = jest.fn();

        await controller.getUsers(req, res, next);
        expect(res.status).toHaveBeenCalledWith(200);
      });

      test('getUserById forwards thrown errors to next', async () => {
        prisma.user.findUnique = jest.fn().mockRejectedValue(new Error('boom'));
        const req = { params: { id: '9999' }, user: { role: 'MANAGER' } };
        const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
        const next = jest.fn();

        await controller.getUserById(req, res, next);
        expect(next).toHaveBeenCalled();
      });

      test('getCurrentUser forwards thrown errors to next', async () => {
        prisma.user.findUnique = jest.fn().mockRejectedValue(new Error('boom'));
        const req = { user: { id: 777, role: 'CLIENT' } };
        const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
        const next = jest.fn();

        await controller.getCurrentUser(req, res, next);
        expect(next).toHaveBeenCalled();
      });

      test('updateUser forwards thrown errors to next when findUnique throws', async () => {
        prisma.user.findUnique = jest.fn().mockRejectedValue(new Error('boom'));
        const req = { params: { id: '5000' }, user: { id: 1, role: 'MANAGER' }, body: {} };
        const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
        const next = jest.fn();

        await controller.updateUser(req, res, next);
        expect(next).toHaveBeenCalled();
      });

      test('getGuestClients honors search filter', async () => {
        prisma.clientinvite = prisma.clientinvite || {};
        prisma.clientinvite.findMany = jest.fn().mockResolvedValue([{ id: 2 }]);
        prisma.clientinvite.count = jest.fn().mockResolvedValue(1);

        const req = { query: { search: 'foo' }, user: { role: 'MANAGER' } };
        const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
        const next = jest.fn();

        await controller.getGuestClients(req, res, next);
        expect(res.status).toHaveBeenCalledWith(200);
      });

      test('testPremiumSubscriptionAdjustment prints failure branch when adjust returns false', async () => {
        prisma.abonnementpremiummensuel = prisma.abonnementpremiummensuel || {};
        prisma.abonnementpremiummensuel.findUnique = jest.fn().mockResolvedValue(null);

        const out = await controller.testPremiumSubscriptionAdjustment(1, 2, 2);
        expect(out.success).toBe(false);
      });
    });
  });
});
