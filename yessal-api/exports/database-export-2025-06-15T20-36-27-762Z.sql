-- Export de la base de données Yessal
-- Date: 2025-06-15T20:36:27.763Z
-- Généré automatiquement par le script d'export

SET NAMES utf8mb4;
SET CHARACTER SET utf8mb4;

-- Données de la table User
SET FOREIGN_KEY_CHECKS = 0;
DELETE FROM `User`;
INSERT INTO `User` (`id`, `role`, `nom`, `prenom`, `email`, `telephone`, `motDePasseHash`, `loginGoogleId`, `adresseText`, `latitude`, `longitude`, `aGeolocalisationEnregistree`, `typeClient`, `estEtudiant`, `siteLavagePrincipalGerantId`, `createdAt`, `updatedAt`) VALUES
  (1, 'Manager', 'Ndoye', 'Serigne', 'serigne.ndoye@example.sn', '+221770122430', '$2b$10$ugrH42esCN22wuBRgld1o.sqCdM/.j562Ko5rsLsZjm0G5/8NgjLu', NULL, 'Rue 140 Louga', 15.03981, -16.409089, 1, NULL, 0, 2, '2025-05-22 19:51:29', '2025-06-15 19:04:48'),
  (2, 'Manager', 'Ba', 'Khady', 'khady.ba@example.sn', '+221793968811', '$2b$10$47vTGpEEsk098pa0FKOO2.mMOky.NR0pUkmxiW7Mez1K5Cuj1NTru', NULL, 'Rue 41 Louga', 15.11658, -16.161256, 1, NULL, 0, 2, '2025-05-22 19:51:30', '2025-05-22 19:51:30'),
  (3, 'Client', 'Diallo', 'Babacar', 'babacar.diallo@example.sn', '+221761245713', '$2b$10$9zCQeQeGlljxptKbtYgaOeoM5B3XE5PSJmpNQ1hvstAVJP0cxyQqq', NULL, 'Rue 188 Ziguinchor', 15.277671, -16.119773, 1, 'Premium', 0, NULL, '2025-05-22 19:51:30', '2025-05-22 19:51:30'),
  (4, 'Client', 'Faye', 'Moussa', 'moussa.faye@example.sn', '+221767600012', '$2b$10$AB3sIWLR8grev.Ik4qzbY.oJ5sZu8Re6CIWuiTa51cu6YGGai1DSC', NULL, 'Rue 77 Dakar', 15.845275, -16.119543, 1, 'Premium', 1, NULL, '2025-05-22 19:51:30', '2025-05-22 19:51:30'),
  (5, 'Client', 'Ndiaye', 'Mame', 'mame.ndiaye@example.sn', '+221799552225', '$2b$10$SHvt1r/uRNcyh9jZcOHss.XxoZKWS3NhyW1xddyCAkFSeTx5vXRC.', NULL, 'Rue 192 Saint-Louis', 15.053709, -16.401439, 1, 'Premium', 0, NULL, '2025-05-22 19:51:30', '2025-05-22 19:51:30'),
  (6, 'Client', 'Ndiaye', 'Fatou', NULL, '771234567', NULL, NULL, NULL, NULL, NULL, 0, 'Standard', 0, NULL, '2025-05-22 19:51:30', '2025-05-22 19:51:30'),
  (7, 'Client', 'Diop', 'Moussa', NULL, '772345678', NULL, NULL, NULL, NULL, NULL, 0, 'Standard', 0, NULL, '2025-05-22 19:51:30', '2025-05-22 19:51:30'),
  (8, 'Client', 'Sow', 'Aminata', NULL, '773456789', NULL, NULL, NULL, NULL, NULL, 0, 'Standard', 0, NULL, '2025-05-22 19:51:30', '2025-05-22 19:51:30'),
  (9, 'Client', 'Diallo', 'Ibrahima', NULL, '774567890', NULL, NULL, NULL, NULL, NULL, 0, 'Standard', 0, NULL, '2025-05-22 19:51:30', '2025-05-22 19:51:30'),
  (10, 'Client', 'Ba', 'Mariama', NULL, '775678901', NULL, NULL, NULL, NULL, NULL, 0, 'Standard', 0, NULL, '2025-05-22 19:51:30', '2025-05-22 19:51:30'),
  (11, 'Client', 'Cissé', 'Omar', NULL, '776789012', NULL, NULL, NULL, NULL, NULL, 0, 'Standard', 0, NULL, '2025-05-22 19:51:30', '2025-05-22 19:51:30'),
  (12, 'Client', 'Faye', 'Aïcha', NULL, '777890123', NULL, NULL, NULL, NULL, NULL, 0, 'Standard', 0, NULL, '2025-05-22 19:51:30', '2025-05-22 19:51:30'),
  (13, 'Client', 'Gueye', 'Modou', NULL, '778901234', NULL, NULL, NULL, NULL, NULL, 0, 'Standard', 0, NULL, '2025-05-22 19:51:30', '2025-05-22 19:51:30'),
  (14, 'Client', 'Kane', 'Khadija', NULL, '779012345', NULL, NULL, NULL, NULL, NULL, 0, 'Standard', 0, NULL, '2025-05-22 19:51:30', '2025-05-22 19:51:30'),
  (15, 'Client', 'Mbaye', 'Cheikh', NULL, '770123456', NULL, NULL, NULL, NULL, NULL, 0, 'Standard', 0, NULL, '2025-05-22 19:51:30', '2025-05-22 19:51:30'),
  (16, 'Client', 'Fall', 'Mamadou', NULL, '771112233', NULL, NULL, NULL, NULL, NULL, 0, 'Standard', 1, NULL, '2025-05-22 19:51:30', '2025-05-22 19:51:30'),
  (17, 'Client', 'Sy', 'Aminata', NULL, '772223344', NULL, NULL, NULL, NULL, NULL, 0, 'Standard', 1, NULL, '2025-05-22 19:51:30', '2025-05-22 19:51:30'),
  (18, 'Client', 'Diouf', 'Omar', NULL, '773334455', NULL, NULL, NULL, NULL, NULL, 0, 'Standard', 1, NULL, '2025-05-22 19:51:30', '2025-05-22 19:51:30'),
  (19, 'Client', 'Niang', 'Fatou', NULL, '774445566', NULL, NULL, NULL, NULL, NULL, 0, 'Standard', 1, NULL, '2025-05-22 19:51:30', '2025-05-22 19:51:30'),
  (20, 'Client', 'Sarr', 'Ibrahima', NULL, '775556677', NULL, NULL, NULL, NULL, NULL, 0, 'Standard', 1, NULL, '2025-05-22 19:51:30', '2025-05-22 19:51:30'),
  (21, 'Client', 'Sow', 'Fatima', 'fatima.sow@student.example.sn', '+221776543210', NULL, NULL, NULL, NULL, NULL, 0, 'Premium', 1, NULL, '2025-05-22 19:51:30', '2025-05-22 19:51:30'),
  (22, 'Client', 'Ndiaye', 'Soda', 'soda76@gmail.com', '768054947', '$2b$10$hFNGIOxMT4LRndjZRsiXoOCwiuhQMsthZon1Qq3C4OeZaf/c0xqCe', NULL, '114 boulevard maxime gorki', NULL, NULL, 0, 'Standard', 0, NULL, '2025-05-22 20:45:00', '2025-05-22 20:45:00'),
  (23, 'Manager', 'FALL', 'Anta', 'anta.fall@example.sn', '772693154', '$2b$10$47vTGpEEsk098pa0FKOO2.mMOky.NR0pUkmxiW7Mez1K5Cuj1NTru', NULL, NULL, NULL, NULL, 0, 'Standard', 0, NULL, '2025-06-01 12:05:11', '2025-06-01 12:05:11'),
  (24, 'Client', 'Fall', 'Fatou', NULL, '777858566', NULL, NULL, NULL, NULL, NULL, 0, 'Standard', 0, NULL, '2025-06-09 12:51:01', '2025-06-09 12:51:01'),
  (25, 'Client', 'KANDJI', 'Abdou', 'abdou.k.kandji@gmail.com', '777858568', NULL, NULL, '114 boulevard maxime gorki', NULL, NULL, 0, 'Standard', 0, NULL, '2025-06-15 16:10:50', '2025-06-15 16:10:50');
