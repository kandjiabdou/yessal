const { PrismaClient: PrismaShared } = require('../generated/shared');
const { PrismaClient: PrismaLocal } = require('../../api-yessal/node_modules/@prisma/client');

const prismaShared = new PrismaShared();
const prismaLocal = new PrismaLocal();

/**
 * Extraire la ville depuis l'adresse (heuristique simple)
 * @param {string|null} adresse - Adresse complète
 * @returns {string|null} Ville extraite ou null
 */
function extractVilleFromAddress(adresse) {
  if (!adresse) return null;
  
  // Villes communes au Sénégal
  const villes = ['Dakar', 'Thiès', 'Rufisque', 'Mbour', 'Saint-Louis', 'Kaolack', 'Ziguinchor', 'Louga', 'Tambacounda', 'Kolda'];
  
  for (const ville of villes) {
    if (adresse.toLowerCase().includes(ville.toLowerCase())) {
      return ville;
    }
  }
  
  return null;
}

/**
 * Script de migration pour ajouter LaverieReference
 * Migre les données existantes de laverieId/laverieName vers laverieRefId
 */
async function migrateLaverieReferences() {
  console.log('🚀 Début de la migration LaverieReference...\n');

  try {
    // 1. Analyser les flux existants
    console.log('📊 Analyse des flux existants...');
    const allFlux = await prismaShared.fluxFinancier.findMany({
      where: {
        sourceApp: 'manager'
      },
      select: {
        id: true,
        laverieId: true,
        laverieName: true,
        sourceApp: true
      }
    });

    console.log(`   ✓ ${allFlux.length} flux trouvés\n`);

    // 2. Identifier les laveries uniques
    console.log('🔍 Identification des laveries uniques...');
    const uniqueLaveriesMap = new Map();
    
    for (const flux of allFlux) {
      if (flux.laverieId) {
        const key = `${flux.sourceApp}-${flux.laverieId}`;
        if (!uniqueLaveriesMap.has(key)) {
          uniqueLaveriesMap.set(key, {
            sourceApp: flux.sourceApp,
            sourceLaverieId: flux.laverieId,
            nom: flux.laverieName
          });
        }
      }
    }

    console.log(`   ✓ ${uniqueLaveriesMap.size} laveries uniques trouvées\n`);

    // 3. Créer les références de laveries
    console.log('💾 Création des références de laveries...');
    const laverieRefMap = new Map(); // key: "sourceApp-sourceLaverieId" -> laverieRefId

    for (const [key, laverieData] of uniqueLaveriesMap.entries()) {
      try {
        // Récupérer les infos complètes depuis la base locale
        const laverieInfo = await prismaLocal.sitelavage.findUnique({
          where: { id: laverieData.sourceLaverieId },
          select: {
            nom: true,
            adresseText: true,
            telephone: true
          }
        });

        if (!laverieInfo) {
          console.log(`   ⚠️  Laverie ${laverieData.sourceLaverieId} non trouvée dans la base locale`);
          continue;
        }

        // Extraire ville de l'adresse si possible
        const ville = extractVilleFromAddress(laverieInfo.adresseText);

        // Vérifier si la référence existe déjà
        let laverieRef = await prismaShared.laverieReference.findUnique({
          where: {
            sourceApp_sourceLaverieId: {
              sourceApp: laverieData.sourceApp,
              sourceLaverieId: laverieData.sourceLaverieId
            }
          }
        });

        // Créer si elle n'existe pas
        if (!laverieRef) {
          laverieRef = await prismaShared.laverieReference.create({
            data: {
              sourceApp: laverieData.sourceApp,
              sourceLaverieId: laverieData.sourceLaverieId,
              nom: laverieInfo.nom,
              adresse: laverieInfo.adresseText || null,
              telephone: laverieInfo.telephone || null,
              ville: ville
            }
          });
          console.log(`   ✓ Créé: ${laverieInfo.nom} (ID: ${laverieData.sourceLaverieId})`);
        } else {
          console.log(`   ⚪ Existe déjà: ${laverieInfo.nom} (ID: ${laverieData.sourceLaverieId})`);
        }

        laverieRefMap.set(key, laverieRef.id);
      } catch (error) {
        console.error(`   ❌ Erreur pour laverie ${laverieData.sourceLaverieId}:`, error.message);
      }
    }

    console.log(`\n   ✓ ${laverieRefMap.size} références de laveries créées/trouvées\n`);

    // 4. Mettre à jour les flux avec les références
    console.log('🔄 Mise à jour des flux avec les références...');
    let updatedCount = 0;
    let skippedCount = 0;

    for (const flux of allFlux) {
      if (!flux.laverieId) {
        skippedCount++;
        continue;
      }

      const key = `${flux.sourceApp}-${flux.laverieId}`;
      const laverieRefId = laverieRefMap.get(key);

      if (!laverieRefId) {
        console.log(`   ⚠️  Pas de référence pour flux ${flux.id} (laverie ${flux.laverieId})`);
        skippedCount++;
        continue;
      }

      try {
        await prismaShared.fluxFinancier.update({
          where: { id: flux.id },
          data: {
            laverieRefId: laverieRefId
          }
        });
        updatedCount++;

        if (updatedCount % 50 === 0) {
          console.log(`   ⏳ ${updatedCount} flux mis à jour...`);
        }
      } catch (error) {
        console.error(`   ❌ Erreur pour flux ${flux.id}:`, error.message);
      }
    }

    console.log(`\n   ✓ ${updatedCount} flux mis à jour`);
    console.log(`   ⚪ ${skippedCount} flux sans laverie (ignorés)\n`);

    // 5. Vérification finale
    console.log('✅ Vérification finale...');
    const fluxWithoutRef = await prismaShared.fluxFinancier.count({
      where: {
        sourceApp: 'manager',
        laverieId: { not: null },
        laverieRefId: null
      }
    });

    if (fluxWithoutRef > 0) {
      console.log(`   ⚠️  ${fluxWithoutRef} flux avec laverieId mais sans laverieRefId`);
    } else {
      console.log('   ✓ Tous les flux avec laverie ont une référence\n');
    }

    // Statistiques finales
    console.log('📈 STATISTIQUES FINALES:');
    console.log('─'.repeat(50));
    console.log(`   Total flux analysés:          ${allFlux.length}`);
    console.log(`   Laveries uniques:             ${uniqueLaveriesMap.size}`);
    console.log(`   Références créées/trouvées:   ${laverieRefMap.size}`);
    console.log(`   Flux mis à jour:              ${updatedCount}`);
    console.log(`   Flux sans laverie:            ${skippedCount}`);
    console.log(`   Flux restants sans ref:       ${fluxWithoutRef}`);
    console.log('─'.repeat(50));

    console.log('\n✅ Migration LaverieReference terminée avec succès!\n');

    // Instructions post-migration
    console.log('📝 PROCHAINES ÉTAPES:');
    console.log('─'.repeat(50));
    console.log('1. Vérifier que laverieRefId est bien défini pour tous les flux');
    console.log('2. Tester la création de nouveaux flux');
    console.log('3. Tester les statistiques par laverie');
    console.log('4. Une fois validé, vous pouvez supprimer les colonnes:');
    console.log('   - ALTER TABLE FluxFinancier DROP COLUMN laverieId;');
    console.log('   - ALTER TABLE FluxFinancier DROP COLUMN laverieName;');
    console.log('─'.repeat(50));

  } catch (error) {
    console.error('\n❌ Erreur lors de la migration:', error);
    throw error;
  } finally {
    await prismaShared.$disconnect();
    await prismaLocal.$disconnect();
  }
}

// Exécuter la migration
migrateLaverieReferences()
  .catch((error) => {
    console.error('❌ Migration échouée:', error);
    process.exit(1);
  });
