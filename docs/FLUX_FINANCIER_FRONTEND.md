# 💰 Module Gestion des Flux Financiers - Manager App

## 📋 Vue d'ensemble

Module de gestion des dépenses et recettes pour les managers de sites de lavage Yessal. Permet de créer, suivre et valider les flux financiers avec pièces jointes.

## 🎯 Fonctionnalités

### ✅ Implémenté
- ✅ Page "Dépenses" dans le menu de navigation (icône Wallet)
- ✅ Dashboard avec 3 cartes : Total Dépenses, Total Recettes, Solde
- ✅ Formulaire d'ajout de flux financier (dépense/recette)
- ✅ Upload multiple de fichiers (images + PDF)
- ✅ Tableau de liste des transactions
- ✅ Service API complet avec gestion des fichiers
- ✅ Validation des fichiers côté client
- ✅ Barre de progression pendant l'upload
- ✅ Design responsive (mobile-first)

### 🔜 À venir (non implémenté)
- ⏳ Validation/rejet des flux (admin)
- ⏳ Filtres par date, type, statut
- ⏳ Export PDF/Excel
- ⏳ Statistiques avancées
- ⏳ Notifications de validation

## 🗂️ Structure des fichiers

```
manager-app-yessal/
├── src/
│   ├── pages/
│   │   └── Depenses.tsx                 # Page principale
│   ├── components/
│   │   ├── finance/
│   │   │   ├── AddFluxDialog.tsx        # Formulaire d'ajout
│   │   │   └── index.ts                 # Exports
│   │   └── layout/
│   │       └── BottomNav.tsx            # Navigation (modifiée)
│   ├── services/
│   │   └── fluxFinancier.ts             # Service API
│   └── App.tsx                          # Routes (modifiée)
```

## 🚀 Utilisation

### 1. Accès à la page
- Depuis le menu de navigation en bas
- Icône "Wallet" (💼)
- Label "Dépenses"

### 2. Ajouter une transaction

**Champs obligatoires :**
- **Type** : Dépense ou Recette
- **Montant** : Somme en FCFA (nombre positif)
- **Date** : Date du flux financier
- **Pièces jointes** : ⚠️ **Au moins un fichier obligatoire** (images ou PDF)

**Champs optionnels :**
- **Motif** : Description courte (ex: "Achat détergent")
- **Bénéficiaire** : Nom du fournisseur
- **Source de financement** : Caisse, Banque, Autre
- **Description** : Détails supplémentaires

**Pièces jointes (OBLIGATOIRES) :**
- ⚠️ **Au moins un fichier requis**
- Images : JPEG, JPG, PNG, GIF, WEBP
- Documents : PDF
- Taille max par fichier : 10 MB
- Nombre max de fichiers : 10 par transaction

**Données auto-remplies :**
- **laverieId** : Site du manager connecté (`siteLavagePrincipalGerantId`)
- **createdBy** : ID du manager connecté

### 3. Upload de fichiers

**Types acceptés :**
- Images : JPEG, JPG, PNG, GIF, WEBP
- Documents : PDF

**Limites :**
- ⚠️ **Au moins 1 fichier obligatoire**
- Taille max par fichier : 10 MB
- Nombre max de fichiers : 10 par transaction

**Validation :**
- Vérification du type MIME côté client
- Vérification de la taille avant upload
- Vérification qu'au moins un fichier est sélectionné
- Erreurs affichées en temps réel

### 4. Workflow d'ajout

```
1. Clic sur "Ajouter une dépense"
2. Remplissage du formulaire
3. Sélection des fichiers (⚠️ OBLIGATOIRE - au moins 1 fichier)
4. Clic sur "Créer"
5. Validation : fichiers sélectionnés ?
6. Progression : 0% → 20% (création flux) → 100% (upload + attachement)
7. Fermeture automatique du dialog
8. Rechargement de la liste
```

## 🔧 Services API

### FluxFinancierService

#### Méthodes disponibles

```typescript
// Créer un flux financier
createFluxFinancier(data: CreateFluxFinancierData): Promise<FluxFinancierResponse>

// Récupérer tous les flux d'une laverie
getFluxFinanciers(laverieId: number): Promise<FluxFinancier[]>

// Récupérer un flux par ID
getFluxFinancierById(id: number): Promise<FluxFinancier | null>

// Upload un fichier
uploadFile(file: File, uploadedBy: number): Promise<UploadFileResponse>

// Upload multiple (batch)
uploadMultipleFiles(files: File[], uploadedBy: number): Promise<UploadMultipleFilesResponse>

// Ajouter une preuve à un flux
addPreuve(fluxId: number, preuveData): Promise<FluxFinancierResponse>

// Supprimer une preuve
deletePreuve(preuveId: number): Promise<{ success: boolean }>

// Workflow complet (recommandé)
createFluxWithFiles(fluxData, files: File[]): Promise<{ success: boolean; fluxId?: number }>
```

#### Exemple d'utilisation

