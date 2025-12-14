/**
 * ============================================
 * CONTRÔLEUR COMPTABILITÉ
 * ============================================
 * 
 * Gère les endpoints de comptabilité en temps réel
 */

const comptabiliteService = require('../services/comptabiliteService');

/**
 * Helper pour gérer les erreurs
 */
const handleError = (error, res, defaultMessage) => {
  console.error('Erreur comptabilité:', error);
  
  return res.status(500).json({
    success: false,
    message: error.message || defaultMessage,
  });
};

/**
 * Parser une date depuis une string ou retourner la date actuelle
 */
const parseDate = (dateStr) => {
  if (!dateStr) return new Date();
  const date = new Date(dateStr);
  return isNaN(date.getTime()) ? new Date() : date;
};

// ============================================
// TRÉSORERIE
// ============================================

/**
 * Obtenir le cash disponible en temps réel
 * GET /api/comptabilite/tresorerie
 * Query params: dateReference (optionnel)
 */
const getTresorerie = async (req, res) => {
  try {
    const { dateReference } = req.query;
    const date = parseDate(dateReference);

    const tresorerie = await comptabiliteService.getCashDisponible(date);

    return res.status(200).json({
      success: true,
      data: tresorerie,
    });
  } catch (error) {
    return handleError(error, res, 'Erreur lors du calcul de la trésorerie');
  }
};

// ============================================
// DETTES
// ============================================

/**
 * Obtenir les dettes envers chaque associé
 * GET /api/comptabilite/dettes
 * Query params: dateReference (optionnel)
 */
const getDettes = async (req, res) => {
  try {
    const { dateReference } = req.query;
    const date = parseDate(dateReference);

    const dettes = await comptabiliteService.getDettesAssocies(date);
    const totalDettes = dettes.reduce((sum, d) => sum + d.dette, 0);

    return res.status(200).json({
      success: true,
      data: {
        dettes,
        total: totalDettes,
        dateReference: date,
      },
    });
  } catch (error) {
    return handleError(error, res, 'Erreur lors du calcul des dettes');
  }
};

// ============================================
// RÉSULTAT
// ============================================

/**
 * Obtenir le résultat d'une période
 * GET /api/comptabilite/resultat
 * Query params: dateDebut, dateFin, siteLavageId (optionnel)
 */
const getResultat = async (req, res) => {
  try {
    const { dateDebut, dateFin, siteLavageId } = req.query;

    if (!dateDebut || !dateFin) {
      return res.status(400).json({
        success: false,
        message: 'Les paramètres dateDebut et dateFin sont requis',
      });
    }

    const debut = new Date(dateDebut);
    const fin = new Date(dateFin);

    if (isNaN(debut.getTime()) || isNaN(fin.getTime())) {
      return res.status(400).json({
        success: false,
        message: 'Format de date invalide',
      });
    }

    const siteId = siteLavageId ? parseInt(siteLavageId, 10) : null;

    const resultat = await comptabiliteService.getResultat(debut, fin, siteId);

    return res.status(200).json({
      success: true,
      data: resultat,
    });
  } catch (error) {
    return handleError(error, res, 'Erreur lors du calcul du résultat');
  }
};

/**
 * Obtenir le résultat du mois en cours
 * GET /api/comptabilite/resultat/mois-courant
 * Query params: siteLavageId (optionnel)
 */
const getResultatMoisCourant = async (req, res) => {
  try {
    const { siteLavageId } = req.query;
    const siteId = siteLavageId ? parseInt(siteLavageId, 10) : null;

    const maintenant = new Date();
    const debutMois = new Date(maintenant.getFullYear(), maintenant.getMonth(), 1);
    const finMois = new Date(maintenant.getFullYear(), maintenant.getMonth() + 1, 0, 23, 59, 59, 999);

    const resultat = await comptabiliteService.getResultat(debutMois, finMois, siteId);

    return res.status(200).json({
      success: true,
      data: resultat,
    });
  } catch (error) {
    return handleError(error, res, 'Erreur lors du calcul du résultat du mois');
  }
};

/**
 * Obtenir le résultat de l'année en cours
 * GET /api/comptabilite/resultat/annee-courante
 * Query params: siteLavageId (optionnel)
 */
