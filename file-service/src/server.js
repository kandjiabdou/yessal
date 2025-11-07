import dotenv from 'dotenv';

// IMPORTANT : Charger les variables d'environnement EN PREMIER
dotenv.config();

// Maintenant on peut importer l'app
import app from './app.js';

const PORT = process.env.PORT || 4540;

// Démarrer le serveur
app.listen(PORT, () => {
  console.log(`
╔════════════════════════════════════════════════════════╗
║                                                        ║
║        📁 YESSAL FILE SERVICE                          ║
║                                                        ║
║  🚀 Serveur démarré sur le port ${PORT}                  ║
║  📂 Stockage: ${process.env.UPLOAD_DIR || 'uploads'}                                   ║
║  🔒 Sécurité: API Key + UUID aléatoires               ║
║                                                        ║
║  Routes disponibles:                                   ║
║  • POST   /api/files/upload                           ║
║  • POST   /api/files/upload-multiple                  ║
║  • GET    /api/files/list                             ║
║  • GET    /api/files/:fileId                          ║
║  • GET    /api/files/download/:fileId (permanent)     ║
║  • GET    /api/files/view/:fileId (permanent)         ║
║  • DELETE /api/files/:fileId                          ║
║                                                        ║
╚════════════════════════════════════════════════════════╝
  `);
});
