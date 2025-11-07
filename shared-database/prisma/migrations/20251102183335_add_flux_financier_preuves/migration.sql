/*
  Warnings:

  - You are about to drop the column `preuveUrl` on the `fluxfinancier` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE `fluxfinancier` DROP COLUMN `preuveUrl`;

-- CreateTable
CREATE TABLE `FluxFinancierPreuve` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `fluxFinancierId` INTEGER NOT NULL,
    `fileId` VARCHAR(191) NOT NULL,
    `filename` VARCHAR(191) NOT NULL,
    `downloadUrl` TEXT NOT NULL,
    `mimetype` VARCHAR(191) NOT NULL,
    `size` INTEGER NOT NULL,
    `uploadedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `FluxFinancierPreuve_fluxFinancierId_idx`(`fluxFinancierId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `FluxFinancierPreuve` ADD CONSTRAINT `FluxFinancierPreuve_fluxFinancierId_fkey` FOREIGN KEY (`fluxFinancierId`) REFERENCES `FluxFinancier`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
