# Intégration du File Service avec l'API Manager

## 🎯 Objectif

Permettre aux managers d'uploader des preuves (PDF, images) lors de la création ou modification d'un flux financier.

## 📋 Configuration

### 1. Ajouter les variables d'environnement dans `.env`

```env
# File Service
FILE_SERVICE_URL=http://localhost:4600
FILE_SERVICE_API_KEY=yessal-manager-2025
```

### 2. Installer axios (si pas déjà installé)

```bash
npm install axios
```

## 📁 Créer le service d'intégration

**`src/services/fileServiceClient.js`**

```javascript
const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');

class FileServiceClient {
  constructor() {
    this.baseUrl = process.env.FILE_SERVICE_URL || 'http://localhost:4600';
    this.apiKey = process.env.FILE_SERVICE_API_KEY;
  }

  /**
   * Upload un fichier vers le file service
   * @param {string} filePath - Chemin du fichier local
   * @param {Object} metadata - Métadonnées
   * @returns {Promise<Object>} Informations du fichier uploadé
   */
  async uploadFile(filePath, metadata = {}) {
    try {
      const form = new FormData();
      form.append('file', fs.createReadStream(filePath));
      form.append('uploadedBy', metadata.uploadedBy || 'unknown');
      form.append('context', metadata.context || 'flux_financier');
      form.append('description', metadata.description || '');

      const response = await axios.post(
        `${this.baseUrl}/api/files/upload`,
        form,
        {
          headers: {
            ...form.getHeaders(),
            'x-api-key': this.apiKey
          }
        }
      );

      return response.data.data;
    } catch (error) {
      console.error('❌ Erreur upload file service:', error.response?.data || error.message);
      throw new Error('Erreur lors de l\'upload du fichier');
    }
  }

  /**
   * Récupère les informations et l'URL de téléchargement d'un fichier
   * @param {string} fileId - ID du fichier
   * @returns {Promise<Object>} Informations du fichier
   */
  async getFileInfo(fileId) {
    try {
      const response = await axios.get(
        `${this.baseUrl}/api/files/${fileId}`,
        {
          headers: {
            'x-api-key': this.apiKey
          }
        }
      );

      return response.data.data;
    } catch (error) {
      console.error('❌ Erreur get file info:', error.response?.data || error.message);
      throw new Error('Erreur lors de la récupération du fichier');
    }
  }

  /**
   * Supprime un fichier
   * @param {string} fileId - ID du fichier
   * @returns {Promise<boolean>} true si supprimé
   */
  async deleteFile(fileId) {
    try {
      await axios.delete(
        `${this.baseUrl}/api/files/${fileId}`,
        {
          headers: {
            'x-api-key': this.apiKey
          }
        }
      );

      return true;
    } catch (error) {
      console.error('❌ Erreur delete file:', error.response?.data || error.message);
      return false;
    }
  }

  /**
   * Extrait l'ID du fichier depuis une URL de téléchargement
   * @param {string} downloadUrl - URL de téléchargement
   * @returns {string|null} ID du fichier
   */
  extractFileIdFromUrl(downloadUrl) {
    try {
      const match = downloadUrl.match(/\/download\/([a-f0-9-]+)/);
      return match ? match[1] : null;
    } catch (error) {
      return null;
    }
  }
}

module.exports = new FileServiceClient();
```

## 🔧 Modifier le contrôleur de flux financier

**`src/controllers/fluxFinancierController.js`**

### Ajouter l'upload de fichier à la création

```javascript
const multer = require('multer');
const path = require('path');
const fileServiceClient = require('../services/fileServiceClient');

// Configuration multer pour upload temporaire
const upload = multer({
  dest: 'temp/',
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp|pdf/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (extname && mimetype) {
      return cb(null, true);
    }
    cb(new Error('Type de fichier non autorisé'));
  }
});

// Middleware pour l'upload
const uploadMiddleware = upload.single('preuve');

// Modifier la méthode createFlux
async createFlux(req, res) {
  try {
    const fluxData = {
      type: req.body.type,
      montant: Number.parseFloat(req.body.montant),
      dateFluxFinancier: req.body.dateFluxFinancier,
      motif: req.body.motif,
      beneficiaire: req.body.beneficiaire,
      sourceFinancement: req.body.sourceFinancement,
      description: req.body.description,
      laverieId: req.body.laverieId ? Number.parseInt(req.body.laverieId, 10) : null,
      createdBy: req.user.id
    };

    // Upload du fichier si présent
    if (req.file) {
      const fileInfo = await fileServiceClient.uploadFile(req.file.path, {
        uploadedBy: req.user.id,
        context: 'flux_financier',
        description: `Preuve ${fluxData.type} - ${fluxData.motif}`
      });

      // Sauvegarder l'URL de téléchargement
      fluxData.preuveUrl = fileInfo.downloadUrl;

      // Nettoyer le fichier temporaire
      fs.unlinkSync(req.file.path);
    }

    const flux = await fluxFinancierService.createFlux(fluxData);

    res.status(201).json({
      success: true,
      message: 'Flux financier créé avec succès',
      data: flux
    });
  } catch (error) {
    // Nettoyer le fichier temporaire en cas d'erreur
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    
    handleFluxError(error, res, 'Erreur lors de la création du flux financier');
  }
}
```

