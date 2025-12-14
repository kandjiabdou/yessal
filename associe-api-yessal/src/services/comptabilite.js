/**
 * ============================================
 * SERVICE DE COMPTABILITÉ YESSAL
 * ============================================
 * 
 * Service de comptabilité en temps réel pour le suivi financier de l'entreprise.
 * Calcule automatiquement les indicateurs comptables à chaque validation de flux.
 * 
 * Fonctionnalités:
 * - Cash disponible en temps réel (caisse + banque)
 * - Dettes envers chaque associé
 * - Bilan comptable à une date donnée
 * - Soldes Intermédiaires de Gestion (SIG) mensuel et annuel
 * - Résultat net de la période
 * - Clôture de période comptable
 * 
 * Architecture:
 * - Utilise les flux financiers validés de shared-database
 * - Stocke les bilans et résultats dans associe-api-yessal
 * - Recettes de laverie calculées depuis api-yessal
 */

const prisma = require('../utils/prismaClient');
const prismaShared = require('../utils/prismaSharedClient');
const prismaApi = require('../../../api-yessal/prisma/client');

// ============================================
// 1. TYPES & CONSTANTES
// ============================================

/**
 * Types de flux financiers dans shared-database
 */
const FluxType = {
  DEPENSE: "depense",      // Charges diverses (salaires, maintenance, etc.)
  RECETTE: "recette",      // Vente de marchandises (manuel)
  APPORT: "apport",        // Apport de capitaux par associé
  RETRAIT: "retrait",      // Retrait par associé
  PRET: "pret",           // Prêt accordé à un tiers
  EMPRUNT: "emprunt",     // Emprunt auprès d'un tiers
};

/**
 * Sources de financement
 */
const SourceFinancement = {
  CAISSE: "caisse",
  BANQUE: "banque",
  EMPRUNT_TIERS: "emprunt_tiers",
  CASH_ASSOCIE: "cash_associe",
  FOND_PROPRE_ASSOCIE: "fond_propre_associe",
  AUTRE: "autre",
};

/**
 * Catégories de charges pour le SIG
 */
const CategorieCharge = {
  PERSONNEL: "salaire",
  FINANCIERE: ["intérêt", "interet"],
  EXPLOITATION: ["achat", "maintenance", "réparation", "location", "électricité", "eau"],
};

// ============================================
// 2. UTILITAIRES DE CALCUL
// ============================================

/**
 * Calcule le coût à partir du revenu et du taux de marge
 * Formule: coût = revenu / (1 + α)
 */
function calculerCout(revenu, alpha) {
  return revenu / (1 + alpha);
}

/**
 * Calcule la marge à partir du revenu et du taux de marge
 * Formule: marge = (α / (1 + α)) × revenu
 */
function calculerMarge(revenu, alpha) {
  return (alpha / (1 + alpha)) * revenu;
}

/**
 * Arrondit un nombre à 2 décimales
 */
function arrondir(nombre) {
  return Math.round(nombre * 100) / 100;
}

/**
 * Somme un tableau de nombres
 */
function somme(tableau) {
  return tableau.reduce((acc, val) => acc + val, 0);
}

// ============================================
// 3. AGRÉGATEUR DE FLUX
// ============================================

/**
 * Agrège les flux financiers par type et période
 */
class AggregateurFlux {
  /**
   * Filtre les flux par période
   */
  static filtrerParPeriode(flux, dateDebut, dateFin) {
    return flux.filter((f) => {
      const date = new Date(f.dateFluxFinancier);
      return date >= dateDebut && date <= dateFin;
    });
  }

  /**
   * Filtre les flux validés et payés/encaissés
   */
  static filtrerFluxValides(flux) {
    return flux.filter(
      (f) => f.status === "validated" && (f.estPaye || f.estEncaisse)
    );
  }

  /**
   * Agrège les revenus de vente de marchandises
   */
  static agregerRevenusMarchandises(flux) {
    return somme(
      flux
        .filter((f) => f.type === FluxType.RECETTE_MARCHANDISE && f.estEncaisse)
        .map((f) => f.montant)
    );
  }

  /**
   * Agrège les revenus de laverie
   */
  static agregerRevenusLaverie(flux) {
    return somme(
      flux
        .filter((f) => f.type === FluxType.RECETTE_LAVERIE && f.estEncaisse)
        .map((f) => f.montant)
    );
  }

  /**
   * Agrège les charges payées
   */
  static agregerCharges(flux) {
    return somme(
      flux
        .filter((f) => f.type === FluxType.DEPENSE && f.estPaye)
        .map((f) => f.montant)
    );
  }

