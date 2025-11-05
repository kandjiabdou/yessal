# Yessal File Service

Service centralisé de gestion de fichiers pour les applications Yessal (Manager et Associé).

## 🎯 Objectif

Séparer la gestion des fichiers dans un service indépendant pour :
- ✅ Centraliser le stockage des preuves de transaction
- ✅ Éviter la duplication entre les deux applications
- ✅ Gérer un contrôle d'accès unique
- ✅ Faciliter la scalabilité (migration vers cloud future)

## 🏗️ Architecture

```
/file-service
├── src/
│   ├── app.js                      # Application Express
│   ├── routes/
│   │   └── files.routes.js         # Routes de l'API
│   ├── controllers/
│   │   └── files.controller.js     # Contrôleurs
│   ├── middleware/
│   │   └── auth.js                 # Authentification
│   └── utils/
│       ├── storage.js              # Service de stockage
│       └── upload.js               # Configuration Multer
├── uploads/                        # Stockage local
│   └── temp/                       # Fichiers temporaires
├── .env                            # Configuration
└── package.json
```

## 🚀 Installation

```bash
cd file-service
npm install
```

## ⚙️ Configuration

Copier `.env.example` vers `.env` et configurer :

```env
PORT=4600
JWT_SECRET=your-super-secret-key
URL_EXPIRY=3600
MAX_FILE_SIZE=10485760
UPLOAD_DIR=uploads
API_KEY_MANAGER=your-manager-api-key
API_KEY_ASSOCIE=your-associe-api-key
```

## 🎬 Démarrage

```bash
# Développement
npm run dev

# Production
npm start
```

## 📡 API Endpoints

### 1. Upload un fichier
```http
POST /api/files/upload
Headers:
  x-api-key: <API_KEY_MANAGER ou API_KEY_ASSOCIE>
  Content-Type: multipart/form-data

Body (form-data):
  file: <fichier>
  uploadedBy: <userId>
  context: flux_financier
  description: Preuve d'achat

Response 201:
{
  "success": true,
  "message": "Fichier uploadé avec succès",
  "data": {
    "fileId": "uuid",
    "filename": "facture.pdf",
    "mimetype": "application/pdf",
    "size": 245678,
    "downloadUrl": "http://localhost:4600/api/files/download/uuid?token=xxx",
    "uploadedAt": "2025-11-02T10:30:00Z"
  }
}
```

### 2. Upload plusieurs fichiers (nouveau)
```http
POST /api/files/upload-multiple
Headers:
  x-api-key: <API_KEY_MANAGER ou API_KEY_ASSOCIE>
  Content-Type: multipart/form-data

Body (form-data):
  files: <fichier1>
  files: <fichier2>
  files: <fichier3>
  uploadedBy: <userId>
  context: flux_financier
  description: Preuves d'achat

Response 201 (Succès total):
{
  "success": true,
  "message": "3 fichier(s) uploadé(s) avec succès",
  "data": [
    {
      "fileId": "uuid-1",
      "filename": "facture.pdf",
      "mimetype": "application/pdf",
      "size": 245678,
      "downloadUrl": "http://localhost:4600/api/files/download/uuid-1?token=xxx",
      "uploadedAt": "2025-11-02T10:30:00Z"
    },
    {
      "fileId": "uuid-2",
      "filename": "photo.jpg",
      "mimetype": "image/jpeg",
      "size": 512000,
      "downloadUrl": "http://localhost:4600/api/files/download/uuid-2?token=yyy",
      "uploadedAt": "2025-11-02T10:30:01Z"
    }
  ]
}

Response 207 (Succès partiel):
{
  "success": true,
  "message": "2/3 fichier(s) uploadé(s)",
  "data": [...],
  "errors": [
    {
      "index": 2,
      "filename": "invalid.exe",
      "error": "Type de fichier non autorisé"
    }
  ]
}
```

### 3. Récupérer les infos d'un fichier
```http
GET /api/files/:fileId
Headers:
  x-api-key: <API_KEY>

Response 200:
{
  "success": true,
  "data": {
    "fileId": "uuid",
    "filename": "facture.pdf",
    "mimetype": "application/pdf",
    "size": 245678,
    "downloadUrl": "http://localhost:4600/api/files/download/uuid?token=xxx",
    "uploadedAt": "2025-11-02T10:30:00Z",
    "metadata": {
      "uploadedBy": "1",
      "source": "manager",
      "context": "flux_financier"
    }
  }
}
```

