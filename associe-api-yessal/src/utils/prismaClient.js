const { PrismaClient } = require('@prisma/client');

// Create a new PrismaClient instance
const prisma = new PrismaClient();

// Log database errors
prisma.$on('error', (e) => {
  console.log('Prisma Error:', e);
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
