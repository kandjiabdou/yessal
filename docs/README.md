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
PORT=4540
UPLOAD_DIR=uploads
MAX_FILE_SIZE=10485760
API_KEY_MANAGER=your-manager-api-key
API_KEY_ASSOCIE=your-associe-api-key
BASE_URL=http://localhost:4540
```

**Note**: JWT_SECRET n'est plus nécessaire car les URLs ne nécessitent plus de token d'expiration.

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
    "downloadUrl": "http://localhost:4540/api/files/download/uuid",
    "viewUrl": "http://localhost:4540/api/files/view/uuid",
    "uploadedAt": "2025-11-02T10:30:00Z"
  }
}
```

**Note importante**: Les URLs générées (`downloadUrl` et `viewUrl`) sont permanentes et ne nécessitent pas de token. La sécurité est assurée par l'UUID aléatoire du fichier qui est difficile à deviner.

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
      "downloadUrl": "http://localhost:4540/api/files/download/uuid-1",
      "viewUrl": "http://localhost:4540/api/files/view/uuid-1",
      "uploadedAt": "2025-11-02T10:30:00Z"
    },
    {
      "fileId": "uuid-2",
      "filename": "photo.jpg",
      "mimetype": "image/jpeg",
      "size": 512000,
      "downloadUrl": "http://localhost:4540/api/files/download/uuid-2",
      "viewUrl": "http://localhost:4540/api/files/view/uuid-2",
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
    "downloadUrl": "http://localhost:4540/api/files/download/uuid",
    "viewUrl": "http://localhost:4540/api/files/view/uuid",
    "uploadedAt": "2025-11-02T10:30:00Z",
    "metadata": {
      "uploadedBy": "1",
      "source": "MANAGER",
      "context": "flux_financier"
    }
  }
}
```

### 4. Visualiser un fichier (affichage inline dans le navigateur)
```http
GET /api/files/view/:fileId

Response: Fichier affiché inline (pour images, PDFs, etc.)
```

### 4. Visualiser un fichier (affichage inline dans le navigateur)
```http
GET /api/files/view/:fileId

Response: Fichier affiché inline (pour images, PDFs, etc.)
```

### 5. Télécharger un fichier (force download)
```http
GET /api/files/download/:fileId

Response: Fichier téléchargé avec header attachment
```

### 6. Supprimer un fichier
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

### 7. Lister tous les fichiers
```http
GET /api/files/list?source=manager
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

### URLs permanentes sans token
- **Ancien système** : URLs avec token JWT qui expirent après 1h
- **Nouveau système** : URLs permanentes basées sur l'UUID du fichier
- **Sécurité** : L'UUID v4 (128 bits aléatoires) rend les URLs impossible à deviner
  - Exemple : `5a93c300-9a87-427a-9d61-8c4b566896be`
  - Probabilité de deviner : 1 sur 3.4×10³⁸ (340 undecillions)
  
### Deux types d'accès
1. **`/download/:fileId`** : Force le téléchargement (header `attachment`)
2. **`/view/:fileId`** : Affiche dans le navigateur (header `inline`)
   - Images : s'affichent directement
   - PDFs : s'ouvrent dans le viewer du navigateur
   - Autres : téléchargés automatiquement

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
    `http://localhost:4540/api/files/${fileId}`,
    {
      headers: {
        'x-api-key': process.env.FILE_SERVICE_API_KEY
      }
    }
  );
  
  return {
    downloadUrl: response.data.data.downloadUrl, // URL pour télécharger
    viewUrl: response.data.data.viewUrl // URL pour visualiser
  };
}
```

#### 3. Affichage dans le frontend

```html
<!-- Afficher une image -->
<img src="http://localhost:4540/api/files/view/uuid-123" alt="Preuve" />

<!-- Afficher un PDF -->
<iframe src="http://localhost:4540/api/files/view/uuid-456" width="100%" height="600"></iframe>

<!-- Bouton de téléchargement -->
<a href="http://localhost:4540/api/files/download/uuid-123" download>
  Télécharger la facture
</a>
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
    "source": "MANAGER",
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

## 🔄 Changements importants (Novembre 2025)

### Migration vers URLs permanentes

**Ancien système** (avant):
- URLs avec token JWT qui expirent après 1h
- Format: `http://localhost:4540/api/files/download/uuid?token=eyJhbGc...`
- Problème: Les liens deviennent inaccessibles après expiration

**Nouveau système** (maintenant):
- URLs permanentes sans token
- Format download: `http://localhost:4540/api/files/download/uuid`
- Format view: `http://localhost:4540/api/files/view/uuid`
- Sécurité: UUID v4 (128 bits aléatoires) impossible à deviner
- Avantages:
  * ✅ Les fichiers restent toujours accessibles
  * ✅ Pas besoin de regénérer les URLs
  * ✅ Simplification du code
  * ✅ Meilleure UX (pas d'expiration surprise)

**Migration**:
- Les anciennes URLs avec `?token=` continuent de fonctionner (rétrocompatibilité)
- Les nouvelles URLs générées n'ont plus de token
- JWT_SECRET n'est plus nécessaire dans `.env`

### Affichage des fichiers côté frontend

**Deux URLs disponibles** :
- `/download/:fileId` - Force le téléchargement (header `attachment`)
- `/view/:fileId` - Affichage inline dans le navigateur (header `inline`)

**Conversion automatique** :
Le frontend peut convertir `downloadUrl` en `viewUrl` :
```javascript
const getViewUrl = (downloadUrl) => {
  return downloadUrl.replace('/download/', '/view/');
};
```

**Utilisation** :
```jsx
{/* Afficher une image */}
<img src={getViewUrl(preuve.downloadUrl)} alt={preuve.filename} />

{/* Ouvrir un PDF dans un nouvel onglet */}
<button onClick={() => window.open(getViewUrl(preuve.downloadUrl), '_blank')}>
  Voir le PDF
</button>

{/* Télécharger */}
<a href={preuve.downloadUrl} download={preuve.filename}>
  Télécharger
</a>
```

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
