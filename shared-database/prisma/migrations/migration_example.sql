-- CreateEnum
CREATE TABLE IF NOT EXISTS `_prisma_migrations` (
  `id` VARCHAR(36) NOT NULL,
  `checksum` VARCHAR(64) NOT NULL,
  `finished_at` DATETIME(3) NULL,
  `migration_name` VARCHAR(255) NOT NULL,
  `logs` TEXT NULL,
  `rolled_back_at` DATETIME(3) NULL,
  `started_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `applied_steps_count` INTEGER UNSIGNED NOT NULL DEFAULT 0,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- CreateTable FluxFinancier
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
    `description` TEXT NULL,
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

-- CreateIndex pour améliorer les performances
CREATE INDEX `FluxFinancier_laverieId_dateFluxFinancier_idx` ON `FluxFinancier`(`laverieId`, `dateFluxFinancier`);
CREATE INDEX `FluxFinancier_createdBy_idx` ON `FluxFinancier`(`createdBy`);
CREATE INDEX `FluxFinancier_sourceApp_validationStatus_idx` ON `FluxFinancier`(`sourceApp`, `validationStatus`);
CREATE INDEX `FluxFinancier_dateFluxFinancier_idx` ON `FluxFinancier`(`dateFluxFinancier`);
CREATE INDEX `FluxFinancier_flagged_idx` ON `FluxFinancier`(`flagged`);