SET FOREIGN_KEY_CHECKS = 1;

-- Données de la table Livreur
SET FOREIGN_KEY_CHECKS = 0;
DELETE FROM `Livreur`;
INSERT INTO `Livreur` (`id`, `nom`, `prenom`, `email`, `telephone`, `adresseText`, `moyenLivraison`, `statutDisponibilite`, `createdAt`, `updatedAt`) VALUES
  (1, 'Diallo', 'Babacar', 'babacar.diallo@livreur.sn', '+221769170266', 'Zone de livraison Dakar', 'Voiture', 1, '2025-05-22 19:51:30', '2025-05-22 19:51:30'),
  (2, 'Fall', 'Moussa', 'moussa.fall@livreur.sn', '+221795057816', 'Zone de livraison Kaolack', 'Moto', 1, '2025-05-22 19:51:30', '2025-05-22 19:51:30');
SET FOREIGN_KEY_CHECKS = 1;

-- Données de la table SiteLavage
SET FOREIGN_KEY_CHECKS = 0;
DELETE FROM `SiteLavage`;
INSERT INTO `SiteLavage` (`id`, `nom`, `adresseText`, `ville`, `latitude`, `longitude`, `telephone`, `horaireOuvertureText`, `statutOuverture`, `createdAt`, `updatedAt`) VALUES
  (1, 'Site Dakar', 'Quartier Grand Yoff', 'Dakar', 15.459215, -16.493975, '+221793884127', '8h - 20h', 1, '2025-05-22 19:51:29', '2025-05-22 19:51:29'),
  (2, 'Site Thiès', 'Quartier Grand Yoff', 'Thiès', 14.691727, -16.136461, '+221776870799', '8h - 20h', 1, '2025-05-22 19:51:29', '2025-05-22 19:51:29');
