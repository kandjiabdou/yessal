/**
 * ============================================
 * SERVICE DE COMPTABILITÉ YESSAL
 * ============================================
 * 
 * Service de comptabilité en temps réel pour le suivi financier de l'entreprise.
 * Calcule automatiquement les indicateurs comptables à partir des flux validés.
 * 
 * Fonctionnalités principales:
 * - Cash disponible en temps réel (caisse + banque)
 * - Dettes envers chaque associé
 * - Bilan comptable à une date donnée
 * - Soldes Intermédiaires de Gestion (SIG) mensuel et annuel
 * - Résultat net de la période (avec recettes laverie réelles)
 * - Clôture de période comptable
 * 
 * Architecture:
 * - Flux financiers: shared-database (FluxFinancier)
 * - Bilans/Résultats: associe-api-yessal (Bilan, Resultat, PeriodeComptable)
 * - Recettes laverie: api-yessal (Commande)
 * - Associés: associe-api-yessal (user)
 */

const prisma = require('../utils/prismaClient'); // associe-api-yessal DB
const prismaShared = require('../utils/prismaSharedClient'); // shared-database

// ============================================
// 1. CONSTANTES & UTILITAIRES
// ============================================

/**
 * Arrondit un nombre à 2 décimales
 */
const arrondir = (nombre) => Math.round(nombre * 100) / 100;

/**
 * Convertit un Decimal Prisma en nombre
 */
const toNumber = (decimal) => decimal ? Number(decimal) : 0;

/**
 * Somme un tableau de nombres
 */
const somme = (tableau) => tableau.reduce((acc, val) => acc + val, 0);

// ============================================
// 2. RÉCUPÉRATION DES FLUX VALIDÉS
// ============================================

/**
 * Récupère tous les flux financiers validés jusqu'à une date donnée
 * @param {Date} dateReference - Date limite (incluse)
 * @param {String|null} laverieRefId - Filtre par laverie (optionnel)
 * @returns {Promise<Array>} Liste des flux validés
 */
async function getFluxValides(dateReference, laverieRefId = null) {
  const where = {
    status: 'validated',
    dateFluxFinancier: { lte: dateReference },
    flagged: true,
  };

  if (laverieRefId) {
    where.laverieRefId = laverieRefId;
  }

  const flux = await prismaShared.fluxFinancier.findMany({
    where,
    include: {
      createdByRef: true,
      laverieRef: true,
      associeUserRef: true,
    },
    orderBy: { dateFluxFinancier: 'asc' },
  });

  return flux.map(f => ({
    ...f,
    montant: toNumber(f.montant),
  }));
}

/**
 * Récupère les flux validés pour une période donnée
 * @param {Date} dateDebut - Date de début (incluse)
 * @param {Date} dateFin - Date de fin (incluse)
 * @param {String|null} laverieRefId - Filtre par laverie (optionnel)
 * @returns {Promise<Array>} Liste des flux de la période
 */
async function getFluxPeriode(dateDebut, dateFin, laverieRefId = null) {
  const where = {
    status: 'validated',
    dateFluxFinancier: {
      gte: dateDebut,
      lte: dateFin,
    },
    flagged: true,
  };

  if (laverieRefId) {
    where.laverieRefId = laverieRefId;
  }

  const flux = await prismaShared.fluxFinancier.findMany({
    where,
    include: {
      createdByRef: true,
      laverieRef: true,
      associeUserRef: true,
    },
    orderBy: { dateFluxFinancier: 'asc' },
  });

  return flux.map(f => ({
    ...f,
    montant: toNumber(f.montant),
  }));
}

// ============================================
// 3. CALCUL DES RECETTES LAVERIE
// ============================================

/**
 * Calcule les recettes laverie réelles à partir des commandes payées
 * Ces recettes ne sont PAS des flux financiers mais calculées depuis api-yessal
 * @param {Date} dateDebut - Date de début
 * @param {Date} dateFin - Date de fin
 * @param {Number|null} siteLavageId - Filtre par site (optionnel)
 * @returns {Promise<Number>} Total des recettes laverie
 */
