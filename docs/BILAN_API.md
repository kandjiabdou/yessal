# API Bilan - Documentation

## Vue d'ensemble

L'API Bilan permet de récupérer le résultat d'exercice d'un site de lavage pour une période donnée (mois). Elle agrège les données de:
- Recettes de la laverie (commandes et abonnements)
- Flux financiers (dépenses et recettes supplémentaires)
- Boutique (à venir)

## Endpoint

### GET /api/bilan/laverie/:laverieId

Récupère le bilan financier d'une laverie pour un mois donné.

**Authentification**: Bearer Token requis  
**Autorisation**: Manager, Gerant, Admin

#### Paramètres

**Path Parameters:**
- `laverieId` (integer, required): ID de la laverie

**Query Parameters:**
- `month` (string, optional): Mois au format `YYYY-MM` (ex: `2025-02`)
  - Par défaut: mois en cours
  - Ne peut pas être dans le futur

#### Exemple de requête

```http
GET /api/bilan/laverie/1?month=2025-02
Authorization: Bearer <token>
```

#### Réponse Success (200 OK)

```json
{
  "success": true,
  "data": {
    "periode": {
      "mois": "2025-02",
      "debut": "2025-02-01",
      "fin": "2025-02-28"
    },
    "recettes": {
      "laverie": {
        "commandes": {
          "montant": 500000,
          "nombre": 45
        },
        "abonnements": {
          "montant": 150000,
          "nombre": 10
        },
        "total": 650000
      },
      "fluxFinanciers": {
        "montant": 100000,
        "nombre": 5
      },
      "boutique": {
        "montant": 0,
        "nombre": 0,
        "aVenir": true
      },
      "total": 750000
    },
    "depenses": {
      "fluxFinanciers": {
        "montant": 300000,
        "nombre": 15
      },
      "total": 300000
    },
    "resultat": {
      "montant": 450000,
      "pourcentage": 60,
      "type": "benefice"
    }
  }
}
```

#### Codes d'erreur

- **400 Bad Request**: Format de mois invalide ou mois futur demandé
- **401 Unauthorized**: Token manquant ou invalide
- **403 Forbidden**: Pas d'accès à cette laverie
- **404 Not Found**: Laverie introuvable
- **500 Internal Server Error**: Erreur serveur

## Structure des données

### BilanData

| Champ | Type | Description |
|-------|------|-------------|
| `periode` | Object | Période du bilan |
| `recettes` | Object | Détail des recettes |
| `depenses` | Object | Détail des dépenses |
| `resultat` | Object | Résultat de l'exercice |

### Recettes

#### Laverie
- **Commandes**: Montant total des commandes livrées/complétées
- **Abonnements**: Montant des abonnements actifs sur la période

#### Flux Financiers
- Recettes supplémentaires enregistrées via les flux financiers

#### Boutique
- À venir (actuellement à 0)

### Dépenses

#### Flux Financiers
- Toutes les dépenses enregistrées via les flux financiers

### Résultat

| Champ | Type | Description |
|-------|------|-------------|
| `montant` | number | Montant du résultat (recettes - dépenses) |
| `pourcentage` | number | Marge bénéficiaire en % |
| `type` | string | 'benefice' ou 'perte' |

## Règles de gestion

1. **Période**: Le bilan est calculé sur un mois calendaire complet
2. **Commandes**: Seules les commandes avec status `Livree` ou `Completed` sont comptabilisées
3. **Abonnements**: Les abonnements actifs pendant la période sont pris en compte
4. **Flux Financiers**: Les flux avec status `annule` sont exclus
5. **Mois futur**: Impossible de consulter le bilan d'un mois futur
6. **Accès**: Un manager ne peut consulter que le bilan de sa laverie principale

## Frontend

### Service TypeScript

```typescript
import BilanService from '@/services/bilan';

// Récupérer le bilan du mois en cours
const response = await BilanService.getBilan(laverieId);

// Récupérer le bilan d'un mois spécifique
const response = await BilanService.getBilan(laverieId, '2025-02');
```

### Page React

La page `Bilan.tsx` affiche:
- Navigation entre les mois (précédent/suivant)
- Carte du résultat principal (bénéfice/perte)
- Détail des recettes par source
- Détail des dépenses
- Formatage des montants en FCFA

## Tests

Pour tester l'API:

```bash
# Test avec curl
curl -X GET "http://localhost:3010/api/bilan/laverie/1?month=2025-02" \
  -H "Authorization: Bearer YOUR_TOKEN"

# Via Swagger UI
http://localhost:3010/api-docs
```

## Notes importantes

- ✅ Pas de calculs côté frontend, tout est fait par l'API
- ✅ Données en temps réel basées sur la base de données
- ✅ Performance optimisée avec requêtes parallèles
- ✅ Validation stricte des permissions d'accès
- 🔄 Module Boutique à venir (actuellement 0)
