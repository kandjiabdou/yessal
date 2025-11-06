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
     │                              │  Générer URLs permanentes        │
     │  201 Created                 │                                  │
     │  { fileId, downloadUrl,      │                                  │
     │    viewUrl }                 │                                  │
     │<─────────────────────────────│                                  │
     │                              │                                  │
     │  POST /api/files/upload      │                                  │
     │  file: photo1.jpg            │                                  │
     ├─────────────────────────────>│                                  │
     │  201 Created                 │                                  │
     │  { fileId, downloadUrl,      │                                  │
     │    viewUrl }                 │                                  │
     │<─────────────────────────────│                                  │
     │                              │                                  │
     │  POST /api/files/upload      │                                  │
     │  file: photo2.jpg            │                                  │
     ├─────────────────────────────>│                                  │
     │  201 Created                 │                                  │
     │  { fileId, downloadUrl,      │                                  │
     │    viewUrl }                 │                                  │
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
     │  GET /view/uuid-123 (afficher)                              │
     ├─────────────────────────────>│                              │
     │                              │  Charger fichier             │
     │                              ├─────────────────────────────>│
     │                              │  Contenu du fichier          │
     │                              │<─────────────────────────────│
     │  200 OK                      │                              │
     │  Content-Disposition: inline │                              │
     │  [Binaire du fichier]        │                              │
     │<─────────────────────────────│                              │
     │                              │                              │
     │  GET /download/uuid-123 (télécharger)                       │
     ├─────────────────────────────>│                              │
     │                              │  Charger fichier             │
     │                              ├─────────────────────────────>│
     │                              │  Contenu du fichier          │
     │                              │<─────────────────────────────│
     │  200 OK                      │                              │
     │  Content-Disposition: attachment                            │
     │  [Binaire du fichier]        │                              │
     │<─────────────────────────────│                              │

Note: Les URLs ne nécessitent pas de token, l'UUID aléatoire assure la sécurité


┌───────────────────────────────────────────────────────────────────────────────────────────┐
│ ÉTAPE 6 : Supprimer une preuve (Frontend gère la suppression du fichier)                 │
└───────────────────────────────────────────────────────────────────────────────────────────┘

Manager App                    API Manager                     Database                File Service
     │                              │                              │                         │
     │  DELETE /flux-financier/     │                              │                         │
     │  preuves/1                   │                              │                         │
     │  Authorization: Bearer token │                              │                         │
     ├─────────────────────────────>│                              │                         │
     │                              │  Vérifier permissions        │                         │
     │                              │  (créateur + status pending) │                         │
     │                              │                              │                         │
     │                              │  SELECT FluxFinancierPreuve  │                         │
     │                              ├─────────────────────────────>│                         │
     │                              │  Preuve + fileId             │                         │
     │                              │<─────────────────────────────│                         │
     │                              │                              │                         │
     │                              │  DELETE FluxFinancierPreuve  │                         │
     │                              ├─────────────────────────────>│                         │
     │                              │  Preuve deleted              │                         │
     │                              │<─────────────────────────────│                         │
     │                              │                              │                         │
     │  200 OK                      │                              │                         │
     │  { success: true,            │                              │                         │
     │    data: { fileId: "..." } } │                              │                         │
     │<─────────────────────────────│                              │                         │
     │                              │                              │                         │
     │  DELETE /api/files/uuid-123  │                              │                         │
     │  x-api-key: xxx              │                              │                         │
     ├─────────────────────────────────────────────────────────────────────────────────────>│
     │                              │                              │  Supprimer fichier      │
     │                              │                              │  physique uploads/      │
     │  200 OK (fichier supprimé)   │                              │                         │
     │<─────────────────────────────────────────────────────────────────────────────────────│

Note: Le frontend supprime d'abord la référence en base, puis le fichier physique.
      Si le fichier physique ne peut pas être supprimé, la référence est déjà supprimée.