```typescript
import FluxFinancierService from '@/services/fluxFinancier';
import AuthService from '@/services/auth';

const user = AuthService.getUser();

const fluxData = {
  type: 'depense',
  montant: 25000,
  dateFluxFinancier: '2025-11-02',
  motif: 'Achat détergent',
  beneficiaire: 'Fournisseur XYZ',
  sourceFinancement: 'caisse',
  description: 'Achat de 10 bidons de 5L',
  laverieId: user.siteLavagePrincipalGerantId,
  createdBy: user.id,
};

const files = [file1, file2, file3]; // FileList converti en Array

// Méthode recommandée (tout-en-un)
const result = await FluxFinancierService.createFluxWithFiles(fluxData, files);

if (result.success) {
  console.log(`Flux créé avec l'ID ${result.fluxId}`);
}
```

## 📊 Structure des données

### FluxFinancier

```typescript
interface FluxFinancier {
  id: number;
  type: 'depense' | 'recette';
  montant: number;
  dateFluxFinancier: string; // ISO 8601
  motif?: string;
  beneficiaire?: string;
  sourceFinancement?: 'caisse' | 'banque' | 'autre';
  description?: string;
  status: 'pending' | 'validated' | 'rejected';
  laverieId: number;
  createdBy: number;
  validatedBy?: number;
  validatedAt?: string;
  createdAt: string;
  updatedAt: string;
  preuves?: FluxFinancierPreuve[];
}
```

### FluxFinancierPreuve

```typescript
interface FluxFinancierPreuve {
  id: number;
  fluxFinancierId: number;
  fileId: string;
  filename: string;
  downloadUrl: string; // URL signée (valide 1h)
  mimetype: string;
  size: number;
  uploadedAt: string;
}
```

## 🎨 Design

### Dashboard Cards
- **Total Dépenses** : Rouge avec icône TrendingDown
- **Total Recettes** : Vert avec icône TrendingUp
- **Solde** : Vert si positif, rouge si négatif

### Table
- **Colonnes** : Date, Type, Motif, Bénéficiaire, Montant, Statut, Preuves
- **Type badge** : Rouge (dépense), Vert (recette)
- **Statut badge** : Jaune (pending), Vert (validated), Rouge (rejected)
- **Montant** : +/- selon le type

### Responsive
- Mobile : 1 colonne pour les cards
- Tablet : 2 colonnes
- Desktop : 3 colonnes
- Table : scroll horizontal sur mobile

## 🔐 Sécurité

### Validation côté client
- Type de fichier (MIME type)
- Taille de fichier (max 10MB)
- Montant > 0
- Site de lavage défini
- ⚠️ **Au moins un fichier sélectionné** (obligatoire)

### API
- Authentification JWT (via apiClient)
- API Key pour file-service
- Permissions sur suppression (admin uniquement)
- URLs signées pour les fichiers (expiration 1h)

## 🐛 Gestion des erreurs

### Cas gérés
- ✅ Site de lavage non défini
- ✅ Fichier trop volumineux
- ✅ Type de fichier non autorisé
- ✅ Aucun fichier sélectionné (au moins 1 obligatoire)
- ✅ Échec de création du flux
- ✅ Échec d'upload de fichiers
- ✅ Échec d'attachement de preuves
- ✅ Erreur réseau
- ✅ Tentative de suppression de la dernière preuve

### Affichage
- Erreurs dans le dialog (bandeau rouge)
- Messages de succès (rechargement de la liste)
- Barre de progression (feedback visuel)

## 📝 TODO / Améliorations futures

### Fonctionnalités
- [ ] Détail d'une transaction (modale)
- [ ] Édition d'une transaction (si pending)
- [ ] Suppression d'une transaction (si pending)
- [ ] Filtres avancés (date, type, statut)
- [ ] Recherche par motif/bénéficiaire
- [ ] Export Excel/PDF
- [ ] Graphiques de statistiques
- [ ] Notifications de validation
- [ ] Historique des modifications

### UX/UI
- [ ] Skeleton loading pour le tableau
- [ ] Pagination de la liste
- [ ] Tri par colonnes
- [ ] Aperçu des images en lightbox
- [ ] Téléchargement groupé de preuves
- [ ] Drag & drop pour upload
- [ ] Confirmation avant suppression

### Performance
- [ ] Lazy loading des images
- [ ] Cache des flux financiers
- [ ] Optimistic updates
- [ ] Debounce sur recherche

### Validation Admin
- [ ] Interface de validation/rejet
- [ ] Commentaires sur validation
- [ ] Notifications managers
- [ ] Dashboard admin avec stats globales

## 🧪 Tests

À implémenter :
- Tests unitaires des services
- Tests de composants (Vitest + React Testing Library)
- Tests E2E (Playwright)

## 📞 Support

Pour toute question ou problème :
1. Vérifier les logs du navigateur (Console)
2. Vérifier les logs de l'API backend
3. Vérifier les logs du file-service
4. Contacter l'équipe de développement

---

**Version** : 1.0.0  
**Date** : 2 novembre 2025  
**Auteur** : Équipe Yessal
