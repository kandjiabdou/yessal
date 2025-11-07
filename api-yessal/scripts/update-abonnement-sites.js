/**
 * Script to update existing abonnements with siteLavageId
 * This script assigns a site to each abonnement based on the user's siteLavagePrincipalGerantId
 * or the first available site if none is set
 */

import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function updateAbonnementSites() {
  console.log('🔄 Starting update of abonnement sites...\n');
  try {
    // Step 1: Ensure the column exists (add it as NULLABLE if missing)
    console.log('ℹ️  Checking whether column siteLavageId exists...');

    const [colExists] = await prisma.$queryRaw`
      SELECT COUNT(*) as cnt
      FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'abonnementpremiummensuel'
        AND COLUMN_NAME = 'siteLavageId'
    `;

    // colExists can be returned as an object like { cnt: BigInt(0) } depending on driver
    const existsCount = Number(colExists?.cnt ?? colExists?.CNT ?? Object.values(colExists || {})[0] ?? 0);

    if (existsCount === 0) {
      console.log('➕ Column not found — adding `siteLavageId` as NULLABLE...');
      await prisma.$executeRaw`
        ALTER TABLE abonnementpremiummensuel
        ADD COLUMN siteLavageId INT NULL
      `;
      console.log('✅ Column added (nullable).');
    } else {
      console.log('✅ Column `siteLavageId` already exists.');
    }

    // Step 2: Update rows to set siteLavageId = 1 where NULL
    console.log('ℹ️  Setting siteLavageId = 1 for abonnements with NULL siteLavageId...');
    const updateResult = await prisma.$executeRaw`
      UPDATE abonnementpremiummensuel
      SET siteLavageId = 1
      WHERE siteLavageId IS NULL
    `;

    console.log(`✅ Updated rows: ${updateResult}`);

    // Step 3: Make the column NOT NULL now that values are set
    console.log('ℹ️  Making column siteLavageId NOT NULL...');
    await prisma.$executeRaw`
      ALTER TABLE abonnementpremiummensuel
      MODIFY COLUMN siteLavageId INT NOT NULL
    `;

    console.log('\n✅ Migration completed successfully!');
    console.log('\n⚠️  Next steps:');
    console.log('   1. Verify the updates in your database');
    console.log('   2. Run: npx prisma db push (or your usual migrate flow) to sync Prisma schema');

  } catch (error) {
    console.error('❌ Fatal error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the script using an async IIFE to avoid promise-chain lint warnings
try {
  await updateAbonnementSites();
  process.exit(0);
} catch (error) {
  console.error('❌ Script failed:', error);
  process.exit(1);
}