┌───────────────────────────────────────────────────────────────────────────────────────────┐
│ ÉTAPE 7 : Supprimer un flux financier complet (avec toutes ses preuves)                  │
└───────────────────────────────────────────────────────────────────────────────────────────┘

Manager App                    API Manager                     Database                File Service
     │                              │                              │                         │
     │  DELETE /flux-financier/42   │                              │                         │
     │  Authorization: Bearer token │                              │                         │
     ├─────────────────────────────>│                              │                         │
     │                              │  Vérifier permissions        │                         │
     │                              │  (créateur + status pending) │                         │
     │                              │                              │                         │
     │                              │  SELECT FluxFinancier        │                         │
     │                              │  JOIN FluxFinancierPreuve    │                         │
     │                              ├─────────────────────────────>│                         │
     │                              │  Flux + preuves (fileIds)    │                         │
     │                              │<─────────────────────────────│                         │
     │                              │                              │                         │
     │                              │  DELETE FluxFinancierPreuve  │                         │
     │                              │  (toutes les preuves)        │                         │
     │                              ├─────────────────────────────>│                         │
     │                              │  Preuves deleted             │                         │
     │                              │<─────────────────────────────│                         │
     │                              │                              │                         │
     │                              │  UPDATE FluxFinancier        │                         │
     │                              │  SET flagged = false         │                         │
     │                              ├─────────────────────────────>│                         │
     │                              │  Flux soft deleted           │                         │
     │                              │<─────────────────────────────│                         │
     │                              │                              │                         │
     │  200 OK                      │                              │                         │
     │  { success: true,            │                              │                         │
     │    data: {                   │                              │                         │
     │      fileIds: ["uuid1",      │                              │                         │
     │                "uuid2",      │                              │                         │
     │                "uuid3"],     │                              │                         │
     │      preuvesCount: 3         │                              │                         │
     │    }                         │                              │                         │
     │  }                           │                              │                         │
     │<─────────────────────────────│                              │                         │
     │                              │                              │                         │
     │  DELETE /api/files/uuid1     │                              │                         │
     │  x-api-key: xxx              │                              │                         │
     ├─────────────────────────────────────────────────────────────────────────────────────>│
     │                              │                              │  Supprimer fichier 1    │
     │  200 OK                      │                              │                         │
     │<─────────────────────────────────────────────────────────────────────────────────────│
     │                              │                              │                         │
     │  DELETE /api/files/uuid2     │                              │                         │
     ├─────────────────────────────────────────────────────────────────────────────────────>│
     │                              │                              │  Supprimer fichier 2    │
     │  200 OK                      │                              │                         │
     │<─────────────────────────────────────────────────────────────────────────────────────│
     │                              │                              │                         │
     │  DELETE /api/files/uuid3     │                              │                         │
     ├─────────────────────────────────────────────────────────────────────────────────────>│
     │                              │                              │  Supprimer fichier 3    │
     │  200 OK                      │                              │                         │
     │<─────────────────────────────────────────────────────────────────────────────────────│

Note: Le frontend supprime tous les fichiers en parallèle après avoir reçu les fileIds.
      Le flux est marqué comme "flagged" (soft delete) pour préserver l'historique.
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

### Suppression de fichier (Manager App → File Service)

```
Request Headers:
├── x-api-key: "yessal-manager-2025"  ← API Key requise
└── Method: DELETE

Endpoint: DELETE /api/files/:fileId

Validation:
✅ API Key valide ?
✅ Fichier existe ?
✅ UUID valide ?

Actions:
1. Suppression du fichier physique (uploads/*)
2. Suppression des métadonnées (si stockées)
3. Retour 200 OK ou 404 Not Found

Note: Le frontend appelle cet endpoint APRÈS avoir supprimé la référence
      en base via l'API Manager
```

### Téléchargement/Visualisation de fichier

