/**
 * Script pour ajouter les index optimisés pour les statistiques
 * sur les tables commande, user et abonnementpremiummensuel SANS PERDRE DE DONNÉES
 * 
 * Ce script ajoute plusieurs index pour optimiser les requêtes du dashboard :
 * 
 * TABLE COMMANDE (4 index) :
 * 1. Index sur dateHeureCommande (pour filtres par période)
 * 2. Index composite sur dateHeureCommande + flag (pour stats avec commandes valides)
 * 3. Index composite sur siteLavageId + dateHeureCommande (pour stats par site)
 * 4. Index sur flag (pour filtrer rapidement les commandes valides)
 * 
 * TABLE USER (3 index) :
 * 5. Index sur createdAt (pour stats nouveaux clients par période)
 * 6. Index composite sur createdAt + flag (pour stats clients valides par période)
 * 7. Index sur flag (pour filtrer rapidement les utilisateurs valides)
 * 
 * TABLE ABONNEMENTPREMIUMMENSUEL (4 index) :
 * 8. Index sur createdAt (pour stats abonnements créés par période)
 * 9. Index composite sur createdAt + flag (pour stats abonnements valides créés)
 * 10. Index composite sur annee + mois + flag (pour abonnements en cours d'un mois)
 * 11. Index sur flag (pour filtrer rapidement les abonnements valides)
 */

const mysql = require('mysql2/promise');
require('dotenv').config();

async function addStatsIndexes() {
  let connection;
  
  try {
    // Connexion à la base de données
    console.log('🔌 Connexion à la base de données...');
    connection = await mysql.createConnection(process.env.DATABASE_URL);
    console.log('✅ Connecté avec succès\n');

    // Liste des index à créer par table
    const indexesByTable = {
      commande: [
        {
          name: 'idx_commande_dateHeureCommande',
          columns: 'dateHeureCommande',
          description: 'Index pour filtrer par période (jour/semaine/mois)'
        },
        {
          name: 'idx_commande_dateHeureCommande_flag',
          columns: 'dateHeureCommande, flag',
          description: 'Index composite pour stats avec commandes valides'
        },
        {
          name: 'idx_commande_siteLavageId_dateHeureCommande',
          columns: 'siteLavageId, dateHeureCommande',
          description: 'Index composite pour stats par site et période'
        },
        {
          name: 'idx_commande_flag',
          columns: 'flag',
          description: 'Index pour filtrer rapidement les commandes valides'
        }
      ],
      user: [
        {
          name: 'idx_user_createdAt',
          columns: 'createdAt',
          description: 'Index pour stats nouveaux clients par période'
        },
        {
          name: 'idx_user_createdAt_flag',
          columns: 'createdAt, flag',
          description: 'Index composite pour stats clients valides par période'
        },
        {
          name: 'idx_user_flag',
          columns: 'flag',
          description: 'Index pour filtrer rapidement les utilisateurs valides'
        }
      ],
      abonnementpremiummensuel: [
        {
          name: 'idx_abonnement_createdAt',
          columns: 'createdAt',
          description: 'Index pour stats abonnements créés par période'
        },
        {
          name: 'idx_abonnement_createdAt_flag',
          columns: 'createdAt, flag',
          description: 'Index composite pour stats abonnements valides créés'
        },
        {
          name: 'idx_abonnement_annee_mois_flag',
          columns: 'annee, mois, flag',
          description: 'Index composite pour abonnements en cours d\'un mois'
        },
        {
          name: 'idx_abonnement_flag',
          columns: 'flag',
          description: 'Index pour filtrer rapidement les abonnements valides'
        }
      ]
    };

    console.log('📊 Vérification et création des index...\n');

    let totalCreated = 0;
    let totalSkipped = 0;

    for (const [tableName, indexes] of Object.entries(indexesByTable)) {
      console.log(`\n🔍 Table: ${tableName}`);
      console.log('─'.repeat(80));

      for (const index of indexes) {
        try {
          // Vérifier si l'index existe déjà
          const [existingIndexes] = await connection.query(
            `SHOW INDEX FROM ${tableName} WHERE Key_name = ?`,
            [index.name]
          );

          if (existingIndexes.length > 0) {
            console.log(`⏭️  Index "${index.name}" existe déjà - Ignoré`);
            totalSkipped++;
            continue;
          }

          // Créer l'index
          console.log(`🔨 Création de l'index "${index.name}"...`);
          console.log(`   Colonnes: ${index.columns}`);
          console.log(`   But: ${index.description}`);
          
          const createIndexSQL = `
            CREATE INDEX ${index.name} 
            ON ${tableName}(${index.columns})
          `;
          
          await connection.query(createIndexSQL);
          console.log(`✅ Index "${index.name}" créé avec succès`);
          totalCreated++;
          
        } catch (error) {
          // Vérifier si l'erreur est due à un index en double (code 1061)
          if (error.errno === 1061) {
            console.log(`⏭️  Index "${index.name}" existe déjà (nom différent) - Ignoré`);
            totalSkipped++;
          } else {
            throw error;
          }
        }
      }
    }

    // Vérification finale : lister tous les index sur chaque table
    console.log('\n\n📋 Vérification finale - Résumé des index créés :');
    console.log('═'.repeat(80));
    console.log(`✅ Index créés : ${totalCreated}`);
    console.log(`⏭️  Index ignorés (déjà existants) : ${totalSkipped}`);
    console.log('═'.repeat(80));

    for (const tableName of Object.keys(indexesByTable)) {
      console.log(`\n📊 Table: ${tableName}`);
      console.log('─'.repeat(80));
      
      const [allIndexes] = await connection.query(`SHOW INDEX FROM ${tableName}`);
      
      // Regrouper par nom d'index
      const indexGroups = {};
      allIndexes.forEach(idx => {
        if (!indexGroups[idx.Key_name]) {
          indexGroups[idx.Key_name] = [];
        }
        indexGroups[idx.Key_name].push(idx.Column_name);
      });

      Object.entries(indexGroups).forEach(([name, columns]) => {
        const columnList = columns.join(', ');
        const isNew = indexesByTable[tableName].some(idx => idx.name === name);
        const marker = isNew ? '🆕' : '  ';
        console.log(`   ${marker} ${name}: (${columnList})`);
      });
    }

    console.log('\n' + '═'.repeat(80));
    console.log('\n✅ Script terminé avec succès !');
    console.log('🚀 Vos requêtes de statistiques seront maintenant beaucoup plus rapides\n');
    console.log('📈 Tables optimisées :');
    console.log('   • commande (stats commandes par site/période)');
    console.log('   • user (stats nouveaux clients)');
    console.log('   • abonnementpremiummensuel (stats abonnements)\n');

  } catch (error) {
    console.error('❌ Erreur lors de l\'exécution du script :', error.message);
    console.error('\nDétails de l\'erreur :', error);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
      console.log('🔌 Connexion fermée');
    }
  }
}

// Exécution du script
console.log('╔════════════════════════════════════════════════════════════════╗');
console.log('║     Script d\'ajout d\'index pour les statistiques              ║');
console.log('║     SANS PERTE DE DONNÉES                                      ║');
console.log('╚════════════════════════════════════════════════════════════════╝\n');

addStatsIndexes();
