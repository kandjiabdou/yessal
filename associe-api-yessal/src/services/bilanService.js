const prismaManager = require("../utils/prismaManagerClient");
const prismaShared = require("../utils/prismaSharedClient");
const laverieReferenceService = require("./laverieReferenceService");

/**
 * Service pour la génération du bilan financier d'une laverie
 */
class BilanService {
  /**
   * Obtenir le bilan groupé par laverie pour un mois donné
   * @param {string} month - Mois au format YYYY-MM
   * @param {number[]} laverieIds - IDs des laveries à inclure (optionnel)
   * @returns {Promise<Object[]>} Liste des bilans par laverie + entreprise
   */
  async getBilanGrouped(month, laverieIds = null) {
    // Validation du format du mois
    if (!/^\d{4}-\d{2}$/.test(month)) {
      throw new Error("Format de mois invalide. Utilisez YYYY-MM");
    }

    const [year, monthNum] = month.split("-").map(Number);
    const startDate = new Date(year, monthNum - 1, 1);
    const endDate = new Date(year, monthNum, 0, 23, 59, 59, 999);

    // Récupérer toutes les LaverieReference disponibles depuis la base partagée
    const whereClause = { sourceApp: "ASSOCIE" };
    if (laverieIds && laverieIds.length > 0) {
      whereClause.sourceLaverieId = { in: laverieIds };
    }

    const laverieRefs = await prismaShared.laverieReference.findMany({
      where: whereClause,
      select: {
        id: true,
        sourceLaverieId: true,
        nom: true,
        adresse: true,
        ville: true,
      },
      orderBy: { nom: "asc" },
    });

    // Récupérer tous les flux financiers de la période
    const allFlux = await prismaShared.fluxFinancier.findMany({
      where: {
        dateFluxFinancier: {
          gte: startDate,
          lte: endDate,
        },
        status: { not: "cancelled" },
        flagged: true,
        sourceApp: "ASSOCIE",
      },
      select: {
        laverieRefId: true,
        type: true,
        montant: true,
      },
    });

    // Construire les bilans
    const bilans = [];

    // Bilan par laverie
    for (const laverieRef of laverieRefs) {
      const [recettesCommandes, recettesAbonnements] = await Promise.all([
        this._getRecettesCommandes(laverieRef.sourceLaverieId, startDate, endDate),
        this._getRecettesAbonnements(laverieRef.sourceLaverieId, startDate, endDate),
      ]);

      const fluxLaverie = allFlux.filter((f) => f.laverieRefId === laverieRef.id);
      const fluxFinanciers = this._calculateFluxStats(fluxLaverie);

      bilans.push({
        laverieRefId: laverieRef.id,
        laverie: {
          id: laverieRef.sourceLaverieId,
          nom: laverieRef.nom,
          adresse: laverieRef.adresse,
          ville: laverieRef.ville,
        },
        ...this._buildBilan(
          month,
          startDate,
          endDate,
          recettesCommandes,
          recettesAbonnements,
          fluxFinanciers
        ),
      });
    }

    // Bilan entreprise (flux sans laverie)
    const fluxEntreprise = allFlux.filter((f) => f.laverieRefId === null);
    const fluxFinanciersEntreprise = this._calculateFluxStats(fluxEntreprise);

    bilans.push({
      laverieRefId: null,
      laverie: null,
      ...this._buildBilan(
        month,
        startDate,
        endDate,
        { montant: 0, nombre: 0 },
        { montant: 0, nombre: 0 },
        fluxFinanciersEntreprise
      ),
    });

    return bilans;
  }

  /**
   * Calculer les statistiques des flux financiers
   * @private
   */
  _calculateFluxStats(flux) {
    const depenses = flux.filter((f) => f.type === "depense");
    const recettes = flux.filter((f) => f.type === "recette");
    const emprunts = flux.filter((f) => f.type === "emprunt");
    const prets = flux.filter((f) => f.type === "pret");

    return {
      depenses: {
        montant: depenses.reduce((sum, f) => sum + Number(f.montant), 0),
        nombre: depenses.length,
      },
      recettes: {
        montant: recettes.reduce((sum, f) => sum + Number(f.montant), 0),
        nombre: recettes.length,
      },
      emprunts: {
        montant: emprunts.reduce((sum, f) => sum + Number(f.montant), 0),
        nombre: emprunts.length,
      },
      prets: {
        montant: prets.reduce((sum, f) => sum + Number(f.montant), 0),
        nombre: prets.length,
      },
    };
  }

  /**
   * Récupérer les recettes des commandes
   * @private
   */
  async _getRecettesCommandes(laverieId, startDate, endDate) {
    const result = await prismaManager.commande.aggregate({
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
    // Extraire l'année et le mois de la période
    const year = startDate.getFullYear();
    const month = startDate.getMonth() + 1; // Les mois commencent à 0 en JS

    const result = await prismaManager.abonnementpremiummensuel.aggregate({
      where: {
        siteLavageId: laverieId,
        annee: year,
        mois: month,
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

    // Calcul des dépenses (uniquement depense + emprunt pour les dépenses réelles)
    const totalDepenses =
      fluxFinanciers.depenses.montant + fluxFinanciers.emprunts.montant;

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
        prets: {
          montant: fluxFinanciers.prets.montant,
          nombre: fluxFinanciers.prets.nombre,
        },
        boutique: {
          montant: recettesBoutique,
          nombre: 0,
          aVenir: true,
        },
        total: totalRecettes + fluxFinanciers.prets.montant,
      },
      depenses: {
        fluxFinanciers: {
          montant: fluxFinanciers.depenses.montant,
          nombre: fluxFinanciers.depenses.nombre,
        },
        emprunts: {
          montant: fluxFinanciers.emprunts.montant,
          nombre: fluxFinanciers.emprunts.nombre,
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
