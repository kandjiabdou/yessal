# 🚀 Guide d'intégration - Module Flux Financier

## ⚡ Démarrage rapide (5 minutes)

### 1. Structure créée

```
✅ Pages
└── src/pages/Depenses.tsx

✅ Composants
├── src/components/finance/AddFluxDialog.tsx
├── src/components/finance/FluxDetailDialog.tsx
└── src/components/finance/index.ts

✅ Services
└── src/services/fluxFinancier.ts

✅ Navigation
├── src/components/layout/BottomNav.tsx (modifié)
└── src/App.tsx (modifié)
```

### 2. URLs des services

Vérifiez dans `src/services/fluxFinancier.ts` :

```typescript
const FILE_SERVICE_URL = 'http://localhost:4600';
const FILE_SERVICE_API_KEY = 'yessal-manager-2025';
```

### 3. Accès

**URL** : `http://localhost:4510/depenses`  
**Navigation** : Menu du bas → Icône "Wallet" (💼)

## 🔧 Configuration requise

### Backend API (port 4520)

Routes nécessaires :
- `POST /api/flux-financier` - Créer un flux
- `GET /api/flux-financier?laverieId={id}` - Liste des flux
- `GET /api/flux-financier/{id}` - Détail d'un flux
- `POST /api/flux-financier/{id}/preuves` - Ajouter une preuve
- `DELETE /api/flux-financier/preuves/{id}` - Supprimer une preuve

### File Service (port 4600)

Routes nécessaires :
- `POST /api/files/upload` - Upload 1 fichier
- `POST /api/files/upload-multiple` - Upload multiple

**API Key** : `yessal-manager-2025` (header `x-api-key`)

## 📦 Dépendances

Toutes les dépendances sont déjà installées dans manager-app-yessal :

```json
{
  "lucide-react": "icônes",
  "axios": "HTTP client",
  "@/components/ui/*": "Shadcn UI"
}
```

## 🎯 Utiliser dans votre code

### Import du service

```typescript
import FluxFinancierService from '@/services/fluxFinancier';

// Créer un flux avec fichiers
const result = await FluxFinancierService.createFluxWithFiles(fluxData, files);

// Récupérer les flux d'une laverie
const fluxList = await FluxFinancierService.getFluxFinanciers(laverieId);
```

### Import des composants

```typescript
import { AddFluxDialog, FluxDetailDialog } from '@/components/finance';

// Utilisation
<AddFluxDialog 
  isOpen={isOpen} 
  onClose={() => setIsOpen(false)} 
  onSuccess={handleSuccess} 
/>
```

## 🧪 Tester l'implémentation

### 1. Démarrer les services

```bash
# Terminal 1 - API Backend
cd api-yessal
npm run dev

# Terminal 2 - File Service
cd file-service
npm run dev

# Terminal 3 - Manager App
cd manager-app-yessal
npm run dev
```

### 2. Vérifier les ports

- ✅ API Backend : http://localhost:4520
- ✅ File Service : http://localhost:4600
- ✅ Manager App : http://localhost:4510

### 3. Test manuel

1. Ouvrir http://localhost:4510/login
2. Se connecter avec un compte Manager
3. Aller sur "Dépenses" (menu du bas)
4. Cliquer sur "Ajouter une dépense"
5. Remplir le formulaire
6. Ajouter 2-3 images ou PDF
7. Cliquer sur "Créer"
8. Vérifier la liste mise à jour

### 4. Vérifications

**Frontend** :
- ✅ Page Dépenses accessible
- ✅ Bouton "Ajouter" visible
- ✅ Dashboard avec 3 cards affichées
- ✅ Table responsive

**Console** :
- ❌ Pas d'erreurs rouges
- ✅ Requêtes API en succès (200/201)

**Network** :
- ✅ POST /api/flux-financier → 201
- ✅ POST /api/files/upload-multiple → 201
- ✅ POST /api/flux-financier/{id}/preuves → 200

## 🐛 Résolution de problèmes

### Erreur : "Site de lavage non défini"

**Cause** : User.siteLavagePrincipalGerantId est null

**Solution** :
```typescript
// Dans AuthService ou au login
user.siteLavagePrincipalGerantId = 1; // ID d'un site existant
```

### Erreur : "Erreur lors de l'upload"

**Cause** : File service non démarré ou mauvaise URL

**Vérification** :
```bash
# Tester le file service
curl http://localhost:4600/api/health
```

**Solution** :
```typescript
// Vérifier dans fluxFinancier.ts
const FILE_SERVICE_URL = 'http://localhost:4600';
```

### Erreur 404 sur /api/flux-financier

**Cause** : Route backend non implémentée

**Solution** : Vérifier que l'API backend est à jour avec les routes flux-financier

### Upload bloqué à 20%

**Cause** : Erreur lors de la création du flux

**Vérification** :
1. Ouvrir DevTools → Network
2. Regarder la réponse de POST /api/flux-financier
3. Vérifier les logs du backend

### Fichiers non attachés

**Cause** : Upload réussi mais attachement échoué

**Vérification** :
1. Regarder la réponse de upload-multiple
2. Vérifier les logs lors de POST /preuves

## 📊 Données de test

### Créer un flux de test

```typescript
const testFlux = {
  type: 'depense',
  montant: 15000,
  dateFluxFinancier: '2025-11-02',
  motif: 'Test - Achat savon',
  beneficiaire: 'Fournisseur Test',
  sourceFinancement: 'caisse',
  description: 'Ceci est un test',
  laverieId: 1,
  createdBy: 1,
};
```

### Images de test

Utilisez n'importe quelle image JPG/PNG < 10MB de votre ordinateur.

## 🔒 Sécurité

### Validation automatique

✅ Type de fichier (client)  
✅ Taille de fichier (client)  
✅ Authentification JWT (API)  
✅ API Key (File Service)  
✅ Permissions (backend)

### Headers automatiques

Le service `apiClient` ajoute automatiquement :
- `Authorization: Bearer {token}`

Le service `FluxFinancierService` ajoute :
- `x-api-key: yessal-manager-2025`

## 📈 Prochaines étapes

### Fonctionnalités recommandées

1. **Détail de flux** : Cliquer sur une ligne du tableau
   ```typescript
   const [selectedFlux, setSelectedFlux] = useState<FluxFinancier | null>(null);
   
   <FluxDetailDialog 
     isOpen={!!selectedFlux} 
     onClose={() => setSelectedFlux(null)} 
     flux={selectedFlux} 
   />
   ```

2. **Filtres** : Par date, type, statut
   ```typescript
   const [filters, setFilters] = useState({
     type: 'all',
     status: 'all',
     dateFrom: '',
     dateTo: '',
   });
   ```

3. **Statistiques** : Graphiques mensuels
   ```typescript
   // Utiliser recharts ou chart.js
   <BarChart data={monthlyStats} />
   ```

## 📚 Documentation complète

- **Frontend** : `FLUX_FINANCIER_FRONTEND.md`
- **Backend API** : `api-yessal/INTEGRATION_FLUX_FINANCIER.md`
- **File Service** : `file-service/README.md`

## 🆘 Support

En cas de problème :

1. **Vérifier les logs** (Console + Backend + File Service)
2. **Vérifier les requêtes réseau** (DevTools → Network)
3. **Vérifier la configuration** (URLs, API Keys)
4. **Consulter la documentation**
5. **Contacter l'équipe dev**

---

**Prêt à coder !** 🚀