async function calculerRecettesLaverie(dateDebut, dateFin, siteLavageId = null) {
  try {
    // Utiliser la base api-yessal pour récupérer les commandes
    const { PrismaClient: PrismaClientApi } = require('@prisma/client');
    const prismaApi = new PrismaClientApi({
      datasources: {
        db: {
          url: process.env.DATABASE_URL // URL de api-yessal
        }
      }
    });

    const where = {
      dateHeureCommande: {
        gte: dateDebut,
        lte: dateFin,
      },
      statut: 'Termine',
      prixPaye: { not: null },
    };

    if (siteLavageId) {
      where.siteLavageId = siteLavageId;
    }

    const result = await prismaApi.commande.aggregate({
      where,
      _sum: { prixPaye: true },
    });

    await prismaApi.$disconnect();

    return toNumber(result._sum.prixPaye || 0);
  } catch (error) {
    console.error('Erreur calcul recettes laverie:', error);
    return 0;
  }
}

/**
 * Calcule les recettes marchandises (ventes manuelles) à partir des flux
 * @param {Array} flux - Liste des flux
 * @returns {Number} Total des recettes marchandises
 */
function calculerRecettesMarchandises(flux) {
  return somme(
    flux
      .filter(f => f.type === 'recette')
      .map(f => f.montant)
  );
}

// ============================================
// 4. CALCULATEUR DE TRÉSORERIE (CASH)
// ============================================

/**
 * Calcule le cash disponible en temps réel
 * Cash = Encaissements - Décaissements
 */
class CalculateurTresorerie {
  
  /**
   * Calcule le cash total disponible à une date donnée
   * @param {Array} flux - Liste des flux validés jusqu'à la date
   * @param {Object} cashInitial - { caisse: number, banque: number }
   * @returns {Object} { caisse, banque, total }
   */
  static calculerCash(flux, cashInitial = { caisse: 0, banque: 0 }) {
    const cashCaisse = this._calculerCashParSource(flux, 'caisse', cashInitial.caisse);
    const cashBanque = this._calculerCashParSource(flux, 'banque', cashInitial.banque);

    return {
      caisse: arrondir(cashCaisse),
      banque: arrondir(cashBanque),
      total: arrondir(cashCaisse + cashBanque),
    };
  }

  /**
   * Calcule le cash pour une source spécifique (caisse ou banque)
   * @param {Array} flux - Liste des flux
   * @param {String} source - 'caisse' ou 'banque'
   * @param {Number} initial - Cash initial
   * @returns {Number} Cash final
   */
  static _calculerCashParSource(flux, source, initial) {
    const fluxSource = flux.filter(f => f.sourceFinancement === source);
    
    const encaissements = this._calculerEncaissements(fluxSource);
    const decaissements = this._calculerDecaissements(fluxSource);

    return initial + encaissements - decaissements;
  }

  /**
   * Calcule les encaissements (argent reçu)
   * @param {Array} flux - Liste des flux
   * @returns {Number} Total encaissements
   */
  static _calculerEncaissements(flux) {
    const typesEncaissement = ['recette', 'apport', 'emprunt'];
    
    return somme(
      flux
        .filter(f => typesEncaissement.includes(f.type))
        .map(f => f.montant)
    );
  }

  /**
   * Calcule les décaissements (argent payé)
   * @param {Array} flux - Liste des flux
   * @returns {Number} Total décaissements
   */
  static _calculerDecaissements(flux) {
    const typesDecaissement = ['depense', 'retrait', 'pret'];
    
    return somme(
      flux
        .filter(f => typesDecaissement.includes(f.type))
        .map(f => f.montant)
    );
  }
}

// ============================================
// 5. CALCULATEUR DE DETTES
// ============================================

/**
 * Calcule les dettes envers les associés et tiers
 */
class CalculateurDettes {
  
