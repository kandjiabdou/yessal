# Architecture de Communication - Flux Financier avec Preuves Multiples

## 📊 Vue d'ensemble

```
┌─────────────────┐      ┌─────────────────┐      ┌─────────────────┐      ┌─────────────────┐
│   Manager App   │      │  File Service   │      │   API Manager   │      │    Database     │
│  (Frontend)     │      │   Port 4600     │      │   Port 4520     │      │     MySQL       │
│  React/Vue/HTML │      │   Express.js    │      │   Express.js    │      │   + Prisma      │
└─────────────────┘      └─────────────────┘      └─────────────────┘      └─────────────────┘
```

## 🔄 Flux de données complet

### Scénario 1 : Créer un flux avec 3 preuves

```
┌───────────────────────────────────────────────────────────────────────────────────────────┐
│ ÉTAPE 1 : Upload des fichiers vers File Service                                          │
└───────────────────────────────────────────────────────────────────────────────────────────┘

Manager App                    File Service                    Système de fichiers
     │                              │                                  │
     │  POST /api/files/upload      │                                  │
     │  file: facture.pdf          │                                  │
     │  x-api-key: xxx             │                                  │
     ├─────────────────────────────>│                                  │
     │                              │  Valider type MIME              │
     │                              │  Générer UUID                    │
     │                              │  Sauvegarder metadata            │
     │                              ├─────────────────────────────────>│
     │                              │                                  │
     │                              │  Fichier enregistré              │
     │                              │<─────────────────────────────────│
     │                              │  Créer JWT token signé           │
     │                              │  Générer downloadUrl             │
     │  201 Created                 │                                  │
     │  { fileId, downloadUrl }     │                                  │
     │<─────────────────────────────│                                  │
     │                              │                                  │
     │  POST /api/files/upload      │                                  │
     │  file: photo1.jpg            │                                  │
     ├─────────────────────────────>│                                  │
     │  201 Created                 │                                  │
     │  { fileId, downloadUrl }     │                                  │
     │<─────────────────────────────│                                  │
     │                              │                                  │
     │  POST /api/files/upload      │                                  │
     │  file: photo2.jpg            │                                  │
     ├─────────────────────────────>│                                  │
     │  201 Created                 │                                  │
     │  { fileId, downloadUrl }     │                                  │
     │<─────────────────────────────│                                  │


┌───────────────────────────────────────────────────────────────────────────────────────────┐
│ ÉTAPE 2 : Créer le flux financier                                                        │
└───────────────────────────────────────────────────────────────────────────────────────────┘

Manager App                    API Manager                     Database
     │                              │                              │
     │  POST /api/flux-financier    │                              │
     │  Authorization: Bearer token │                              │
     │  Body: {                     │                              │
     │    type: "depense",          │                              │
     │    montant: 50000,           │                              │
     │    motif: "Achat",           │                              │
     │    laverieId: 1              │                              │
     │  }                           │                              │
     ├─────────────────────────────>│                              │
     │                              │  Valider JWT                 │
     │                              │  Valider données             │
     │                              │                              │
     │                              │  INSERT FluxFinancier        │
     │                              ├─────────────────────────────>│
     │                              │  Flux created (id: 42)       │
     │                              │<─────────────────────────────│
     │                              │                              │
     │  201 Created                 │                              │
     │  { id: 42, ..., preuves: [] }│                              │
     │<─────────────────────────────│                              │


┌───────────────────────────────────────────────────────────────────────────────────────────┐
│ ÉTAPE 3 : Ajouter les preuves au flux                                                    │
└───────────────────────────────────────────────────────────────────────────────────────────┘

Manager App                    API Manager                     Database
     │                              │                              │
     │  POST /flux-financier/42/preuves                            │
     │  Authorization: Bearer token │                              │
     │  Body: {                     │                              │
     │    fileId: "uuid-123",       │                              │
     │    filename: "facture.pdf",  │                              │
     │    downloadUrl: "...",       │                              │
     │    mimetype: "...",          │                              │
     │    size: 245678              │                              │
     │  }                           │                              │
     ├─────────────────────────────>│                              │
     │                              │  Vérifier flux existe        │
     │                              │  Vérifier créateur           │
     │                              │  Vérifier status pending     │
     │                              │                              │
     │                              │  INSERT FluxFinancierPreuve  │
     │                              ├─────────────────────────────>│
     │                              │  Preuve created (id: 1)      │
     │                              │<─────────────────────────────│
     │  201 Created                 │                              │
     │  { id: 1, fileId: "..." }    │                              │
     │<─────────────────────────────│                              │
     │                              │                              │
     │  POST /flux-financier/42/preuves (photo1)                   │
     ├─────────────────────────────>│                              │
     │  201 Created                 │                              │
     │<─────────────────────────────│                              │
     │                              │                              │
     │  POST /flux-financier/42/preuves (photo2)                   │
     ├─────────────────────────────>│                              │
     │  201 Created                 │                              │
     │<─────────────────────────────│                              │


┌───────────────────────────────────────────────────────────────────────────────────────────┐
│ ÉTAPE 4 : Afficher le flux avec ses preuves                                              │
└───────────────────────────────────────────────────────────────────────────────────────────┘

Manager App                    API Manager                     Database
     │                              │                              │
     │  GET /flux-financier/42      │                              │
     │  Authorization: Bearer token │                              │
     ├─────────────────────────────>│                              │
     │                              │  SELECT FluxFinancier        │
     │                              │  JOIN FluxFinancierPreuve    │
     │                              ├─────────────────────────────>│
     │                              │  Flux + 3 preuves            │
     │                              │<─────────────────────────────│
     │                              │                              │
     │  200 OK                      │                              │
     │  {                           │                              │
     │    id: 42,                   │                              │
     │    type: "depense",          │                              │
     │    montant: 50000,           │                              │
     │    preuves: [                │                              │
     │      { id: 1, filename: "facture.pdf", downloadUrl: "..." },
     │      { id: 2, filename: "photo1.jpg", downloadUrl: "..." }, │
     │      { id: 3, filename: "photo2.jpg", downloadUrl: "..." }  │
     │    ]                         │                              │
     │  }                           │                              │
     │<─────────────────────────────│                              │


┌───────────────────────────────────────────────────────────────────────────────────────────┐
│ ÉTAPE 5 : Télécharger/Afficher les preuves                                               │
└───────────────────────────────────────────────────────────────────────────────────────────┘

Manager App                    File Service                    Système de fichiers
     │                              │                              │
     │  GET /download/uuid-123?token=xxx                           │
     ├─────────────────────────────>│                              │
     │                              │  Vérifier JWT token          │
     │                              │  Vérifier expiration (<1h)   │
     │                              │  Charger fichier             │
     │                              ├─────────────────────────────>│
     │                              │  Contenu du fichier          │
     │                              │<─────────────────────────────│
     │  200 OK                      │                              │
     │  Content-Type: application/pdf                              │
     │  [Binaire du fichier]        │                              │
     │<─────────────────────────────│                              │
```

