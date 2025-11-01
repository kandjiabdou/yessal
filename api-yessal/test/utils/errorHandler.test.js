const { errorHandler } = require('../../src/middleware/errorHandler');
const { Prisma } = require('@prisma/client');

function makeRes() {
  const json = jest.fn();
  const status = jest.fn(() => ({ json }));
  return { status, json };
}

function makeReq() {
  return { path: '/x', method: 'GET', body: { a: 1 }, params: { id: 1 }, query: {}, user: { id: 9 } };
}

describe('errorHandler middleware', () => {
  let consoleSpy;

  beforeEach(() => {
    consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleSpy.mockRestore();
    jest.resetAllMocks();
  });

  test('handles Prisma P2002 unique constraint', () => {
    const err = { code: 'P2002', meta: { target: ['email'] } };
    Object.setPrototypeOf(err, Prisma.PrismaClientKnownRequestError.prototype);

    const res = makeRes();
    errorHandler(err, makeReq(), res, jest.fn());

    expect(res.status).toHaveBeenCalledWith(409);
    expect(res.status().json).toHaveBeenCalledWith(expect.objectContaining({ success: false, message: expect.any(String) }));
  });

  test('handles Prisma P2014 relation error', () => {
    const err = { code: 'P2014', meta: { info: 'bad' } };
    Object.setPrototypeOf(err, Prisma.PrismaClientKnownRequestError.prototype);

    const res = makeRes();
    errorHandler(err, makeReq(), res, jest.fn());

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.status().json).toHaveBeenCalledWith(expect.objectContaining({ message: 'Invalid relation' }));
  });

  test('handles Prisma P2003 foreign key error', () => {
    const err = { code: 'P2003', meta: { field_name: 'siteId' } };
    Object.setPrototypeOf(err, Prisma.PrismaClientKnownRequestError.prototype);

    const res = makeRes();
    errorHandler(err, makeReq(), res, jest.fn());

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.status().json).toHaveBeenCalledWith(expect.objectContaining({ message: 'Related record not found', field: 'siteId' }));
  });

  test('handles Prisma P2025 record not found', () => {
    const err = { code: 'P2025', meta: { cause: 'not found' } };
    Object.setPrototypeOf(err, Prisma.PrismaClientKnownRequestError.prototype);

    const res = makeRes();
    errorHandler(err, makeReq(), res, jest.fn());

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.status().json).toHaveBeenCalledWith(expect.objectContaining({ message: 'Record not found' }));
  });

  test('handles generic Prisma error with Database error', () => {
    const err = { code: 'OTHER', message: 'boom' };
    Object.setPrototypeOf(err, Prisma.PrismaClientKnownRequestError.prototype);

    const res = makeRes();
    errorHandler(err, makeReq(), res, jest.fn());

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.status().json).toHaveBeenCalledWith(expect.objectContaining({ message: 'Database error' }));
  });

  test('includes details when NODE_ENV=development for Prisma and generic errors', () => {
    const old = process.env.NODE_ENV;
    process.env.NODE_ENV = 'development';

    const prismaErr = { code: 'OTHER', message: 'boomdev' };
    Object.setPrototypeOf(prismaErr, Prisma.PrismaClientKnownRequestError.prototype);
    const res1 = makeRes();
    errorHandler(prismaErr, makeReq(), res1, jest.fn());
    expect(res1.status().json).toHaveBeenCalledWith(expect.objectContaining({ details: 'boomdev' }));

    const genericErr = {}; // no message
    const res2 = makeRes();
    errorHandler(genericErr, makeReq(), res2, jest.fn());
    expect(res2.status().json).toHaveBeenCalledWith(expect.objectContaining({ message: 'Internal Server Error', error: undefined }));

    process.env.NODE_ENV = old;
  });

  test('handles JWT errors', () => {
    const jwtErr = { name: 'JsonWebTokenError' };
    const res = makeRes();
    errorHandler(jwtErr, makeReq(), res, jest.fn());
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.status().json).toHaveBeenCalledWith(expect.objectContaining({ message: 'Invalid or expired token, please login again' }));

    const jwtErr2 = { name: 'TokenExpiredError' };
    const res2 = makeRes();
    errorHandler(jwtErr2, makeReq(), res2, jest.fn());
    expect(res2.status).toHaveBeenCalledWith(401);
  });

  test('handles ValidationError', () => {
    const err = { name: 'ValidationError', errors: { field: 'bad' } };
    const res = makeRes();
    errorHandler(err, makeReq(), res, jest.fn());
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.status().json).toHaveBeenCalledWith(expect.objectContaining({ message: 'Validation failed', errors: err.errors }));
  });

  test('handles AppError-like operational errors', () => {
    const err = { isOperational: true, statusCode: 418, message: "I'm a teapot" };
    const res = makeRes();
    errorHandler(err, makeReq(), res, jest.fn());
    expect(res.status).toHaveBeenCalledWith(418);
    expect(res.status().json).toHaveBeenCalledWith(expect.objectContaining({ message: "I'm a teapot" }));
  });

  test('handles generic error as Internal Server Error', () => {
    const err = new Error('oh no');
    const res = makeRes();
    errorHandler(err, makeReq(), res, jest.fn());
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.status().json).toHaveBeenCalledWith(expect.objectContaining({ message: 'Internal Server Error' }));
  });
});
