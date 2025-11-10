const bilanService = require('../services/bilanService');

/**
 * Obtenir le mois en cours au format YYYY-MM
 */
const getCurrentMonth = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
};

/**
 * Obtenir le bilan groupé par laverie pour un mois donné
 * GET /api/bilan?month=YYYY-MM&laverieIds=1,2,3&viewMode=laverie|entreprise|tous
 */
const getBilanGrouped = async (req, res) => {
  try {
    const { month, laverieIds, viewMode } = req.query;

    // Déterminer le mois (mois en cours par défaut)
    const targetMonth = month || getCurrentMonth();

    // Validation du format du mois
    if (!/^\d{4}-\d{2}$/.test(targetMonth)) {
      return res.status(400).json({
        success: false,
        message: 'Format de mois invalide. Utilisez YYYY-MM'
      });
    }

    // Vérifier qu'on ne demande pas un mois futur
    if (targetMonth > getCurrentMonth()) {
      return res.status(400).json({
        success: false,
        message: 'Impossible de consulter le bilan d\'un mois futur'
      });
    }

    // Valider le viewMode
    const validViewModes = ['laverie', 'entreprise', 'tous'];
    const targetViewMode = viewMode || 'tous';
    if (!validViewModes.includes(targetViewMode)) {
      return res.status(400).json({
        success: false,
        message: 'viewMode invalide. Utilisez: laverie, entreprise ou tous'
      });
    }

    // Parser les IDs de laveries si fournis
    let parsedLaverieIds = null;
    if (laverieIds) {
      parsedLaverieIds = laverieIds.split(',').map(id => Number.parseInt(id.trim(), 10));
      if (parsedLaverieIds.some(id => Number.isNaN(id))) {
        return res.status(400).json({
          success: false,
          message: 'IDs de laveries invalides'
        });
      }
    }

    // Récupérer les bilans groupés
    const bilans = await bilanService.getBilanGrouped(targetMonth, parsedLaverieIds, targetViewMode);

    return res.status(200).json({
      success: true,
      data: bilans
    });

  } catch (error) {
    console.error('Erreur getBilanGrouped:', error);
    
    return res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération du bilan',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

module.exports = {
  getBilanGrouped
};
