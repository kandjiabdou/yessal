# Intégration File Service avec Flux Financier (Preuves Multiples)

## 🎯 Architecture actuelle

### Schéma de données
```javascript
FluxFinancier {
  id: 1,
  type: 'depense',
  montant: 50000,
  preuves: [  // Relation 1:N
    {
      id: 1,
      fileId: 'uuid-123',
      filename: 'facture.pdf',
      downloadUrl: 'http://localhost:4600/api/files/download/uuid-123?token=xxx',
      mimetype: 'application/pdf',
      size: 245678
    },
    {
      id: 2,
      fileId: 'uuid-456',
      filename: 'photo.jpg',
      downloadUrl: 'http://localhost:4600/api/files/download/uuid-456?token=yyy',
      mimetype: 'image/jpeg',
      size: 512000
    }
  ]
}
```

## 🔄 Workflow complet

### Option 1 : Upload fichier par fichier (RECOMMANDÉ)

**Avantage** : Pas de modification du file-service nécessaire

```javascript
// Frontend - Exemple React
async function createFluxWithProofs(fluxData, files) {
  // 1. Créer le flux (sans preuves)
  const fluxResponse = await fetch('/api/flux-financier', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(fluxData)
  });
  
  const flux = await fluxResponse.json();
  const fluxId = flux.data.id;
  
  // 2. Pour chaque fichier
  for (const file of files) {
    // a) Upload vers file-service
    const formData = new FormData();
    formData.append('file', file);
    formData.append('uploadedBy', userId);
    formData.append('context', 'flux_financier');
    formData.append('description', `Preuve ${flux.data.motif}`);
    
    const uploadResponse = await fetch('http://localhost:4600/api/files/upload', {
      method: 'POST',
      headers: {
        'x-api-key': 'yessal-manager-2025'
      },
      body: formData
    });
    
    const uploadData = await uploadResponse.json();
    
    // b) Ajouter la preuve au flux
    await fetch(`/api/flux-financier/${fluxId}/preuves`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        fileId: uploadData.data.fileId,
        filename: uploadData.data.filename,
        downloadUrl: uploadData.data.downloadUrl,
        mimetype: uploadData.data.mimetype,
        size: uploadData.data.size
      })
    });
  }
  
  return fluxId;
}
```

### Option 2 : Modifier le file-service pour uploads multiples

**Avantage** : Upload plus rapide (batch)  
**Inconvénient** : Nécessite modification du file-service

#### Modification du file-service

**`src/utils/upload.js`** - Ajouter configuration multiple
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
    fileSize: 10 * 1024 * 1024 // 10MB par fichier
  },
  fileFilter
});

// Export pour single ET multiple
export const uploadSingle = upload.single('file');
export const uploadMultiple = upload.array('files', 10); // Max 10 fichiers

export default upload;
```

**`src/controllers/files.controller.js`** - Ajouter méthode uploadMultiple
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
      source: req.source,
      context: req.body.context || 'general',
      description: req.body.description || ''
    };
    
    const uploadedFiles = [];
    
    // Traiter chaque fichier
    for (const file of req.files) {
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
    }
    
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

**`src/routes/files.routes.js`** - Ajouter route multiple
```javascript
import { uploadSingle, uploadMultiple } from '../utils/upload.js';

/**
 * @route POST /api/files/upload-multiple
 * @desc Upload plusieurs fichiers
 * @access Privé (API Key requise)
 */
