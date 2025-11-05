-- CreateTable
CREATE TABLE `FluxFinancier` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `type` ENUM('depense', 'recette', 'emprunt', 'pret') NOT NULL DEFAULT 'depense',
    `montant` DECIMAL(65, 30) NOT NULL,
    `devise` ENUM('FCFA', 'EUR', 'USD') NOT NULL DEFAULT 'FCFA',
    `dateFluxFinancier` DATETIME(3) NOT NULL,
    `motif` VARCHAR(191) NULL,
    `beneficiaire` VARCHAR(191) NULL,
    `sourceFinancement` ENUM('caisse', 'banque', 'emprunt', 'autre') NULL,
    `actionnaire` VARCHAR(191) NULL,
    `statut` ENUM('pending', 'validated', 'rejected', 'annule') NULL,
    `dateEcheance` DATETIME(3) NULL,
    `description` VARCHAR(191) NULL,
    `preuveUrl` VARCHAR(191) NULL,
    `sourceApp` ENUM('manager', 'associe') NOT NULL,
    `laverieId` INTEGER NULL,
    `laverieName` VARCHAR(191) NULL,
    `createdBy` VARCHAR(191) NOT NULL,
    `validatedBy` VARCHAR(191) NULL,
    `flagged` BOOLEAN NOT NULL DEFAULT false,
    `validationStatus` ENUM('pending', 'validated', 'rejected') NOT NULL DEFAULT 'pending',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
