/**
 * Script de migration pour transformer les types de flux financiers
 * emprunt → apport
 * pret → retrait
 * 
 * IMPORTANT: Exécuter ce script APRÈS avoir mis à jour le schema.prisma
 * et AVANT de déployer les nouvelles versions des applications
 */

// Import du client Prisma généré
const { PrismaClient } = require('../../generated/shared');

const prisma = new PrismaClient();

async function migrateFluxTypes() {
  console.log('🚀 Démarrage de la migration des types de flux financiers...\n');

  try {
    // 1. Compter les flux à migrer
    const countEmprunt = await prisma.$queryRaw`
      SELECT COUNT(*) as count FROM FluxFinancier WHERE type = 'emprunt'
    `;
    const countPret = await prisma.$queryRaw`
      SELECT COUNT(*) as count FROM FluxFinancier WHERE type = 'pret'
    `;

    const nbEmprunt = Number(countEmprunt[0].count);
    const nbPret = Number(countPret[0].count);

    console.log(`📊 Statistiques avant migration:`);
    console.log(`   - Flux "emprunt" à migrer vers "apport": ${nbEmprunt}`);
    console.log(`   - Flux "pret" à migrer vers "retrait": ${nbPret}`);
    console.log(`   - Total à migrer: ${nbEmprunt + nbPret}\n`);

    if (nbEmprunt === 0 && nbPret === 0) {
      console.log('✅ Aucun flux à migrer. La base de données est déjà à jour.');
      return;
    }

    // 2. Migrer emprunt → apport
    if (nbEmprunt > 0) {
      console.log(`🔄 Migration de ${nbEmprunt} flux "emprunt" vers "apport"...`);
      const resultEmprunt = await prisma.$executeRaw`
        UPDATE FluxFinancier 
        SET type = 'apport' 
        WHERE type = 'emprunt'
      `;
      console.log(`   ✅ ${resultEmprunt} flux migrés vers "apport"\n`);
    }

    // 3. Migrer pret → retrait
    if (nbPret > 0) {
      console.log(`🔄 Migration de ${nbPret} flux "pret" vers "retrait"...`);
      const resultPret = await prisma.$executeRaw`
        UPDATE FluxFinancier 
        SET type = 'retrait' 
        WHERE type = 'pret'
      `;
      console.log(`   ✅ ${resultPret} flux migrés vers "retrait"\n`);
    }

    // 4. Vérification post-migration
    const countApres = await prisma.$queryRaw`
      SELECT 
        type,
        COUNT(*) as count
      FROM FluxFinancier
      GROUP BY type
    `;

    console.log('📊 Statistiques après migration:');
    countApres.forEach(row => {
      console.log(`   - ${row.type}: ${row.count}`);
    });

    console.log('\n✅ Migration terminée avec succès!');
    console.log('\n⚠️  Prochaines étapes:');
    console.log('   1. Vérifier les données dans Prisma Studio');
    console.log('   2. Mettre à jour le code des applications (remplacer emprunt/pret par apport/retrait)');
    console.log('   3. Déployer les nouvelles versions des applications');

  } catch (error) {
    console.error('❌ Erreur lors de la migration:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Exécution du script
migrateFluxTypes()
  .then(() => {
    console.log('\n✨ Script terminé');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Le script a échoué:', error);
    process.exit(1);
  });