const getResultatAnneeCourante = async (req, res) => {
  try {
    const { siteLavageId } = req.query;
    const siteId = siteLavageId ? parseInt(siteLavageId, 10) : null;

    const maintenant = new Date();
    const debutAnnee = new Date(maintenant.getFullYear(), 0, 1);
    const finAnnee = new Date(maintenant.getFullYear(), 11, 31, 23, 59, 59, 999);

    const resultat = await comptabiliteService.getResultat(debutAnnee, finAnnee, siteId);

    return res.status(200).json({
      success: true,
      data: resultat,
    });
  } catch (error) {
    return handleError(error, res, 'Erreur lors du calcul du résultat de l\'année');
  }
};

// ============================================
// SIG (Soldes Intermédiaires de Gestion)
// ============================================

/**
 * Obtenir le SIG d'une période
 * GET /api/comptabilite/sig
 * Query params: dateDebut, dateFin, siteLavageId (optionnel)
 */
const getSIG = async (req, res) => {
  try {
    const { dateDebut, dateFin, siteLavageId } = req.query;

    if (!dateDebut || !dateFin) {
      return res.status(400).json({
        success: false,
        message: 'Les paramètres dateDebut et dateFin sont requis',
      });
    }

    const debut = new Date(dateDebut);
    const fin = new Date(dateFin);

    if (isNaN(debut.getTime()) || isNaN(fin.getTime())) {
      return res.status(400).json({
        success: false,
        message: 'Format de date invalide',
      });
    }

    const siteId = siteLavageId ? parseInt(siteLavageId, 10) : null;

    const sig = await comptabiliteService.getSIG(debut, fin, siteId);

    return res.status(200).json({
      success: true,
      data: sig,
    });
  } catch (error) {
    return handleError(error, res, 'Erreur lors du calcul du SIG');
  }
};

/**
 * Obtenir le SIG mensuel d'une année
 * GET /api/comptabilite/sig/mensuel
 * Query params: annee, siteLavageId (optionnel)
 */
const getSIGMensuel = async (req, res) => {
  try {
    const { annee, siteLavageId } = req.query;

    if (!annee) {
      return res.status(400).json({
        success: false,
        message: 'Le paramètre annee est requis',
      });
    }

    const year = parseInt(annee, 10);
    if (isNaN(year)) {
      return res.status(400).json({
        success: false,
        message: 'Format d\'année invalide',
      });
    }

    const siteId = siteLavageId ? parseInt(siteLavageId, 10) : null;

    const sigMensuel = await comptabiliteService.getSIGMensuel(year, siteId);

    return res.status(200).json({
      success: true,
      data: sigMensuel,
    });
  } catch (error) {
    return handleError(error, res, 'Erreur lors du calcul du SIG mensuel');
  }
};

/**
 * Obtenir le SIG annuel
 * GET /api/comptabilite/sig/annuel
 * Query params: annee, siteLavageId (optionnel)
 */
const getSIGAnnuel = async (req, res) => {
  try {
    const { annee, siteLavageId } = req.query;

    if (!annee) {
      return res.status(400).json({
        success: false,
        message: 'Le paramètre annee est requis',
      });
    }

    const year = parseInt(annee, 10);
    if (isNaN(year)) {
      return res.status(400).json({
        success: false,
        message: 'Format d\'année invalide',
      });
    }

    const siteId = siteLavageId ? parseInt(siteLavageId, 10) : null;

    const sigAnnuel = await comptabiliteService.getSIGAnnuel(year, siteId);

    return res.status(200).json({
      success: true,
      data: sigAnnuel,
    });
  } catch (error) {
    return handleError(error, res, 'Erreur lors du calcul du SIG annuel');
  }
};

// ============================================
// BILAN
// ============================================

/**
 * Obtenir le bilan à une date donnée
 * GET /api/comptabilite/bilan
 * Query params: dateReference, options (optionnel)
 */
const getBilan = async (req, res) => {
  try {
    const { dateReference, siteLavageId } = req.query;
    const date = parseDate(dateReference);

    const options = {};
    if (siteLavageId) {
      options.siteLavageId = parseInt(siteLavageId, 10);
    }

    const bilan = await comptabiliteService.getBilan(date, options);

    return res.status(200).json({
      success: true,
      data: bilan,
    });
  } catch (error) {
    return handleError(error, res, 'Erreur lors du calcul du bilan');
  }
};

// ============================================
// CLÔTURE DE PÉRIODE
// ============================================

