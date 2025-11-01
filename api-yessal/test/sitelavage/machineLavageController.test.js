const controller = require('../../src/controllers/machineLavageController');
const prisma = require('../../src/utils/prismaClient');

describe('machineLavageController', () => {
  beforeEach(() => jest.clearAllMocks());

  describe('getMachines', () => {
    test('returns machines and respects siteLavageId filter', async () => {
      prisma.machinelavage = prisma.machinelavage || {};
      prisma.machinelavage.findMany = jest.fn().mockResolvedValue([{ id: 1, numero: 5 }]);

      const req = { query: { siteLavageId: '10' } };
      const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
      const next = jest.fn();

      await controller.getMachines(req, res, next);

      expect(prisma.machinelavage.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ siteLavageId: 10 }) }));
      expect(res.status).toHaveBeenCalledWith(200);
    });

    test('forwards errors to next', async () => {
      prisma.machinelavage = prisma.machinelavage || {};
      prisma.machinelavage.findMany = jest.fn().mockRejectedValue(new Error('db fail'));
      const req = { query: {} };
      const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
      const next = jest.fn();

      await controller.getMachines(req, res, next);
      expect(next).toHaveBeenCalled();
    });
  });

  describe('getMachineById', () => {
    test('returns 404 when missing', async () => {
      prisma.machinelavage = prisma.machinelavage || {};
      prisma.machinelavage.findUnique = jest.fn().mockResolvedValue(null);
      const req = { params: { id: '99' } };
      const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
      const next = jest.fn();

      await controller.getMachineById(req, res, next);
      expect(res.status).toHaveBeenCalledWith(404);
    });

    test('returns machine when found', async () => {
      prisma.machinelavage = prisma.machinelavage || {};
      prisma.machinelavage.findUnique = jest.fn().mockResolvedValue({ id: 2, numero: 1 });
      const req = { params: { id: '2' } };
      const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
      const next = jest.fn();

      await controller.getMachineById(req, res, next);
      expect(res.status).toHaveBeenCalledWith(200);
    });
  });

  describe('createMachine', () => {
    test('returns 404 if site not found', async () => {
      prisma.sitelavage = prisma.sitelavage || {};
      prisma.sitelavage.findUnique = jest.fn().mockResolvedValue(null);
      const req = { body: { siteLavageId: 10, numero: 1 } };
      const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
      const next = jest.fn();

      await controller.createMachine(req, res, next);
      expect(res.status).toHaveBeenCalledWith(404);
    });

    test('returns 409 if duplicate numero in site', async () => {
      prisma.sitelavage = prisma.sitelavage || {};
      prisma.sitelavage.findUnique = jest.fn().mockResolvedValue({ id: 11 });
      prisma.machinelavage = prisma.machinelavage || {};
      prisma.machinelavage.findFirst = jest.fn().mockResolvedValue({ id: 5 });

      const req = { body: { siteLavageId: 11, numero: 7 } };
      const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
      const next = jest.fn();

      await controller.createMachine(req, res, next);
      expect(res.status).toHaveBeenCalledWith(409);
    });

    test('creates machine successfully', async () => {
      prisma.sitelavage = prisma.sitelavage || {};
      prisma.sitelavage.findUnique = jest.fn().mockResolvedValue({ id: 12 });
      prisma.machinelavage = prisma.machinelavage || {};
      prisma.machinelavage.findFirst = jest.fn().mockResolvedValue(null);
      prisma.machinelavage.create = jest.fn().mockResolvedValue({ id: 6 });

      const req = { body: { siteLavageId: 12, numero: 2, nom: 'M', type: 'T', poidsKg: 10 } };
      const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
      const next = jest.fn();

      await controller.createMachine(req, res, next);
      expect(prisma.machinelavage.create).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(201);
    });
  });

  describe('updateMachine', () => {
    test('returns 404 when machine missing', async () => {
      prisma.machinelavage = prisma.machinelavage || {};
      prisma.machinelavage.findUnique = jest.fn().mockResolvedValue(null);
      const req = { params: { id: '100' }, body: {} };
      const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
      const next = jest.fn();

      await controller.updateMachine(req, res, next);
      expect(res.status).toHaveBeenCalledWith(404);
    });

    test('returns 409 when duplicate new numero', async () => {
      prisma.machinelavage = prisma.machinelavage || {};
      prisma.machinelavage.findUnique = jest.fn().mockResolvedValue({ id: 200, siteLavageId: 20, numero: 1 });
      prisma.machinelavage.findFirst = jest.fn().mockResolvedValue({ id: 201 });

      const req = { params: { id: '200' }, body: { numero: 2 } };
      const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
      const next = jest.fn();

      await controller.updateMachine(req, res, next);
      expect(res.status).toHaveBeenCalledWith(409);
    });

    test('skips duplicate check when numero same as existing and updates', async () => {
      prisma.machinelavage = prisma.machinelavage || {};
      prisma.machinelavage.findUnique = jest.fn().mockResolvedValue({ id: 300, siteLavageId: 30, numero: 5 });
      prisma.machinelavage.findFirst = jest.fn();
      prisma.machinelavage.update = jest.fn().mockResolvedValue({ id: 300 });

      const req = { params: { id: '300' }, body: { numero: 5, nom: 'Same' } };
      const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
      const next = jest.fn();

      await controller.updateMachine(req, res, next);
      expect(prisma.machinelavage.findFirst).not.toHaveBeenCalled();
      expect(prisma.machinelavage.update).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(200);
    });

    test('updates successfully when no duplicate', async () => {
      prisma.machinelavage = prisma.machinelavage || {};
      prisma.machinelavage.findUnique = jest.fn().mockResolvedValue({ id: 400, siteLavageId: 40, numero: 1 });
      prisma.machinelavage.findFirst = jest.fn().mockResolvedValue(null);
      prisma.machinelavage.update = jest.fn().mockResolvedValue({ id: 400 });

      const req = { params: { id: '400' }, body: { numero: 2, nom: 'New' } };
      const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
      const next = jest.fn();

      await controller.updateMachine(req, res, next);
      expect(prisma.machinelavage.update).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(200);
    });
  });

  describe('deleteMachine', () => {
    test('returns 404 when machine missing', async () => {
      prisma.machinelavage = prisma.machinelavage || {};
      prisma.machinelavage.findUnique = jest.fn().mockResolvedValue(null);
      const req = { params: { id: '500' } };
      const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
      const next = jest.fn();

      await controller.deleteMachine(req, res, next);
      expect(res.status).toHaveBeenCalledWith(404);
    });

    test('deletes machine successfully', async () => {
      prisma.machinelavage = prisma.machinelavage || {};
      prisma.machinelavage.findUnique = jest.fn().mockResolvedValue({ id: 501 });
      prisma.machinelavage.delete = jest.fn().mockResolvedValue({});

      const req = { params: { id: '501' } };
      const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
      const next = jest.fn();

      await controller.deleteMachine(req, res, next);
      expect(prisma.machinelavage.delete).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(200);
    });

    test('forwards errors to next', async () => {
      prisma.machinelavage = prisma.machinelavage || {};
      prisma.machinelavage.findUnique = jest.fn().mockRejectedValue(new Error('boom'));
      const req = { params: { id: '600' } };
      const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
      const next = jest.fn();

      await controller.deleteMachine(req, res, next);
      expect(next).toHaveBeenCalled();
    });
  });
});