  /**
   * Calcule la dette totale envers un associé spécifique
   * Dette = Apports + Emprunts - Retraits
   * @param {Array} flux - Tous les flux validés
   * @param {String} associeUserRefId - ID de la référence utilisateur
   * @returns {Number} Dette envers l'associé
   */
  static calculerDetteAssocie(flux, associeUserRefId) {
    const fluxAssocie = flux.filter(f => 
      f.associeUserRefId === associeUserRefId ||
      (f.createdByRefId === associeUserRefId && ['apport', 'retrait', 'emprunt'].includes(f.type))
    );

    const apports = somme(
      fluxAssocie
        .filter(f => f.type === 'apport')
        .map(f => f.montant)
    );

    const emprunts = somme(
      fluxAssocie
        .filter(f => f.type === 'emprunt' && f.sourceFinancement === 'cash_associe')
        .map(f => f.montant)
    );

    const retraits = somme(
      fluxAssocie
        .filter(f => f.type === 'retrait')
        .map(f => f.montant)
    );

    return arrondir(apports + emprunts - retraits);
  }

  /**
   * Calcule les dettes envers tous les associés
   * @param {Array} flux - Tous les flux validés
   * @param {Array} associes - Liste des associés
   * @returns {Array} Liste des dettes par associé
   */
  static async calculerDettesTousAssocies(flux) {
    // Récupérer tous les associés
    const associes = await prisma.user.findMany({
      where: {
        role: 'ASSOCIE',
        flag: true,
      },
      select: {
        id: true,
        nom: true,
        prenom: true,
        email: true,
        pourcentageParts: true,
      },
    });

    // Créer un map des UserReference par email
    const userRefs = await prismaShared.userReference.findMany({
      where: {
        sourceApp: 'ASSOCIE',
      },
    });

    const emailToRefId = new Map();
    for (const ref of userRefs) {
      if (ref.email) {
        emailToRefId.set(ref.email.toLowerCase(), ref.id);
      }
    }

    const dettesParAssocie = [];

    for (const associe of associes) {
      const userRefId = associe.email ? emailToRefId.get(associe.email.toLowerCase()) : null;
      
      if (userRefId) {
        const dette = this.calculerDetteAssocie(flux, userRefId);
        
        dettesParAssocie.push({
          associeId: associe.id,
          nom: associe.nom,
          prenom: associe.prenom,
          pourcentageParts: toNumber(associe.pourcentageParts),
          dette: dette,
        });
      }
    }

    return dettesParAssocie;
  }

  /**
   * Calcule les dettes envers les tiers externes
   * @param {Array} flux - Tous les flux validés
   * @returns {Number} Dette totale envers tiers
   */
  static calculerDettesTiers(flux) {
    const emprunts = somme(
      flux
        .filter(f => f.type === 'emprunt' && f.sourceFinancement === 'emprunt_tiers')
        .map(f => f.montant)
    );

    // Si vous avez des remboursements, les déduire ici
    return arrondir(emprunts);
  }
}

// ============================================
// 6. CALCULATEUR DE RÉSULTAT
// ============================================

/**
 * Calcule le résultat d'une période
 * Résultat = Recettes (Laverie + Marchandises) - Charges
 */
class CalculateurResultat {
  
  /**
   * Calcule le résultat pour une période donnée
   * @param {Date} dateDebut - Date de début
   * @param {Date} dateFin - Date de fin
   * @param {Number|null} siteLavageId - Filtre par site (optionnel)
   * @returns {Promise<Object>} Résultat détaillé
   */
  static async calculerResultat(dateDebut, dateFin, siteLavageId = null) {
    // Récupérer les flux de la période
    let laverieRefId = null;
    if (siteLavageId) {
      const laverieRef = await prismaShared.laverieReference.findFirst({
        where: { sourceLaverieId: siteLavageId },
      });
      laverieRefId = laverieRef?.id || null;
    }

    const flux = await getFluxPeriode(dateDebut, dateFin, laverieRefId);

    // 1. Recettes laverie (depuis commandes)
    const recettesLaverie = await calculerRecettesLaverie(dateDebut, dateFin, siteLavageId);

    // 2. Recettes marchandises (flux manuels)
    const recettesMarchandises = calculerRecettesMarchandises(flux);

    // 3. Total recettes
    const recettesTotal = recettesLaverie + recettesMarchandises;

    // 4. Charges (dépenses payées)
    const charges = somme(
      flux
        .filter(f => f.type === 'depense')
        .map(f => f.montant)
    );

    // 5. Résultat net
    const resultatNet = recettesTotal - charges;

    return {
      dateDebut,
      dateFin,
      recettesLaverie: arrondir(recettesLaverie),
      recettesMarchandises: arrondir(recettesMarchandises),
      recettesTotal: arrondir(recettesTotal),
      charges: arrondir(charges),
      resultatNet: arrondir(resultatNet),
    };
  }
}