SET FOREIGN_KEY_CHECKS = 1;

-- Aucune donnée dans la table MachineLavage

-- Données de la table ClientInvite
SET FOREIGN_KEY_CHECKS = 0;
DELETE FROM `ClientInvite`;
INSERT INTO `ClientInvite` (`id`, `nom`, `prenom`, `telephone`, `email`, `adresseText`) VALUES
  (1, 'Client sans compte', NULL, NULL, NULL, NULL),
  (2, 'Diop Seynabou', NULL, NULL, NULL, NULL),
  (3, 'Client sans compte', NULL, NULL, NULL, NULL),
  (4, 'TALL Fatou', NULL, NULL, NULL, NULL),
  (5, 'FALL', 'Modou', '', '', ''),
  (6, 'DIOP', 'DEMBA', '', '', '');
SET FOREIGN_KEY_CHECKS = 1;

-- Données de la table Commande
SET FOREIGN_KEY_CHECKS = 0;
DELETE FROM `Commande`;
INSERT INTO `Commande` (`id`, `clientUserId`, `clientInviteId`, `siteLavageId`, `gerantCreationUserId`, `gerantReceptionUserId`, `livreurId`, `dateHeureCommande`, `dateDernierStatutChange`, `statut`, `masseClientIndicativeKg`, `masseVerifieeKg`, `estEnLivraison`, `prixTotal`, `modePaiement`, `typeReduction`, `formuleCommande`, `createdAt`, `updatedAt`) VALUES
  (1, NULL, NULL, 2, 1, NULL, NULL, '2025-05-22 20:02:24', '2025-05-22 20:02:24', 'PrisEnCharge', 20, 20, 0, 4000, 'Espece', NULL, 'BaseMachine', '2025-05-22 20:02:24', '2025-05-22 20:02:24'),
  (2, 21, NULL, 1, 1, NULL, NULL, '2025-05-22 20:11:15', '2025-05-23 08:59:26', 'Livraison', 11, 11, 1, 1000, 'Espece', 'Etudiant', 'BaseMachine', '2025-05-22 20:11:15', '2025-05-23 08:59:26'),
  (3, 7, NULL, 2, 1, NULL, NULL, '2025-05-22 20:12:13', '2025-05-22 20:12:13', 'PrisEnCharge', 12, 12, 0, 4000, 'Espece', NULL, 'BaseMachine', '2025-05-22 20:12:13', '2025-05-22 20:12:13'),
  (4, NULL, NULL, 1, 1, NULL, NULL, '2025-05-22 20:12:40', '2025-05-22 20:12:40', 'PrisEnCharge', 27, 27, 0, 6000, 'Espece', NULL, 'BaseMachine', '2025-05-22 20:12:40', '2025-05-22 20:12:40'),
  (5, NULL, NULL, 1, 1, NULL, NULL, '2025-05-22 20:13:16', '2025-05-22 20:13:16', 'PrisEnCharge', 7, 7, 0, 2000, 'Espece', NULL, 'Detail', '2025-05-22 20:13:16', '2025-05-22 20:13:16'),
  (6, NULL, NULL, 1, 1, NULL, NULL, '2025-05-22 20:21:43', '2025-05-22 20:21:43', 'PrisEnCharge', 6, 6, 0, 2000, 'Espece', NULL, 'BaseMachine', '2025-05-22 20:21:43', '2025-05-22 20:21:43'),
  (7, NULL, NULL, 1, 1, NULL, NULL, '2025-05-22 20:25:40', '2025-05-22 20:25:40', 'PrisEnCharge', 7, 7, 0, 2000, 'Espece', NULL, 'BaseMachine', '2025-05-22 20:25:40', '2025-05-22 20:25:40'),
  (8, NULL, 1, 1, 1, NULL, NULL, '2025-05-22 20:38:10', '2025-05-22 20:38:10', 'PrisEnCharge', 6, 6, 0, 2000, 'Espece', NULL, 'BaseMachine', '2025-05-22 20:38:10', '2025-05-22 20:38:10'),
  (9, NULL, 2, 1, 1, NULL, NULL, '2025-05-22 20:43:26', '2025-05-22 20:43:26', 'PrisEnCharge', 6, 6, 0, 2000, 'Espece', NULL, 'BaseMachine', '2025-05-22 20:43:26', '2025-05-22 20:43:26'),
  (10, 22, NULL, 1, 1, NULL, NULL, '2025-05-22 20:45:13', '2025-05-22 20:45:13', 'PrisEnCharge', 27, 27, 0, 6000, 'Espece', NULL, 'Detail', '2025-05-22 20:45:13', '2025-05-22 20:45:13'),
  (11, 8, NULL, 2, 1, NULL, NULL, '2025-05-22 20:45:52', '2025-05-23 09:09:51', 'LavageEnCours', 6, 6, 0, 2000, 'MobileMoney', NULL, 'Detail', '2025-05-22 20:45:52', '2025-05-23 09:09:51'),
  (12, 3, NULL, 2, 1, NULL, NULL, '2025-05-22 20:46:29', '2025-05-23 09:08:50', 'Livraison', 10, 10, 1, 0, 'MobileMoney', NULL, 'BaseMachine', '2025-05-22 20:46:29', '2025-05-23 09:08:50'),
  (13, 9, NULL, 2, 1, NULL, 2, '2025-05-23 08:17:00', '2025-05-23 09:08:30', 'Livraison', 16, 16, 1, 10600, 'MobileMoney', NULL, 'BaseMachine', '2025-05-23 08:17:00', '2025-05-23 17:27:14'),
  (14, 3, NULL, 1, 1, NULL, NULL, '2025-05-23 08:51:32', '2025-05-23 09:09:17', 'Livre', 6, 6, 0, 0, 'Espece', NULL, 'BaseMachine', '2025-05-23 08:51:32', '2025-05-23 09:09:17'),
  (15, 21, NULL, 2, 1, NULL, 2, '2025-05-23 09:16:08', '2025-05-23 09:16:27', 'PrisEnCharge', 12, 12, 1, 8920, 'MobileMoney', NULL, 'Detail', '2025-05-23 09:16:08', '2025-05-23 09:16:27'),
  (16, 3, NULL, 1, 1, NULL, NULL, '2025-05-23 09:17:23', '2025-05-23 09:17:23', 'PrisEnCharge', 8, 8, 0, 0, 'Espece', NULL, 'BaseMachine', '2025-05-23 09:17:23', '2025-05-23 09:17:23'),
  (17, NULL, 3, 1, 1, NULL, NULL, '2025-05-23 09:20:15', '2025-05-23 09:20:44', 'Livre', 12, 12, 0, 4000, 'Espece', NULL, 'BaseMachine', '2025-05-23 09:20:15', '2025-05-23 09:20:44'),
  (18, NULL, 4, 1, 1, NULL, NULL, '2025-05-23 09:23:29', '2025-05-23 11:43:32', 'LavageEnCours', 13, 13, 0, 4000, 'Espece', NULL, 'BaseMachine', '2025-05-23 09:23:29', '2025-05-23 11:43:32'),
  (19, NULL, NULL, 1, 1, NULL, NULL, '2025-06-01 19:36:20', '2025-06-01 19:36:20', 'PrisEnCharge', 6, NULL, 0, NULL, NULL, NULL, 'BaseMachine', '2025-06-01 19:36:20', '2025-06-01 19:36:20'),
  (20, 9, NULL, 1, 1, NULL, NULL, '2025-06-01 19:40:27', '2025-06-01 19:40:27', 'PrisEnCharge', 6, NULL, 0, NULL, NULL, NULL, 'BaseMachine', '2025-06-01 19:40:27', '2025-06-01 19:40:27'),
  (21, 7, NULL, 2, 1, NULL, NULL, '2025-06-01 19:46:08', '2025-06-01 19:46:08', 'PrisEnCharge', 15, NULL, 0, NULL, NULL, NULL, 'BaseMachine', '2025-06-01 19:46:08', '2025-06-01 19:46:08'),
  (22, 16, NULL, 1, 1, NULL, NULL, '2025-06-01 19:49:53', '2025-06-01 19:49:53', 'PrisEnCharge', 6, NULL, 0, NULL, NULL, 'Etudiant', 'BaseMachine', '2025-06-01 19:49:53', '2025-06-01 19:49:53'),
  (23, NULL, NULL, 1, 1, NULL, 1, '2025-06-15 16:01:09', '2025-06-15 16:01:09', 'PrisEnCharge', 26, NULL, 1, 11900, 'Espece', NULL, 'BaseMachine', '2025-06-15 16:01:09', '2025-06-15 18:29:08'),
  (24, NULL, NULL, 1, 1, NULL, NULL, '2025-06-15 16:02:06', '2025-06-15 16:02:06', 'PrisEnCharge', 54.8, NULL, 0, 12000, 'Espece', NULL, 'BaseMachine', '2025-06-15 16:02:06', '2025-06-15 16:02:06'),
  (25, NULL, NULL, 2, 1, NULL, 2, '2025-06-15 16:02:38', '2025-06-15 16:02:38', 'PrisEnCharge', 6, NULL, 1, 4900, 'MobileMoney', NULL, 'BaseMachine', '2025-06-15 16:02:38', '2025-06-15 19:54:13'),
  (26, NULL, 5, 1, 1, NULL, NULL, '2025-06-15 16:10:15', '2025-06-15 16:10:15', 'PrisEnCharge', 7, NULL, 0, 2000, 'Espece', NULL, 'BaseMachine', '2025-06-15 16:10:15', '2025-06-15 16:10:15'),
  (27, 25, NULL, 1, 1, NULL, 2, '2025-06-15 16:11:29', '2025-06-15 16:11:29', 'PrisEnCharge', 19, NULL, 1, 5000, 'Espece', NULL, 'BaseMachine', '2025-06-15 16:11:29', '2025-06-15 18:29:00'),
  (28, 25, NULL, 1, 1, NULL, NULL, '2025-06-15 16:11:50', '2025-06-15 16:11:50', 'PrisEnCharge', 6, NULL, 1, 3000, 'Espece', NULL, 'BaseMachine', '2025-06-15 16:11:50', '2025-06-15 16:11:50'),
  (29, 16, NULL, 1, 1, NULL, 1, '2025-06-15 16:44:08', '2025-06-15 18:29:22', 'Livraison', 6, NULL, 1, 4410, 'Espece', 'Etudiant', 'BaseMachine', '2025-06-15 16:44:08', '2025-06-15 18:29:22'),
  (30, 21, NULL, 1, 1, NULL, NULL, '2025-06-15 18:01:56', '2025-06-15 18:28:45', 'Collecte', 12, NULL, 0, 3600, 'Espece', 'Etudiant', 'BaseMachine', '2025-06-15 18:01:56', '2025-06-15 18:28:45'),
  (31, 21, NULL, 1, 1, NULL, NULL, '2025-06-15 18:03:14', '2025-06-15 18:28:34', 'Repassage', 10, NULL, 0, 3600, 'Espece', 'Etudiant', 'BaseMachine', '2025-06-15 18:03:14', '2025-06-15 18:28:34'),
  (32, 8, NULL, 1, 1, NULL, NULL, '2025-06-15 18:41:39', '2025-06-15 18:41:56', 'Repassage', 13, NULL, 0, 4000, 'Espece', NULL, 'BaseMachine', '2025-06-15 18:41:39', '2025-06-15 18:41:56'),
  (33, NULL, 6, 1, 1, NULL, 1, '2025-06-15 18:44:27', '2025-06-15 18:46:01', 'Livre', 15, NULL, 1, 8250, 'MobileMoney', NULL, 'BaseMachine', '2025-06-15 18:44:27', '2025-06-15 18:46:01'),
  (34, NULL, NULL, 2, 1, NULL, NULL, '2025-06-15 19:16:09', '2025-06-15 19:54:03', 'LavageEnCours', 6, NULL, 0, 2000, 'Espece', NULL, 'BaseMachine', '2025-06-15 19:16:09', '2025-06-15 19:54:03'),
  (35, NULL, NULL, 2, 1, NULL, NULL, '2025-06-15 20:00:05', '2025-06-15 20:00:05', 'PrisEnCharge', 14.8, NULL, 0, 4000, 'Espece', NULL, 'BaseMachine', '2025-06-15 20:00:05', '2025-06-15 20:00:05'),
  (36, 25, NULL, 2, 1, NULL, NULL, '2025-06-15 20:06:47', '2025-06-15 20:06:47', 'PrisEnCharge', 18.8, NULL, 1, 8820, 'Espece', NULL, 'BaseMachine', '2025-06-15 20:06:47', '2025-06-15 20:06:47');