  /**
   * Agrège les achats de stock
   */
  static agregerAchatsStock(flux) {
    return somme(
      flux
        .filter((f) => f.type === FluxType.ACHAT_STOCK && f.estPaye)
        .map((f) => f.montant)
    );
  }

  /**
   * Agrège les achats d'immobilisations
   */
  static agregerAchatsImmobilisations(flux) {
    return somme(
      flux
        .filter((f) => f.type === FluxType.ACHAT_IMMOBILISATION && f.estPaye)
        .map((f) => f.montant)
    );
  }

  /**
   * Agrège les apports
   */
  static agregerApports(flux) {
    return somme(
      flux.filter((f) => f.type === FluxType.APPORT).map((f) => f.montant)
    );
  }

  /**
   * Agrège les retraits
   */
  static agregerRetraits(flux) {
    return somme(
      flux.filter((f) => f.type === FluxType.RETRAIT).map((f) => f.montant)
    );
  }

  /**
   * Agrège les emprunts par type de tiers
   */
  static agregerEmprunts(flux, typeTiers = null) {
    let emprunts = flux.filter((f) => f.type === FluxType.EMPRUNT);

    if (typeTiers) {
      emprunts = emprunts.filter((f) => f.typeTiers === typeTiers);
    }

    return somme(emprunts.map((f) => f.montant));
  }

  /**
   * Agrège les remboursements d'emprunts
   */
  static agregerRemboursementsEmprunts(flux, typeTiers = null) {
    let remb = flux.filter(
      (f) => f.type === FluxType.REMBOURSEMENT_EMPRUNT && f.estPaye
    );

    if (typeTiers) {
      remb = remb.filter((f) => f.typeTiers === typeTiers);
    }

    return somme(remb.map((f) => f.montant));
  }

  /**
   * Calcule les dettes ouvertes à une date donnée
   */
  static calculerDettesOuvertes(tousLesFlux, dateReference, typeTiers = null) {
    const fluxAvantDate = tousLesFlux.filter(
      (f) => new Date(f.dateFluxFinancier) <= dateReference
    );

    const emprunts = this.agregerEmprunts(fluxAvantDate, typeTiers);
    const remboursements = this.agregerRemboursementsEmprunts(
      fluxAvantDate,
      typeTiers
    );

    return emprunts - remboursements;
  }

  static calculerDettesVersAssocie(flux, associeId, dateReference) {
    const fluxAssocie = flux.filter(
      (f) =>
        f.associeUserRefId === associeId &&
        new Date(f.dateFluxFinancier) <= dateReference &&
        f.status === "validated"
    );

    // 1. Apports de l'associé (augmente la dette)
    const apports = fluxAssocie
      .filter((f) => f.type === "apport")
      .reduce((sum, f) => sum + f.montant, 0);

    // 2. Retraits de l'associé (diminue la dette)
    const retraits = fluxAssocie
      .filter((f) => f.type === "retrait")
      .reduce((sum, f) => sum + f.montant, 0);

    // 3. Dépenses payées par l'associé (augmente la dette)
    const depensesPayees = fluxAssocie
      .filter(
        (f) =>
          (f.type === "depense" || f.type === "achat_stock") &&
          f.typeTiers === "ASSOCIE" &&
          f.estPaye &&
          !f.sourceFinancement // Pas payé par l'entreprise
      )
      .reduce((sum, f) => sum + f.montant, 0);

    // 4. Remboursements à l'associé (diminue la dette)
    const remboursements = fluxAssocie
      .filter((f) => f.type === "retrait" && f.motif?.includes("Remboursement"))
      .reduce((sum, f) => sum + f.montant, 0);

    return apports - retraits + depensesPayees - remboursements;
  }
}

// ============================================
// 4. CALCULATEUR DE CASH
// ============================================

/**
 * Calcule le cash disponible en temps réel
 */
class CalculateurCash {
  /**
   * Calcule le cash total à une date donnée
   */
  static calculerCashTotal(flux, dateReference, cashInitial = 0) {
    const fluxAvantDate = flux.filter(
      (f) =>
        new Date(f.dateFluxFinancier) <= dateReference &&
        f.status === "validated"
    );

    const encaissements = this.calculerEncaissements(fluxAvantDate);
    const decaissements = this.calculerDecaissements(fluxAvantDate);

    return arrondir(cashInitial + encaissements - decaissements);
  }

  /**
   * Calcule tous les encaissements
   */
  static calculerEncaissements(flux) {
    const types = [
      FluxType.RECETTE_MARCHANDISE,
      FluxType.RECETTE_LAVERIE,
      FluxType.APPORT,
      FluxType.EMPRUNT,
      FluxType.REMBOURSEMENT_PRET,
    ];

    return somme(
      flux
        .filter((f) => types.includes(f.type) && f.estEncaisse)
        .map((f) => f.montant)
    );
  }

