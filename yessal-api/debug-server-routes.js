const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const swaggerUi = require('swagger-ui-express');
const swaggerJsdoc = require('swagger-jsdoc');

console.log('Imports successful');

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 5000;

console.log('Express initialized');

// Apply global middlewares
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

console.log('Middleware applied');

// Swagger setup
const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Yessal Laundry API',
      version: '1.0.0',
      description: 'Laundromat Management API',
    },
  },
  apis: ['./src/swagger/components/*.js'], // path to components
};

console.log('Swagger options defined');

const swaggerDocs = swaggerJsdoc(swaggerOptions);
console.log('Swagger docs generated');

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocs));
console.log('Swagger UI setup');

// Try to import auth routes
try {
  console.log('Trying to import auth routes...');
  const authRoutes = require('./src/routes/authRoutes');
  app.use('/api/auth', authRoutes);
  console.log('Auth routes setup successful');
} catch (error) {
  console.error('Error setting up auth routes:', error.message);
}

// Root route
app.get('/', (req, res) => {
  res.json({ message: 'Welcome to Debug Server with Routes' });
});

// Start the server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Debug server with routes is running on port ${PORT}`);
});