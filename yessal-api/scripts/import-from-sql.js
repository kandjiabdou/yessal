const { exec } = require('child_process');
const path = require('path');
const fs = require('fs');

async function importFromSQL() {
    console.log('🔄 Import des données depuis yessal.sql...');
    
    const sqlFile = path.join(__dirname, 'yessal.sql');
    
    // Vérifier que le fichier existe
    if (!fs.existsSync(sqlFile)) {
        console.error('❌ Fichier yessal.sql non trouvé dans scripts/');
        process.exit(1);
    }
    
    // Commande MySQL pour importer
    const command = `mysql -u root -p yessal < "${sqlFile}"`;
    
    console.log('📝 Commande à exécuter :');
    console.log(command);
    console.log('\n⚠️  Vous devrez saisir le mot de passe MySQL root');
    
    exec(command, (error, stdout, stderr) => {
        if (error) {
            console.error('❌ Erreur lors de l\'import :', error.message);
            return;
        }
        
        if (stderr) {
            console.log('⚠️  Avertissements :', stderr);
        }
        
        console.log('✅ Import terminé avec succès !');
        console.log('📊 Données restaurées depuis yessal.sql');
    });
}

// Exécuter l'import
importFromSQL().catch(console.error); 