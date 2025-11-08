# Tests du File Service avec curl

## Configuration
```bash
FILE_SERVICE_URL=http://localhost:4600
API_KEY=yessal-manager-2025
```

## 1. Health Check

```bash
curl http://localhost:4600/health
```

**Réponse attendue:**
```json
{
  "status": "OK",
  "service": "Yessal File Service",
  "version": "1.0.0",
  "timestamp": "2025-11-02T..."
}
```

## 2. Upload un fichier

### Créer un fichier de test
```bash
echo "Test PDF content" > test.pdf
```

### Upload
```bash
curl -X POST http://localhost:4600/api/files/upload \
  -H "x-api-key: yessal-manager-2025" \
  -F "file=@test.pdf" \
  -F "uploadedBy=1" \
  -F "context=flux_financier" \
  -F "description=Test preuve"
```

**Réponse attendue:**
```json
{
  "success": true,
  "message": "Fichier uploadé avec succès",
  "data": {
    "fileId": "uuid-xxx",
    "filename": "test.pdf",
    "mimetype": "application/pdf",
    "size": 123,
    "downloadUrl": "http://localhost:4600/api/files/download/uuid-xxx?token=xxx",
    "uploadedAt": "2025-11-02T..."
  }
}
```

## 3. Récupérer les infos d'un fichier

```bash
FILE_ID="uuid-from-upload-response"

curl -X GET http://localhost:4600/api/files/$FILE_ID \
  -H "x-api-key: yessal-manager-2025"
```

**Réponse attendue:**
```json
{
  "success": true,
  "data": {
    "fileId": "uuid-xxx",
    "filename": "test.pdf",
    "mimetype": "application/pdf",
    "size": 123,
    "downloadUrl": "http://localhost:4600/api/files/download/uuid-xxx?token=xxx",
    "uploadedAt": "2025-11-02T...",
    "metadata": {
      "uploadedBy": "1",
      "source": "MANAGER",
      "context": "flux_financier",
      "description": "Test preuve"
    }
  }
}
```

## 4. Télécharger un fichier

```bash
# Utiliser l'URL complète avec token de la réponse précédente
DOWNLOAD_URL="http://localhost:4600/api/files/download/uuid-xxx?token=xxx"

curl -X GET "$DOWNLOAD_URL" -o downloaded-file.pdf
```

## 5. Lister tous les fichiers

```bash
curl -X GET http://localhost:4600/api/files \
  -H "x-api-key: yessal-manager-2025"
```

### Avec filtre par source
```bash
curl -X GET "http://localhost:4600/api/files?source=manager" \
  -H "x-api-key: yessal-manager-2025"
```

**Réponse attendue:**
```json
{
  "success": true,
  "data": [
    {
      "fileId": "uuid-xxx",
      "filename": "test.pdf",
      "mimetype": "application/pdf",
      "size": 123,
      "uploadedAt": "2025-11-02T...",
      "metadata": {...},
      "downloadUrl": "http://localhost:4600/api/files/download/uuid-xxx?token=xxx"
    }
  ],
  "total": 1
}
```

## 6. Supprimer un fichier

```bash
FILE_ID="uuid-from-upload-response"

curl -X DELETE http://localhost:4600/api/files/$FILE_ID \
  -H "x-api-key: yessal-manager-2025"
```

**Réponse attendue:**
```json
{
  "success": true,
  "message": "Fichier supprimé avec succès"
}
```

## 7. Tests d'erreurs

### 7.1 Upload sans API Key
```bash
curl -X POST http://localhost:4600/api/files/upload \
  -F "file=@test.pdf"
```

**Réponse attendue: 401**
```json
{
  "success": false,
  "message": "API Key manquante"
}
```

### 7.2 Upload avec mauvaise API Key
```bash
curl -X POST http://localhost:4600/api/files/upload \
  -H "x-api-key: wrong-key" \
  -F "file=@test.pdf"
```

**Réponse attendue: 403**
```json
{
  "success": false,
  "message": "API Key invalide"
}
```

### 7.3 Téléchargement sans token
```bash
curl -X GET http://localhost:4600/api/files/download/uuid-xxx
```

**Réponse attendue: 401**
```json
{
  "success": false,
  "message": "Token de téléchargement manquant"
}
```