  /**
   * Calcule tous les décaissements
   */
  static calculerDecaissements(flux) {
    const types = [
      FluxType.DEPENSE,
      FluxType.ACHAT_STOCK,
      FluxType.ACHAT_IMMOBILISATION,
      FluxType.RETRAIT,
      FluxType.REMBOURSEMENT_EMPRUNT,
      FluxType.PRET,
    ];

    return somme(
      flux
        .filter((f) => types.includes(f.type) && f.estPaye)
        .map((f) => f.montant)
    );
  }

  /**
   * Répartition du cash par source
   */
  static repartirCash(flux, dateReference) {
    const fluxAvantDate = flux.filter(
      (f) =>
        new Date(f.dateFluxFinancier) <= dateReference &&
        f.status === "validated"
    );

    const caisse = this.calculerCashParSource(
      fluxAvantDate,
      SourceFinancement.CAISSE
    );
    const banque = this.calculerCashParSource(
      fluxAvantDate,
      SourceFinancement.BANQUE
    );

    return {
      caisse: arrondir(caisse),
      banque: arrondir(banque),
      total: arrondir(caisse + banque),
    };
  }

  /**
   * Calcule le cash pour une source donnée
   */
  static calculerCashParSource(flux, source) {
    const fluxSource = flux.filter((f) => f.sourceFinancement === source);

    const encaissements = this.calculerEncaissements(fluxSource);
    const decaissements = this.calculerDecaissements(fluxSource);

    return encaissements - decaissements;
  }
}

// ============================================
// 5. CALCULATEUR DE STOCK
// ============================================

/**
 * Calcule la valeur du stock en temps réel
 */
class CalculateurStock {
  /**
   * Calcule la valeur du stock à une date donnée
   * Formule: Stock(t) = Stock(0) + achats - coût des ventes
   */
  static calculerStock(flux, dateReference, stockInitial, alpha) {
    const fluxAvantDate = AggregateurFlux.filtrerParPeriode(
      flux,
      new Date(0),
      dateReference
    );

    const fluxValides = AggregateurFlux.filtrerFluxValides(fluxAvantDate);

    // Achats de stock
    const achatsStock = AggregateurFlux.agregerAchatsStock(fluxValides);

    // Coût des ventes (revenu / (1 + α))
    const revenusMarchandises =
      AggregateurFlux.agregerRevenusMarchandises(fluxValides);
    const coutVentes = calculerCout(revenusMarchandises, alpha);

    const stockFinal = stockInitial + achatsStock - coutVentes;

    return {
      stockInitial: arrondir(stockInitial),
      achatsStock: arrondir(achatsStock),
      coutVentes: arrondir(coutVentes),
      stockFinal: arrondir(stockFinal),
    };
  }
}

// ============================================
// 6. CALCULATEUR DE RÉSULTAT
// ============================================

/**
 * Calcule le résultat d'une période
 */
class CalculateurResultat {
  /**
   * Calcule le résultat pour une période donnée
   */
  static calculerResultat(flux, dateDebut, dateFin, alpha) {
    const fluxPeriode = AggregateurFlux.filtrerParPeriode(
      flux,
      dateDebut,
      dateFin
    );
    const fluxValides = AggregateurFlux.filtrerFluxValides(fluxPeriode);

    // Revenus
    const revenusMarchandises =
      AggregateurFlux.agregerRevenusMarchandises(fluxValides);
    const revenusLaverie = AggregateurFlux.agregerRevenusLaverie(fluxValides);

    // Charges
    const charges = AggregateurFlux.agregerCharges(fluxValides);

    // Marge sur marchandises
    const coutVentes = calculerCout(revenusMarchandises, alpha);
    const margeMarchandises = calculerMarge(revenusMarchandises, alpha);

    // Résultat net
    const resultatNet = margeMarchandises + revenusLaverie - charges;

    return {
      revenuVenteMarchandise: arrondir(revenusMarchandises),
      revenuLaverie: arrondir(revenusLaverie),
      revenusTotal: arrondir(revenusMarchandises + revenusLaverie),

      coutVenteMarchandise: arrondir(coutVentes),
      margeVenteMarchandise: arrondir(margeMarchandises),

      chargesTotal: arrondir(charges),

      alphaMargeSurCout: alpha,
      resultatNet: arrondir(resultatNet),
    };
  }

