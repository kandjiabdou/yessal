# Guide d'utilisation - Flux Financier avec Pièces Jointes Multiples

## 🎯 Nouveau système de gestion des preuves

Un flux financier peut maintenant avoir **plusieurs pièces jointes** (images, PDF) au lieu d'une seule URL.

⚠️ **Important** : **Au moins une preuve est obligatoire** pour chaque flux financier. Il est impossible de :
- Créer un flux sans ajouter de preuve immédiatement après
- Supprimer la dernière preuve d'un flux

## 📊 Schéma de données

### FluxFinancier
```javascript
{
  id: 1,
  type: 'depense',
  montant: 50000,
  dateFluxFinancier: '2025-11-02T10:00:00Z',
  motif: 'Achat équipement',
  beneficiaire: 'Fournisseur XYZ',
  sourceFinancement: 'caisse',
  description: 'Achat de machines',
  laverieId: 1,
  laverieName: 'Laverie Test',
  createdBy: '1',
  sourceApp: 'manager',
  statut: 'pending',
  status: 'pending',
  preuves: [  // ⭐ NOUVEAU: Tableau de pièces jointes
    {
      id: 1,
      fileId: 'uuid-file-1',
      filename: 'facture.pdf',
      downloadUrl: 'http://localhost:4600/api/files/download/uuid?token=xxx',
      mimetype: 'application/pdf',
      size: 245678,
      uploadedAt: '2025-11-02T10:05:00Z'
    },
    {
      id: 2,
      fileId: 'uuid-file-2',
      filename: 'photo_equipement.jpg',
      downloadUrl: 'http://localhost:4600/api/files/download/uuid2?token=yyy',
      mimetype: 'image/jpeg',
      size: 512000,
      uploadedAt: '2025-11-02T10:06:00Z'
    }
  ]
}
```

## 🔄 Workflow complet

### 1. Créer un flux financier (sans preuves)

```javascript
POST /api/flux-financier
Headers: Authorization: Bearer <token>
Body:
{
  "type": "depense",
  "montant": 50000,
  "dateFluxFinancier": "2025-11-02T10:00:00Z",
  "motif": "Achat équipement",
  "beneficiaire": "Fournisseur XYZ",
  "sourceFinancement": "caisse",
  "description": "Achat de machines à laver",
  "laverieId": 1
}

Response 201:
{
  "success": true,
  "message": "Flux financier créé avec succès",
  "data": {
    "id": 1,
    "type": "depense",
    "montant": 50000,
    ...
    "preuves": []  // Vide au départ
  }
}
```

### 2. Uploader un fichier au file-service

```javascript
POST http://localhost:4600/api/files/upload
Headers: x-api-key: yessal-manager-2025
Body: multipart/form-data
{
  file: <fichier>,
  uploadedBy: 1,
  context: 'flux_financier',
  description: 'Facture achat équipement'
}

Response 201:
{
  "success": true,
  "message": "Fichier uploadé avec succès",
  "data": {
    "fileId": "uuid-xxx",
    "filename": "facture.pdf",
    "mimetype": "application/pdf",
    "size": 245678,
    "downloadUrl": "http://localhost:4600/api/files/download/uuid-xxx?token=...",
    "uploadedAt": "2025-11-02T10:05:00Z"
  }
}
```

### 3. Ajouter la preuve au flux financier

```javascript
POST /api/flux-financier/1/preuves
Headers: Authorization: Bearer <token>
Body:
{
  "fileId": "uuid-xxx",
  "filename": "facture.pdf",
  "downloadUrl": "http://localhost:4600/api/files/download/uuid-xxx?token=...",
  "mimetype": "application/pdf",
  "size": 245678
}

Response 201:
{
  "success": true,
  "message": "Preuve ajoutée avec succès",
  "data": {
    "id": 1,
    "fluxFinancierId": 1,
    "fileId": "uuid-xxx",
    "filename": "facture.pdf",
    "downloadUrl": "...",
    "mimetype": "application/pdf",
    "size": 245678,
    "uploadedAt": "2025-11-02T10:05:00Z"
  }
}
```

### 4. Ajouter d'autres preuves (facultatif)

Répétez les étapes 2 et 3 pour chaque fichier supplémentaire.

### 5. Récupérer un flux avec toutes ses preuves

```javascript
GET /api/flux-financier/1
Headers: Authorization: Bearer <token>

Response 200:
{
  "success": true,
  "data": {
    "id": 1,
    "type": "depense",
    "montant": 50000,
    ...
    "preuves": [
      {
        "id": 1,
        "fileId": "uuid-xxx",
        "filename": "facture.pdf",
        "downloadUrl": "...",
        "mimetype": "application/pdf",
        "size": 245678,
        "uploadedAt": "2025-11-02T10:05:00Z"
      },
      {
        "id": 2,
        "fileId": "uuid-yyy",
        "filename": "photo.jpg",
        "downloadUrl": "...",
        "mimetype": "image/jpeg",
        "size": 512000,
        "uploadedAt": "2025-11-02T10:06:00Z"
      }
    ]
  }
}
```