## 🛣️ Mettre à jour les routes

**`src/routes/fluxFinancier.routes.js`**

```javascript
const express = require('express');
const router = express.Router();
const fluxFinancierController = require('../controllers/fluxFinancierController');
const { authMiddleware } = require('../middleware/auth');
const multer = require('multer');
const path = require('path');

// Configuration multer
const upload = multer({
  dest: 'temp/',
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp|pdf/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    if (extname && mimetype) return cb(null, true);
    cb(new Error('Type de fichier non autorisé'));
  }
});

// Routes avec upload optionnel
router.post(
  '/',
  authMiddleware,
  upload.single('preuve'),
  fluxFinancierController.createFlux
);

router.put(
  '/:id',
  authMiddleware,
  upload.single('preuve'),
  fluxFinancierController.updateFlux
);

// Autres routes...
```

## 📝 Exemple d'utilisation côté frontend

### Création d'un flux avec preuve

```javascript
const formData = new FormData();

// Données du flux
formData.append('type', 'depense');
formData.append('montant', '50000');
formData.append('dateFluxFinancier', '2025-11-02');
formData.append('motif', 'Achat équipement');
formData.append('beneficiaire', 'Fournisseur XYZ');
formData.append('sourceFinancement', 'caisse');
formData.append('description', 'Achat de machines à laver');
formData.append('laverieId', '1');

// Fichier preuve (si présent)
if (fileInput.files[0]) {
  formData.append('preuve', fileInput.files[0]);
}

// Envoi
const response = await fetch('http://localhost:4520/api/flux-financier', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`
    // Pas de Content-Type, le navigateur le gère automatiquement pour FormData
  },
  body: formData
});

const result = await response.json();
console.log(result.data.preuveUrl); // URL de téléchargement signée
```

### Affichage de la preuve

```javascript
// Récupérer l'URL de téléchargement
async function getDownloadUrl(preuveUrl) {
  // Si l'URL est expirée (>1h), régénérer
  const fileId = extractFileId(preuveUrl);
  
  const response = await fetch(
    `http://localhost:4520/api/flux-financier/${fluxId}`,
    {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    }
  );
  
  const flux = await response.json();
  return flux.data.preuveUrl; // URL fraîche
}

function extractFileId(downloadUrl) {
  const match = downloadUrl.match(/\/download\/([a-f0-9-]+)/);
  return match ? match[1] : null;
}
```

## 🔄 Gestion de la modification

Lors de la modification d'un flux avec une nouvelle preuve :

```javascript
async updateFlux(req, res) {
  try {
    const { id } = req.params;
    const updateData = { ...req.body };

    // Si un nouveau fichier est uploadé
    if (req.file) {
      // Récupérer l'ancien flux
      const oldFlux = await fluxFinancierService.getFluxById(id);
      
      // Upload du nouveau fichier
      const fileInfo = await fileServiceClient.uploadFile(req.file.path, {
        uploadedBy: req.user.id,
        context: 'flux_financier',
        description: `Preuve modifiée - ${updateData.motif || oldFlux.motif}`
      });

      updateData.preuveUrl = fileInfo.downloadUrl;

      // Supprimer l'ancien fichier si présent
      if (oldFlux.preuveUrl) {
        const oldFileId = fileServiceClient.extractFileIdFromUrl(oldFlux.preuveUrl);
        if (oldFileId) {
          await fileServiceClient.deleteFile(oldFileId);
        }
      }

      // Nettoyer le fichier temporaire
      fs.unlinkSync(req.file.path);
    }

    const flux = await fluxFinancierService.updateFlux(id, req.user.id, updateData);

    res.json({
      success: true,
      message: 'Flux financier mis à jour avec succès',
      data: flux
    });
  } catch (error) {
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    handleFluxError(error, res, 'Erreur lors de la mise à jour du flux financier');
  }
}
```

## ✅ Points de contrôle

1. ✅ Le File Service doit être démarré sur le port 4600
2. ✅ Les variables d'environnement doivent être configurées
3. ✅ Le dossier `temp/` doit exister dans l'API Manager
4. ✅ Les fichiers temporaires sont nettoyés après upload
5. ✅ L'ancien fichier est supprimé lors d'une modification
6. ✅ Les URLs signées expirent après 1h

## 🔒 Sécurité

- ✅ Authentification par API Key
- ✅ Validation des types de fichiers (images + PDF uniquement)
- ✅ Limite de taille (10MB)
- ✅ URLs signées avec expiration
- ✅ Contrôle d'accès : seul le créateur peut modifier/supprimer

## 📞 Endpoints utilisés

- `POST /api/files/upload` - Upload fichier
- `GET /api/files/:fileId` - Récupérer info + nouvelle URL signée
- `DELETE /api/files/:fileId` - Supprimer fichier
- `GET /api/files/download/:fileId?token=xxx` - Téléchargement (URL publique)
