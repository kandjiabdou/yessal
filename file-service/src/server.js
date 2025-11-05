import dotenv from 'dotenv';

// IMPORTANT : Charger les variables d'environnement EN PREMIER
dotenv.config();

// Vérifier les variables critiques
if (!process.env.JWT_SECRET) {
  console.error('❌ ERREUR CRITIQUE: JWT_SECRET n\'est pas défini dans le fichier .env');
  console.error('   Créez un fichier .env à la racine avec: JWT_SECRET=votre-secret-ici');
  process.exit(1);
}

// Maintenant on peut importer l'app
import app from './app.js';

const PORT = process.env.PORT || 4600;

// Démarrer le serveur
app.listen(PORT, () => {
  console.log(`
╔════════════════════════════════════════════════════════╗
║                                                        ║
║        📁 YESSAL FILE SERVICE                          ║
║                                                        ║
║  🚀 Serveur démarré sur le port ${PORT}                  ║
║  📂 Stockage: ${process.env.UPLOAD_DIR || 'uploads'}                                   ║
║  🔒 Sécurité: API Key + JWT Tokens                    ║
║                                                        ║
║  Routes disponibles:                                   ║
║  • POST   /api/files/upload                           ║
║  • POST   /api/files/upload-multiple                  ║
║  • GET    /api/files/:fileId                          ║
║  • GET    /api/files/download/:fileId                 ║
║  • DELETE /api/files/:fileId                          ║
║  • GET    /api/files                                  ║
║                                                        ║
╚════════════════════════════════════════════════════════╝
  `);
});