### 7.4 Upload fichier non autorisé
```bash
echo "test" > test.txt

curl -X POST http://localhost:4600/api/files/upload \
  -H "x-api-key: yessal-manager-2025" \
  -F "file=@test.txt"
```

**Réponse attendue: 400**
```json
{
  "success": false,
  "message": "Type de fichier non autorisé..."
}
```

### 7.5 Fichier inexistant
```bash
curl -X GET http://localhost:4600/api/files/non-existent-id \
  -H "x-api-key: yessal-manager-2025"
```

**Réponse attendue: 404**
```json
{
  "success": false,
  "message": "Fichier non trouvé"
}
```

### 7.6 Supprimer fichier d'une autre source
```bash
# Manager tente de supprimer un fichier uploadé par Associé
curl -X DELETE http://localhost:4600/api/files/associe-file-id \
  -H "x-api-key: yessal-manager-2025"
```

**Réponse attendue: 403**
```json
{
  "success": false,
  "message": "Vous n'avez pas l'autorisation de supprimer ce fichier"
}
```

## 📝 Tests avec Postman

### Collection Postman

Créer une collection avec les variables d'environnement:
- `baseUrl`: `http://localhost:4600`
- `apiKey`: `yessal-manager-2025`

### Requêtes:

1. **Health Check**
   - GET `{{baseUrl}}/health`

2. **Upload File**
   - POST `{{baseUrl}}/api/files/upload`
   - Headers: `x-api-key: {{apiKey}}`
   - Body: form-data
     - file: (fichier)
     - uploadedBy: 1
     - context: flux_financier
     - description: Test

3. **Get File Info**
   - GET `{{baseUrl}}/api/files/{{fileId}}`
   - Headers: `x-api-key: {{apiKey}}`

4. **Download File**
   - GET `{{downloadUrl}}` (URL complète avec token)

5. **List Files**
   - GET `{{baseUrl}}/api/files`
   - Headers: `x-api-key: {{apiKey}}`

6. **Delete File**
   - DELETE `{{baseUrl}}/api/files/{{fileId}}`
   - Headers: `x-api-key: {{apiKey}}`

## 🎯 Scénario complet de test

```bash
#!/bin/bash

echo "🧪 Tests du File Service"
echo "========================"

API_KEY="yessal-manager-2025"
BASE_URL="http://localhost:4600"

# 1. Health check
echo -e "\n1️⃣  Health Check"
curl -s $BASE_URL/health | jq

# 2. Upload fichier
echo -e "\n2️⃣  Upload fichier"
echo "Test content" > test-file.pdf
UPLOAD_RESPONSE=$(curl -s -X POST $BASE_URL/api/files/upload \
  -H "x-api-key: $API_KEY" \
  -F "file=@test-file.pdf" \
  -F "uploadedBy=1" \
  -F "context=test" \
  -F "description=Test automatique")

echo $UPLOAD_RESPONSE | jq

# Extraire fileId et downloadUrl
FILE_ID=$(echo $UPLOAD_RESPONSE | jq -r '.data.fileId')
DOWNLOAD_URL=$(echo $UPLOAD_RESPONSE | jq -r '.data.downloadUrl')

# 3. Récupérer info
echo -e "\n3️⃣  Récupérer info fichier"
curl -s -X GET $BASE_URL/api/files/$FILE_ID \
  -H "x-api-key: $API_KEY" | jq

# 4. Télécharger
echo -e "\n4️⃣  Télécharger fichier"
curl -s -X GET "$DOWNLOAD_URL" -o downloaded.pdf
echo "Fichier téléchargé: downloaded.pdf"

# 5. Lister
echo -e "\n5️⃣  Lister fichiers"
curl -s -X GET $BASE_URL/api/files \
  -H "x-api-key: $API_KEY" | jq

# 6. Supprimer
echo -e "\n6️⃣  Supprimer fichier"
curl -s -X DELETE $BASE_URL/api/files/$FILE_ID \
  -H "x-api-key: $API_KEY" | jq

# Nettoyage
rm -f test-file.pdf downloaded.pdf

echo -e "\n✅ Tests terminés"
```

Sauvegarder ce script dans `test-file-service.sh` et exécuter:
```bash
chmod +x test-file-service.sh
./test-file-service.sh
```
