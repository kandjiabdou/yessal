# Collection de requêtes pour tester l'API Flux Financier

## Variables
Remplacez ces valeurs par les vôtres :
- `{{BASE_URL}}` : http://localhost:4520
- `{{TOKEN}}` : Votre JWT token après login
- `{{LAVERIE_ID}}` : ID d'une laverie existante

---

## 1. Authentication

### Login (obtenir le token)
```bash
curl -X POST {{BASE_URL}}/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "manager@yessal.sn",
    "password": "your_password"
  }'
```

**Réponse attendue :**
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "user": { ... },
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "..."
  }
}
```

---

## 2. Créer un flux financier

### Créer une dépense
```bash
curl -X POST {{BASE_URL}}/api/flux-financier \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer {{TOKEN}}" \
  -d '{
    "type": "depense",
    "montant": 50000,
    "dateFluxFinancier": "2025-02-01T10:00:00Z",
    "motif": "Achat de détergent",
    "beneficiaire": "Fournisseur ABC",
    "sourceFinancement": "caisse",
    "description": "Achat mensuel de produits de lavage",
    "preuveUrl": "https://drive.google.com/file/d/123456",
    "laverieId": 1
  }'
```

### Créer une recette
```bash
curl -X POST {{BASE_URL}}/api/flux-financier \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer {{TOKEN}}" \
  -d '{
    "type": "recette",
    "montant": 150000,
    "dateFluxFinancier": "2025-02-01T15:00:00Z",
    "motif": "Ventes journée",
    "description": "Recettes de la journée du 1er février",
    "laverieId": 1
  }'
```

### Créer un flux sans laverie
```bash
curl -X POST {{BASE_URL}}/api/flux-financier \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer {{TOKEN}}" \
  -d '{
    "type": "depense",
    "montant": 25000,
    "dateFluxFinancier": "2025-02-01T12:00:00Z",
    "motif": "Frais administratifs",
    "description": "Frais généraux de gestion"
  }'
```

---

## 3. Consulter les flux

### Obtenir tous les flux du manager connecté
```bash
curl -X GET "{{BASE_URL}}/api/flux-financier" \
  -H "Authorization: Bearer {{TOKEN}}"
```

### Filtrer par type (dépenses uniquement)
```bash
curl -X GET "{{BASE_URL}}/api/flux-financier?type=depense" \
  -H "Authorization: Bearer {{TOKEN}}"
```

### Filtrer par laverie
```bash
curl -X GET "{{BASE_URL}}/api/flux-financier?laverieId={{LAVERIE_ID}}" \
  -H "Authorization: Bearer {{TOKEN}}"
```

### Filtrer par période
```bash
curl -X GET "{{BASE_URL}}/api/flux-financier?startDate=2025-02-01&endDate=2025-02-28" \
  -H "Authorization: Bearer {{TOKEN}}"
```

### Filtrer par statut de validation
```bash
curl -X GET "{{BASE_URL}}/api/flux-financier?validationStatus=pending" \
  -H "Authorization: Bearer {{TOKEN}}"
```

### Pagination
```bash
curl -X GET "{{BASE_URL}}/api/flux-financier?page=1&limit=10" \
  -H "Authorization: Bearer {{TOKEN}}"
```

### Combinaison de filtres
```bash
curl -X GET "{{BASE_URL}}/api/flux-financier?type=recette&laverieId=1&startDate=2025-02-01&page=1&limit=20" \
  -H "Authorization: Bearer {{TOKEN}}"
```

---

## 4. Obtenir un flux spécifique

```bash
curl -X GET "{{BASE_URL}}/api/flux-financier/1" \
  -H "Authorization: Bearer {{TOKEN}}"
```

---

## 5. Flux par laverie

### Tous les flux d'une laverie
```bash
curl -X GET "{{BASE_URL}}/api/flux-financier/laverie/{{LAVERIE_ID}}" \
  -H "Authorization: Bearer {{TOKEN}}"
```

### Flux d'une laverie avec filtres
```bash
curl -X GET "{{BASE_URL}}/api/flux-financier/laverie/{{LAVERIE_ID}}?type=depense&startDate=2025-02-01" \
  -H "Authorization: Bearer {{TOKEN}}"
```

---

## 6. Statistiques

### Statistiques d'une laverie (toutes périodes)
```bash
curl -X GET "{{BASE_URL}}/api/flux-financier/laverie/{{LAVERIE_ID}}/stats" \
  -H "Authorization: Bearer {{TOKEN}}"
```

### Statistiques sur une période
```bash
curl -X GET "{{BASE_URL}}/api/flux-financier/laverie/{{LAVERIE_ID}}/stats?startDate=2025-02-01&endDate=2025-02-28" \
  -H "Authorization: Bearer {{TOKEN}}"
```

**Réponse attendue :**
```json
{
  "success": true,
  "data": {
    "depenses": {
      "total": 150000,
      "count": 5
    },
    "recettes": {
      "total": 300000,
      "count": 12
    },
    "solde": 150000,
    "devise": "FCFA"
  }
}
```

---

## 7. Mettre à jour un flux

### Modifier un flux (doit être pending et créé par vous)
```bash
curl -X PUT "{{BASE_URL}}/api/flux-financier/1" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer {{TOKEN}}" \
  -d '{
    "montant": 55000,
    "description": "Montant ajusté après vérification",
    "preuveUrl": "https://drive.google.com/file/d/updated"
  }'
