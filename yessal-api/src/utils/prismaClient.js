const { PrismaClient } = require('@prisma/client');
const logger = require('./logger');

// Create a new PrismaClient instance
const prisma = new PrismaClient();

// Log database errors
prisma.$on('error', (e) => {
  logger.error('Prisma Error:', e);
});

// Handle process termination to close the Prisma connection
process.on('SIGINT', async () => {
  await prisma.$disconnect();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  await prisma.$disconnect();
  process.exit(0);
});

module.exports = prisma;
