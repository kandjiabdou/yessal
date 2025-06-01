const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const swaggerJsdoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');
const logger = require('./utils/logger');

// Import routes
const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const machineLavageRoutes = require('./routes/machineLavageRoutes');
const siteLavageRoutes = require('./routes/siteLavageRoutes');
const livreurRoutes = require('./routes/livreurRoutes');
const orderRoutes = require('./routes/orderRoutes');
const fideliteRoutes = require('./routes/fideliteRoutes');

const app = express();

// Middleware
app.use(cors());
app.use(helmet());
app.use(compression());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan('combined', { stream: { write: message => logger.info(message.trim()) } }));

// Swagger configuration
const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'API Yessal',
      version: '1.0.0',
      description: 'API pour le système de gestion de laverie Yessal'
    },
    servers: [
      {
        url: 'http://localhost:4500',
        description: 'Serveur de développement'
      }
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT'
        }
      }
    }
  },
  apis: ['./src/routes/*.js', './src/swagger/components/*.js']
};

const swaggerSpec = swaggerJsdoc(swaggerOptions);
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/machines', machineLavageRoutes);
app.use('/api/sites', siteLavageRoutes);
app.use('/api/livreurs', livreurRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/fidelite', fideliteRoutes);

// Handle 404 - Route not found
app.use((req, res, next) => {
  res.status(404).json({
    success: false,
    message: `Cannot ${req.method} ${req.path}`,
    error: 'Route not found'
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  logger.error('Error:', err);
  
  // Handle specific error types
  if (err.name === 'ValidationError') {
    return res.status(400).json({
      success: false,
      message: 'Validation error',
      errors: err.errors || [{ message: err.message }]
    });
  }
  
  if (err.name === 'UnauthorizedError') {
    return res.status(401).json({
      success: false,
      message: 'Authentication error',
      error: err.message || 'Invalid or missing token'
    });
  }

  if (err.name === 'PrismaClientKnownRequestError') {
    return res.status(400).json({
      success: false,
      message: 'Database error',
      error: err.message
    });
  }

  if (err.name === 'PrismaClientValidationError') {
    return res.status(400).json({
      success: false,
      message: 'Invalid data provided',
      error: err.message
    });
  }

  // Handle CORS errors
  if (err.name === 'TypeError' && err.message.includes('CORS')) {
    return res.status(500).json({
      success: false,
      message: 'CORS error',
      error: 'Cross-Origin Request Blocked'
    });
  }

  // Default error response
  res.status(err.status || 500).json({
    success: false,
    message: 'Internal server error',
    error: process.env.NODE_ENV === 'development' ? err.message : 'An unexpected error occurred'
  });
});

module.exports = app; 