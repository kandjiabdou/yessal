const { PrismaClient } = require('../../../shared-database/generated/shared');

// Instance Prisma pour la base de données partagée
const prismaShared = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_SHARED_URL
    }
  }
});

module.exports = prismaShared;
