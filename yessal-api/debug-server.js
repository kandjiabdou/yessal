const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

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

// Root route
app.get('/', (req, res) => {
  res.json({ message: 'Welcome to Debug Server' });
});

// Start the server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Debug server is running on port ${PORT}`);
});