SET FOREIGN_KEY_CHECKS = 1;

-- Données de la table CommandeOptions
SET FOREIGN_KEY_CHECKS = 0;
DELETE FROM `CommandeOptions`;
INSERT INTO `CommandeOptions` (`id`, `commandeId`, `aOptionRepassage`, `aOptionSechage`, `aOptionLivraison`, `aOptionExpress`) VALUES
  (1, 1, 0, 0, 0, 0),
  (2, 2, 1, 1, 1, 1),
  (3, 3, 0, 0, 0, 0),
  (4, 4, 0, 0, 0, 0),
  (5, 5, 0, 0, 0, 0),
  (6, 6, 0, 0, 0, 0),
  (7, 7, 0, 0, 0, 0),
  (8, 8, 0, 0, 0, 0),
  (9, 9, 0, 0, 0, 0),
  (10, 10, 0, 0, 0, 0),
  (11, 11, 0, 0, 0, 0),
  (12, 12, 0, 1, 1, 0),
  (13, 13, 1, 1, 1, 0),
  (14, 14, 0, 0, 0, 0),
  (15, 15, 1, 1, 1, 1),
  (16, 16, 0, 0, 0, 0),
  (17, 17, 0, 0, 0, 0),
  (18, 18, 0, 0, 0, 0),
  (19, 19, 0, 0, 0, 0),
  (20, 20, 0, 0, 0, 0),
  (21, 21, 0, 0, 0, 0),
  (22, 22, 0, 0, 0, 0),
  (23, 23, 0, 1, 1, 1),
  (24, 24, 0, 0, 0, 0),
  (25, 25, 0, 1, 1, 1),
  (26, 26, 0, 0, 0, 0),
  (27, 27, 0, 0, 1, 0),
  (28, 28, 0, 0, 1, 0),
  (29, 29, 0, 1, 1, 1),
  (30, 30, 0, 0, 0, 0),
  (31, 31, 0, 0, 0, 0),
  (32, 32, 0, 0, 0, 0),
  (33, 33, 0, 1, 1, 1),
  (34, 34, 0, 0, 0, 0),
  (35, 35, 0, 0, 0, 0),
  (36, 36, 0, 1, 1, 1);