/**
 * Clôturer une période comptable
 * POST /api/comptabilite/cloture
 * Body: { dateDebut, dateFin, tauxDividende, siteLavageId }
 */
const cloturerPeriode = async (req, res) => {
  try {
    const { dateDebut, dateFin, tauxDividende, siteLavageId } = req.body;

    if (!dateDebut || !dateFin) {
      return res.status(400).json({
        success: false,
        message: 'Les paramètres dateDebut et dateFin sont requis',
      });
    }

    const debut = new Date(dateDebut);
    const fin = new Date(dateFin);

    if (isNaN(debut.getTime()) || isNaN(fin.getTime())) {
      return res.status(400).json({
        success: false,
        message: 'Format de date invalide',
      });
    }

    const options = {};
    if (tauxDividende !== undefined) {
      const taux = parseFloat(tauxDividende);
      if (isNaN(taux) || taux < 0 || taux > 1) {
        return res.status(400).json({
          success: false,
          message: 'Le taux de dividende doit être entre 0 et 1',
        });
      }
      options.tauxDividende = taux;
    }

    if (siteLavageId) {
      options.siteLavageId = parseInt(siteLavageId, 10);
    }

    const associeUserId = req.user.id;

    const cloture = await comptabiliteService.cloturerPeriode(
      debut,
      fin,
      associeUserId,
      options
    );

    return res.status(201).json({
      success: true,
      message: 'Période clôturée avec succès',
      data: cloture,
    });
  } catch (error) {
    return handleError(error, res, 'Erreur lors de la clôture de période');
  }
};

// ============================================
// TABLEAU DE BORD
// ============================================

/**
 * Obtenir le tableau de bord en temps réel
 * GET /api/comptabilite/dashboard
 * Query params: dateReference, siteLavageId (optionnel)
 */
const getDashboard = async (req, res) => {
  try {
    const { dateReference, siteLavageId } = req.query;

    const options = {};
    if (dateReference) {
      options.dateReference = parseDate(dateReference);
    }
    if (siteLavageId) {
      options.siteLavageId = parseInt(siteLavageId, 10);
    }

    const dashboard = await comptabiliteService.getTableauDeBord(options);

    return res.status(200).json({
      success: true,
      data: dashboard,
    });
  } catch (error) {
    return handleError(error, res, 'Erreur lors de la génération du tableau de bord');
  }
};

// ============================================
// RECALCUL SUR PÉRIODE
// ============================================

/**
 * Déclencher un recalcul complet sur une période donnée
 * POST /api/comptabilite/recalcul
 * Body: { dateDebut, dateFin, siteLavageId }
 */
const recalculerPeriode = async (req, res) => {
  try {
    const { dateDebut, dateFin, siteLavageId } = req.body;

    if (!dateDebut || !dateFin) {
      return res.status(400).json({
        success: false,
        message: 'Les paramètres dateDebut et dateFin sont requis',
      });
    }

    const debut = new Date(dateDebut);
    const fin = new Date(dateFin);

    if (isNaN(debut.getTime()) || isNaN(fin.getTime())) {
      return res.status(400).json({
        success: false,
        message: 'Format de date invalide',
      });
    }

    const siteId = siteLavageId ? parseInt(siteLavageId, 10) : null;

    // Calculer tous les indicateurs pour la période
    const [resultat, sig, bilan] = await Promise.all([
      comptabiliteService.getResultat(debut, fin, siteId),
      comptabiliteService.getSIG(debut, fin, siteId),
      comptabiliteService.getBilan(fin, { siteLavageId: siteId }),
    ]);

    return res.status(200).json({
      success: true,
      message: 'Recalcul effectué avec succès',
      data: {
        resultat,
        sig,
        bilan,
      },
    });
  } catch (error) {
    return handleError(error, res, 'Erreur lors du recalcul de la période');
  }
};

module.exports = {
  // Trésorerie
  getTresorerie,
  
  // Dettes
  getDettes,
  
  // Résultat
  getResultat,
  getResultatMoisCourant,
  getResultatAnneeCourante,
  
  // SIG
  getSIG,
  getSIGMensuel,
  getSIGAnnuel,
  
  // Bilan
  getBilan,
  
  // Clôture
  cloturerPeriode,
  
  // Dashboard
  getDashboard,
  
  // Recalcul
  recalculerPeriode,
};
