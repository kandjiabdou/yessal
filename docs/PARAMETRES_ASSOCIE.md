# Documentation - Système de Paramètres Associé

## 📋 Vue d'ensemble

Implémentation complète d'un système de paramètres propre et modulaire pour l'application Associé, avec séparation des responsabilités et respect des principes SOLID.

## 🗄️ Modifications de la Base de Données

### Nouveau Schéma Prisma

#### Table `entreprise`
```prisma
model entreprise {
  id                Int      @id @default(autoincrement())
  nom               String
  adresse           String?
  ville             String?
  telephone         String?
  email             String?
  devise            devise   @default(FCFA)
  tauxConversion    Float    @default(655.96) // 1 EUR = X FCFA
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt
  
  @@index([nom])
}
```

#### Modifications de la table `user`
```prisma
model user {
  // ... champs existants ...
  devisePreference devise   @default(FCFA) // Nouveau champ
  // ...
}

enum devise {
  FCFA
  EUR
}
```

### Commandes appliquées
```bash
cd associe-api-yessal
npx prisma db push
node scripts/init-entreprise.js
```

## 🏗️ Architecture Backend

### Structure des fichiers

```
associe-api-yessal/
├── src/
│   ├── services/
│   │   └── parametreService.js       # Logique métier
│   ├── controllers/
│   │   └── parametreController.js    # Gestion des requêtes
│   ├── routes/
│   │   └── parametreRoutes.js        # Définition des endpoints
│   └── middleware/
│       └── validation.js             # Ajout du schéma devisePreference
├── scripts/
│   └── init-entreprise.js            # Script d'initialisation
└── prisma/
    └── schema.prisma                 # Nouveau schéma
```

### Services (`parametreService.js`)

**Responsabilités :**
- Logique métier isolée
- Accès aux données via Prisma
- Validation métier

**Méthodes :**
```javascript
// Récupère les informations de l'entreprise
async getEntrepriseInfo(): Promise<Entreprise>

// Récupère les informations d'un utilisateur
async getUserInfo(userId): Promise<UserInfo>

// Met à jour la préférence de devise
async updateUserDevisePreference(userId, devise): Promise<User>

// Liste tous les associés
async listAssocies(): Promise<Associe[]>
```

### Contrôleurs (`parametreController.js`)

**Responsabilités :**
- Gestion des requêtes HTTP
- Extraction des données de la requête
- Appel aux services
- Formatage des réponses

**Endpoints :**
- `getEntrepriseInfo`: GET /api/parametres/entreprise
- `getUserInfo`: GET /api/parametres/user
- `updateDevisePreference`: PUT /api/parametres/devise-preference
- `listAssocies`: GET /api/parametres/associes

### Routes (`parametreRoutes.js`)

**Configuration :**
- Authentification requise sur tous les endpoints
- Autorisation: ASSOCIE et ADMIN
- Validation Joi pour les données entrantes
- Documentation Swagger intégrée

## 🎨 Architecture Frontend

### Structure des fichiers

```
associe-app-yessal/
├── src/
│   ├── services/
│   │   ├── auth.ts                   # Service auth nettoyé
│   │   └── parametre.ts              # Nouveau service paramètres
│   └── pages/
│       └── Parametres.tsx            # Page de paramètres refactorisée
```

### Service Auth (`auth.ts`) - Nettoyé

**Fonctions conservées :**
```typescript
// Authentification
login(credentials): Promise<LoginResponse>

// Gestion du token
getToken(): string | null
getUser(): User | null
isAuthenticated(): boolean

// Vérification des rôles
isAssocie(): boolean
isAdmin(): boolean

// Déconnexion
logout(): void
```

**Fonctions supprimées :**
- `getSitesLavage()` - Spécifique manager
- `getSitesWithSessionInfo()` - Spécifique manager
- `updateAssocieSite()` - Spécifique manager
- `setWorkSession()` - Spécifique manager
- `getWorkSession()` - Spécifique manager
- `updateActivity()` - Spécifique manager
- `forceUpdateSiteStatuses()` - Spécifique manager
- `updateSiteInfo()` - Spécifique manager
- `updateSiteStatus()` - Spécifique manager
- `changePassword()` - Déplacé vers API directe

### Nouveau Service Paramètres (`parametre.ts`)

**Interfaces TypeScript :**
```typescript
interface Entreprise {
  id: number;
  nom: string;
  adresse: string | null;
  ville: string | null;
  telephone: string | null;
  email: string | null;
  devise: 'FCFA' | 'EUR';
  tauxConversion: number;
}

interface UserInfo {
  id: number;
  role: string;
  nom: string;
  prenom: string;
  email: string | null;
  telephone: string | null;
  pourcentageParts: number;
  devisePreference: 'FCFA' | 'EUR';
}

interface Associe {
  id: number;
  nom: string;
  prenom: string;
  email: string | null;
  telephone: string | null;
  pourcentageParts: number;
}
```

**Méthodes :**
```typescript
getEntrepriseInfo(): Promise<Entreprise>
getUserInfo(): Promise<UserInfo>
updateDevisePreference(devise): Promise<void>
listAssocies(): Promise<Associe[]>
```

