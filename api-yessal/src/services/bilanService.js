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

    // Vérifier que la laverie existe et récupérer ses informations
    const laverie = await prisma.sitelavage.findUnique({
      where: { id: laverieId },
      select: {
        id: true,
        nom: true,
        estLaverie: true,
        estBoutique: true,
        estVirtuel: true,
      },
    });

    if (!laverie) {
      throw new Error("Laverie non trouvée");
    }

    // Récupérer toutes les données en parallèle
    const [recettesCommandes, recettesAbonnements, recettesVentes, fluxFinanciers] =
      await Promise.all([
        this._getRecettesCommandes(laverieId, startDate, endDate),
        this._getRecettesAbonnements(laverieId, startDate, endDate),
        this._getRecettesVentes(laverieId, startDate, endDate),
        this._getFluxFinanciers(laverieId, startDate, endDate),
      ]);

    // Construire le bilan
    return this._buildBilan(
      month,
      startDate,
      endDate,
      laverie,
      recettesCommandes,
      recettesAbonnements,
      recettesVentes,
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
   * Récupérer les recettes des ventes boutique
   * @private
   */
  async _getRecettesVentes(laverieId, startDate, endDate) {
    const ventes = await prisma.vente.findMany({
      where: {
        siteLavageId: laverieId,
        dateVente: {
          gte: startDate,
          lte: endDate,
        },
        flag: true,
      },
      select: {
        montantTotal: true,
        montantPaye: true,
      },
    });

    const montantTotal = ventes.reduce((sum, vente) => {
      // Utiliser montantPaye si disponible, sinon montantTotal
      const montant = vente.montantPaye !== null ? vente.montantPaye : vente.montantTotal;
      return sum + Number(montant);
    }, 0);

    return {
      montant: montantTotal,
      nombre: ventes.length,
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
        rubrique: true,
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
      depensesParRubrique: this._groupByRubrique(depenses),
      recettesParRubrique: this._groupByRubrique(recettes),
    };
  }

  /**
   * Regroupe une liste de flux par rubrique d'activité (Laverie / Boutique / Commun)
   * @private
   */
  _groupByRubrique(items) {
    const acc = {
      laverie: { montant: 0, nombre: 0 },
      boutique: { montant: 0, nombre: 0 },
      commun: { montant: 0, nombre: 0 },
    };
    for (const f of items) {
      let key = "commun";
      if (f.rubrique === "Laverie") key = "laverie";
      else if (f.rubrique === "Boutique") key = "boutique";
      acc[key].montant += Number(f.montant);
      acc[key].nombre += 1;
    }
    return acc;
  }

  /**
   * Construit un objet résultat (montant, marge %, type) à partir des recettes/dépenses
   * @private
   */
  _makeResultat(totalRecettes, totalDepenses) {
    const montant = totalRecettes - totalDepenses;
    const pourcentage =
      totalRecettes > 0 ? Math.round((montant / totalRecettes) * 100) : 0;
    return { montant, pourcentage, type: montant >= 0 ? "benefice" : "perte" };
  }

  /**
   * Construire la structure du bilan
   * @private
   */
  _buildBilan(
    month,
    startDate,
    endDate,
    site,
    commandes,
    abonnements,
    ventes,
    fluxFinanciers
  ) {
    const { estLaverie, estBoutique, estVirtuel } = site;

    // Calcul des recettes selon le type de site
    let recettesLaverie = 0;
    let recettesBoutique = 0;

    // Inclure les recettes laverie si c'est une laverie et pas virtuelle
    if (estLaverie && !estVirtuel) {
      recettesLaverie = commandes.montant + abonnements.montant;
    }

    // Inclure les recettes boutique si c'est une boutique
    if (estBoutique) {
      recettesBoutique = ventes.montant;
    }

    const recettesFluxFinanciers = fluxFinanciers.recettes.montant;
    const totalRecettes =
      recettesLaverie + recettesBoutique + recettesFluxFinanciers;

    // Calcul des dépenses
    const totalDepenses = fluxFinanciers.depenses.montant;

    // Calcul du résultat
    const resultat = totalRecettes - totalDepenses;
    const pourcentageMarge =
      totalRecettes > 0 ? Math.round((resultat / totalRecettes) * 100) : 0;

    // Construire le bilan en incluant uniquement les sections pertinentes
    const bilan = {
      periode: {
        mois: month,
        debut: startDate.toISOString().split("T")[0],
        fin: endDate.toISOString().split("T")[0],
      },
      site: {
        estLaverie,
        estBoutique,
        estVirtuel,
      },
      recettes: {
        fluxFinanciers: {
          montant: recettesFluxFinanciers,
          nombre: fluxFinanciers.recettes.nombre,
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

    // Ajouter la section laverie si applicable
    if (estLaverie && !estVirtuel) {
      bilan.recettes.laverie = {
        commandes: {
          montant: commandes.montant,
          nombre: commandes.nombre,
        },
        abonnements: {
          montant: abonnements.montant,
          nombre: abonnements.nombre,
        },
        total: recettesLaverie,
      };
    }

    // Ajouter la section boutique si applicable
    if (estBoutique) {
      bilan.recettes.boutique = {
        ventes: {
          montant: ventes.montant,
          nombre: ventes.nombre,
        },
        total: recettesBoutique,
      };
    }

    // Bilan par activité (direct costing) : chaque activité porte ses recettes
    // et ses dépenses directement rattachées (rubrique). Les dépenses "Commun"
    // ne pèsent que sur le bilan global (elles ne sont attribuées à aucune activité).
    const depParRubrique = fluxFinanciers.depensesParRubrique || {
      laverie: { montant: 0, nombre: 0 },
      boutique: { montant: 0, nombre: 0 },
      commun: { montant: 0, nombre: 0 },
    };
    const recParRubrique = fluxFinanciers.recettesParRubrique || {
      laverie: { montant: 0, nombre: 0 },
      boutique: { montant: 0, nombre: 0 },
      commun: { montant: 0, nombre: 0 },
    };

    bilan.parActivite = {
      laverie:
        estLaverie && !estVirtuel
          ? {
              recettes: {
                commandes: { montant: commandes.montant, nombre: commandes.nombre },
                abonnements: { montant: abonnements.montant, nombre: abonnements.nombre },
                autres: { montant: recParRubrique.laverie.montant, nombre: recParRubrique.laverie.nombre },
                total: recettesLaverie + recParRubrique.laverie.montant,
              },
              depenses: { montant: depParRubrique.laverie.montant, nombre: depParRubrique.laverie.nombre },
              resultat: this._makeResultat(
                recettesLaverie + recParRubrique.laverie.montant,
                depParRubrique.laverie.montant
              ),
            }
          : null,
      boutique: estBoutique
        ? {
            recettes: {
              ventes: { montant: ventes.montant, nombre: ventes.nombre },
              autres: { montant: recParRubrique.boutique.montant, nombre: recParRubrique.boutique.nombre },
              total: recettesBoutique + recParRubrique.boutique.montant,
            },
            depenses: { montant: depParRubrique.boutique.montant, nombre: depParRubrique.boutique.nombre },
            resultat: this._makeResultat(
              recettesBoutique + recParRubrique.boutique.montant,
              depParRubrique.boutique.montant
            ),
          }
        : null,
      commun: {
        depenses: { montant: depParRubrique.commun.montant, nombre: depParRubrique.commun.nombre },
        recettes: { montant: recParRubrique.commun.montant, nombre: recParRubrique.commun.nombre },
      },
    };

    return bilan;
  }
}

module.exports = new BilanService();