## 🗄️ Structure de la base de données

```sql
┌─────────────────────────────────────┐
│       FluxFinancier                 │
├─────────────────────────────────────┤
│ id: 42                              │
│ type: "depense"                     │
│ montant: 50000                      │
│ motif: "Achat équipement"           │
│ laverieId: 1                        │
│ createdBy: "1"                      │
│ sourceApp: "manager"                │
│ validationStatus: "pending"         │
└─────────────────────────────────────┘
              │
              │ 1:N relation
              │
       ┌──────┴──────┬──────────────┐
       │             │              │
       ▼             ▼              ▼
┌──────────────┐ ┌──────────────┐ ┌──────────────┐
│ Preuve #1    │ │ Preuve #2    │ │ Preuve #3    │
├──────────────┤ ├──────────────┤ ├──────────────┤
│ id: 1        │ │ id: 2        │ │ id: 3        │
│ fileId: uuid1│ │ fileId: uuid2│ │ fileId: uuid3│
│ filename:    │ │ filename:    │ │ filename:    │
│ facture.pdf  │ │ photo1.jpg   │ │ photo2.jpg   │
│ downloadUrl  │ │ downloadUrl  │ │ downloadUrl  │
│ mimetype     │ │ mimetype     │ │ mimetype     │
│ size: 245678 │ │ size: 512000 │ │ size: 389000 │
└──────────────┘ └──────────────┘ └──────────────┘
```