SET FOREIGN_KEY_CHECKS = 1;

-- Données de la table RepartitionMachine
SET FOREIGN_KEY_CHECKS = 0;
DELETE FROM `RepartitionMachine`;
INSERT INTO `RepartitionMachine` (`id`, `commandeId`, `typeMachine`, `quantite`, `prixUnitaire`) VALUES
  (1, 1, 'M20', 1, 4000),
  (2, 3, 'M6', 2, 2000),
  (3, 4, 'M20', 1, 4000),
  (4, 4, 'M6', 1, 2000),
  (5, 6, 'M6', 1, 2000),
  (6, 7, 'M6', 1, 2000),
  (7, 8, 'M6', 1, 2000),
  (8, 9, 'M6', 1, 2000),
  (9, 13, 'M20', 1, 4000),
  (10, 15, 'M6', 2, 2000),
  (11, 17, 'M6', 2, 2000),
  (12, 18, 'M20', 1, 4000),
  (13, 23, 'Machine20kg', 1, 4000),
  (14, 23, 'Machine6kg', 1, 2000),
  (15, 24, 'Machine20kg', 3, 4000),
  (16, 25, 'Machine6kg', 1, 2000),
  (17, 26, 'Machine6kg', 1, 2000),
  (18, 27, 'Machine20kg', 1, 4000),
  (19, 28, 'Machine6kg', 1, 2000),
  (20, 29, 'Machine6kg', 1, 2000),
  (21, 32, 'Machine20kg', 1, 4000),
  (22, 33, 'Machine20kg', 1, 4000),
  (23, 34, 'Machine6kg', 1, 2000),
  (24, 35, 'Machine20kg', 1, 4000),
  (25, 36, 'Machine20kg', 1, 4000);
