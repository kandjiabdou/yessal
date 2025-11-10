const prisma = require("../utils/prismaClient");
const prismaShared = require("../utils/prismaSharedClient");
const laverieReferenceService = require("./laverieReferenceService");

/**
 * Service pour la génération du bilan financier d'une laverie
 */
class BilanService {
  /**
   * Obtenir le bilan d'une laverie pour un mois donné
   * @param {number} laverieId - ID de la laverie
   * @param {string} month - Mois au format YYYY-MM
   * @returns {Promise<Object>} Bilan structuré
   */
  async getBilanByLaverie(laverieId, month) {
    // Validation du format du mois
    if (!/^\d{4}-\d{2}$/.test(month)) {
      throw new Error("Format de mois invalide. Utilisez YYYY-MM");
    }

    const [year, monthNum] = month.split("-").map(Number);
    const startDate = new Date(year, monthNum - 1, 1);
    const endDate = new Date(year, monthNum, 0, 23, 59, 59, 999);

    // Vérifier que la laverie existe
    const laverie = await prisma.sitelavage.findUnique({
      where: { id: laverieId },
    });

    if (!laverie) {
      throw new Error("Laverie non trouvée");
    }

    // Récupérer toutes les données en parallèle
    const [recettesCommandes, recettesAbonnements, fluxFinanciers] =
      await Promise.all([
        this._getRecettesCommandes(laverieId, startDate, endDate),
        this._getRecettesAbonnements(laverieId, startDate, endDate),
        this._getFluxFinanciers(laverieId, startDate, endDate),
      ]);

    // Construire le bilan
    return this._buildBilan(
      month,
      startDate,
      endDate,
      recettesCommandes,
      recettesAbonnements,
      fluxFinanciers
    );
  }

  /**
   * Récupérer les recettes des commandes
   * @private
   */
  async _getRecettesCommandes(laverieId, startDate, endDate) {
    const result = await prisma.commande.aggregate({
      where: {
        siteLavageId: laverieId,
        dateHeureCommande: {
          gte: startDate,
          lte: endDate,
            },
        flag: true,
      },
      _sum: {
        prixPaye: true,
      },
      _count: {
        id: true,
      },
    });

    return {
      montant: result._sum.prixPaye || 0,
      nombre: result._count.id || 0,
    };
  }

  /**
   * Récupérer les recettes des abonnements
   * @private
   */
  async _getRecettesAbonnements(laverieId, startDate, endDate) {
    const result = await prisma.abonnementpremiummensuel.aggregate({
      where: {
        siteLavageId: laverieId,
        createdAt: {
          gte: startDate,
          lt: endDate,
        },
        flag: true,
      },
      _sum: {
        montant: true,
      },
      _count: {
        id: true,
      },
    });

    return {
      montant: result._sum.montant || 0,
      nombre: result._count.id || 0,
    };
  }

  /**
   * Récupérer les flux financiers (dépenses et recettes)
   * @private
   */
  async _getFluxFinanciers(laverieId, startDate, endDate) {
    // Obtenir la référence de laverie dans la base partagée
    const laverieRefId = await laverieReferenceService.getOrCreateLaverieRef(
      laverieId,
      "MANAGER"
    );

    const flux = await prismaShared.fluxFinancier.findMany({
      where: {
        laverieRefId: laverieRefId,
        dateFluxFinancier: {
          gte: startDate,
          lte: endDate,
        },
        flagged: true,
        sourceApp: "MANAGER",
      },
      select: {
        laverieRefId: true,
        type: true,
        montant: true,
      },
    });

    const depenses = flux.filter((f) => f.type === "depense");
    const recettes = flux.filter((f) => f.type === "recette");

    return {
      depenses: {
        montant: depenses.reduce((sum, f) => sum + Number(f.montant), 0),
        nombre: depenses.length,
      },
      recettes: {
        montant: recettes.reduce((sum, f) => sum + Number(f.montant), 0),
        nombre: recettes.length,
      },
    };
  }

  /**
   * Construire la structure du bilan
   * @private
   */
  _buildBilan(
    month,
    startDate,
    endDate,
    commandes,
    abonnements,
    fluxFinanciers
  ) {
    // Calcul des recettes
    const recettesLaverie = commandes.montant + abonnements.montant;
    const recettesFluxFinanciers = fluxFinanciers.recettes.montant;
    const recettesBoutique = 0; // À venir
    const totalRecettes =
      recettesLaverie + recettesFluxFinanciers + recettesBoutique;

    // Calcul des dépenses
    const totalDepenses = fluxFinanciers.depenses.montant;

    // Calcul du résultat
    const resultat = totalRecettes - totalDepenses;
    const pourcentageMarge =
      totalRecettes > 0 ? Math.round((resultat / totalRecettes) * 100) : 0;

    return {
      periode: {
        mois: month,
        debut: startDate.toISOString().split("T")[0],
        fin: endDate.toISOString().split("T")[0],
      },
      recettes: {
        laverie: {
          commandes: {
            montant: commandes.montant,
            nombre: commandes.nombre,
          },
          abonnements: {
            montant: abonnements.montant,
            nombre: abonnements.nombre,
          },
          total: recettesLaverie,
        },
        fluxFinanciers: {
          montant: recettesFluxFinanciers,
          nombre: fluxFinanciers.recettes.nombre,
        },
        boutique: {
          montant: recettesBoutique,
          nombre: 0,
          aVenir: true,
        },
        total: totalRecettes,
      },
      depenses: {
        fluxFinanciers: {
          montant: fluxFinanciers.depenses.montant,
          nombre: fluxFinanciers.depenses.nombre,
        },
        total: totalDepenses,
      },
      resultat: {
        montant: resultat,
        pourcentage: pourcentageMarge,
        type: resultat >= 0 ? "benefice" : "perte",
      },
    };
  }
}

module.exports = new BilanService();