```
URLs permanentes (sans token):
• http://localhost:4540/api/files/download/uuid-123 (force download)
• http://localhost:4540/api/files/view/uuid-123 (affichage inline)

Sécurité par UUID:
├── UUID v4 (128 bits aléatoires)
├── Exemple: 5a93c300-9a87-427a-9d61-8c4b566896be
└── Probabilité de deviner: 1 sur 3.4×10³⁸

Validation:
✅ Fichier existe ?
✅ UUID valide ?
```

## 🗑️ Gestion de la suppression

### Règles de suppression des preuves

```
Conditions pour supprimer une preuve:
├── ✅ Utilisateur = créateur du flux
├── ✅ Flux en status "pending" (non validé/rejeté)
└── ✅ Preuve existe

Si validé ou rejeté:
└── ❌ Suppression interdite (préservation de l'historique)
```

### Processus de suppression en cascade

#### Suppression d'une preuve unique

```
Étape 1: User clique "Supprimer" sur une preuve (Frontend)
    ↓
Étape 2: Frontend appelle FluxFinancierService.deletePreuve(preuveId, fileId)
    ↓
Étape 3: Frontend → DELETE /flux-financier/preuves/:preuveId (API Manager)
    ↓
Étape 4: API Manager vérifie les permissions
    ↓
Étape 5: API Manager supprime la référence FluxFinancierPreuve en DB
    ↓
Étape 6: API Manager retourne 200 OK au Frontend
    ↓
Étape 7: Frontend → DELETE /api/files/:fileId (File Service)
    ↓
Étape 8: File Service supprime le fichier physique (uploads/*)
    ↓
Étape 9: Frontend recharge la liste des flux/preuves
```

#### Suppression d'un flux financier complet

```
Étape 1: User clique "Supprimer" sur un flux (Frontend)
    ↓
Étape 2: Frontend affiche confirmation avec détails du flux
    ↓
Étape 3: Frontend → DELETE /flux-financier/:id (API Manager)
    ↓
Étape 4: API Manager vérifie les permissions (créateur + status pending)
    ↓
Étape 5: API Manager récupère toutes les preuves du flux (fileIds)
    ↓
Étape 6: API Manager supprime toutes les références FluxFinancierPreuve en DB
    ↓
Étape 7: API Manager fait un soft delete du flux (flagged = false)
    ↓
Étape 8: API Manager retourne 200 OK + liste des fileIds au Frontend
    ↓
Étape 9: Frontend → DELETE /api/files/:fileId pour chaque fichier (parallèle)
    ↓
Étape 10: File Service supprime tous les fichiers physiques (uploads/*)
    ↓
Étape 11: Frontend recharge la liste des flux
```

**Avantages de cette approche**:
- ✅ Cohérence : Le frontend qui a créé les fichiers les supprime aussi
- ✅ Découplage : L'API Manager n'a pas besoin de connaître le File Service
- ✅ Sécurité : Pas besoin de variables d'environnement FILE_SERVICE_URL/API_KEY côté backend
- ✅ Simplicité : Moins de dépendances entre services
- ✅ Performance : Suppression parallèle des fichiers
- ✅ Soft Delete : Le flux est marqué comme supprimé mais conservé en DB pour l'historique

### Gestion des erreurs de suppression

#### Suppression d'une preuve

```typescript
// Frontend: fluxFinancier.ts
static async deletePreuve(preuveId: number, fileId: string) {
  try {
    // Étape 1: Supprimer la référence en base de données
    const deletePreuveResponse = await apiClient.delete(
      `/flux-financier/preuves/${preuveId}`
    );

    if (!deletePreuveResponse.data.success) {
      return deletePreuveResponse.data;
    }

    // Étape 2: Supprimer le fichier physique du file-service
    const deleteFileResponse = await this.deleteFile(fileId);

    if (!deleteFileResponse.success) {
      console.warn(`Preuve supprimée mais fichier ${fileId} non supprimé`);
      // ⚠️ On retourne success car la référence est supprimée
      return {
        success: true,
        message: 'Preuve supprimée (fichier physique non supprimé)'
      };
    }

    return {
      success: true,
      message: 'Preuve et fichier supprimés avec succès'
    };
  } catch (error) {
    // Erreur lors de la suppression
  }
}
```

