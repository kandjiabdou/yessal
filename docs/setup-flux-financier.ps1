# Script de configuration du module Flux Financier

Write-Host "=== Configuration du module Flux Financier ===" -ForegroundColor Green
Write-Host ""

# Vérifier si nous sommes dans le bon répertoire
$currentPath = Get-Location
if (-not (Test-Path "api-yessal")) {
    Write-Host "ERREUR: Veuillez exécuter ce script depuis le dossier racine du projet" -ForegroundColor Red
    exit 1
}

Write-Host "1. Installation des dépendances de la base partagée..." -ForegroundColor Cyan
Set-Location "shared-database/prisma"
if (Test-Path "package.json") {
    npm install
    if ($LASTEXITCODE -ne 0) {
        Write-Host "ERREUR: Installation des dépendances échouée" -ForegroundColor Red
        exit 1
    }
} else {
    Write-Host "AVERTISSEMENT: package.json non trouvé dans shared-database/prisma" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "2. Génération du client Prisma partagé..." -ForegroundColor Cyan
npx prisma generate
if ($LASTEXITCODE -ne 0) {
    Write-Host "ERREUR: Génération du client Prisma échouée" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "3. Installation des dépendances de l'API..." -ForegroundColor Cyan
Set-Location "../../api-yessal"
npm install
if ($LASTEXITCODE -ne 0) {
    Write-Host "ERREUR: Installation des dépendances API échouée" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "4. Vérification de la configuration..." -ForegroundColor Cyan

# Vérifier si le fichier .env existe
if (-not (Test-Path ".env")) {
    Write-Host "AVERTISSEMENT: Fichier .env non trouvé" -ForegroundColor Yellow
    Write-Host "Veuillez créer un fichier .env avec les variables suivantes:" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "DATABASE_URL='mysql://user:password@localhost:3306/yessal_manager'" -ForegroundColor White
    Write-Host "DATABASE_SHARED_URL='mysql://user:password@localhost:3306/yessal_shared'" -ForegroundColor White
    Write-Host "JWT_SECRET='your_secret_key'" -ForegroundColor White
    Write-Host "PORT=4520" -ForegroundColor White
    Write-Host ""
} else {
    $envContent = Get-Content ".env" -Raw
    
    if ($envContent -notmatch "DATABASE_SHARED_URL") {
        Write-Host "AVERTISSEMENT: DATABASE_SHARED_URL non trouvée dans .env" -ForegroundColor Yellow
        Write-Host "Ajoutez cette ligne à votre fichier .env:" -ForegroundColor Yellow
        Write-Host "DATABASE_SHARED_URL='mysql://user:password@localhost:3306/yessal_shared'" -ForegroundColor White
        Write-Host ""
    } else {
        Write-Host "✓ DATABASE_SHARED_URL trouvée dans .env" -ForegroundColor Green
    }
}

Write-Host ""
Write-Host "5. Migration de la base de données partagée..." -ForegroundColor Cyan
$response = Read-Host "Voulez-vous exécuter les migrations maintenant? (o/N)"
if ($response -eq "o" -or $response -eq "O") {
    Set-Location "../shared-database/prisma"
    npx prisma migrate dev --name init_flux_financier
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✓ Migration réussie" -ForegroundColor Green
    } else {
        Write-Host "ERREUR: Migration échouée" -ForegroundColor Red
        Write-Host "Vous pouvez l'exécuter manuellement plus tard avec:" -ForegroundColor Yellow
        Write-Host "cd shared-database/prisma" -ForegroundColor White
        Write-Host "npx prisma migrate dev" -ForegroundColor White
    }
} else {
    Write-Host "Migration ignorée. Exécutez-la manuellement avec:" -ForegroundColor Yellow
    Write-Host "cd shared-database/prisma" -ForegroundColor White
    Write-Host "npx prisma migrate dev" -ForegroundColor White
}

Write-Host ""
Write-Host "=== Configuration terminée ===" -ForegroundColor Green
Write-Host ""
Write-Host "Prochaines étapes:" -ForegroundColor Cyan
Write-Host "1. Vérifiez votre fichier .env" -ForegroundColor White
Write-Host "2. Exécutez les migrations si ce n'est pas fait" -ForegroundColor White
Write-Host "3. Démarrez l'API: npm run dev" -ForegroundColor White
Write-Host "4. Testez les endpoints: http://localhost:4520/api-docs" -ForegroundColor White
Write-Host ""
Write-Host "Documentation complète: api-yessal/FLUX_FINANCIER_README.md" -ForegroundColor Cyan

Set-Location $currentPath