router.post(
  '/upload-multiple',
  authenticateApiKey,
  uploadMultiple,
  filesController.uploadMultipleFiles
);
```

## 🔌 Communication entre services

### 1. **Manager App → File Service** (Upload)

```javascript
// Dans manager-app frontend (React/Vue)
async function uploadFiles(files) {
  const formData = new FormData();
  
  files.forEach(file => {
    formData.append('files', file); // 'files' pour multiple
  });
  
  formData.append('uploadedBy', currentUser.id);
  formData.append('context', 'flux_financier');
  
  const response = await fetch('http://localhost:4600/api/files/upload-multiple', {
    method: 'POST',
    headers: {
      'x-api-key': 'yessal-manager-2025'
    },
    body: formData
  });
  
  return await response.json();
}
```

### 2. **Manager App → API Manager** (Créer flux + preuves)

```javascript
async function createFluxWithProofs(fluxData, uploadedFiles) {
  // 1. Créer le flux
  const fluxResponse = await fetch('http://localhost:4520/api/flux-financier', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(fluxData)
  });
  
  const flux = await fluxResponse.json();
  
  // 2. Ajouter toutes les preuves
  for (const fileInfo of uploadedFiles) {
    await fetch(`http://localhost:4520/api/flux-financier/${flux.data.id}/preuves`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        fileId: fileInfo.fileId,
        filename: fileInfo.filename,
        downloadUrl: fileInfo.downloadUrl,
        mimetype: fileInfo.mimetype,
        size: fileInfo.size
      })
    });
  }
  
  return flux.data;
}
```

### 3. **Manager App → API Manager** (Récupérer flux avec preuves)

```javascript
async function getFluxWithProofs(fluxId) {
  const response = await fetch(`http://localhost:4520/api/flux-financier/${fluxId}`, {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });
  
  const result = await response.json();
  
  // result.data.preuves contient toutes les preuves avec leurs URLs signées
  return result.data;
}
```

### 4. **Manager App → File Service** (Télécharger fichier)

```html
<!-- Les URLs signées peuvent être utilisées directement -->
<a href="{preuve.downloadUrl}" download="{preuve.filename}">
  Télécharger {preuve.filename}
</a>

<!-- Ou en img pour les images -->
<img src="{preuve.downloadUrl}" alt="{preuve.filename}" />
```

## 📝 Exemple complet Frontend (React)

```jsx
import { useState } from 'react';

function FluxFinancierForm() {
  const [files, setFiles] = useState([]);
  const [formData, setFormData] = useState({
    type: 'depense',
    montant: '',
    dateFluxFinancier: '',
    motif: '',
    beneficiaire: '',
    sourceFinancement: 'caisse',
    description: '',
    laverieId: ''
  });

  const handleFileChange = (e) => {
    setFiles(Array.from(e.target.files));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      // 1. Créer le flux (sans preuves)
      const fluxResponse = await fetch('/api/flux-financier', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      });
      
      const flux = await fluxResponse.json();
      const fluxId = flux.data.id;
      
      // 2. Upload et attacher chaque fichier
      if (files.length > 0) {
        // Option A: Un par un (plus sûr)
        for (const file of files) {
          const uploadFormData = new FormData();
          uploadFormData.append('file', file);
          uploadFormData.append('uploadedBy', userId);
          uploadFormData.append('context', 'flux_financier');
          
          const uploadRes = await fetch('http://localhost:4600/api/files/upload', {
            method: 'POST',
            headers: { 'x-api-key': 'yessal-manager-2025' },
            body: uploadFormData
          });
          
          const uploadData = await uploadRes.json();
          
          await fetch(`/api/flux-financier/${fluxId}/preuves`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              fileId: uploadData.data.fileId,
              filename: uploadData.data.filename,
              downloadUrl: uploadData.data.downloadUrl,
              mimetype: uploadData.data.mimetype,
              size: uploadData.data.size
            })
          });
        }
        
        // Option B: Batch (si uploadMultiple implémenté)
        const batchFormData = new FormData();
        files.forEach(file => batchFormData.append('files', file));
        batchFormData.append('uploadedBy', userId);
        batchFormData.append('context', 'flux_financier');
        
        const batchUploadRes = await fetch('http://localhost:4600/api/files/upload-multiple', {
          method: 'POST',
          headers: { 'x-api-key': 'yessal-manager-2025' },
          body: batchFormData
        });
        
        const batchData = await batchUploadRes.json();
        
        for (const fileInfo of batchData.data) {
          await fetch(`/api/flux-financier/${fluxId}/preuves`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify(fileInfo)
          });
        }
      }
      
      alert('Flux créé avec succès !');
      window.location.href = '/flux-financier';
    } catch (error) {
      console.error(error);
      alert('Erreur lors de la création');
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      {/* Champs du formulaire */}
      <input
        type="number"
        value={formData.montant}
        onChange={(e) => setFormData({...formData, montant: e.target.value})}
        placeholder="Montant"
        required
      />
      
      {/* Upload multiple */}
      <input
        type="file"
        multiple
        accept="image/*,.pdf"
        onChange={handleFileChange}
      />
      
      <p>{files.length} fichier(s) sélectionné(s)</p>
      
      <button type="submit">Créer le flux</button>
    </form>
  );
}

