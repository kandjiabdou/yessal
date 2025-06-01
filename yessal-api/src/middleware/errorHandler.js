const logger = require('../utils/logger');
const { Prisma } = require('@prisma/client');

/**
 * Handle Prisma specific errors
 */
const handlePrismaError = (err, res) => {
  switch (err.code) {
    case 'P2002': // Unique constraint violation
      return res.status(409).json({
        success: false,
        message: 'A record with this data already exists',
        fields: err.meta?.target
      });
      
    case 'P2014': // Violation of a required relation
      return res.status(400).json({
        success: false,
        message: 'Invalid relation',
        details: err.meta
      });
      
    case 'P2003': // Foreign key constraint failed
      return res.status(400).json({
        success: false,
        message: 'Related record not found',
        field: err.meta?.field_name
      });
      
    case 'P2025': // Record not found
      return res.status(404).json({
        success: false,
        message: 'Record not found',
        details: err.meta?.cause
      });
      
    default:
      return res.status(500).json({
        success: false,
        message: 'Database error',
        details: process.env.NODE_ENV === 'development' ? err.message : undefined
      });
  }
};

/**
 * Global error handler middleware
 */
const errorHandler = (err, req, res, next) => {
  // Log the error
  logger.error('Error:', {
    message: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
    body: req.body,
    params: req.params,
    query: req.query,
    user: req.user ? req.user.id : 'unauthenticated'
  });

  // Handle Prisma errors
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    return handlePrismaError(err, res);
  }
  
  // Handle JWT errors
  if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
    return res.status(401).json({
      success: false,
      message: 'Invalid or expired token, please login again'
    });
  }
  
  // Handle validation errors
  if (err.name === 'ValidationError') {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: err.errors
    });
  }

  // Handle AppError instances
  if (err.isOperational) {
    return res.status(err.statusCode).json({
      success: false,
      message: err.message
    });
  }
  
  // Handle any other errors
  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal Server Error';
  
  res.status(statusCode).json({
    success: false,
    message: statusCode === 500 ? 'Internal Server Error' : message,
    error: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
};

module.exports = {
  errorHandler
};
