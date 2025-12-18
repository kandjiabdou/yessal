const mysql = require('mysql2/promise');
const dotenv = require('dotenv');

// Charger la DATABASE_URL depuis .env
dotenv.config();

// Prix des machines
const PRIX_MACHINE_20KG = 4000;
const PRIX_MACHINE_6KG = 2000;

/**
 * Calcule la répartition optimale des machines pour la formule de base
 * Formule exacte selon les spécifications utilisateur
 */
function calculerRepartitionMachines(poids) {
  // 1. n = entier(poids / 20)
  const n = Math.floor(poids / 20);

  // 2. r = poids mod 20
  const r = poids % 20;

  let nombreMachine20kg = n;
  let nombreMachine6kg = 0;
  let prixTotal = 0;

  if (r > 0) {
    // 3. Si M6 ×(r/6) > M20 → on prend une machine 20kg supplémentaire
    const prixMachine6kgPourReste = PRIX_MACHINE_6KG * (r / 6);

    if (prixMachine6kgPourReste > PRIX_MACHINE_20KG) {
      nombreMachine20kg = n + 1;
      nombreMachine6kg = 0;
      prixTotal = nombreMachine20kg * PRIX_MACHINE_20KG;
    } else {
      // 4. Sinon → prix = n×M20 + (entier(r/6) + 1 si reste(r/6) > 1.5)×M6
      const entierR6 = Math.floor(r / 6);
      const resteR6 = r % 6;
      const ajoutSiReste = resteR6 > 1.5 ? 1 : 0;

      nombreMachine20kg = n;
      nombreMachine6kg = entierR6 + ajoutSiReste;
      prixTotal = n * PRIX_MACHINE_20KG + nombreMachine6kg * PRIX_MACHINE_6KG;
    }
  } else {
    // Pas de reste, utiliser seulement les machines 20kg
    prixTotal = n * PRIX_MACHINE_20KG;
  }

  return {
    nombreMachine20kg,
    nombreMachine6kg,
    prixMachines: prixTotal,
  };
}

async function fixRepartitionMachines() {
  let connection;

  try {
    // Créer la connexion à la base de données
    connection = await mysql.createConnection(process.env.DATABASE_URL);
    console.log('✅ Connexion à la base de données établie');

    // Récupérer TOUTES les commandes (sans filtre de formule, statut ou flag)
    const [commandes] = await connection.execute(
      `SELECT id, masseClientIndicativeKg, formuleCommande
       FROM commande 
       ORDER BY id`
    );

    console.log(`\n📦 Trouvé ${commandes.length} commandes au total`);

    let commandesTraitees = 0;
    let machinesCreees = 0;

    for (const commande of commandes) {
      const poids = commande.masseClientIndicativeKg;

      if (!poids || poids <= 0) {
        console.log(`⚠️  Commande ${commande.id}: Poids invalide (${poids} kg), ignoré`);
        continue;
      }

      // Calculer la répartition
      const repartition = calculerRepartitionMachines(poids);

      // Supprimer TOUTES les anciennes répartitions (éviter la redondance)
      await connection.execute(
        `DELETE FROM repartitionmachine WHERE commandeId = ?`,
        [commande.id]
      );

      // Créer les nouvelles répartitions
      if (repartition.nombreMachine20kg > 0) {
        await connection.execute(
          `INSERT INTO repartitionmachine (commandeId, typeMachine, quantite, prixUnitaire, flag)
           VALUES (?, 'Machine20kg', ?, ?, true)`,
          [commande.id, repartition.nombreMachine20kg, PRIX_MACHINE_20KG]
        );
        machinesCreees++;
      }

      if (repartition.nombreMachine6kg > 0) {
        await connection.execute(
          `INSERT INTO repartitionmachine (commandeId, typeMachine, quantite, prixUnitaire, flag)
           VALUES (?, 'Machine6kg', ?, ?, true)`,
          [commande.id, repartition.nombreMachine6kg, PRIX_MACHINE_6KG]
        );
        machinesCreees++;
      }

      const formuleText = commande.formuleCommande === 'BaseMachine' ? '[BASE]' : '[DETAIL]';
      console.log(
        `✓ Commande ${commande.id} ${formuleText} (${poids}kg): ${repartition.nombreMachine20kg}x20kg + ${repartition.nombreMachine6kg}x6kg`
      );

      commandesTraitees++;
    }

    console.log('\n✅ Traitement terminé avec succès !');
    console.log(`\n📊 Résumé:`);
    console.log(`   - Commandes traitées: ${commandesTraitees}`);
    console.log(`   - Lignes machines créées: ${machinesCreees}`);

    await connection.end();
  } catch (error) {
    console.error('\n❌ Erreur lors du traitement:', error.message);
    console.error(error);
    if (connection) {
      await connection.end();
    }
    process.exit(1);
  }
}

// Exécuter le script
fixRepartitionMachines().catch((error) => {
  console.error('❌ Erreur:', error.message);
  process.exit(1);
});