### 4. Télécharger un fichier
```http
GET /api/files/download/:fileId?token=<JWT_TOKEN>

Response: Fichier téléchargé
```

### 5. Supprimer un fichier
```http
DELETE /api/files/:fileId
Headers:
  x-api-key: <API_KEY>

Response 200:
{
  "success": true,
  "message": "Fichier supprimé avec succès"
}
```

### 6. Lister tous les fichiers
```http
GET /api/files?source=manager
Headers:
  x-api-key: <API_KEY>

Response 200:
{
  "success": true,
  "data": [...],
  "total": 10
}
```

## 🔒 Sécurité

### API Key
Chaque application (Manager/Associé) possède sa propre API Key :
- Headers: `x-api-key: <API_KEY>`
- Les clés sont configurées dans `.env`

### URLs signées (JWT)
Les fichiers sont téléchargeables uniquement via des URLs signées :
- Token JWT valide pendant 1 heure par défaut
- Contient l'ID du fichier et expire automatiquement
- Empêche l'accès non autorisé aux fichiers

### Contrôle d'accès
- Seule la source qui a uploadé peut supprimer le fichier
- Manager ne peut pas supprimer les fichiers de l'Associé et vice-versa

## 📁 Types de fichiers autorisés

- **Images** : JPEG, JPG, PNG, GIF, WebP
- **Documents** : PDF

**Taille maximale** : 10 MB (configurable)

## 🔗 Intégration avec les APIs

### API Manager / Associé

#### 1. Upload lors de la création d'un flux financier

```javascript
// Côté API Manager
const FormData = require('form-data');
const axios = require('axios');
const fs = require('fs');

async function uploadPreuveFlux(filePath, userId) {
  const form = new FormData();
  form.append('file', fs.createReadStream(filePath));
  form.append('uploadedBy', userId);
  form.append('context', 'flux_financier');
  form.append('description', 'Preuve de dépense');
  
  const response = await axios.post(
    'http://localhost:4600/api/files/upload',
    form,
    {
      headers: {
        ...form.getHeaders(),
        'x-api-key': process.env.FILE_SERVICE_API_KEY
      }
    }
  );
  
  return response.data.data.downloadUrl; // URL à sauvegarder dans preuveUrl
}
```

#### 2. Récupération d'un fichier

```javascript
async function getFileUrl(fileId) {
  const response = await axios.get(
    `http://localhost:4600/api/files/${fileId}`,
    {
      headers: {
        'x-api-key': process.env.FILE_SERVICE_API_KEY
      }
    }
  );
  
  return response.data.data.downloadUrl; // URL signée valide 1h
}
```

## 🌐 Scalabilité

Le service est conçu pour être facilement étendu au stockage cloud :

```javascript
// Future implémentation S3
STORAGE_TYPE=s3
AWS_S3_BUCKET=yessal-files
AWS_ACCESS_KEY_ID=xxx
AWS_SECRET_ACCESS_KEY=xxx
AWS_REGION=us-east-1
```

## 📊 Métadonnées des fichiers

Chaque fichier stocké possède un fichier `.meta.json` associé :

```json
{
  "id": "uuid",
  "filename": "unique_filename.pdf",
  "originalName": "facture.pdf",
  "path": "uploads/unique_filename.pdf",
  "mimetype": "application/pdf",
  "size": 245678,
  "uploadedBy": "1",
  "uploadedAt": "2025-11-02T10:30:00Z",
  "metadata": {
    "uploadedBy": "1",
    "source": "manager",
    "context": "flux_financier",
    "description": "Preuve d'achat"
  }
}
```

## 🧪 Tests

```bash
npm test
```

## 📝 Logs

Les erreurs sont loggées dans la console avec le préfixe ❌

## 🚦 Health Check

```http
GET /health

Response:
{
  "status": "OK",
  "service": "Yessal File Service",
  "version": "1.0.0",
  "timestamp": "2025-11-02T10:30:00Z"
}
```

## 🔧 Maintenance

### Nettoyage des fichiers expirés

```javascript
// À implémenter dans un cron job
import storageService from './src/utils/storage.js';

// Supprimer les fichiers de plus de 90 jours
const deleted = storageService.cleanupOldFiles(90);
console.log(`${deleted} fichiers supprimés`);
```

## 📞 Support

Pour toute question, contactez l'équipe Yessal.
