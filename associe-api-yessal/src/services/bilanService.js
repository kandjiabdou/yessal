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
   * @param {string} viewMode - Mode d'affichage: 'laverie', 'entreprise', 'tous' (défaut: 'tous')
   * @returns {Promise<Object[]>} Liste des bilans par laverie + entreprise + total
   */
  async getBilanGrouped(month, laverieIds = null, viewMode = 'tous') {
    // Validation du format du mois
    if (!/^\d{4}-\d{2}$/.test(month)) {
      throw new Error("Format de mois invalide. Utilisez YYYY-MM");
    }

    const [year, monthNum] = month.split("-").map(Number);
    const startDate = new Date(year, monthNum - 1, 1);
    const endDate = new Date(year, monthNum, 0, 23, 59, 59, 999);

    // Récupérer toutes les laveries depuis la base manager
    const whereClause = { flag: true };
    if (laverieIds && laverieIds.length > 0) {
      whereClause.id = { in: laverieIds };
    }

    const laveries = await prismaManager.sitelavage.findMany({
      where: whereClause,
      select: {
        id: true,
        nom: true,
        adresseText: true,
        ville: true,
      },
      orderBy: { nom: "asc" },
    });

    // Récupérer toutes les LaverieReference pour mapper les flux
    const laverieRefs = await prismaShared.laverieReference.findMany({
      where: {
        sourceApp: "MANAGER",
        sourceLaverieId: { in: laveries.map(l => l.id) }
      },
      select: {
        id: true,
        sourceLaverieId: true,
      },
    });

    // Créer un map pour retrouver rapidement la laverieRefId
    const laverieRefMap = new Map();
    for (const ref of laverieRefs) {
      laverieRefMap.set(ref.sourceLaverieId, ref.id);
    }

    // Récupérer tous les flux financiers de la période
    const allFlux = await prismaShared.fluxFinancier.findMany({
      where: {
        dateFluxFinancier: {
          gte: startDate,
          lte: endDate,
        },
        flagged: true,
        status: 'validated',
      },
      select: {
        laverieRefId: true,
        type: true,
        montant: true,
      },
    });

    // Construire les bilans
    const bilans = [];
    
    // Variables pour le bilan total
    let totalRecettesCommandes = { montant: 0, nombre: 0 };
    let totalRecettesAbonnements = { montant: 0, nombre: 0 };
    let totalFluxFinanciers = {
      depenses: { montant: 0, nombre: 0 },
      recettes: { montant: 0, nombre: 0 },
      apports: { montant: 0, nombre: 0 },
      retraits: { montant: 0, nombre: 0 },
    };

    // Bilan par laverie (si mode laverie ou tous)
    if (viewMode === 'laverie' || viewMode === 'tous') {
      for (const laverie of laveries) {
        const [recettesCommandes, recettesAbonnements] = await Promise.all([
          this._getRecettesCommandes(laverie.id, startDate, endDate),
          this._getRecettesAbonnements(laverie.id, startDate, endDate),
        ]);

        // Récupérer les flux pour cette laverie
        const laverieRefId = laverieRefMap.get(laverie.id);
        const fluxLaverie = laverieRefId 
          ? allFlux.filter((f) => f.laverieRefId === laverieRefId)
          : [];
        const fluxFinanciers = this._calculateFluxStats(fluxLaverie);

        bilans.push({
          laverieRefId: laverieRefId || `temp-${laverie.id}`,
          laverie: {
            id: laverie.id,
            nom: laverie.nom,
            adresse: laverie.adresseText,
            ville: laverie.ville,
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

        // Accumuler pour le total
        totalRecettesCommandes.montant += recettesCommandes.montant;
        totalRecettesCommandes.nombre += recettesCommandes.nombre;
        totalRecettesAbonnements.montant += recettesAbonnements.montant;
        totalRecettesAbonnements.nombre += recettesAbonnements.nombre;
        totalFluxFinanciers.depenses.montant += fluxFinanciers.depenses.montant;
        totalFluxFinanciers.depenses.nombre += fluxFinanciers.depenses.nombre;
        totalFluxFinanciers.recettes.montant += fluxFinanciers.recettes.montant;
        totalFluxFinanciers.recettes.nombre += fluxFinanciers.recettes.nombre;
        totalFluxFinanciers.apports.montant += fluxFinanciers.apports.montant;
        totalFluxFinanciers.apports.nombre += fluxFinanciers.apports.nombre;
        totalFluxFinanciers.retraits.montant += fluxFinanciers.retraits.montant;
        totalFluxFinanciers.retraits.nombre += fluxFinanciers.retraits.nombre;
      }
    }

    // Bilan entreprise (flux sans laverie) - si mode entreprise ou tous
    if (viewMode === 'entreprise' || viewMode === 'tous') {
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

      // Accumuler les flux entreprise dans le total
      totalFluxFinanciers.depenses.montant += fluxFinanciersEntreprise.depenses.montant;
      totalFluxFinanciers.depenses.nombre += fluxFinanciersEntreprise.depenses.nombre;
      totalFluxFinanciers.recettes.montant += fluxFinanciersEntreprise.recettes.montant;
      totalFluxFinanciers.recettes.nombre += fluxFinanciersEntreprise.recettes.nombre;
      totalFluxFinanciers.apports.montant += fluxFinanciersEntreprise.apports.montant;
      totalFluxFinanciers.apports.nombre += fluxFinanciersEntreprise.apports.nombre;
      totalFluxFinanciers.retraits.montant += fluxFinanciersEntreprise.retraits.montant;
      totalFluxFinanciers.retraits.nombre += fluxFinanciersEntreprise.retraits.nombre;
    }

    // Ajouter le bilan "Tous" en première position si mode tous
    if (viewMode === 'tous') {
      const bilanTotal = {
        laverieRefId: 'total',
        laverie: { id: 0, nom: 'TOTAL GÉNÉRAL', adresse: '', ville: '' },
        ...this._buildBilan(
          month,
          startDate,
          endDate,
          totalRecettesCommandes,
          totalRecettesAbonnements,
          totalFluxFinanciers
        ),
      };
      bilans.unshift(bilanTotal); // Ajouter au début
    }

    return bilans;
  }

  /**
   * Calculer les statistiques des flux financiers
   * @private
   */
  _calculateFluxStats(flux) {
    const depenses = flux.filter((f) => f.type === "depense");
    const recettes = flux.filter((f) => f.type === "recette");
    const apports = flux.filter((f) => f.type === "apport");
    const retraits = flux.filter((f) => f.type === "retrait");

    return {
      depenses: {
        montant: depenses.reduce((sum, f) => sum + Number(f.montant), 0),
        nombre: depenses.length,
      },
      recettes: {
        montant: recettes.reduce((sum, f) => sum + Number(f.montant), 0),
        nombre: recettes.length,
      },
      apports: {
        montant: apports.reduce((sum, f) => sum + Number(f.montant), 0),
        nombre: apports.length,
      },
      retraits: {
        montant: retraits.reduce((sum, f) => sum + Number(f.montant), 0),
        nombre: retraits.length,
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
    const result = await prismaManager.abonnementpremiummensuel.aggregate({
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
    // Calcul des recettes (laverie + recettes + apports reçus)
    const recettesLaverie = commandes.montant + abonnements.montant;
    const recettesFluxFinanciers = fluxFinanciers.recettes.montant;
    const recettesApports = fluxFinanciers.apports.montant; // ✅ Apports = RECETTES
    const recettesBoutique = 0; // À venir
    const totalRecettes =
      recettesLaverie + recettesFluxFinanciers + recettesApports + recettesBoutique;

    // Calcul des dépenses (depenses + retraits effectués)
    const totalDepenses =
      fluxFinanciers.depenses.montant + fluxFinanciers.retraits.montant; // ✅ Retraits = DÉPENSES

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
        apports: { // ✅ Apports dans RECETTES
          montant: fluxFinanciers.apports.montant,
          nombre: fluxFinanciers.apports.nombre,
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
        retraits: { // ✅ Retraits dans DÉPENSES
          montant: fluxFinanciers.retraits.montant,
          nombre: fluxFinanciers.retraits.nombre,
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
