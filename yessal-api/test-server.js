const express = require('express');
const app = express();

console.log('Express initialized');

// Root route
app.get('/', (req, res) => {
  res.json({ message: 'Test server running' });
});

// Start the server
const PORT = process.env.PORT || 5000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Test server is running on port ${PORT}`);
});