## 📁 Stockage physique des fichiers

```
file-service/
└── uploads/
    ├── 2025/
    │   └── 11/
    │       ├── uuid-123_facture.pdf    ← Métadata en DB
    │       ├── uuid-456_photo1.jpg     ← Métadata en DB
    │       └── uuid-789_photo2.jpg     ← Métadata en DB
    └── temp/
        └── (fichiers temporaires durant upload)
```

## 🔐 Sécurité et authentification

### Communication Manager App → File Service

```
Request Headers:
├── x-api-key: "yessal-manager-2025"  ← API Key fixe
└── Content-Type: multipart/form-data

Validation:
✅ API Key valide ?
✅ Type MIME autorisé ?
✅ Taille < 10MB ?
```

### Communication Manager App → API Manager

```
Request Headers:
├── Authorization: "Bearer eyJhbGc..."  ← JWT Token utilisateur
└── Content-Type: application/json

Validation:
✅ JWT valide ?
✅ Utilisateur authentifié ?
✅ Role = Manager ou Gerant ?
✅ Créateur du flux ?
```

### Téléchargement de fichier

```
URL signée:
http://localhost:4600/api/files/download/uuid-123?token=eyJhbGc...

Token contient:
├── fileId: "uuid-123"
├── exp: timestamp + 3600s (1h)
└── signature: HMAC-SHA256

Validation:
✅ Token valide ?
✅ Signature correcte ?
✅ Non expiré ?
✅ FileId correspond ?
```

## ⚡ Optimisations possibles

### Option 1 : Upload séquentiel (actuel)
```
Temps total = n × (upload_time + network_latency)
Exemple: 3 fichiers × (2s + 0.1s) = 6.3s
```

### Option 2 : Upload parallèle
```javascript
// Upload tous les fichiers en parallèle
const uploadPromises = files.map(file => uploadToFileService(file));
const uploadedFiles = await Promise.all(uploadPromises);
```
```
Temps total ≈ max(upload_time) + network_latency
Exemple: max(2s, 1.5s, 1s) + 0.1s = 2.1s
```

### Option 3 : Upload batch (avec upload-multiple)
```
Temps total = 1 × batch_upload_time
Exemple: 3 fichiers en 1 requête = 3s
```

## 📊 Comparaison des approches

| Approche | Avantages | Inconvénients | Recommandé pour |
|----------|-----------|---------------|-----------------|
| **Séquentiel** | Simple, gestion d'erreur facile | Plus lent | 1-3 fichiers |
| **Parallèle** | Rapide, bon compromis | Code plus complexe | 3-10 fichiers |
| **Batch** | 1 seule requête HTTP | Tout échoue si 1 erreur | >10 fichiers |

## ✅ Checklist d'intégration

- [ ] File Service démarré sur port 4600
- [ ] API Manager configurée avec `FILE_SERVICE_URL` et `FILE_SERVICE_API_KEY`
- [ ] Migration Prisma appliquée (FluxFinancierPreuve)
- [ ] Endpoints `/preuves` testés
- [ ] Frontend implémente upload multiple
- [ ] Affichage des preuves dans l'interface
- [ ] Gestion de la suppression de preuves
- [ ] Tests de sécurité (tentative d'accès non autorisé)
- [ ] Tests de performance (upload de 10 fichiers)