  /**
   * Calcule le résultat cumulé depuis le début de l'année
   */
  static calculerResultatCumule(flux, dateDebut, dateFin, alpha) {
    // Début de l'année
    const debutAnnee = new Date(dateFin.getFullYear(), 0, 1);

    return this.calculerResultat(flux, debutAnnee, dateFin, alpha);
  }
}

// ============================================
// 7. CALCULATEUR SIG (Soldes Intermédiaires de Gestion)
// ============================================

/**
 * Calcule les Soldes Intermédiaires de Gestion
 */
class CalculateurSIG {
  /**
   * Calcule le SIG complet pour une période
   */
  static calculerSIG(flux, dateDebut, dateFin, alpha) {
    const fluxPeriode = AggregateurFlux.filtrerParPeriode(
      flux,
      dateDebut,
      dateFin
    );
    const fluxValides = AggregateurFlux.filtrerFluxValides(fluxPeriode);

    // 1. Production vendue
    const productionVendue =
      AggregateurFlux.agregerRevenusMarchandises(fluxValides) +
      AggregateurFlux.agregerRevenusLaverie(fluxValides);

    // 2. Consommations (coût des marchandises vendues)
    const revenusMarchandises =
      AggregateurFlux.agregerRevenusMarchandises(fluxValides);
    const consommations = calculerCout(revenusMarchandises, alpha);

    // 3. Valeur ajoutée
    const valeurAjoutee = productionVendue - consommations;

    // 4. Charges de personnel (à extraire des charges)
    const chargesPersonnel = this.extraireChargesPersonnel(fluxValides);
    const autresCharges =
      AggregateurFlux.agregerCharges(fluxValides) - chargesPersonnel;

    // 5. Excédent Brut d'Exploitation (EBE)
    const ebe = valeurAjoutee - chargesPersonnel;

    // 6. Résultat d'exploitation
    const resultatExploitation = ebe - autresCharges;

    // 7. Charges financières (intérêts sur emprunts)
    const chargesFinancieres = this.extraireChargesFinancieres(fluxValides);

    // 8. Résultat courant avant impôts
    const resultatCourant = resultatExploitation - chargesFinancieres;

    // 9. Résultat net (= résultat courant pour simplification)
    const resultatNet = resultatCourant;

    return {
      productionVendue: arrondir(productionVendue),
      consommations: arrondir(consommations),
      valeurAjoutee: arrondir(valeurAjoutee),
      chargesPersonnel: arrondir(chargesPersonnel),
      ebe: arrondir(ebe),
      autresCharges: arrondir(autresCharges),
      resultatExploitation: arrondir(resultatExploitation),
      chargesFinancieres: arrondir(chargesFinancieres),
      resultatCourant: arrondir(resultatCourant),
      resultatNet: arrondir(resultatNet),

      // Ratios
      tauxMargeCommerciale: arrondir((valeurAjoutee / productionVendue) * 100),
      tauxEBE: arrondir((ebe / productionVendue) * 100),
    };
  }

  /**
   * Extrait les charges de personnel des flux
   */
  static extraireChargesPersonnel(flux) {
    return somme(
      flux
        .filter(
          (f) =>
            f.type === FluxType.DEPENSE &&
            f.motif &&
            f.motif.toLowerCase().includes("salaire")
        )
        .map((f) => f.montant)
    );
  }

  /**
   * Extrait les charges financières
   */
  static extraireChargesFinancieres(flux) {
    return somme(
      flux
        .filter(
          (f) =>
            f.type === FluxType.DEPENSE &&
            f.motif &&
            (f.motif.toLowerCase().includes("intérêt") ||
              f.motif.toLowerCase().includes("interet"))
        )
        .map((f) => f.montant)
    );
  }

  /**
   * Calcule le SIG mensuel pour toute une année
   */
  static calculerSIGMensuel(flux, annee, alpha) {
    const sigMensuel = [];

    for (let mois = 0; mois < 12; mois++) {
      const dateDebut = new Date(annee, mois, 1);
      const dateFin = new Date(annee, mois + 1, 0, 23, 59, 59);

      const sig = this.calculerSIG(flux, dateDebut, dateFin, alpha);

      sigMensuel.push({
        mois: mois + 1,
        annee,
        dateDebut,
        dateFin,
        ...sig,
      });
    }

    return sigMensuel;
  }

  /**
   * Calcule le SIG annuel
   */
  static calculerSIGAnnuel(flux, annee, alpha) {
    const dateDebut = new Date(annee, 0, 1);
    const dateFin = new Date(annee, 11, 31, 23, 59, 59);

    return {
      annee,
      ...this.calculerSIG(flux, dateDebut, dateFin, alpha),
    };
  }
}

// ============================================
// 8. CALCULATEUR DE BILAN
// ============================================

