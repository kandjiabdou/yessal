const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

// Fonction utilitaire pour échapper les valeurs SQL
function escapeSQLValue(value) {
  if (value === null || value === undefined) {
    return 'NULL';
  }
  if (typeof value === 'string') {
    return `'${value.replace(/'/g, "''").replace(/\\/g, '\\\\')}'`;
  }
  if (typeof value === 'boolean') {
    return value ? '1' : '0';
  }
  if (value instanceof Date) {
    return `'${value.toISOString().slice(0, 19).replace('T', ' ')}'`;
  }
  return value;
}

// Fonction pour générer les INSERT statements
function generateInsertStatement(tableName, records) {
  if (!records || records.length === 0) {
    return `-- Aucune donnée dans la table ${tableName}\n\n`;
  }

  const columns = Object.keys(records[0]);
  let sql = `-- Données de la table ${tableName}\n`;
  sql += `SET FOREIGN_KEY_CHECKS = 0;\n`;
  sql += `DELETE FROM \`${tableName}\`;\n`;
  
  const values = records.map(record => {
    const valueString = columns.map(col => escapeSQLValue(record[col])).join(', ');
    return `(${valueString})`;
  }).join(',\n  ');
  
  sql += `INSERT INTO \`${tableName}\` (\`${columns.join('`, `')}\`) VALUES\n  ${values};\n`;
  sql += `SET FOREIGN_KEY_CHECKS = 1;\n\n`;
  
  return sql;
}

async function exportDatabase() {
  try {
    console.log('🚀 Début de l\'exportation de la base de données...');
    
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `database-export-${timestamp}.sql`;
    const filepath = path.join(__dirname, '..', 'exports', filename);
    
    // Créer le dossier exports s'il n'existe pas
    const exportDir = path.dirname(filepath);
    if (!fs.existsSync(exportDir)) {
      fs.mkdirSync(exportDir, { recursive: true });
    }
    
    let sqlContent = `-- Export de la base de données Yessal\n`;
    sqlContent += `-- Date: ${new Date().toISOString()}\n`;
    sqlContent += `-- Généré automatiquement par le script d'export\n\n`;
    sqlContent += `SET NAMES utf8mb4;\n`;
    sqlContent += `SET CHARACTER SET utf8mb4;\n\n`;

    console.log('📋 Exportation des utilisateurs...');
    const users = await prisma.user.findMany();
    sqlContent += generateInsertStatement('User', users);

    console.log('🚚 Exportation des livreurs...');
    const livreurs = await prisma.livreur.findMany();
    sqlContent += generateInsertStatement('Livreur', livreurs);

    console.log('🏠 Exportation des sites de lavage...');
    const sitesLavage = await prisma.siteLavage.findMany();
    sqlContent += generateInsertStatement('SiteLavage', sitesLavage);

    console.log('🔧 Exportation des machines...');
    const machines = await prisma.machineLavage.findMany();
    sqlContent += generateInsertStatement('MachineLavage', machines);

    console.log('👤 Exportation des clients invités...');
    const clientsInvites = await prisma.clientInvite.findMany();
    sqlContent += generateInsertStatement('ClientInvite', clientsInvites);

    console.log('📦 Exportation des commandes...');
    const commandes = await prisma.commande.findMany();
    sqlContent += generateInsertStatement('Commande', commandes);

    console.log('⚙️ Exportation des options de commandes...');
    const commandeOptions = await prisma.commandeOptions.findMany();
    sqlContent += generateInsertStatement('CommandeOptions', commandeOptions);

    console.log('🏭 Exportation des répartitions machines...');
    const repartitionMachines = await prisma.repartitionMachine.findMany();
    sqlContent += generateInsertStatement('RepartitionMachine', repartitionMachines);

    console.log('📍 Exportation des adresses de livraison...');
    const adressesLivraison = await prisma.adresseLivraison.findMany();
    sqlContent += generateInsertStatement('AdresseLivraison', adressesLivraison);

    console.log('📈 Exportation de l\'historique des statuts...');
    const historiqueStatuts = await prisma.historiqueStatutCommande.findMany();
    sqlContent += generateInsertStatement('HistoriqueStatutCommande', historiqueStatuts);

    console.log('💳 Exportation des paiements...');
    const paiements = await prisma.paiement.findMany();
    sqlContent += generateInsertStatement('Paiement', paiements);

    console.log('🎯 Exportation des données de fidélité...');
    const fidelites = await prisma.fidelite.findMany();
    sqlContent += generateInsertStatement('Fidelite', fidelites);

    console.log('💎 Exportation des abonnements premium...');
    const abonnements = await prisma.abonnementPremiumMensuel.findMany();
    sqlContent += generateInsertStatement('AbonnementPremiumMensuel', abonnements);

    console.log('📊 Exportation des statistiques journalières...');
    const statsJournalieres = await prisma.statJournalSite.findMany();
    sqlContent += generateInsertStatement('StatJournalSite', statsJournalieres);

    console.log('📝 Exportation des logs admin...');
    const logsAdmin = await prisma.logAdminAction.findMany();
    sqlContent += generateInsertStatement('LogAdminAction', logsAdmin);

    // Écrire le fichier
    fs.writeFileSync(filepath, sqlContent, 'utf8');
    
    console.log(`✅ Export terminé avec succès !`);
    console.log(`📄 Fichier généré: ${filepath}`);
    console.log(`📏 Taille du fichier: ${(fs.statSync(filepath).size / 1024).toFixed(2)} KB`);
    
    // Afficher un résumé
    console.log('\n📊 Résumé de l\'export:');
    console.log(`   Users: ${users.length}`);
    console.log(`   Livreurs: ${livreurs.length}`);
    console.log(`   Sites de lavage: ${sitesLavage.length}`);
    console.log(`   Machines: ${machines.length}`);
    console.log(`   Clients invités: ${clientsInvites.length}`);
    console.log(`   Commandes: ${commandes.length}`);
    console.log(`   Options commandes: ${commandeOptions.length}`);
    console.log(`   Répartitions machines: ${repartitionMachines.length}`);
    console.log(`   Adresses livraison: ${adressesLivraison.length}`);
    console.log(`   Historique statuts: ${historiqueStatuts.length}`);
    console.log(`   Paiements: ${paiements.length}`);
    console.log(`   Fidélités: ${fidelites.length}`);
    console.log(`   Abonnements premium: ${abonnements.length}`);
    console.log(`   Stats journalières: ${statsJournalieres.length}`);
    console.log(`   Logs admin: ${logsAdmin.length}`);

  } catch (error) {
    console.error('❌ Erreur lors de l\'export:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Exécuter le script
if (require.main === module) {
  exportDatabase();
}

module.exports = { exportDatabase }; 