// Composant pour afficher les preuves
function PreuvesDisplay({ preuves }) {
  return (
    <div className="preuves-list">
      <h3>Pièces jointes ({preuves.length})</h3>
      {preuves.map(preuve => (
        <div key={preuve.id} className="preuve-item">
          {preuve.mimetype.startsWith('image/') ? (
            <img src={preuve.downloadUrl} alt={preuve.filename} />
          ) : (
            <a href={preuve.downloadUrl} download={preuve.filename}>
              📄 {preuve.filename}
            </a>
          )}
          <span>{(preuve.size / 1024).toFixed(2)} KB</span>
        </div>
      ))}
    </div>
  );
}
```

## 🔄 Diagramme de séquence

```
Manager App          File Service          API Manager          Database
    |                     |                      |                   |
    |--1. Upload files--->|                      |                   |
    |<---fileIds + URLs---|                      |                   |
    |                     |                      |                   |
    |---------2. Create Flux-------------------->|                   |
    |                     |                      |--Insert Flux----->|
    |                     |                      |<--Flux created----|
    |<--------Flux ID + data---------------------|                   |
    |                     |                      |                   |
    |---------3. Add Proof 1-------------------->|                   |
    |                     |                      |--Insert Preuve--->|
    |<--------Success----------------------------|                   |
    |                     |                      |                   |
    |---------4. Add Proof 2-------------------->|                   |
    |                     |                      |--Insert Preuve--->|
    |<--------Success----------------------------|                   |
    |                     |                      |                   |
    |---------5. Get Flux----------------------->|                   |
    |                     |                      |--Query with join->|
    |                     |                      |<--Flux + preuves--|
    |<--------Flux with all proofs---------------|                   |
    |                     |                      |                   |
    |--6. Display images->|                      |                   |
    |   (using signed URLs)|                      |                   |
```

## ✅ Recommandations

### Option recommandée : **Upload fichier par fichier**

**Pourquoi ?**
- ✅ Pas de modification du file-service nécessaire
- ✅ Meilleure gestion d'erreurs (si un fichier échoue, les autres continuent)
- ✅ Meilleur feedback utilisateur (barre de progression par fichier)
- ✅ Compatible avec l'architecture actuelle

### Si besoin de performance : **Implémenter uploadMultiple**

**Seulement si** :
- Vous avez besoin d'uploader >5 fichiers fréquemment
- La latence réseau est importante
- Vous voulez réduire le nombre de requêtes HTTP

## 🔒 Sécurité

- ✅ API Keys pour communication inter-services
- ✅ JWT tokens pour authentification utilisateur
- ✅ URLs signées avec expiration (1h)
- ✅ Validation des types MIME
- ✅ Limite de taille (10MB par fichier)
- ✅ Contrôle d'accès : seul le créateur peut modifier

## 📞 Endpoints disponibles

### File Service (port 4600)
- `POST /api/files/upload` - Upload 1 fichier
- `POST /api/files/upload-multiple` - Upload multiple (à implémenter)
- `GET /api/files/:fileId` - Info + nouvelle URL signée
- `GET /api/files/download/:fileId?token=xxx` - Téléchargement
- `DELETE /api/files/:fileId` - Supprimer fichier

### API Manager (port 4520)
- `POST /api/flux-financier` - Créer flux
- `POST /api/flux-financier/:id/preuves` - Ajouter preuve
- `GET /api/flux-financier/:id` - Récupérer flux + preuves
- `DELETE /api/flux-financier/preuves/:preuveId` - Supprimer preuve
- `PUT /api/flux-financier/:id` - Modifier flux