// ============================================
// 7. CALCULATEUR SIG (Soldes Intermédiaires de Gestion)
// ============================================

/**
 * Calcule les Soldes Intermédiaires de Gestion
 * Permet d'analyser la performance par étapes
 */
class CalculateurSIG {
  
  /**
   * Calcule le SIG complet pour une période
   * @param {Date} dateDebut - Date de début
   * @param {Date} dateFin - Date de fin
   * @param {Number|null} siteLavageId - Filtre par site (optionnel)
   * @returns {Promise<Object>} SIG détaillé
   */
  static async calculerSIG(dateDebut, dateFin, siteLavageId = null) {
    // Récupérer les flux de la période
    let laverieRefId = null;
    if (siteLavageId) {
      const laverieRef = await prismaShared.laverieReference.findFirst({
        where: { sourceLaverieId: siteLavageId },
      });
      laverieRefId = laverieRef?.id || null;
    }

    const flux = await getFluxPeriode(dateDebut, dateFin, laverieRefId);

    // 1. Chiffre d'affaires (Production vendue)
    const recettesLaverie = await calculerRecettesLaverie(dateDebut, dateFin, siteLavageId);
    const recettesMarchandises = calculerRecettesMarchandises(flux);
    const chiffreAffaires = recettesLaverie + recettesMarchandises;

    // 2. Charges par catégorie
    const chargesPersonnel = this._extraireCharges(flux, 'PERSONNEL');
    const chargesExploitation = this._extraireCharges(flux, 'EXPLOITATION');
    const chargesFinancieres = this._extraireCharges(flux, 'FINANCIERE');
    const autresCharges = this._extraireCharges(flux, 'AUTRE');

    // 3. Valeur ajoutée (simplifié: CA pour services)
    const valeurAjoutee = chiffreAffaires;

    // 4. EBE (Excédent Brut d'Exploitation)
    const ebe = valeurAjoutee - chargesPersonnel;

    // 5. Résultat d'exploitation
    const resultatExploitation = ebe - chargesExploitation - autresCharges;

    // 6. Résultat courant
    const resultatCourant = resultatExploitation - chargesFinancieres;

    // 7. Résultat net (= résultat courant pour simplification)
    const resultatNet = resultatCourant;

    return {
      dateDebut,
      dateFin,
      chiffreAffaires: arrondir(chiffreAffaires),
      recettesLaverie: arrondir(recettesLaverie),
      recettesMarchandises: arrondir(recettesMarchandises),
      valeurAjoutee: arrondir(valeurAjoutee),
      chargesPersonnel: arrondir(chargesPersonnel),
      ebe: arrondir(ebe),
      chargesExploitation: arrondir(chargesExploitation),
      chargesFinancieres: arrondir(chargesFinancieres),
      autresCharges: arrondir(autresCharges),
      resultatExploitation: arrondir(resultatExploitation),
      resultatCourant: arrondir(resultatCourant),
      resultatNet: arrondir(resultatNet),
      // Ratios
      tauxMargeEBE: chiffreAffaires > 0 ? arrondir((ebe / chiffreAffaires) * 100) : 0,
      tauxMargeNette: chiffreAffaires > 0 ? arrondir((resultatNet / chiffreAffaires) * 100) : 0,
    };
  }

