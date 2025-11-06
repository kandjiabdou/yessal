import fs from 'node:fs';
import path from 'node:path';
import { v4 as uuidv4 } from 'uuid';
import dotenv from 'dotenv';

// Charger les variables d'environnement dès l'import du module
dotenv.config();

/**
 * Service de stockage de fichiers
 * Gère le stockage local et pourra être étendu au cloud
 */
class StorageService {
  constructor() {
    this.uploadDir = process.env.UPLOAD_DIR || 'uploads';
    this.baseUrl = process.env.BASE_URL || `http://localhost:${process.env.PORT || 4600}`;
    
    this.initStorage();
  }

  /**
   * Initialise le dossier de stockage
   */
  initStorage() {
    if (!fs.existsSync(this.uploadDir)) {
      fs.mkdirSync(this.uploadDir, { recursive: true });
      console.log(`📁 Dossier de stockage créé : ${this.uploadDir}`);
    }
  }

  /**
   * Génère un nom de fichier unique
   * @param {string} originalName - Nom original du fichier
   * @returns {string} Nom unique du fichier
   */
  generateUniqueFilename(originalName) {
    const ext = path.extname(originalName);
    const nameWithoutExt = path.basename(originalName, ext);
    const sanitizedName = nameWithoutExt.replace(/[^a-zA-Z0-9_-]/g, '_');
    const uniqueId = uuidv4();
    const timestamp = Date.now();
    
    return `${sanitizedName}_${timestamp}_${uniqueId}${ext}`;
  }

  /**
   * Sauvegarde un fichier localement
   * @param {Object} file - Fichier uploadé (multer)
   * @param {Object} metadata - Métadonnées du fichier
   * @returns {Promise<Object>} Informations du fichier sauvegardé
   */
  async saveFile(file, metadata = {}) {
    const uniqueFilename = this.generateUniqueFilename(file.originalname);
    const filePath = path.join(this.uploadDir, uniqueFilename);
    
    // Déplacer le fichier temporaire vers le dossier final
    fs.renameSync(file.path, filePath);
    
    const fileInfo = {
      id: uuidv4(),
      filename: uniqueFilename,
      originalName: file.originalname,
      path: filePath,
      mimetype: file.mimetype,
      size: file.size,
      uploadedBy: metadata.uploadedBy || 'unknown',
      uploadedAt: new Date().toISOString(),
      metadata: metadata
    };
    
    // Sauvegarder les métadonnées dans un fichier JSON
    const metadataPath = `${filePath}.meta.json`;
    fs.writeFileSync(metadataPath, JSON.stringify(fileInfo, null, 2));
    
    return fileInfo;
  }

  /**
   * Génère une URL permanente pour accéder à un fichier
   * @param {string} fileId - ID du fichier
   * @returns {string} URL permanente
   */
  generateDownloadUrl(fileId) {
    return `${this.baseUrl}/api/files/download/${fileId}`;
  }

  /**
   * Génère une URL permanente pour afficher/visualiser un fichier
   * @param {string} fileId - ID du fichier
   * @returns {string} URL permanente
   */
  generateViewUrl(fileId) {
    return `${this.baseUrl}/api/files/view/${fileId}`;
  }

  /**
   * Récupère les informations d'un fichier
   * @param {string} fileId - ID du fichier
   * @returns {Object|null} Informations du fichier ou null
   */
  getFileInfo(fileId) {
    const files = this.listFiles();
    const fileInfo = files.find(f => f.id === fileId);
    
    if (!fileInfo) {
      return null;
    }
    
    // Vérifier que le fichier existe toujours
    if (!fs.existsSync(fileInfo.path)) {
      return null;
    }
    
    return fileInfo;
  }

  /**
   * Liste tous les fichiers stockés
   * @returns {Array<Object>} Liste des fichiers
   */
  listFiles() {
    const files = [];
    
    if (!fs.existsSync(this.uploadDir)) {
      return files;
    }
    
    const entries = fs.readdirSync(this.uploadDir);
    
    for (const entry of entries) {
      if (entry.endsWith('.meta.json')) {
        const metadataPath = path.join(this.uploadDir, entry);
        try {
          const fileInfo = JSON.parse(fs.readFileSync(metadataPath, 'utf8'));
          files.push(fileInfo);
        } catch (error) {
          console.error(`❌ Erreur lecture métadonnées ${entry}:`, error.message);
        }
      }
    }
    
    return files;
  }

  /**
   * Supprime un fichier
   * @param {string} fileId - ID du fichier à supprimer
   * @returns {boolean} true si supprimé, false sinon
   */
  deleteFile(fileId) {
    const fileInfo = this.getFileInfo(fileId);
    
    if (!fileInfo) {
      return false;
    }
    
    try {
      // Supprimer le fichier
      if (fs.existsSync(fileInfo.path)) {
        fs.unlinkSync(fileInfo.path);
      }
      
      // Supprimer les métadonnées
      const metadataPath = `${fileInfo.path}.meta.json`;
      if (fs.existsSync(metadataPath)) {
        fs.unlinkSync(metadataPath);
      }
      
      return true;
    } catch (error) {
      console.error(`❌ Erreur suppression fichier ${fileId}:`, error.message);
      return false;
    }
  }

  /**
   * Nettoie les fichiers expirés (pour une future implémentation)
   * @param {number} maxAgeInDays - Age maximum en jours
   */
  cleanupOldFiles(maxAgeInDays = 90) {
    const files = this.listFiles();
    const now = Date.now();
    const maxAge = maxAgeInDays * 24 * 60 * 60 * 1000;
    
    let deletedCount = 0;
    
    for (const file of files) {
      const uploadDate = new Date(file.uploadedAt).getTime();
      const age = now - uploadDate;
      
      if (age > maxAge) {
        if (this.deleteFile(file.id)) {
          deletedCount++;
          console.log(`🗑️  Fichier expiré supprimé: ${file.originalName}`);
        }
      }
    }
    
    return deletedCount;
  }
}

export default new StorageService();
