# DOCUMENTATION SYSTÈME DE COMPTABILITÉ YESSAL

## 📋 Vue d'ensemble

Le système de comptabilité Yessal est un système **en temps réel** qui calcule automatiquement tous les indicateurs comptables à partir des **flux financiers validés**. Il permet un suivi instantané de la santé financière de l'entreprise.

### Principes clés

1. **Comptabilité de trésorerie** : Basée sur les encaissements et décaissements réels
2. **Temps réel** : Tous les indicateurs sont calculés à la demande (pas de cache)
3. **Validation obligatoire** : Seuls les flux validés sont pris en compte
4. **Multi-sources** : Combine les flux manuels et les recettes laverie automatiques
5. **Multi-laveries** : Possibilité de filtrer par laverie ou voir l'entreprise globale

---

## 🏗️ Architecture des données

### Sources de données

```
┌─────────────────────────────────────────────────────────────┐
│                  SOURCES DE DONNÉES                         │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  1. shared-database (FluxFinancier)                         │
│     ├── Dépenses (charges)                                  │
│     ├── Recettes marchandises (manuelles)                   │
│     ├── Apports associés                                    │
│     ├── Retraits associés                                   │
│     ├── Emprunts                                            │
│     └── Prêts                                               │
│                                                             │
│  2. api-yessal (Commande)                                   │
│     └── Recettes laverie (automatiques)                     │
│                                                             │
│  3. associe-api-yessal (Bilan, Resultat, PeriodeComptable)  │
│     └── Stockage des clôtures de période                    │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Types de flux financiers

| Type | Description | Impact Cash | Impact Dette | Validation |
|------|-------------|-------------|--------------|------------|
| **depense** | Charge payée (salaire, maintenance, etc.) | ❌ Diminue | - | Requise |
| **recette** | Vente de marchandises (manuel) | ✅ Augmente | - | Requise |
| **apport** | Apport de capital par associé | ✅ Augmente | ✅ Dette envers associé | Requise |
| **retrait** | Retrait par associé | ❌ Diminue | ❌ Diminue dette | Requise |
| **emprunt** | Emprunt auprès d'un tiers | ✅ Augmente | ✅ Dette envers tiers | Requise |
| **pret** | Prêt accordé à un tiers | ❌ Diminue | - | Requise |

---

## 🧮 Algorithmes de calcul

### 1. Trésorerie (Cash disponible)

#### Formule

```
Cash Total = Cash Initial + Encaissements - Décaissements

Avec:
- Encaissements = Recettes + Apports + Emprunts
- Décaissements = Dépenses + Retraits + Prêts
```

#### Répartition

Le cash est suivi par source de financement :

```
Cash Caisse = flux filtrés par sourceFinancement = 'caisse'
Cash Banque = flux filtrés par sourceFinancement = 'banque'
Cash Total = Cash Caisse + Cash Banque
```

#### Exemple de calcul

```javascript
// Flux validés
const flux = [
  { type: 'apport', montant: 1000000, sourceFinancement: 'banque' },
  { type: 'recette', montant: 50000, sourceFinancement: 'caisse' },
  { type: 'depense', montant: 30000, sourceFinancement: 'caisse' },
  { type: 'retrait', montant: 100000, sourceFinancement: 'banque' },
];

// Résultat
Cash Caisse = 0 + 50000 - 30000 = 20000 FCFA
Cash Banque = 0 + 1000000 - 100000 = 900000 FCFA
Cash Total = 920000 FCFA
```

### 2. Dettes envers les associés

#### Formule

```
Dette envers Associé = Apports + Emprunts_Associé - Retraits

Avec:
- Apports = flux type 'apport' de l'associé
- Emprunts_Associé = flux type 'emprunt' avec sourceFinancement = 'cash_associe'
- Retraits = flux type 'retrait' de l'associé
```

#### Identification des flux

Les flux d'un associé sont identifiés par :
- `associeUserRefId` : ID de la référence utilisateur (shared-database)
- Matching par email entre `associe-api-yessal` et `shared-database`

#### Exemple

```javascript
// Associé: Jean Dupont (60% des parts)
const fluxJean = [
  { type: 'apport', montant: 500000 },  // Apport initial
  { type: 'apport', montant: 200000 },  // Apport supplémentaire
  { type: 'retrait', montant: 50000 },  // Retrait
];