  /**
   * Extrait les charges d'une catégorie
   * @param {Array} flux - Liste des flux
   * @param {String} categorie - PERSONNEL, EXPLOITATION, FINANCIERE, AUTRE
   * @returns {Number} Total des charges
   */
  static _extraireCharges(flux, categorie) {
    const fluxDepenses = flux.filter(f => f.type === 'depense');

    if (categorie === 'PERSONNEL') {
      return somme(
        fluxDepenses
          .filter(f => f.motif && f.motif.toLowerCase().includes('salaire'))
          .map(f => f.montant)
      );
    }

    if (categorie === 'FINANCIERE') {
      return somme(
        fluxDepenses
          .filter(f => f.motif && (
            f.motif.toLowerCase().includes('intérêt') ||
            f.motif.toLowerCase().includes('interet') ||
            f.motif.toLowerCase().includes('frais bancaire')
          ))
          .map(f => f.montant)
      );
    }

    if (categorie === 'EXPLOITATION') {
      const motsClefs = ['achat', 'maintenance', 'réparation', 'location', 'électricité', 'eau', 'fourniture'];
      return somme(
        fluxDepenses
          .filter(f => f.motif && motsClefs.some(mot => f.motif.toLowerCase().includes(mot)))
          .map(f => f.montant)
      );
    }

    if (categorie === 'AUTRE') {
      // Autres charges = toutes les dépenses - (personnel + exploitation + financières)
      const personnel = this._extraireCharges(flux, 'PERSONNEL');
      const exploitation = this._extraireCharges(flux, 'EXPLOITATION');
      const financieres = this._extraireCharges(flux, 'FINANCIERE');
      const total = somme(fluxDepenses.map(f => f.montant));
      
      return total - personnel - exploitation - financieres;
    }

    return 0;
  }

  /**
   * Calcule le SIG mensuel pour une année
   * @param {Number} annee - Année
   * @param {Number|null} siteLavageId - Filtre par site (optionnel)
   * @returns {Promise<Array>} SIG par mois
   */
  static async calculerSIGMensuel(annee, siteLavageId = null) {
    const sigMensuel = [];

    for (let mois = 0; mois < 12; mois++) {
      const dateDebut = new Date(annee, mois, 1);
      const dateFin = new Date(annee, mois + 1, 0, 23, 59, 59, 999);

      const sig = await this.calculerSIG(dateDebut, dateFin, siteLavageId);

      sigMensuel.push({
        mois: mois + 1,
        annee,
        ...sig,
      });
    }

    return sigMensuel;
  }

  /**
   * Calcule le SIG annuel
   * @param {Number} annee - Année
   * @param {Number|null} siteLavageId - Filtre par site (optionnel)
   * @returns {Promise<Object>} SIG annuel
   */
  static async calculerSIGAnnuel(annee, siteLavageId = null) {
    const dateDebut = new Date(annee, 0, 1);
    const dateFin = new Date(annee, 11, 31, 23, 59, 59, 999);

    return await this.calculerSIG(dateDebut, dateFin, siteLavageId);
  }
}

// ============================================
// 8. CALCULATEUR DE BILAN
// ============================================

/**
 * Calcule le bilan comptable à une date donnée
 * Bilan = ACTIF (Cash + Stock) = PASSIF (Dettes + Capitaux Propres + Résultat)
 */
class CalculateurBilan {
  
