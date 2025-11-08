const swaggerJsdoc = require('swagger-jsdoc');
const swaggerDefinition = require('./swaggerDefinition');

// Options for the swagger docs
const options = {
  // Import swaggerDefinitions
  swaggerDefinition,
  // Path to the API docs
  apis: [
    './src/routes/*.js',
    './src/swagger/components/*.js'
  ],
};

// Initialize swagger-jsdoc
const specs = swaggerJsdoc(options);

module.exports = {
  specs,
};