Dette envers Jean = 500000 + 200000 - 50000 = 650000 FCFA
```

### 3. Résultat de la période

#### Formule simplifiée

```
Résultat Net = Recettes Totales - Charges

Avec:
- Recettes Totales = Recettes Laverie + Recettes Marchandises
- Recettes Laverie = Calculées depuis les commandes payées (api-yessal)
- Recettes Marchandises = Flux type 'recette' (manuels)
- Charges = Flux type 'depense'
```

#### Calcul des recettes laverie

```javascript
// Depuis api-yessal.commande
SELECT SUM(prixPaye) 
FROM commande 
WHERE statut = 'Termine' 
  AND dateHeureCommande BETWEEN dateDebut AND dateFin
  AND prixPaye IS NOT NULL
```

#### Exemple mensuel (Janvier 2025)

```javascript
// Recettes
Recettes Laverie = 1500000 FCFA  // Depuis commandes
Recettes Marchandises = 300000 FCFA  // Flux manuels
Total Recettes = 1800000 FCFA

// Charges
Salaires = 400000 FCFA
Maintenance = 50000 FCFA
Électricité = 80000 FCFA
Autres charges = 70000 FCFA
Total Charges = 600000 FCFA

// Résultat
Résultat Net = 1800000 - 600000 = 1200000 FCFA
```

### 4. SIG (Soldes Intermédiaires de Gestion)

Le SIG décompose la formation du résultat par étapes :

#### Étapes de calcul

```
1. Chiffre d'Affaires (CA)
   = Recettes Laverie + Recettes Marchandises

2. Valeur Ajoutée (VA)
   = CA (car activité de services)

3. Excédent Brut d'Exploitation (EBE)
   = Valeur Ajoutée - Charges de Personnel

4. Résultat d'Exploitation
   = EBE - Charges d'Exploitation - Autres Charges

5. Résultat Courant
   = Résultat d'Exploitation - Charges Financières

6. Résultat Net
   = Résultat Courant (simplifié)
```

#### Classification des charges

Les charges sont classées automatiquement par mots-clés dans le motif :

| Catégorie | Mots-clés | Exemples |
|-----------|-----------|----------|
| **Personnel** | salaire | "Salaire gérant", "Salaire employé" |
| **Exploitation** | achat, maintenance, réparation, location, électricité, eau, fourniture | "Maintenance machine", "Électricité mensuelle" |
| **Financières** | intérêt, interet, frais bancaire | "Intérêts emprunt", "Frais bancaires" |
| **Autres** | Tout le reste | Charges non classifiées |

#### Ratios calculés

```
Taux de Marge EBE = (EBE / CA) × 100
Taux de Marge Nette = (Résultat Net / CA) × 100
```

#### Exemple SIG Janvier 2025

```
Chiffre d'Affaires:          1 800 000 FCFA
Valeur Ajoutée:              1 800 000 FCFA
  - Charges Personnel:         400 000 FCFA
═══════════════════════════════════════════
Excédent Brut d'Exploitation:1 400 000 FCFA  (Taux: 77.8%)
  - Charges Exploitation:      200 000 FCFA
═══════════════════════════════════════════
Résultat d'Exploitation:     1 200 000 FCFA
  - Charges Financières:             0 FCFA
═══════════════════════════════════════════
Résultat Courant:            1 200 000 FCFA
Résultat Net:                1 200 000 FCFA  (Taux: 66.7%)
```

### 5. Bilan comptable

Le bilan représente la situation patrimoniale à une date donnée.

#### Structure

```
╔═══════════════════════════════════════════════════════════════╗
║                    ACTIF                 │        PASSIF      ║
╠═══════════════════════════════════════════════════════════════╣
║ TRÉSORERIE                               │ DETTES             ║
║  • Cash Caisse           920 000         │  • Vers Associés   ║
║  • Cash Banque           920 000         │  • Vers Tiers      ║
║  Total Trésorerie      1 840 000         │  Total Dettes      ║
║                                          │                    ║
║ STOCK                                    │ CAPITAUX PROPRES   ║
║  • Valeur au coût         50 000         │  • Capital         ║
║                                          │  • Réserves        ║
║                                          │                    ║
║                                          │ RÉSULTAT           ║
║                                          │  • Période         ║
╠═══════════════════════════════════════════════════════════════╣
║ TOTAL ACTIF            1 890 000         │ TOTAL PASSIF       ║
╚═══════════════════════════════════════════════════════════════╝
```

#### Vérification de l'équilibre

```
Actif Total = Passif Total