  /**
   * Calcule le bilan complet à une date donnée
   * @param {Date} dateReference - Date du bilan
   * @param {Object} options - Options de calcul
   * @returns {Promise<Object>} Bilan détaillé
   */
  static async calculerBilan(dateReference, options = {}) {
    const {
      cashInitial = { caisse: 0, banque: 0 },
      stockInitial = 0,
      dettesInitiales = 0,
      capitauxPropreInitiaux = 0,
      reservesInitiales = 0,
      siteLavageId = null,
    } = options;

    // Récupérer tous les flux validés jusqu'à la date
    let laverieRefId = null;
    if (siteLavageId) {
      const laverieRef = await prismaShared.laverieReference.findFirst({
        where: { sourceLaverieId: siteLavageId },
      });
      laverieRefId = laverieRef?.id || null;
    }

    const flux = await getFluxValides(dateReference, laverieRefId);

    // === ACTIF ===
    
    // 1. Trésorerie (Cash)
    const tresorerie = CalculateurTresorerie.calculerCash(flux, cashInitial);

    // 2. Stock (simplifié: on suppose stockInitial constant ou vous pouvez le calculer)
    const stock = stockInitial;

    const actifTotal = tresorerie.total + stock;

    // === PASSIF ===
    
    // 1. Dettes
    const dettesAssocies = await CalculateurDettes.calculerDettesTousAssocies(flux);
    const totalDettesAssocies = somme(dettesAssocies.map(d => d.dette));
    const dettesTiers = CalculateurDettes.calculerDettesTiers(flux);
    const dettesTotales = dettesInitiales + totalDettesAssocies + dettesTiers;

    // 2. Capitaux propres
    const apportsTotal = somme(
      flux
        .filter(f => f.type === 'apport')
        .map(f => f.montant)
    );
    const retraitsTotal = somme(
      flux
        .filter(f => f.type === 'retrait')
        .map(f => f.montant)
    );
    const capitauxPropres = capitauxPropreInitiaux + apportsTotal - retraitsTotal;

    // 3. Réserves
    const reserves = reservesInitiales;

    // 4. Résultat de la période (0 en cours d'exercice, calculé à la clôture)
    const resultatPeriode = 0;

    const passifTotal = dettesTotales + capitauxPropres + reserves + resultatPeriode;

    // Vérification de l'équilibre comptable
    const equilibre = Math.abs(actifTotal - passifTotal) < 0.01;

    return {
      dateBilan: dateReference,
      // ACTIF
      actif: {
        tresorerie: {
          caisse: tresorerie.caisse,
          banque: tresorerie.banque,
          total: tresorerie.total,
        },
        stock: arrondir(stock),
        total: arrondir(actifTotal),
      },
      // PASSIF
      passif: {
        dettes: {
          associes: dettesAssocies,
          totalAssocies: arrondir(totalDettesAssocies),
          tiers: arrondir(dettesTiers),
          total: arrondir(dettesTotales),
        },
        capitauxPropres: arrondir(capitauxPropres),
        reserves: arrondir(reserves),
        resultatPeriode: arrondir(resultatPeriode),
        total: arrondir(passifTotal),
      },
      // Vérification
      equilibre,
      ecart: arrondir(actifTotal - passifTotal),
    };
  }
}

// ============================================
// 9. CLÔTURE DE PÉRIODE
// ============================================

/**
 * Gère la clôture d'une période comptable
 */
class MoteurCloture {
  
  /**
   * Clôture une période comptable
   * @param {Date} dateDebut - Date de début de la période
   * @param {Date} dateFin - Date de fin de la période
   * @param {Number} associeUserId - ID de l'associé qui clôture
   * @param {Object} options - Options de clôture
   * @returns {Promise<Object>} Résultat de la clôture
   */
  static async cloturerPeriode(dateDebut, dateFin, associeUserId, options = {}) {
    const {
      tauxDividende = 0.3, // 30% du résultat en dividendes
      siteLavageId = null,
    } = options;

    // 1. Calculer le résultat de la période
    const resultat = await CalculateurResultat.calculerResultat(dateDebut, dateFin, siteLavageId);

    // 2. Calculer le bilan de fin de période
    const bilan = await CalculateurBilan.calculerBilan(dateFin, options);

    // 3. Calculer le SIG
    const sig = await CalculateurSIG.calculerSIG(dateDebut, dateFin, siteLavageId);

    // 4. Affecter le résultat
    const affectation = await this._affecterResultat(resultat.resultatNet, tauxDividende);

    // 5. Enregistrer la clôture en base de données
    const periodeComptable = await this._enregistrerCloture({
      dateDebut,
      dateFin,
      resultat,
      bilan,
      associeUserId,
      affectation,
    });

    return {
      periodeComptable,
      resultat,
      sig,
      bilan,
      affectation,
    };
  }