/**
 * Calcule le bilan à une date donnée
 */
class CalculateurBilan {
  /**
   * Calcule le bilan complet
   */
  static calculerBilan(params) {
    const {
      flux,
      dateReference,
      stockInitial,
      cashInitial,
      dettesInitiales,
      capitauxPropresinitaux,
      reservesInitiales,
      alpha,
      associeUserId,
    } = params;

    // ACTIF
    const cash = CalculateurCash.repartirCash(flux, dateReference);
    const stock = CalculateurStock.calculerStock(
      flux,
      dateReference,
      stockInitial,
      alpha
    );

    const actifTotal = cash.total + stock.stockFinal;

    // PASSIF - Dettes
    const dettesAssocies = AggregateurFlux.calculerDettesOuvertes(
      flux,
      dateReference,
      TypeTiers.ASSOCIE
    );
    const dettesTiersExternes = AggregateurFlux.calculerDettesOuvertes(
      flux,
      dateReference,
      TypeTiers.TIERS_EXTERNE
    );
    const dettesTotales =
      dettesInitiales + dettesAssocies + dettesTiersExternes;

    // PASSIF - Capitaux Propres
    const apports = AggregateurFlux.agregerApports(flux);
    const retraits = AggregateurFlux.agregerRetraits(flux);
    const capitauxPropres = capitauxPropresinitaux + apports - retraits;

    // Réserves (inchangées pendant la période)
    const reserves = reservesInitiales;

    // Résultat de la période (0 en début de période)
    const resultatPeriode = 0;

    return {
      dateBilan: dateReference,
      associeUserId,

      // ACTIF
      cashCaisse: cash.caisse,
      cashBanque: cash.banque,
      cashTotal: cash.total,
      stockValeurRevient: stock.stockFinal,
      actifTotal: arrondir(actifTotal),

      // PASSIF
      dettesVersAssocies: arrondir(dettesAssocies),
      dettesVersTiersExternes: arrondir(dettesTiersExternes),
      dettesTotales: arrondir(dettesTotales),

      capitauxPropresHorsResultat: arrondir(capitauxPropres),
      reserves: arrondir(reserves),
      resultatPeriode: arrondir(resultatPeriode),

      // Vérification identité comptable
      passifTotal: arrondir(dettesTotales + capitauxPropres + resultatPeriode),
      equilibre:
        arrondir(actifTotal) ===
        arrondir(dettesTotales + capitauxPropres + resultatPeriode),
    };
  }

  /**
   * Calcule le bilan de fin de période avec résultat
   */
  static calculerBilanAvecResultat(params) {
    const {
      flux,
      dateDebut,
      dateFin,
      stockInitial,
      cashInitial,
      dettesInitiales,
      capitauxPropresinitaux,
      reservesInitiales,
      alpha,
      associeUserId,
    } = params;

    // Bilan de base
    const bilan = this.calculerBilan({
      flux,
      dateReference: dateFin,
      stockInitial,
      cashInitial,
      dettesInitiales,
      capitauxPropresinitaux,
      reservesInitiales,
      alpha,
      associeUserId,
    });

    // Calcul du résultat de la période
    const resultat = CalculateurResultat.calculerResultat(
      flux,
      dateDebut,
      dateFin,
      alpha
    );

    // Mise à jour du bilan avec le résultat
    bilan.resultatPeriode = resultat.resultatNet;
    bilan.passifTotal = arrondir(
      bilan.dettesTotales +
        bilan.capitauxPropresHorsResultat +
        resultat.resultatNet
    );
    bilan.equilibre =
      arrondir(bilan.actifTotal) === arrondir(bilan.passifTotal);

    return {
      bilan,
      resultat,
    };
  }
}

// ============================================
// 9. CALCULATEUR D'AFFECTATION
// ============================================

/**
 * Calcule l'affectation du résultat
 */
class CalculateurAffectation {
  /**
   * Calcule l'affectation du résultat aux associés
   */
  static calculerAffectation(resultatNet, tauxDividende, associes) {
    const montantDividendes = resultatNet * tauxDividende;
    const montantMisEnReserve = resultatNet * (1 - tauxDividende);

    const affectationsAssocies = associes.map((associe) => {
      const montantDividendeDu = associe.pourcentageParts * montantDividendes;

      return {
        associeUserId: associe.id,
        pourcentageParts: associe.pourcentageParts,
        montantDividendeDu: arrondir(montantDividendeDu),
        montantRetire: 0,
        montantCompense: 0,
      };
    });

    return {
      tauxDividende,
      montantDividendes: arrondir(montantDividendes),
      montantMisEnReserve: arrondir(montantMisEnReserve),
      affectationsAssocies,
    };
  }

