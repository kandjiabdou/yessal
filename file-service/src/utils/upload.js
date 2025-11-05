import multer from 'multer';
import path from 'node:path';

/**
 * Configuration de Multer pour l'upload de fichiers
 */

// Types MIME autorisés
const ALLOWED_MIMES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/gif',
  'image/webp',
  'application/pdf'
];

// Extensions autorisées
const ALLOWED_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.pdf'];

/**
 * Filtre pour valider les fichiers uploadés
 */
const fileFilter = (req, file, cb) => {
  const ext = path.extname(file.originalname).toLowerCase();
  
  // Vérifier l'extension
  if (!ALLOWED_EXTENSIONS.includes(ext)) {
    return cb(
      new Error(`Type de fichier non autorisé. Extensions acceptées : ${ALLOWED_EXTENSIONS.join(', ')}`),
      false
    );
  }
  
  // Vérifier le MIME type
  if (!ALLOWED_MIMES.includes(file.mimetype)) {
    return cb(
      new Error(`Type MIME non autorisé. Types acceptés : images (JPEG, PNG, GIF, WebP) et PDF`),
      false
    );
  }
  
  cb(null, true);
};

/**
 * Configuration du stockage temporaire
 */
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/temp/');
  },
  filename: (req, file, cb) => {
    // Nom temporaire unique
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1E9)}`;
    cb(null, `temp-${uniqueSuffix}${path.extname(file.originalname)}`);
  }
});

/**
 * Configuration Multer
 */
const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: Number.parseInt(process.env.MAX_FILE_SIZE || '10485760', 10), // 10MB par défaut par fichier
    files: Number.parseInt(process.env.MAX_FILES || '10', 10) // 10 fichiers max par défaut
  }
});

// Export pour upload simple (1 fichier)
export const uploadSingle = upload.single('file');

// Export pour upload multiple (jusqu'à MAX_FILES fichiers)
export const uploadMultiple = upload.array('files', Number.parseInt(process.env.MAX_FILES || '10', 10));

export default upload;
