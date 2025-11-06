/**
 * Script to update existing abonnements with siteLavageId
 * This script assigns a site to each abonnement based on the user's siteLavagePrincipalGerantId
 * or the first available site if none is set
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function updateAbonnementSites() {
  console.log('🔄 Starting update of abonnement sites...\n');

  try {
    // Get all abonnements without siteLavageId
    const abonnements = await prisma.abonnementpremiummensuel.findMany({
      where: {
        siteLavageId: null
      },
      include: {
        clientUser: {
          select: {
            id: true,
            nom: true,
            prenom: true,
            siteLavagePrincipalGerantId: true
          }
        }
      }
    });

    console.log(`📊 Found ${abonnements.length} abonnements without siteLavageId\n`);

    if (abonnements.length === 0) {
      console.log('✅ All abonnements already have siteLavageId assigned!');
      return;
    }

    // Get first available site as fallback
    const fallbackSite = await prisma.sitelavage.findFirst({
      where: { flag: true },
      orderBy: { id: 'asc' }
    });

    if (!fallbackSite) {
      console.error('❌ No sites found in database. Please create at least one site first.');
      return;
    }

    console.log(`🏢 Fallback site: ${fallbackSite.nom} (ID: ${fallbackSite.id})\n`);

    // Update each abonnement
    let updated = 0;
    let errors = 0;

    for (const abonnement of abonnements) {
      try {
        const siteLavageId = abonnement.clientUser?.siteLavagePrincipalGerantId || fallbackSite.id;
        
        await prisma.abonnementpremiummensuel.update({
          where: { id: abonnement.id },
          data: { siteLavageId }
        });

        const clientName = abonnement.clientUser 
          ? `${abonnement.clientUser.prenom} ${abonnement.clientUser.nom}`
          : 'Unknown';
        
        console.log(`✅ Updated abonnement #${abonnement.id} for ${clientName} - Site ID: ${siteLavageId}`);
        updated++;
      } catch (error) {
        console.error(`❌ Error updating abonnement #${abonnement.id}:`, error.message);
        errors++;
      }
    }

    console.log(`\n📈 Summary:`);
    console.log(`   - Updated: ${updated}`);
    console.log(`   - Errors: ${errors}`);
    console.log(`   - Total: ${abonnements.length}`);

    if (updated > 0) {
      console.log('\n✅ Migration completed successfully!');
      console.log('\n⚠️  Next steps:');
      console.log('   1. Verify the updates in your database');
      console.log('   2. Update schema to make siteLavageId required (NOT NULL)');
      console.log('   3. Run: npx prisma db push');
    }

  } catch (error) {
    console.error('❌ Fatal error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the script
updateAbonnementSites()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('❌ Script failed:', error);
    process.exit(1);
  });