Si Actif ≠ Passif → Erreur comptable
```

### 6. Clôture de période

La clôture fige les comptes et affecte le résultat.

#### Étapes automatiques

```
1. Calcul du Résultat Net de la période
2. Calcul du Bilan de fin
3. Calcul du SIG
4. Affectation du Résultat:
   - x% → Dividendes (répartis selon % de parts)
   - (100-x)% → Réserves
5. Enregistrement en base de données:
   - PeriodeComptable
   - Bilan
   - Resultat
   - AffectationResultat
```

#### Affectation du résultat

```
Résultat Net = 1 200 000 FCFA
Taux Dividendes = 30%

Montant Dividendes = 1 200 000 × 0.30 = 360 000 FCFA
Montant Réserves = 1 200 000 × 0.70 = 840 000 FCFA

Répartition par associé (exemple):
- Jean (60%): 360 000 × 0.60 = 216 000 FCFA
- Marie (40%): 360 000 × 0.40 = 144 000 FCFA
```

---

## 🔄 Fonctionnement en temps réel

### Mise à jour automatique

À chaque **validation de flux**, le système déclenche automatiquement :

```javascript
// Dans fluxFinancierService.validateFlux()
await comptabiliteService.onFluxValide(fluxId);
```

Cette fonction peut :
- Mettre à jour des caches
- Recalculer les indicateurs clés
- Envoyer des notifications
- Déclencher des alertes (ex: cash négatif)

### Calculs à la demande

Tous les endpoints calculent les valeurs **en temps réel** :

```javascript
// À chaque appel
GET /api/comptabilite/tresorerie
→ Récupère TOUS les flux validés
→ Calcule le cash actuel
→ Retourne le résultat

// Pas de cache, toujours à jour
```

### Performance

Pour optimiser les performances sur de gros volumes :
- Filtrage par date dès la requête Prisma
- Utilisation d'index sur `dateFluxFinancier`, `status`, `flagged`
- Possibilité de caching futur (Redis) si nécessaire

---

## 📡 Endpoints API

### Base URL
```
https://api.yessal.com/api/comptabilite
```

### 1. Trésorerie

#### GET `/tresorerie`

Obtient le cash disponible en temps réel.

**Query params:**
- `dateReference` (optionnel) : Date de référence (défaut: maintenant)

**Exemple:**
```bash
GET /api/comptabilite/tresorerie?dateReference=2025-01-31

Response:
{
  "success": true,
  "data": {
    "caisse": 120000,
    "banque": 950000,
    "total": 1070000
  }
}
```

### 2. Dettes

#### GET `/dettes`

Obtient les dettes envers chaque associé.

**Query params:**
- `dateReference` (optionnel) : Date de référence (défaut: maintenant)

**Exemple:**
```bash
GET /api/comptabilite/dettes

Response:
{
  "success": true,
  "data": {
    "dettes": [
      {
        "associeId": 1,
        "nom": "Dupont",
        "prenom": "Jean",
        "pourcentageParts": 0.6,
        "dette": 650000
      },
      {
        "associeId": 2,
        "nom": "Martin",
        "prenom": "Marie",
        "pourcentageParts": 0.4,
        "dette": 450000
      }
    ],
    "total": 1100000,
    "dateReference": "2025-01-15T..."
  }
}
```

### 3. Résultat

#### GET `/resultat`

Calcule le résultat d'une période.

**Query params:**
- `dateDebut` (requis) : Date de début
- `dateFin` (requis) : Date de fin
- `siteLavageId` (optionnel) : Filtre par laverie

**Exemple:**
```bash
GET /api/comptabilite/resultat?dateDebut=2025-01-01&dateFin=2025-01-31

Response:
{
  "success": true,
  "data": {
    "dateDebut": "2025-01-01T...",
    "dateFin": "2025-01-31T...",
    "recettesLaverie": 1500000,
    "recettesMarchandises": 300000,
    "recettesTotal": 1800000,
    "charges": 600000,
    "resultatNet": 1200000
  }
}
```

#### GET `/resultat/mois-courant`

Résultat du mois en cours.

#### GET `/resultat/annee-courante`

Résultat de l'année en cours.

### 4. SIG (Soldes Intermédiaires de Gestion)

#### GET `/sig`

Calcule le SIG d'une période.

**Query params:**
- `dateDebut` (requis) : Date de début
- `dateFin` (requis) : Date de fin
- `siteLavageId` (optionnel) : Filtre par laverie

**Exemple:**
```bash
GET /api/comptabilite/sig?dateDebut=2025-01-01&dateFin=2025-01-31