SET FOREIGN_KEY_CHECKS = 1;

-- Données de la table AdresseLivraison
SET FOREIGN_KEY_CHECKS = 0;
DELETE FROM `AdresseLivraison`;
INSERT INTO `AdresseLivraison` (`id`, `commandeId`, `adresseText`, `latitude`, `longitude`) VALUES
  (1, 2, 'Thies medina fall', NULL, NULL),
  (2, 12, 'Rue 188 Ziguinchor', 15.277671, -16.119773),
  (3, 13, 'Ma maison', NULL, NULL),
  (4, 15, 'Médina fall', NULL, NULL),
  (5, 23, 'Livraison', NULL, NULL),
  (6, 25, 'adress', NULL, NULL),
  (7, 27, '114 boulevard maxime gorki', NULL, NULL),
  (8, 28, '114 boulevard maxime gorki', NULL, NULL),
  (9, 29, 'ad', NULL, NULL),
  (10, 33, 'THIES', NULL, NULL),
  (11, 36, '114 boulevard maxime gorki', NULL, NULL);
SET FOREIGN_KEY_CHECKS = 1;

-- Données de la table HistoriqueStatutCommande
SET FOREIGN_KEY_CHECKS = 0;
DELETE FROM `HistoriqueStatutCommande`;
INSERT INTO `HistoriqueStatutCommande` (`id`, `commandeId`, `statut`, `dateHeureChangement`) VALUES
  (1, 1, 'PrisEnCharge', '2025-05-22 20:02:24'),
  (2, 2, 'PrisEnCharge', '2025-05-22 20:11:15'),
  (3, 3, 'PrisEnCharge', '2025-05-22 20:12:13'),
  (4, 4, 'PrisEnCharge', '2025-05-22 20:12:40'),
  (5, 5, 'PrisEnCharge', '2025-05-22 20:13:16'),
  (6, 6, 'PrisEnCharge', '2025-05-22 20:21:43'),
  (7, 7, 'PrisEnCharge', '2025-05-22 20:25:40'),
  (8, 8, 'PrisEnCharge', '2025-05-22 20:38:10'),
  (9, 9, 'PrisEnCharge', '2025-05-22 20:43:26'),
  (10, 10, 'PrisEnCharge', '2025-05-22 20:45:13'),
  (11, 11, 'PrisEnCharge', '2025-05-22 20:45:52'),
  (12, 12, 'PrisEnCharge', '2025-05-22 20:46:29'),
  (13, 13, 'PrisEnCharge', '2025-05-23 08:17:00'),
  (14, 14, 'PrisEnCharge', '2025-05-23 08:51:32'),
  (15, 2, 'Livraison', '2025-05-23 08:59:26'),
  (16, 14, 'LavageEnCours', '2025-05-23 09:05:03'),
  (17, 14, 'Repassage', '2025-05-23 09:05:11'),
  (18, 13, 'Livraison', '2025-05-23 09:05:30'),
  (19, 13, 'LavageEnCours', '2025-05-23 09:08:21'),
  (20, 13, 'Livraison', '2025-05-23 09:08:30'),
  (21, 12, 'Livraison', '2025-05-23 09:08:50'),
  (22, 14, 'Livre', '2025-05-23 09:09:10'),
  (23, 14, 'PrisEnCharge', '2025-05-23 09:09:14'),
  (24, 14, 'Livre', '2025-05-23 09:09:17'),
  (25, 11, 'LavageEnCours', '2025-05-23 09:09:51'),
  (26, 15, 'PrisEnCharge', '2025-05-23 09:16:08'),
  (27, 15, 'Livraison', '2025-05-23 09:16:14'),
  (28, 15, 'PrisEnCharge', '2025-05-23 09:16:27'),
  (29, 16, 'PrisEnCharge', '2025-05-23 09:17:23'),
  (30, 17, 'PrisEnCharge', '2025-05-23 09:20:15'),
  (31, 17, 'LavageEnCours', '2025-05-23 09:20:21'),
  (32, 17, 'Repassage', '2025-05-23 09:20:24'),
  (33, 17, 'PrisEnCharge', '2025-05-23 09:20:28'),
  (34, 17, 'LavageEnCours', '2025-05-23 09:20:30'),
  (35, 17, 'Livre', '2025-05-23 09:20:44'),
  (36, 18, 'PrisEnCharge', '2025-05-23 09:23:29'),
  (37, 18, 'LavageEnCours', '2025-05-23 11:43:32'),
  (38, 19, 'PrisEnCharge', '2025-06-01 19:36:20'),
  (39, 20, 'PrisEnCharge', '2025-06-01 19:40:27'),
  (40, 21, 'PrisEnCharge', '2025-06-01 19:46:08'),
  (41, 22, 'PrisEnCharge', '2025-06-01 19:49:53'),
  (42, 23, 'PrisEnCharge', '2025-06-15 16:01:09'),
  (43, 24, 'PrisEnCharge', '2025-06-15 16:02:06'),
  (44, 25, 'PrisEnCharge', '2025-06-15 16:02:38'),
  (45, 26, 'PrisEnCharge', '2025-06-15 16:10:15'),
  (46, 27, 'PrisEnCharge', '2025-06-15 16:11:29'),
  (47, 28, 'PrisEnCharge', '2025-06-15 16:11:50'),
  (48, 29, 'PrisEnCharge', '2025-06-15 16:44:08'),
  (49, 30, 'PrisEnCharge', '2025-06-15 18:01:56'),
  (50, 31, 'PrisEnCharge', '2025-06-15 18:03:14'),
  (51, 31, 'Repassage', '2025-06-15 18:28:34'),
  (52, 30, 'Collecte', '2025-06-15 18:28:45'),
  (53, 29, 'Livraison', '2025-06-15 18:29:22'),
  (54, 32, 'PrisEnCharge', '2025-06-15 18:41:39'),
  (55, 32, 'Repassage', '2025-06-15 18:41:56'),
  (56, 33, 'PrisEnCharge', '2025-06-15 18:44:27'),
  (57, 33, 'Livraison', '2025-06-15 18:45:02'),
  (58, 33, 'Livre', '2025-06-15 18:46:01'),
  (59, 34, 'PrisEnCharge', '2025-06-15 19:16:09'),
  (60, 34, 'LavageEnCours', '2025-06-15 19:54:03'),
  (61, 35, 'PrisEnCharge', '2025-06-15 20:00:05'),
  (62, 36, 'PrisEnCharge', '2025-06-15 20:06:47');
