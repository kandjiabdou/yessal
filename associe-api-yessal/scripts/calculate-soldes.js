/**
 * Script de calcul et mise à jour des soldes des associés
 *
 * Ce script parcourt tous les flux financiers validés de chaque associé
 * et calcule leur solde en fonction des règles suivantes:
 * - Apport avec sourceFinancement='propre' : +montant
 * - Retrait : -montant
 *
 * Usage: node scripts/calculate-soldes.js
 */

const {
  PrismaClient: PrismaShared,
} = require("../../shared-database/generated/shared");
const { PrismaClient } = require("@prisma/client");

const prismaShared = new PrismaShared({
  datasources: {
    db: {
      url: process.env.DATABASE_SHARED_URL,
    },
  },
});
const prisma = new PrismaClient();

async function calculateSoldes() {
  try {
    console.log("🔄 Début du calcul des soldes des associés...\n");

    // Récupérer tous les utilisateurs (associés)
    const users = await prisma.user.findMany({
      select: {
        id: true,
        nom: true,
        prenom: true,
        email: true,
      },
    });

    console.log(`📊 ${users.length} associé(s) trouvé(s)\n`);

    let totalUpdated = 0;
    const results = [];

    for (const user of users) {
      console.log(
        `\n👤 Traitement de ${user.prenom} ${user.nom} (ID: ${
          user.id
        }, Email: ${user.email || "N/A"})`
      );

      if (!user.email) {
        console.log(`  ⚠️  Aucun email trouvé, solde non modifié`);
        continue;
      }

      // Récupérer tous les flux financiers validés de cet utilisateur via l'email
      const fluxList = await prismaShared.fluxFinancier.findMany({
        where: {
          flagged: true, // Seulement les flux validés
              sourceApp: "ASSOCIE",
          status: "validated",
          createdByRef: {
            email: user.email,
          },
          OR: [
            {
              type: "apport",
              sourceFinancement: "propre",
            },
            {
              type: "retrait",
            },
          ],
        },
        orderBy: {
          createdAt: "asc",
        },
      });

      console.log(`  📋 ${fluxList.length} flux financier(s) trouvé(s)`);

      // Calculer le solde
      let soldeCalcule = 0;

      for (const flux of fluxList) {
        const montant = Number(flux.montant);

        if (flux.type === "apport" && flux.sourceFinancement === "propre") {
          soldeCalcule += montant;
          console.log(
            `    ➕ Apport: +${montant} FCFA (Date: ${flux.dateFluxFinancier.toLocaleDateString()})`
          );
        } else if (flux.type === "retrait") {
          soldeCalcule -= montant;
          console.log(
            `    ➖ Retrait: -${montant} FCFA (Date: ${flux.dateFluxFinancier.toLocaleDateString()})`
          );
        }
      }

      // Mettre à jour le solde dans la base de données
      await prisma.user.update({
        where: { id: user.id },
        data: { solde: soldeCalcule },
      });

      console.log(`  💰 Solde calculé: ${soldeCalcule} FCFA`);
      console.log(`  ✅ Solde mis à jour avec succès`);

      results.push({
        userId: user.id,
        nom: `${user.prenom} ${user.nom}`,
        nombreFlux: fluxList.length,
        solde: soldeCalcule,
      });

      totalUpdated++;
    }

    // Afficher le résumé
    console.log("\n" + "=".repeat(60));
    console.log("📊 RÉSUMÉ DU CALCUL DES SOLDES");
    console.log("=".repeat(60));
    console.log(`\n✅ ${totalUpdated} associé(s) traité(s) avec succès\n`);

    if (results.length > 0) {
      console.log("Détails par associé:");
      console.log("-".repeat(60));

      results.forEach((result) => {
        console.log(`${result.nom}`);
        console.log(`  - Nombre de flux: ${result.nombreFlux}`);
        console.log(
          `  - Solde final: ${result.solde.toLocaleString("fr-FR")} FCFA`
        );
        console.log("-".repeat(60));
      });

      // Calculer le total général
      const totalGeneral = results.reduce((sum, r) => sum + r.solde, 0);
      console.log(
        `\n💰 TOTAL GÉNÉRAL DES SOLDES: ${totalGeneral.toLocaleString(
          "fr-FR"
        )} FCFA\n`
      );
    }

    console.log("✨ Script terminé avec succès!");
  } catch (error) {
    console.error("\n❌ Erreur lors du calcul des soldes:", error);
    throw error;
  } finally {
    await prismaShared.$disconnect();
    await prisma.$disconnect();
  }
}

// Exécution du script
calculateSoldes()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error("Erreur fatale:", error);
    process.exit(1);
  });
