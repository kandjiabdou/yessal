# Modification du File Service pour uploads multiples

## Fichiers à modifier

### 1. src/utils/upload.js

Remplacer le contenu par :

```javascript
import multer from 'multer';
import path from 'path';

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/temp/');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const fileFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png|gif|webp|pdf/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowedTypes.test(file.mimetype);

  if (mimetype && extname) {
    return cb(null, true);
  }
  cb(new Error('Type de fichier non autorisé. Formats acceptés: jpg, png, gif, webp, pdf'));
};

const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB par fichier
    files: 10 // Maximum 10 fichiers
  },
  fileFilter
});

// Export pour single ET multiple
export const uploadSingle = upload.single('file');
export const uploadMultiple = upload.array('files', 10); // Max 10 fichiers

export default upload;
```

### 2. src/controllers/files.controller.js

Ajouter cette méthode à la classe FilesController :

```javascript
/**
 * Upload plusieurs fichiers
 * POST /api/files/upload-multiple
 */
async uploadMultipleFiles(req, res) {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Aucun fichier fourni'
      });
    }
    
    const metadata = {
      uploadedBy: req.body.uploadedBy || 'unknown',
      source: req.source, // manager ou associe
      context: req.body.context || 'general',
      description: req.body.description || ''
    };
    
    const uploadedFiles = [];
    const errors = [];
    
    // Traiter chaque fichier
    for (let i = 0; i < req.files.length; i++) {
      try {
        const file = req.files[i];
        const fileInfo = await storageService.saveFile(file, metadata);
        const downloadUrl = storageService.generateSignedUrl(fileInfo.id);
        
        uploadedFiles.push({
          fileId: fileInfo.id,
          filename: fileInfo.originalName,
          mimetype: fileInfo.mimetype,
          size: fileInfo.size,
          downloadUrl,
          uploadedAt: fileInfo.uploadedAt
        });
      } catch (error) {
        errors.push({
          index: i,
          filename: req.files[i].originalname,
          error: error.message
        });
      }
    }
    
    // Si tous les fichiers ont échoué
    if (uploadedFiles.length === 0) {
      return res.status(500).json({
        success: false,
        message: 'Échec de l\'upload de tous les fichiers',
        errors
      });
    }
    
    // Si certains fichiers ont échoué
    if (errors.length > 0) {
      return res.status(207).json({ // 207 Multi-Status
        success: true,
        message: `${uploadedFiles.length}/${req.files.length} fichier(s) uploadé(s)`,
        data: uploadedFiles,
        errors
      });
    }
    
    // Tous les fichiers uploadés avec succès
    res.status(201).json({
      success: true,
      message: `${uploadedFiles.length} fichier(s) uploadé(s) avec succès`,
      data: uploadedFiles
    });
  } catch (error) {
    console.error('❌ Erreur upload multiple:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de l\'upload des fichiers',
      error: error.message
    });
  }
}
```

### 3. src/routes/files.routes.js

Modifier les imports et ajouter la route :

```javascript
import express from 'express';
import filesController from '../controllers/files.controller.js';
import { uploadSingle, uploadMultiple } from '../utils/upload.js';
import { authenticateApiKey, verifyDownloadToken } from '../middleware/auth.js';

const router = express.Router();

/**
 * @route POST /api/files/upload
 * @desc Upload un nouveau fichier
 * @access Privé (API Key requise)
 */
router.post(
  '/upload',
  authenticateApiKey,
  uploadSingle,
  filesController.uploadFile
);

/**
 * @route POST /api/files/upload-multiple
 * @desc Upload plusieurs fichiers (max 10)
 * @access Privé (API Key requise)
 */
router.post(
  '/upload-multiple',
  authenticateApiKey,
  uploadMultiple,
  filesController.uploadMultipleFiles
);

// ... reste des routes inchangées
```

## Test de la nouvelle fonctionnalité

### Avec curl

```bash
curl -X POST http://localhost:4600/api/files/upload-multiple \
  -H "x-api-key: yessal-manager-2025" \
  -F "files=@facture1.pdf" \
  -F "files=@facture2.pdf" \
  -F "files=@photo.jpg" \
  -F "uploadedBy=1" \
  -F "context=flux_financier" \
  -F "description=Preuves achat équipement"
```

### Avec Postman

1. Method: POST
2. URL: http://localhost:4600/api/files/upload-multiple
3. Headers:
   - x-api-key: yessal-manager-2025
4. Body (form-data):
   - files: [Sélectionner plusieurs fichiers]
   - uploadedBy: 1
   - context: flux_financier
   - description: Test upload multiple

### Avec JavaScript (Frontend)

```javascript
const formData = new FormData();

// Ajouter plusieurs fichiers
for (const file of fileInputElement.files) {
  formData.append('files', file);
}

formData.append('uploadedBy', userId);
formData.append('context', 'flux_financier');
formData.append('description', 'Preuves dépense');

const response = await fetch('http://localhost:4600/api/files/upload-multiple', {
  method: 'POST',
  headers: {
    'x-api-key': 'yessal-manager-2025'
  },
  body: formData
});

const result = await response.json();
console.log(result.data); // Array de fichiers uploadés
```

## Réponses possibles

### Succès total (201)
```json
{
  "success": true,
  "message": "3 fichier(s) uploadé(s) avec succès",
  "data": [
    {
      "fileId": "uuid-123",
      "filename": "facture.pdf",
      "mimetype": "application/pdf",
      "size": 245678,
      "downloadUrl": "http://localhost:4600/api/files/download/uuid-123?token=xxx",
      "uploadedAt": "2025-11-02T10:00:00.000Z"
    },
    {
      "fileId": "uuid-456",
      "filename": "photo.jpg",
      "mimetype": "image/jpeg",
      "size": 512000,
      "downloadUrl": "http://localhost:4600/api/files/download/uuid-456?token=yyy",
      "uploadedAt": "2025-11-02T10:00:01.000Z"
    }
  ]
}
```

### Succès partiel (207 Multi-Status)
```json
{
  "success": true,
  "message": "2/3 fichier(s) uploadé(s)",
  "data": [
    {
      "fileId": "uuid-123",
      "filename": "facture.pdf",
      ...
    }
  ],
  "errors": [
    {
      "index": 1,
      "filename": "invalid.exe",
      "error": "Type de fichier non autorisé"
    }
  ]
}
```

### Échec total (500)
```json
{
  "success": false,
  "message": "Échec de l'upload de tous les fichiers",
  "errors": [
    {
      "index": 0,
      "filename": "trop_gros.pdf",
      "error": "File too large"
    }
  ]
}
```

## Migration sans casser l'existant

✅ L'endpoint `/upload` (single) continue de fonctionner  
✅ Nouvelle route `/upload-multiple` pour les besoins multiples  
✅ Compatibilité totale avec le code existant