SET FOREIGN_KEY_CHECKS = 1;

-- Aucune donnée dans la table Paiement

-- Données de la table Fidelite
SET FOREIGN_KEY_CHECKS = 0;
DELETE FROM `Fidelite`;
INSERT INTO `Fidelite` (`id`, `clientUserId`, `numeroCarteFidelite`, `nombreLavageTotal`, `poidsTotalLaveKg`, `lavagesGratuits6kgRestants`, `lavagesGratuits20kgRestants`, `createdAt`, `updatedAt`) VALUES
  (1, 6, 'TH39671NDI', 0, 0, 0, 0, '2025-05-22 19:51:30', '2025-05-22 19:51:30'),
  (2, 7, 'TH80924DIO', 0, 0, 0, 0, '2025-05-22 19:51:30', '2025-05-22 19:51:30'),
  (3, 8, 'TH11035SOW', 0, 0, 0, 0, '2025-05-22 19:51:30', '2025-05-22 19:51:30'),
  (4, 9, 'TH95750DIA', 0, 0, 0, 0, '2025-05-22 19:51:30', '2025-05-22 19:51:30'),
  (5, 10, 'TH63817BAX', 0, 0, 0, 0, '2025-05-22 19:51:30', '2025-05-22 19:51:30'),
  (6, 11, 'TH97399CIS', 0, 0, 0, 0, '2025-05-22 19:51:30', '2025-05-22 19:51:30'),
  (7, 12, 'TH20601FAY', 0, 0, 0, 0, '2025-05-22 19:51:30', '2025-05-22 19:51:30'),
  (8, 13, 'TH12005GUE', 0, 0, 0, 0, '2025-05-22 19:51:30', '2025-05-22 19:51:30'),
  (9, 14, 'TH29723KAN', 0, 0, 0, 0, '2025-05-22 19:51:30', '2025-05-22 19:51:30'),
  (10, 15, 'TH28542MBA', 0, 0, 0, 0, '2025-05-22 19:51:30', '2025-05-22 19:51:30'),
  (11, 16, 'TH59381FAL', 0, 0, 0, 0, '2025-05-22 19:51:30', '2025-05-22 19:51:30'),
  (12, 17, 'TH20907SYX', 0, 0, 0, 0, '2025-05-22 19:51:30', '2025-05-22 19:51:30'),
  (13, 18, 'TH34506DIO', 0, 0, 0, 0, '2025-05-22 19:51:30', '2025-05-22 19:51:30'),
  (14, 19, 'TH39257NIA', 0, 0, 0, 0, '2025-05-22 19:51:30', '2025-05-22 19:51:30'),
  (15, 20, 'TH28092SAR', 0, 0, 0, 0, '2025-05-22 19:51:30', '2025-05-22 19:51:30'),
  (16, 21, 'TH31126SOW', 0, 0, 0, 0, '2025-05-22 19:51:30', '2025-05-22 19:51:30'),
  (17, 22, 'TH59075NDI', 0, 0, 0, 0, '2025-05-22 20:45:00', '2025-05-22 20:45:00'),
  (18, 24, 'TH89282FAL', 0, 0, 0, 0, '2025-06-09 12:51:01', '2025-06-09 12:51:01'),
  (19, 25, 'TH88989KAN', 0, 0, 0, 0, '2025-06-15 16:10:50', '2025-06-15 16:10:50');