```

### Modifier uniquement la description
```bash
curl -X PUT "{{BASE_URL}}/api/flux-financier/1" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer {{TOKEN}}" \
  -d '{
    "description": "Nouvelle description"
  }'
```

---

## 8. Supprimer un flux

```bash
curl -X DELETE "{{BASE_URL}}/api/flux-financier/1" \
  -H "Authorization: Bearer {{TOKEN}}"
```

**Note :** C'est un soft delete (flagged = true), le flux reste en base.

---

## 9. Cas d'erreur

### Tentative sans authentification
```bash
curl -X GET "{{BASE_URL}}/api/flux-financier"
```

**Réponse :**
```json
{
  "success": false,
  "message": "Authentication required. No token provided."
}
```

### Type invalide
```bash
curl -X POST {{BASE_URL}}/api/flux-financier \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer {{TOKEN}}" \
  -d '{
    "type": "emprunt",
    "montant": 50000,
    "dateFluxFinancier": "2025-02-01T10:00:00Z"
  }'
```

**Réponse :**
```json
{
  "success": false,
  "message": "Le type doit être \"depense\" ou \"recette\""
}
```

### Montant négatif
```bash
curl -X POST {{BASE_URL}}/api/flux-financier \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer {{TOKEN}}" \
  -d '{
    "type": "depense",
    "montant": -1000,
    "dateFluxFinancier": "2025-02-01T10:00:00Z"
  }'
```

**Réponse :**
```json
{
  "success": false,
  "message": "Le montant doit être un nombre positif"
}
```

### Champs obligatoires manquants
```bash
curl -X POST {{BASE_URL}}/api/flux-financier \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer {{TOKEN}}" \
  -d '{
    "type": "depense"
  }'
```

**Réponse :**
```json
{
  "success": false,
  "message": "Les champs type, montant et dateFluxFinancier sont obligatoires"
}
```

---

## 10. Collection Postman (JSON)

Vous pouvez importer cette collection dans Postman :

```json
{
  "info": {
    "name": "Yessal - Flux Financier API",
    "schema": "https://schema.getpostman.com/json/collection/v2.1.0/collection.json"
  },
  "variable": [
    {
      "key": "BASE_URL",
      "value": "http://localhost:4520"
    },
    {
      "key": "TOKEN",
      "value": ""
    },
    {
      "key": "LAVERIE_ID",
      "value": "1"
    }
  ],
  "item": [
    {
      "name": "Auth",
      "item": [
        {
          "name": "Login",
          "request": {
            "method": "POST",
            "header": [],
            "body": {
              "mode": "raw",
              "raw": "{\n  \"email\": \"manager@yessal.sn\",\n  \"password\": \"your_password\"\n}",
              "options": {
                "raw": {
                  "language": "json"
                }
              }
            },
            "url": {
              "raw": "{{BASE_URL}}/api/auth/login",
              "host": ["{{BASE_URL}}"],
              "path": ["api", "auth", "login"]
            }
          }
        }
      ]
    },
    {
      "name": "Flux Financier",
      "item": [
        {
          "name": "Créer une dépense",
          "request": {
            "method": "POST",
            "header": [
              {
                "key": "Authorization",
                "value": "Bearer {{TOKEN}}"
              }
            ],
            "body": {
              "mode": "raw",
              "raw": "{\n  \"type\": \"depense\",\n  \"montant\": 50000,\n  \"dateFluxFinancier\": \"2025-02-01T10:00:00Z\",\n  \"motif\": \"Achat de détergent\",\n  \"beneficiaire\": \"Fournisseur ABC\",\n  \"sourceFinancement\": \"caisse\",\n  \"description\": \"Achat mensuel\",\n  \"laverieId\": {{LAVERIE_ID}}\n}",
              "options": {
                "raw": {
                  "language": "json"
                }
              }
            },
            "url": {
              "raw": "{{BASE_URL}}/api/flux-financier",
              "host": ["{{BASE_URL}}"],
              "path": ["api", "flux-financier"]
            }
          }
        },
        {
          "name": "Lister tous les flux",
          "request": {
            "method": "GET",
            "header": [
              {
                "key": "Authorization",
                "value": "Bearer {{TOKEN}}"
              }
            ],
            "url": {
              "raw": "{{BASE_URL}}/api/flux-financier",
              "host": ["{{BASE_URL}}"],
              "path": ["api", "flux-financier"]
            }
          }
        },
        {
          "name": "Statistiques laverie",
          "request": {
            "method": "GET",
            "header": [
              {
                "key": "Authorization",
                "value": "Bearer {{TOKEN}}"
              }
            ],
            "url": {
              "raw": "{{BASE_URL}}/api/flux-financier/laverie/{{LAVERIE_ID}}/stats",
              "host": ["{{BASE_URL}}"],
              "path": ["api", "flux-financier", "laverie", "{{LAVERIE_ID}}", "stats"]
            }
          }
        }
      ]
    }
  ]
}
```

---

## Notes importantes

1. **Token JWT** : Expire après 24h par défaut. Utilisez le refresh token si nécessaire.

2. **Format de date** : Utilisez le format ISO 8601 : `2025-02-01T10:00:00Z`

3. **Montants** : Toujours en FCFA, pas de décimales nécessaires pour les centimes

4. **Pagination** : Par défaut, limite de 50 résultats. Utilisez `page` et `limit` pour plus.

5. **Soft delete** : Les flux supprimés ont `flagged = true` mais restent en base.

6. **Permissions** : Seul le créateur peut modifier/supprimer ses flux (si pending).

---

Bonne utilisation de l'API ! 🚀