  /**
   * Affecte le résultat entre dividendes et réserves
   * @param {Number} resultatNet - Résultat net de la période
   * @param {Number} tauxDividende - Pourcentage en dividendes
   * @returns {Promise<Object>} Affectation détaillée
   */
  static async _affecterResultat(resultatNet, tauxDividende) {
    const montantDividendes = resultatNet * tauxDividende;
    const montantReserves = resultat * (1 - tauxDividende);

    // Récupérer tous les associés
    const associes = await prisma.user.findMany({
      where: {
        role: 'ASSOCIE',
        flag: true,
      },
      select: {
        id: true,
        nom: true,
        prenom: true,
        pourcentageParts: true,
      },
    });

    // Calculer la part de chaque associé
    const affectationsAssocies = associes.map(associe => {
      const parts = toNumber(associe.pourcentageParts);
      const dividendeDu = montantDividendes * parts;

      return {
        associeId: associe.id,
        nom: associe.nom,
        prenom: associe.prenom,
        pourcentageParts: parts,
        dividendeDu: arrondir(dividendeDu),
      };
    });

    return {
      resultatNet: arrondir(resultatNet),
      tauxDividende,
      montantDividendes: arrondir(montantDividendes),
      montantReserves: arrondir(montantReserves),
      affectationsAssocies,
    };
  }

  /**
   * Enregistre la clôture en base de données
   * @param {Object} data - Données de la clôture
   * @returns {Promise<Object>} Période comptable enregistrée
   */
  static async _enregistrerCloture(data) {
    const { dateDebut, dateFin, resultat, bilan, associeUserId, affectation } = data;

    // Vérifier si une entreprise existe, sinon en créer une
    let entreprise = await prisma.entreprise.findFirst();
    if (!entreprise) {
      entreprise = await prisma.entreprise.create({
        data: {
          nom: 'Yessal',
          devise: 'FCFA',
        },
      });
    }

    // Créer le résultat
    const resultatDb = await prisma.resultat.create({
      data: {
        revenuVenteMarchandise: resultat.recettesMarchandises,
        revenuLaverie: resultat.recettesLaverie,
        chargesTotal: resultat.charges,
        coutVenteMarchandise: 0, // Simplifié
        margeVenteMarchandise: resultat.recettesMarchandises,
        alphaMargeSurCout: 0, // Simplifié
        resultatNet: resultat.resultatNet,
      },
    });

    // Créer le bilan de fin
    const bilanDb = await prisma.bilan.create({
      data: {
        entrepriseId: entreprise.id,
        associeUserId,
        dateBilan: dateFin,
        typeBilan: 'FIN',
        cashCaisse: bilan.actif.tresorerie.caisse,
        cashBanque: bilan.actif.tresorerie.banque,
        cashTotal: bilan.actif.tresorerie.total,
        stockValeurRevient: bilan.actif.stock,
        actifTotal: bilan.actif.total,
        dettesTotales: bilan.passif.dettes.total,
        dettesVersAssocies: bilan.passif.dettes.totalAssocies,
        dettesVersTiersExternes: bilan.passif.dettes.tiers,
        capitauxPropresHorsResultat: bilan.passif.capitauxPropres,
        reserves: bilan.passif.reserves,
        resultatPeriode: resultat.resultatNet,
      },
    });

    // Créer l'affectation du résultat
    const affectationDb = await prisma.affectationResultat.create({
      data: {
        resultatId: resultatDb.id,
        tauxDividende: affectation.tauxDividende,
        montantDividendes: affectation.montantDividendes,
        montantMisEnReserve: affectation.montantReserves,
        affectationsAssocies: {
          create: affectation.affectationsAssocies.map(aff => ({
            associeUserId: aff.associeId,
            montantDividendeDu: aff.dividendeDu,
          })),
        },
      },
      include: {
        affectationsAssocies: true,
      },
    });

    // Créer la période comptable
    const periode = await prisma.periodeComptable.create({
      data: {
        entrepriseId: entreprise.id,
        periodeDebut: dateDebut,
        periodeFin: dateFin,
        estCloturee: true,
        bilanFinId: bilanDb.id,
        resultatId: resultatDb.id,
      },
      include: {
        bilanFin: true,
        resultat: {
          include: {
            affectation: {
              include: {
                affectationsAssocies: true,
              },
            },
          },
        },
      },
    });

    return periode;
  }
}