Response:
{
  "success": true,
  "data": {
    "chiffreAffaires": 1800000,
    "valeurAjoutee": 1800000,
    "chargesPersonnel": 400000,
    "ebe": 1400000,
    "chargesExploitation": 200000,
    "resultatExploitation": 1200000,
    "chargesFinancieres": 0,
    "resultatCourant": 1200000,
    "resultatNet": 1200000,
    "tauxMargeEBE": 77.78,
    "tauxMargeNette": 66.67
  }
}
```

#### GET `/sig/mensuel`

SIG mensuel d'une année (12 mois).

**Query params:**
- `annee` (requis) : Année (ex: 2025)
- `siteLavageId` (optionnel)

**Exemple:**
```bash
GET /api/comptabilite/sig/mensuel?annee=2025

Response:
{
  "success": true,
  "data": [
    { "mois": 1, "annee": 2025, "chiffreAffaires": 1800000, "ebe": 1400000, ... },
    { "mois": 2, "annee": 2025, "chiffreAffaires": 1950000, "ebe": 1500000, ... },
    ...
  ]
}
```

#### GET `/sig/annuel`

SIG annuel.

### 5. Bilan

#### GET `/bilan`

Obtient le bilan à une date donnée.

**Query params:**
- `dateReference` (optionnel) : Date du bilan (défaut: maintenant)
- `siteLavageId` (optionnel) : Filtre par laverie

**Exemple:**
```bash
GET /api/comptabilite/bilan?dateReference=2025-01-31

Response:
{
  "success": true,
  "data": {
    "dateBilan": "2025-01-31T...",
    "actif": {
      "tresorerie": {
        "caisse": 120000,
        "banque": 950000,
        "total": 1070000
      },
      "stock": 50000,
      "total": 1120000
    },
    "passif": {
      "dettes": {
        "associes": [...],
        "totalAssocies": 1100000,
        "tiers": 0,
        "total": 1100000
      },
      "capitauxPropres": 0,
      "reserves": 0,
      "resultatPeriode": 20000,
      "total": 1120000
    },
    "equilibre": true,
    "ecart": 0
  }
}
```

### 6. Clôture de période

#### POST `/cloture`

Clôture une période comptable.

**Body:**
```json
{
  "dateDebut": "2025-01-01",
  "dateFin": "2025-01-31",
  "tauxDividende": 0.3,
  "siteLavageId": null
}
```

**Response:**
```json
{
  "success": true,
  "message": "Période clôturée avec succès",
  "data": {
    "periodeComptable": {...},
    "resultat": {...},
    "sig": {...},
    "bilan": {...},
    "affectation": {
      "resultatNet": 1200000,
      "tauxDividende": 0.3,
      "montantDividendes": 360000,
      "montantReserves": 840000,
      "affectationsAssocies": [...]
    }
  }
}
```

### 7. Dashboard

#### GET `/dashboard`

Tableau de bord complet en temps réel.

**Query params:**
- `dateReference` (optionnel) : Date de référence
- `siteLavageId` (optionnel) : Filtre par laverie

**Exemple:**
```bash
GET /api/comptabilite/dashboard

