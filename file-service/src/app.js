import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import filesRoutes from './routes/files.routes.js';

// Note: dotenv.config() est appelé dans server.js AVANT d'importer ce fichier

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 4600;

// Créer les dossiers nécessaires
const uploadDir = process.env.UPLOAD_DIR || 'uploads';
const tempDir = path.join(uploadDir, 'temp');

if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}
if (!fs.existsSync(tempDir)) {
  fs.mkdirSync(tempDir, { recursive: true });
}

// Middlewares de sécurité
app.use(helmet());

// Configuration CORS
const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(",") || [
  "http://localhost:4510",
  "http://localhost:4520",
  "http://localhost:4530"
];
app.use(cors({
  origin: (origin, callback) => {
    // Autoriser les requêtes sans origin (comme Postman)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Non autorisé par CORS'));
    }
  },
  credentials: true
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limite de 100 requêtes par IP
  message: 'Trop de requêtes depuis cette IP, veuillez réessayer plus tard'
});

app.use('/api/files/upload', rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20, // 20 uploads max par 15 minutes
  message: 'Trop d\'uploads, veuillez réessayer plus tard'
}));

app.use(limiter);

// Parser JSON
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Route de santé
app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    service: 'Yessal File Service',
    version: '1.0.0',
    timestamp: new Date().toISOString()
  });
});

// Routes de l'API
app.use('/api/files', filesRoutes);

// Route 404
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route non trouvée'
  });
});

// Gestionnaire d'erreurs global
app.use((err, req, res, next) => {
  console.error('❌ Erreur:', err);
  
  // Erreur Multer (upload)
  if (err.name === 'MulterError') {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        message: 'Fichier trop volumineux',
        maxSize: `${process.env.MAX_FILE_SIZE / 1024 / 1024}MB`
      });
    }
    return res.status(400).json({
      success: false,
      message: err.message
    });
  }
  
  // Erreurs de validation de fichier
  if (err.message.includes('Type de fichier') || err.message.includes('Type MIME')) {
    return res.status(400).json({
      success: false,
      message: err.message
    });
  }
  
  // Erreur CORS
  if (err.message === 'Non autorisé par CORS') {
    return res.status(403).json({
      success: false,
      message: 'Origine non autorisée'
    });
  }
  
  // Erreur générique
  res.status(500).json({
    success: false,
    message: 'Erreur interne du serveur',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

export default app;
