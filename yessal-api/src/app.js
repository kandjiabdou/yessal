const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const swaggerJsdoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');
const logger = require('./utils/logger');
const { errorHandler } = require('./middleware/errorHandler');

// Import routes
const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const machineLavageRoutes = require('./routes/machineLavageRoutes');
const siteLavageRoutes = require('./routes/siteLavageRoutes');
const livreurRoutes = require('./routes/livreurRoutes');
const orderRoutes = require('./routes/orderRoutes');
const fideliteRoutes = require('./routes/fideliteRoutes');
const managerRoutes = require('./routes/managerRoutes');
const clientRoutes = require('./routes/clientRoutes');

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
  apis: ['./src/routes/*.js']
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
app.use('/api/managers', managerRoutes);
app.use('/api/clients', clientRoutes);

// Handle 404 - Route not found
app.use((req, res, next) => {
  const error = new Error(`Cannot ${req.method} ${req.path}`);
  error.statusCode = 404;
  next(error);
});

// Error handling middleware
app.use(errorHandler);

module.exports = app; 