  /**
   * Calcule les comptes des associés après affectation
   */
  static calculerComptesAssocies(affectation, associes) {
    return affectation.affectationsAssocies.map((aff) => {
      const associe = associes.find((a) => a.id === aff.associeUserId);

      return {
        associeUserId: aff.associeUserId,
        nom: associe.nom,
        prenom: associe.prenom,
        pourcentageParts: aff.pourcentageParts,

        // Comptes avant affectation
        compteCourantSoldeAvant: associe.compteCourantSolde,
        compteDividendesDusAvant: associe.compteDividendesDus,
        compteCreanceSoldeAvant: associe.compteCreanceSolde,

        // Nouveaux dividendes dus
        dividendesDu: aff.montantDividendeDu,

        // Comptes après affectation
        compteDividendesDusApres: arrondir(
          associe.compteDividendesDus + aff.montantDividendeDu
        ),
      };
    });
  }
}

// ============================================
// 10. MOTEUR DE CLÔTURE
// ============================================

/**
 * Moteur principal de clôture de période
 */
class MoteurCloture {
  /**
   * Clôture complète d'une période
   */
  static cloturerPeriode(params) {
    const {
      flux,
      dateDebut,
      dateFin,
      stockInitial,
      cashInitial,
      dettesInitiales,
      capitauxPropresinitaux,
      reservesInitiales,
      alpha,
      tauxDividende,
      associes,
      associeUserId, // Qui effectue la clôture
    } = params;

    // 1. Calcul du bilan et du résultat
    const { bilan, resultat } = CalculateurBilan.calculerBilanAvecResultat({
      flux,
      dateDebut,
      dateFin,
      stockInitial,
      cashInitial,
      dettesInitiales,
      capitauxPropresinitaux,
      reservesInitiales,
      alpha,
      associeUserId,
    });

    // 2. Calcul de l'affectation du résultat
    const affectation = CalculateurAffectation.calculerAffectation(
      resultat.resultatNet,
      tauxDividende,
      associes
    );

    // 3. Calcul des comptes des associés
    const comptesAssocies = CalculateurAffectation.calculerComptesAssocies(
      affectation,
      associes
    );

    // 4. Calcul du nouveau bilan après affectation (t=1+)
    const nouveauBilan = {
      ...bilan,
      dateBilan: new Date(dateFin.getTime() + 1), // t=1+

      // Cash diminue des dividendes
      cashTotal: arrondir(bilan.cashTotal - affectation.montantDividendes),
      actifTotal: arrondir(
        bilan.cashTotal -
          affectation.montantDividendes +
          bilan.stockValeurRevient
      ),

      // Capitaux propres augmentent des réserves
      capitauxPropresHorsResultat: arrondir(
        bilan.capitauxPropresHorsResultat + affectation.montantMisEnReserve
      ),
      reserves: arrondir(bilan.reserves + affectation.montantMisEnReserve),

      // Résultat remis à 0
      resultatPeriode: 0,
    };

    nouveauBilan.passifTotal = arrondir(
      nouveauBilan.dettesTotales + nouveauBilan.capitauxPropresHorsResultat
    );
    nouveauBilan.equilibre =
      arrondir(nouveauBilan.actifTotal) === arrondir(nouveauBilan.passifTotal);

    return {
      periode: {
        dateDebut,
        dateFin,
        estCloturee: true,
      },
      bilanFin: bilan,
      resultat,
      affectation,
      comptesAssocies,
      bilanDebutNouvellePeriode: nouveauBilan,
    };
  }
}

// ============================================
// 11. TABLEAU DE BORD TEMPS RÉEL
// ============================================

/**
 * Génère un tableau de bord temps réel
 */
