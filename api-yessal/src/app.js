const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const swaggerJsdoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');
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
const dashboardRoutes = require('./routes/dashboardRoutes');
const fluxFinancierRoutes = require('./routes/fluxFinancierRoute');

const app = express();

// CORS configuration
const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    // Define allowed origins based on environment
    const allowedOrigins =
      process.env.NODE_ENV === "production"
        ? [
            "https://manager.yessal.sn",
            "https://api.yessal.sn",
            "https://admin.yessal.sn",
            "https://dev.manager.yessal.sn",
            "https://dev.api.yessal.sn",
          ]
        : [
            "http://localhost:4510",
            "http://localhost:5555",
            "http://localhost:4520",
            "http://127.0.0.1:4510",
            "http://127.0.0.1:5555",
          ];

    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true, // Allow cookies to be sent
  optionsSuccessStatus: 200, // For legacy browser support
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: [
    'Origin',
    'X-Requested-With',
    'Content-Type',
    'Accept',
    'Authorization',
    'Cache-Control',
    'Pragma'
  ],
  exposedHeaders: ['Content-Length', 'X-Foo', 'X-Bar'],
  maxAge: 86400 // Cache preflight response for 24 hours
};

// Middleware
app.use(cors(corsOptions));
app.use(helmet());
app.use(compression());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

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
        url: 'http://localhost:4520',
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
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/flux-financier', fluxFinancierRoutes);

// Handle 404 - Route not found
app.use((req, res, next) => {
  const error = new Error(`Cannot ${req.method} ${req.path}`);
  error.statusCode = 404;
  next(error);
});

// Error handling middleware
app.use(errorHandler);

module.exports = app; 