#### Suppression d'un flux complet

```typescript
// Frontend: fluxFinancier.ts
static async deleteFlux(fluxId: number) {
  try {
    // Étape 1: Supprimer le flux et récupérer les fileIds
    const deleteFluxResponse = await apiClient.delete(`/flux-financier/${fluxId}`);

    if (!deleteFluxResponse.data.success) {
      return {
        success: false,
        message: 'Erreur lors de la suppression du flux'
      };
    }

    const fileIds = deleteFluxResponse.data.data?.fileIds || [];
    const preuvesCount = deleteFluxResponse.data.data?.preuvesCount || 0;

    // Étape 2: Supprimer tous les fichiers physiques (si présents)
    if (fileIds.length > 0) {
      const deleteFilesResult = await this.deleteMultipleFiles(fileIds);
      
      if (!deleteFilesResult.success) {
        // Certains fichiers n'ont pas pu être supprimés
        return {
          success: true,
          message: `Flux supprimé (${deleteFilesResult.deleted}/${preuvesCount} fichiers supprimés)`
        };
      }
    }

    return {
      success: true,
      message: `Flux et ${preuvesCount} fichier(s) supprimés avec succès`
    };
  } catch (error) {
    // Erreur lors de la suppression
  }
}
```

```typescript
// Frontend: Suppression parallèle des fichiers
static async deleteMultipleFiles(fileIds: string[]) {
  const deletePromises = fileIds.map(fileId => this.deleteFile(fileId));
  const results = await Promise.all(deletePromises);
  
  const deleted = results.filter(r => r.success).length;
  const failed = results.filter(r => !r.success).length;
  
  return {
    success: failed === 0,
    deleted,
    failed,
    message: failed > 0 
      ? `${deleted} fichier(s) supprimé(s), ${failed} échec(s)`
      : `${deleted} fichier(s) supprimé(s) avec succès`
  };
}
```

**Politique de suppression**:
- **Preuve unique** : Si la référence en base ne peut pas être supprimée → Échec complet
- **Preuve unique** : Si la référence est supprimée mais le fichier physique ne peut pas être supprimé → Succès avec warning
- **Flux complet** : Si le flux ne peut pas être supprimé → Échec complet
- **Flux complet** : Si le flux est supprimé mais certains fichiers ne peuvent pas être supprimés → Succès avec compteur partiel
- Les fichiers orphelins peuvent être nettoyés périodiquement par un job de maintenance

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

## 🔄 Récapitulatif des opérations

### Opérations de création

| Opération | Endpoint | Méthode | Auth | Description |
|-----------|----------|---------|------|-------------|
| **Upload fichier** | `/api/files/upload` | POST | API Key | Upload un fichier vers le file-service |
| **Upload multiple** | `/api/files/upload-multiple` | POST | API Key | Upload plusieurs fichiers en batch |
| **Créer flux** | `/flux-financier` | POST | Bearer Token | Crée un flux financier sans preuves |
| **Ajouter preuve** | `/flux-financier/:id/preuves` | POST | Bearer Token | Ajoute une preuve à un flux existant |
| **Workflow complet** | `createFluxWithFiles()` | - | - | Frontend: Upload + Création + Attachement |

### Opérations de lecture