## 🎯 Fonctionnalités Implémentées

### Page Paramètres (`Parametres.tsx`)

#### 1. **Profil Utilisateur** (Lecture seule)
- Nom (figé)
- Prénom (figé)
- Email (figé)
- Téléphone (figé)
- Rôle et pourcentage de parts affiché en badge

#### 2. **Sécurité**
- Changement de mot de passe
- Validation côté client (min 6 caractères, confirmation)
- Appel direct à l'API auth

#### 3. **Informations Entreprise** (Lecture seule)
- Nom de l'entreprise
- Adresse
- Ville
- Devise principale
- Taux de conversion

#### 4. **Préférence de Devise** (Modifiable)
- Sélection FCFA ou EUR
- Mise à jour en temps réel
- Affichage du taux de conversion

#### 5. **Liste des Associés**
- Affichage de tous les associés
- Pourcentage de parts de chacun
- Indication visuelle "Vous" pour l'utilisateur connecté
- Total des parts calculé

#### 6. **Actions**
- Bouton de déconnexion

## 🔒 Sécurité

### Backend
- Authentification JWT requise
- Autorisation basée sur les rôles (ASSOCIE, ADMIN)
- Validation Joi des données entrantes
- Queries paramétrées Prisma (protection SQL injection)

### Frontend
- Token stocké de manière sécurisée (localStorage)
- Validation côté client avant envoi
- Gestion des erreurs API
- Redirection si non authentifié

## 📝 Exemples d'Utilisation

### Récupérer les informations de l'entreprise
```typescript
const entreprise = await parametreService.getEntrepriseInfo();
console.log(entreprise.nom); // "Yessal Lavage SARL"
```

### Changer la préférence de devise
```typescript
await parametreService.updateDevisePreference('EUR');
toast.success('Devise changée en EUR');
```

### Lister tous les associés
```typescript
const associes = await parametreService.listAssocies();
associes.forEach(a => {
  console.log(`${a.prenom} ${a.nom}: ${a.pourcentageParts}%`);
});
```

### Changer le mot de passe
```typescript
await apiClient.post('/auth/change-password', {
  currentPassword: 'ancien',
  newPassword: 'nouveau'
});
```

## 🎨 Interface Utilisateur

### Design System
- Composants shadcn/ui
- Tailwind CSS pour le styling
- Icons Lucide React
- Toast notifications (react-toastify)

### Responsive Design
- Grid layout adaptatif (1 colonne mobile, 2 colonnes desktop)
- Cartes bien espacées
- Boutons et inputs accessibles

### UX
- Champs figés en gris (disabled)
- Badges pour les rôles et pourcentages
- Feedback visuel immédiat (toast)
- Navigation intuitive (bouton retour)

## 📊 Données de Test

### Entreprise par défaut
```javascript
{
  nom: 'Yessal Lavage SARL',
  adresse: '123 Avenue des Affaires',
  ville: 'Dakar',
  telephone: '+221 33 123 45 67',
  email: 'contact@yessal.sn',
  devise: 'FCFA',
  tauxConversion: 655.96
}
```

## 🧪 Tests Recommandés

### Backend
```bash
# Test de récupération entreprise
GET /api/parametres/entreprise
Authorization: Bearer {token}

# Test changement devise
PUT /api/parametres/devise-preference
Authorization: Bearer {token}
Body: { "devise": "EUR" }

# Test liste associés
GET /api/parametres/associes
Authorization: Bearer {token}
```

### Frontend
1. Se connecter en tant qu'associé
2. Aller sur la page Paramètres
3. Vérifier l'affichage des informations
4. Changer la devise (FCFA ↔ EUR)
5. Modifier le mot de passe
6. Vérifier la liste des associés

## 🚀 Déploiement

### Backend
```bash
cd associe-api-yessal
npx prisma db push
node scripts/init-entreprise.js
npm run dev
```

### Frontend
```bash
cd associe-app-yessal
npm run dev
```

## ✅ Principes Respectés

### Clean Code
- ✅ Fonctions courtes et ciblées
- ✅ Noms explicites
- ✅ Commentaires pertinents
- ✅ Pas de code dupliqué

### SOLID
- ✅ Single Responsibility: chaque service a une responsabilité unique
- ✅ Open/Closed: extensible sans modification
- ✅ Liskov Substitution: interfaces cohérentes
- ✅ Interface Segregation: interfaces minimales
- ✅ Dependency Inversion: dépendances via abstractions

### Architecture
- ✅ Séparation des couches (Service → Controller → Routes)
- ✅ Séparation frontend/backend
- ✅ Types TypeScript stricts
- ✅ Validation des données
- ✅ Gestion d'erreurs centralisée

## 📚 Ressources

- [Prisma Documentation](https://www.prisma.io/docs)
- [Express Best Practices](https://expressjs.com/en/advanced/best-practice-security.html)
- [React TypeScript](https://react-typescript-cheatsheet.netlify.app/)
- [shadcn/ui Components](https://ui.shadcn.com/)