SET FOREIGN_KEY_CHECKS = 1;

-- Données de la table AbonnementPremiumMensuel
SET FOREIGN_KEY_CHECKS = 0;
DELETE FROM `AbonnementPremiumMensuel`;
INSERT INTO `AbonnementPremiumMensuel` (`id`, `clientUserId`, `annee`, `mois`, `limiteKg`, `kgUtilises`, `createdAt`, `updatedAt`) VALUES
  (1, 3, 2025, 5, 40, 39, '2025-05-22 19:51:30', '2025-05-22 19:51:30'),
  (2, 4, 2025, 5, 40, 35, '2025-05-22 19:51:30', '2025-05-22 19:51:30'),
  (3, 5, 2025, 5, 40, 53, '2025-05-22 19:51:30', '2025-05-22 19:51:30'),
  (4, 21, 2025, 5, 40, 70, '2025-05-22 19:51:30', '2025-05-22 19:51:30');
SET FOREIGN_KEY_CHECKS = 1;

-- Aucune donnée dans la table StatJournalSite

-- Données de la table LogAdminAction
SET FOREIGN_KEY_CHECKS = 0;
DELETE FROM `LogAdminAction`;
INSERT INTO `LogAdminAction` (`id`, `adminUserId`, `typeAction`, `entite`, `entiteId`, `description`, `dateAction`) VALUES
  (1, 1, 'UPDATE', 'User', 1, 'Mot de passe modifié', '2025-05-23 17:09:39');
SET FOREIGN_KEY_CHECKS = 1;