| Opération | Endpoint | Méthode | Auth | Description |
|-----------|----------|---------|------|-------------|
| **Lister flux** | `/flux-financier` | GET | Bearer Token | Liste les flux avec filtres (mois, année, type) |
| **Détails flux** | `/flux-financier/:id` | GET | Bearer Token | Récupère un flux avec ses preuves |
| **Statistiques** | `/flux-financier/laverie/:id/stats` | GET | Bearer Token | Statistiques dépenses/recettes/solde |
| **Télécharger fichier** | `/api/files/download/:fileId` | GET | Public (UUID) | Télécharge un fichier (attachment) |
| **Visualiser fichier** | `/api/files/view/:fileId` | GET | Public (UUID) | Affiche un fichier (inline) |

### Opérations de suppression

| Opération | Endpoint | Méthode | Auth | Description |
|-----------|----------|---------|------|-------------|
| **Supprimer preuve** | `/flux-financier/preuves/:id` | DELETE | Bearer Token | Supprime une preuve (référence DB) |
| **Supprimer fichier** | `/api/files/:fileId` | DELETE | API Key | Supprime un fichier physique |
| **Supprimer flux** | `/flux-financier/:id` | DELETE | Bearer Token | Soft delete flux + suppression preuves |
| **Workflow preuve** | `deletePreuve()` | - | - | Frontend: Supprime référence + fichier |
| **Workflow flux** | `deleteFlux()` | - | - | Frontend: Supprime flux + tous fichiers |

### Règles de sécurité

| Ressource | Création | Lecture | Modification | Suppression |
|-----------|----------|---------|--------------|-------------|
| **Flux** | ✅ Tout manager | ✅ Créateur uniquement | ✅ Créateur + pending | ✅ Créateur + pending |
| **Preuve** | ✅ Créateur flux + pending | ✅ Avec le flux | ❌ Non modifiable | ✅ Créateur flux + pending |
| **Fichier** | ✅ API Key | ✅ Public (UUID) | ❌ Non modifiable | ✅ API Key |

**Légende** : 
- ✅ Autorisé
- ❌ Interdit
- "pending" = flux.validationStatus === 'pending'

## ✅ Checklist d'intégration

### Backend
- [ ] File Service démarré sur port 4540 (ou configuré dans FILE_SERVICE_URL)
- [ ] ~~Variables d'environnement configurées dans API Manager~~ (Non nécessaires - suppression gérée côté frontend)
- [ ] Migration Prisma appliquée (table FluxFinancierPreuve)
- [ ] Endpoints `/preuves` testés (POST pour ajouter, DELETE pour supprimer la référence)
- [ ] Suppression retourne le fileId au frontend pour permettre la suppression du fichier

### Frontend
- [ ] Upload multiple de fichiers implémenté
- [ ] Affichage des preuves dans l'interface (miniatures + liste)
- [ ] Gestion de la suppression de preuves avec confirmation
- [ ] Gestion de la suppression de flux complet avec confirmation
- [ ] Suppression en 2 étapes : référence DB puis fichier(s) physique(s)
- [ ] Suppression parallèle des fichiers pour les flux complets
- [ ] Rechargement automatique après suppression/ajout
- [ ] Gestion des erreurs d'upload/suppression (avec fallback si fichier non supprimé)
- [ ] Visualisation des images (inline) et PDFs
- [ ] Bouton "Supprimer" visible uniquement pour les flux en status "pending"

### Sécurité & Tests
- [ ] Tests de sécurité (tentative d'accès non autorisé)
- [ ] Tests de suppression de preuve (créateur vs non-créateur)
- [ ] Tests de suppression de preuve (flux pending vs validated/rejected)
- [ ] Tests de suppression de flux (créateur vs non-créateur)
- [ ] Tests de suppression de flux (flux pending vs validated/rejected)
- [ ] Tests de suppression de flux avec preuves multiples
- [ ] Tests de performance (upload de 10 fichiers)
- [ ] Tests de suppression en cascade (preuve + fichier)
- [ ] Tests de suppression en cascade (flux + preuves + fichiers)
- [ ] Vérification des logs en cas d'erreur de suppression de fichier
- [ ] Tests de suppression parallèle des fichiers (performance)