// ============================================
// 10. TABLEAU DE BORD TEMPS RÉEL
// ============================================

/**
 * Génère un tableau de bord en temps réel
 */
class TableauDeBord {
  
  /**
   * Génère le tableau de bord complet
   * @param {Object} options - Options du dashboard
   * @returns {Promise<Object>} Dashboard complet
   */
  static async generer(options = {}) {
    const {
      dateReference = new Date(),
      siteLavageId = null,
    } = options;

    // 1. Cash disponible
    const flux = await getFluxValides(dateReference);
    const tresorerie = CalculateurTresorerie.calculerCash(flux);

    // 2. Dettes envers associés
    const dettesAssocies = await CalculateurDettes.calculerDettesTousAssocies(flux);

    // 3. Résultat du mois en cours
    const debutMois = new Date(dateReference.getFullYear(), dateReference.getMonth(), 1);
    const resultatMois = await CalculateurResultat.calculerResultat(debutMois, dateReference, siteLavageId);

    // 4. Résultat de l'année en cours
    const debutAnnee = new Date(dateReference.getFullYear(), 0, 1);
    const resultatAnnee = await CalculateurResultat.calculerResultat(debutAnnee, dateReference, siteLavageId);

    // 5. SIG du mois
    const sigMois = await CalculateurSIG.calculerSIG(debutMois, dateReference, siteLavageId);

    return {
      dateReference,
      tresorerie,
      dettesAssocies,
      totalDettes: arrondir(somme(dettesAssocies.map(d => d.dette))),
      moisCourant: {
        mois: debutMois.getMonth() + 1,
        annee: debutMois.getFullYear(),
        resultat: resultatMois,
        sig: sigMois,
      },
      anneeCourante: {
        annee: dateReference.getFullYear(),
        resultat: resultatAnnee,
      },
    };
  }
}

// ============================================
// 11. SERVICE PRINCIPAL
// ============================================

/**
 * Service de comptabilité - Point d'entrée principal
 */
class ComptabiliteService {
  
  // Trésorerie
  async getCashDisponible(dateReference = new Date()) {
    const flux = await getFluxValides(dateReference);
    return CalculateurTresorerie.calculerCash(flux);
  }

  // Dettes
  async getDettesAssocies(dateReference = new Date()) {
    const flux = await getFluxValides(dateReference);
    return await CalculateurDettes.calculerDettesTousAssocies(flux);
  }

  // Résultat
  async getResultat(dateDebut, dateFin, siteLavageId = null) {
    return await CalculateurResultat.calculerResultat(dateDebut, dateFin, siteLavageId);
  }

  // SIG
  async getSIG(dateDebut, dateFin, siteLavageId = null) {
    return await CalculateurSIG.calculerSIG(dateDebut, dateFin, siteLavageId);
  }

  async getSIGMensuel(annee, siteLavageId = null) {
    return await CalculateurSIG.calculerSIGMensuel(annee, siteLavageId);
  }

  async getSIGAnnuel(annee, siteLavageId = null) {
    return await CalculateurSIG.calculerSIGAnnuel(annee, siteLavageId);
  }

  // Bilan
  async getBilan(dateReference, options = {}) {
    return await CalculateurBilan.calculerBilan(dateReference, options);
  }

  // Clôture
  async cloturerPeriode(dateDebut, dateFin, associeUserId, options = {}) {
    return await MoteurCloture.cloturerPeriode(dateDebut, dateFin, associeUserId, options);
  }

  // Dashboard
  async getTableauDeBord(options = {}) {
    return await TableauDeBord.generer(options);
  }

  // Mise à jour automatique lors de la validation d'un flux
  async onFluxValide(fluxId) {
    // Cette méthode est appelée automatiquement après validation d'un flux
    // Elle peut mettre à jour des caches ou déclencher des calculs
    console.log(`Flux ${fluxId} validé - mise à jour comptable automatique`);
    
    // Vous pouvez ici:
    // - Mettre à jour un cache de trésorerie
    // - Recalculer les dettes associés
    // - Envoyer des notifications
    // etc.
  }
}

module.exports = new ComptabiliteService();