class TableauDeBord {
  /**
   * Génère le tableau de bord complet
   */
  static generer(params) {
    const {
      flux,
      dateReference = new Date(),
      stockInitial,
      cashInitial,
      dettesInitiales,
      capitauxPropresinitaux,
      reservesInitiales,
      alpha,
      associes,
    } = params;

    // Cash disponible
    const cash = CalculateurCash.repartirCash(flux, dateReference);

    // Dettes envers les associés
    const dettesParAssocies = associes.map((associe) => {
      const fluxAssocie = flux.filter((f) => f.associeUserRefId === associe.id);

      const dettes = AggregateurFlux.calculerDettesOuvertes(
        fluxAssocie,
        dateReference,
        TypeTiers.ASSOCIE
      );

      return {
        associeId: associe.id,
        nom: `${associe.prenom} ${associe.nom}`,
        pourcentageParts: associe.pourcentageParts,
        compteCourantSolde: associe.compteCourantSolde,
        compteDividendesDus: associe.compteDividendesDus,
        compteCreanceSolde: associe.compteCreanceSolde,
        dettesEnvers: arrondir(dettes),
        totalDu: arrondir(associe.compteDividendesDus + dettes),
      };
    });

    // Résultat du mois en cours
    const debutMois = new Date(
      dateReference.getFullYear(),
      dateReference.getMonth(),
      1
    );
    const resultatMois = CalculateurResultat.calculerResultat(
      flux,
      debutMois,
      dateReference,
      alpha
    );

    // Résultat cumulé de l'année
    const debutAnnee = new Date(dateReference.getFullYear(), 0, 1);
    const resultatAnnee = CalculateurResultat.calculerResultat(
      flux,
      debutAnnee,
      dateReference,
      alpha
    );

    // SIG du mois en cours
    const sigMois = CalculateurSIG.calculerSIG(
      flux,
      debutMois,
      dateReference,
      alpha
    );

    // Stock actuel
    const stock = CalculateurStock.calculerStock(
      flux,
      dateReference,
      stockInitial,
      alpha
    );

    return {
      dateReference,

      // Trésorerie
      tresorerie: {
        cashCaisse: cash.caisse,
        cashBanque: cash.banque,
        cashTotal: cash.total,
        cashDisponible: cash.total, // Peut être ajusté selon besoins
      },

      // Stock
      stock: {
        valeurRevient: stock.stockFinal,
        achats: stock.achatsStock,
        coutVentes: stock.coutVentes,
      },

      // Dettes
      dettes: {
        versAssocies: somme(dettesParAssocies.map((d) => d.dettesEnvers)),
        detailsAssocies: dettesParAssocies,
        versTiersExternes: AggregateurFlux.calculerDettesOuvertes(
          flux,
          dateReference,
          TypeTiers.TIERS_EXTERNE
        ),
        total: arrondir(
          somme(dettesParAssocies.map((d) => d.dettesEnvers)) +
            AggregateurFlux.calculerDettesOuvertes(
              flux,
              dateReference,
              TypeTiers.TIERS_EXTERNE
            )
        ),
      },

      // Performance du mois
      moisCourant: {
        mois: debutMois.getMonth() + 1,
        annee: debutMois.getFullYear(),
        resultat: resultatMois,
        sig: sigMois,
      },

      // Performance de l'année
      anneeCourante: {
        annee: dateReference.getFullYear(),
        resultat: resultatAnnee,
        nombreJours: Math.floor(
          (dateReference - debutAnnee) / (1000 * 60 * 60 * 24)
        ),
      },

      // Ratios clés
      ratios: {
        tauxMarge: arrondir(
          (resultatMois.margeVenteMarchandise / resultatMois.revenusTotal) * 100
        ),
        tauxEBE: sigMois.tauxEBE,
        rentabilite: arrondir(
          (resultatMois.resultatNet / resultatMois.revenusTotal) * 100
        ),
      },
    };
  }

  /**
   * Génère un rapport mensuel complet
   */
  static genererRapportMensuel(flux, annee, mois, alpha, associes) {
    const dateDebut = new Date(annee, mois - 1, 1);
    const dateFin = new Date(annee, mois, 0, 23, 59, 59);

    const resultat = CalculateurResultat.calculerResultat(
      flux,
      dateDebut,
      dateFin,
      alpha
    );

    const sig = CalculateurSIG.calculerSIG(flux, dateDebut, dateFin, alpha);

    return {
      periode: {
        mois,
        annee,
        dateDebut,
        dateFin,
      },
      resultat,
      sig,
    };
  }

  /**
   * Génère un rapport annuel complet
   */
  static genererRapportAnnuel(flux, annee, alpha, associes) {
    const dateDebut = new Date(annee, 0, 1);
    const dateFin = new Date(annee, 11, 31, 23, 59, 59);

    const resultat = CalculateurResultat.calculerResultat(
      flux,
      dateDebut,
      dateFin,
      alpha
    );

    const sig = CalculateurSIG.calculerSIG(flux, dateDebut, dateFin, alpha);

    const sigMensuel = CalculateurSIG.calculerSIGMensuel(flux, annee, alpha);

    return {
      annee,
      dateDebut,
      dateFin,
      resultat,
      sig,
      evolutionMensuelle: sigMensuel,
    };
  }
}

// ============================================
// 12. EXEMPLES D'UTILISATION
// ============================================

/**
 * Exemple 1: Clôture d'une période mensuelle
 */