Response:
{
  "success": true,
  "data": {
    "dateReference": "2025-01-15T...",
    "tresorerie": {
      "caisse": 120000,
      "banque": 950000,
      "total": 1070000
    },
    "dettesAssocies": [...],
    "totalDettes": 1100000,
    "moisCourant": {
      "mois": 1,
      "annee": 2025,
      "resultat": {...},
      "sig": {...}
    },
    "anneeCourante": {
      "annee": 2025,
      "resultat": {...}
    }
  }
}
```

### 8. Recalcul

#### POST `/recalcul`

Déclenche un recalcul complet sur une période.

**Body:**
```json
{
  "dateDebut": "2025-01-01",
  "dateFin": "2025-01-31",
  "siteLavageId": null
}
```

**Response:**
```json
{
  "success": true,
  "message": "Recalcul effectué avec succès",
  "data": {
    "resultat": {...},
    "sig": {...},
    "bilan": {...}
  }
}
```

---

## 🎯 Cas d'usage

### 1. Consulter le cash disponible

**Besoin:** Savoir combien d'argent l'entreprise a en caisse et en banque.

**Action:**
```bash
GET /api/comptabilite/tresorerie
```

**Usage:** Avant de prendre une décision d'achat ou d'investissement.

### 2. Voir ce que l'entreprise doit à chaque associé

**Besoin:** Connaître les dettes envers les associés (apports non remboursés).

**Action:**
```bash
GET /api/comptabilite/dettes
```

**Usage:** Pour planifier les remboursements ou les dividendes.

### 3. Connaître la rentabilité du mois

**Besoin:** Savoir si le mois en cours est profitable.

**Action:**
```bash
GET /api/comptabilite/resultat/mois-courant
```

**Usage:** Suivi mensuel de la performance.

### 4. Analyser la performance avec le SIG

**Besoin:** Comprendre où va l'argent (personnel, exploitation, etc.).

**Action:**
```bash
GET /api/comptabilite/sig?dateDebut=2025-01-01&dateFin=2025-01-31
```

**Usage:** Identifier les postes de charges à optimiser.

### 5. Voir l'évolution sur l'année

**Besoin:** Comparer les mois de l'année pour voir les tendances.

**Action:**
```bash
GET /api/comptabilite/sig/mensuel?annee=2025
```

**Usage:** Rapports de gestion, présentation aux associés.

### 6. Clôturer l'exercice annuel

**Besoin:** Figer les comptes de fin d'année et distribuer les dividendes.

**Action:**
```bash
POST /api/comptabilite/cloture
{
  "dateDebut": "2025-01-01",
  "dateFin": "2025-12-31",
  "tauxDividende": 0.3
}
```

**Usage:** À la fin de l'exercice comptable.

### 7. Tableau de bord pour les associés

**Besoin:** Vue d'ensemble instantanée de la situation.

**Action:**
```bash
GET /api/comptabilite/dashboard
```

**Usage:** Page d'accueil de l'app associés.

---

## ⚠️ Points d'attention

### 1. Validation obligatoire

❌ **Les flux non validés ne sont PAS pris en compte dans les calculs.**

✅ Workflow correct :
1. Créer le flux (`POST /api/flux-financier`)
2. Ajouter les preuves (`POST /api/flux-financier/:id/preuves`)
3. **Valider le flux** (`POST /api/flux-financier/:id/validate`)
4. → Le flux est maintenant pris en compte dans la comptabilité

### 2. Recettes laverie vs Flux manuels

- **Recettes laverie** : Calculées automatiquement depuis `api-yessal.commande`
- **Recettes marchandises** : Flux manuels de type `recette`

⚠️ Ne pas créer de flux `recette` pour les laveries, c'est automatique !

### 3. Dettes vs Capitaux propres

**Dette envers associé** = L'entreprise doit de l'argent à l'associé
- Apport → Dette augmente
- Retrait → Dette diminue

**Capitaux propres** = Argent définitivement investi (ne sera pas remboursé)

### 4. Performance sur gros volumes

Pour des milliers de flux :
- Utiliser les filtres de date pour limiter la période
- Filtrer par `siteLavageId` si possible
- Envisager un système de cache (Redis) pour le dashboard

### 5. Cohérence des données

Le système vérifie l'équilibre comptable :
```javascript
if (actifTotal !== passifTotal) {
  // Alerte : incohérence comptable
}
```

Si `equilibre: false` → Vérifier les flux et les calculs.

---

## 🚀 Évolutions futures

### 1. Amortissements

Gérer l'amortissement des immobilisations (machines, véhicules).

### 2. Provisions

Constituer des provisions pour risques et charges.

### 3. Inventaire de stock

Système de suivi des stocks avec valorisation dynamique.

### 4. Rapprochements bancaires

Comparer les flux avec les relevés bancaires.

### 5. Multi-devises

Support de l'Euro et autres devises avec conversion automatique.

### 6. Analytique multi-axes

- Par laverie
- Par type de service
- Par gérant
- Par période

### 7. Prévisions

Projections de trésorerie et de résultat basées sur l'historique.

---

## 📞 Support

Pour toute question sur la comptabilité Yessal :
- **Documentation technique** : `associe-api-yessal/src/services/comptabiliteService.js`
- **Exemples d'utilisation** : Tests dans le repository
- **Contact développeur** : Voir README.md

---

**Version:** 1.0  
**Dernière mise à jour:** Janvier 2025  
**Auteur:** Équipe Yessal