### 6. Supprimer une preuve

⚠️ **Restriction** : Impossible de supprimer la dernière preuve. Un flux doit toujours avoir au moins une preuve.

```javascript
DELETE /api/flux-financier/preuves/1
Headers: Authorization: Bearer <token>

Response 200:
{
  "success": true,
  "message": "Preuve supprimée avec succès"
}

// OU en cas d'erreur (dernière preuve)
Response 403:
{
  "success": false,
  "message": "Impossible de supprimer la dernière preuve. Au moins une preuve est obligatoire."
}
```

## 🔒 Règles de validation

### Pour créer un flux :
- ✅ Tous les champs obligatoires doivent être remplis
- ✅ **Au moins une preuve doit être ajoutée immédiatement après création**

### Pour ajouter une preuve :
- ✅ Le flux doit exister
- ✅ Le flux doit avoir `sourceApp = 'manager'`
- ✅ L'utilisateur doit être le créateur du flux
- ✅ Le flux doit avoir `status = 'pending'`

### Pour supprimer une preuve :
- ✅ La preuve doit exister
- ✅ Le flux associé doit avoir `sourceApp = 'manager'`
- ✅ L'utilisateur doit être le créateur du flux
- ✅ Le flux doit avoir `status = 'pending'`
- ⚠️ **Il doit rester au moins 2 preuves avant suppression** (après suppression il en restera 1)

## 📝 Exemple d'implémentation Frontend (React)

```javascript
// 1. Créer le flux
const createFluxWithProofs = async (fluxData, files) => {
  // Créer le flux
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
  
  // Upload chaque fichier et l'ajouter comme preuve
  for (const file of files) {
    // 1. Upload vers file-service
    const formData = new FormData();
    formData.append('file', file);
    formData.append('uploadedBy', userId);
    formData.append('context', 'flux_financier');
    
    const uploadResponse = await fetch('http://localhost:4600/api/files/upload', {
      method: 'POST',
      headers: {
        'x-api-key': 'yessal-manager-2025'
      },
      body: formData
    });
    
    const uploadData = await uploadResponse.json();
    
    // 2. Ajouter la preuve au flux
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
};

// Utilisation
const files = [file1, file2, file3]; // Depuis un input file
const fluxId = await createFluxWithProofs({
  type: 'depense',
  montant: 50000,
  dateFluxFinancier: new Date().toISOString(),
  motif: 'Achat équipement',
  laverieId: 1
}, files);
```

## 📱 Composant React d'exemple

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
      // 1. Créer le flux
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
      
      // 2. Uploader et attacher les fichiers
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
      
      alert('Flux créé avec succès !');
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
      
      {/* Upload multiple de fichiers */}
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
```

## ✅ Avantages du nouveau système

1. **Flexibilité** : Plusieurs preuves par flux (facture + photos + devis, etc.)
2. **Traçabilité** : Chaque preuve a son propre ID et date d'upload
3. **Sécurité** : URLs signées individuelles pour chaque fichier
4. **Performance** : Les preuves sont chargées en lazy loading si nécessaire
5. **Maintenabilité** : Relation Prisma propre avec cascade delete
6. **Obligation de preuve** : ⚠️ Au moins une preuve obligatoire garantit la traçabilité de chaque flux

## 🔄 Migration depuis l'ancien système

L'ancien champ `preuveUrl` a été supprimé. Si vous aviez des données existantes, elles ont été perdues lors de la migration. Assurez-vous de sauvegarder vos données avant de migrer.

## 📞 Endpoints disponibles

| Méthode | Endpoint | Description |
|---------|----------|-------------|
| POST | `/api/flux-financier` | Créer un flux (sans preuves) |
| POST | `/api/flux-financier/:id/preuves` | Ajouter une preuve à un flux |
| GET | `/api/flux-financier/:id` | Récupérer un flux avec ses preuves |
| DELETE | `/api/flux-financier/preuves/:preuveId` | Supprimer une preuve |
| PUT | `/api/flux-financier/:id` | Modifier un flux |
| DELETE | `/api/flux-financier/:id` | Supprimer un flux (soft delete) |

## 🎓 Bonnes pratiques

1. **Toujours uploader vers le file-service d'abord**
2. **Stocker les métadonnées retournées** (fileId, downloadUrl, etc.)
3. **Gérer les erreurs d'upload** avant d'ajouter la preuve au flux
4. **Régénérer les URLs signées** si elles sont expirées (>1h)
5. **Nettoyer les fichiers orphelins** du file-service si l'ajout au flux échoue