function exempleCloture() {
  const flux = [
    // ... vos flux financiers depuis la base de données
  ];

  const associes = [
    {
      id: 1,
      nom: "Dupont",
      prenom: "Jean",
      pourcentageParts: 0.6, // 60%
      compteCourantSolde: 0,
      compteDividendesDus: 0,
      compteCreanceSolde: 0,
    },
    {
      id: 2,
      nom: "Martin",
      prenom: "Marie",
      pourcentageParts: 0.4, // 40%
      compteCourantSolde: 0,
      compteDividendesDus: 0,
      compteCreanceSolde: 0,
    },
  ];

  const resultatCloture = MoteurCloture.cloturerPeriode({
    flux,
    dateDebut: new Date("2025-01-01"),
    dateFin: new Date("2025-01-31T23:59:59"),
    stockInitial: 50000,
    cashInitial: 100000,
    dettesInitiales: 0,
    capitauxPropresinitaux: 150000,
    reservesInitiales: 0,
    alpha: 0.5, // 50% de marge
    tauxDividende: 0.3, // 30% en dividendes
    associes,
    associeUserId: 1, // Jean effectue la clôture
  });

  console.log("Résultat de la clôture:", resultatCloture);

  return resultatCloture;
}

/**
 * Exemple 2: Tableau de bord temps réel
 */
function exempleTableauDeBord() {
  const flux = [
    // ... vos flux financiers
  ];

  const associes = [
    // ... vos associés
  ];

  const dashboard = TableauDeBord.generer({
    flux,
    dateReference: new Date(), // Maintenant
    stockInitial: 50000,
    cashInitial: 100000,
    dettesInitiales: 0,
    capitauxPropresinitaux: 150000,
    reservesInitiales: 0,
    alpha: 0.5,
    associes,
  });

  console.log("Tableau de bord:", dashboard);

  return dashboard;
}

/**
 * Exemple 3: Cash disponible en temps réel
 */
function exempleCashDisponible() {
  const flux = [
    // ... vos flux
  ];

  const cashActuel = CalculateurCash.calculerCashTotal(
    flux,
    new Date(),
    100000 // Cash initial
  );

  const repartition = CalculateurCash.repartirCash(flux, new Date());

  console.log("Cash total:", cashActuel);
  console.log("Répartition:", repartition);

  return { cashActuel, repartition };
}

/**
 * Exemple 4: Résultat du mois en cours
 */
function exempleResultatMois() {
  const flux = [
    // ... vos flux
  ];

  const maintenant = new Date();
  const debutMois = new Date(
    maintenant.getFullYear(),
    maintenant.getMonth(),
    1
  );

  const resultat = CalculateurResultat.calculerResultat(
    flux,
    debutMois,
    maintenant,
    0.5 // alpha
  );

  console.log("Résultat du mois:", resultat);

  return resultat;
}

/**
 * Exemple 5: SIG mensuel sur toute l'année
 */
function exempleSIGAnnuel() {
  const flux = [
    // ... vos flux
  ];

  const sigMensuel = CalculateurSIG.calculerSIGMensuel(
    flux,
    2025,
    0.5 // alpha
  );

  console.log("SIG mensuel:", sigMensuel);

  return sigMensuel;
}

/**
 * Exemple 6: Dettes envers chaque associé
 */
function exempleDettesAssocies() {
  const flux = [
    // ... vos flux
  ];

  const associes = [
    { id: 1, nom: "Dupont" },
    { id: 2, nom: "Martin" },
  ];

  const dettesParAssocie = associes.map((associe) => {
    const fluxAssocie = flux.filter((f) => f.associeUserRefId === associe.id);

    const dettes = AggregateurFlux.calculerDettesOuvertes(
      fluxAssocie,
      new Date(),
      TypeTiers.ASSOCIE
    );

    return {
      associeId: associe.id,
      nom: associe.nom,
      dettesEnvers: dettes,
    };
  });

  console.log("Dettes par associé:", dettesParAssocie);

  return dettesParAssocie;
}

// ============================================
// 13. EXPORTS
// ============================================

module.exports = {
  // Types
  FluxType,
  TypeTiers,
  SourceFinancement,

  // Utilitaires
  calculerCout,
  calculerMarge,
  arrondir,
  somme,

  // Agrégation
  AggregateurFlux,

  // Calculateurs
  CalculateurCash,
  CalculateurStock,
  CalculateurResultat,
  CalculateurSIG,
  CalculateurBilan,
  CalculateurAffectation,

  // Moteur principal
  MoteurCloture,

  // Tableau de bord
  TableauDeBord,

  // Exemples
  exempleCloture,
  exempleTableauDeBord,
  exempleCashDisponible,
  exempleResultatMois,
  exempleSIGAnnuel,
  exempleDettesAssocies,
};
