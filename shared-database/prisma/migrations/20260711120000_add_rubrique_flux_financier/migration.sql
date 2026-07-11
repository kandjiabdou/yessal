-- AlterTable: rattache chaque flux financier à une activité pour le bilan par activité.
-- Les lignes existantes deviennent 'Commun' (elles n'apparaîtront donc que dans le bilan global).
ALTER TABLE `FluxFinancier` ADD COLUMN `rubrique` ENUM('Laverie', 'Boutique', 'Commun') NOT NULL DEFAULT 'Commun';
