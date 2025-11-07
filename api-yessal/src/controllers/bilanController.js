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
 * Obtenir le bilan d'une laverie pour un mois donné
 * GET /api/bilan/laverie/:laverieId?month=YYYY-MM
 */
const getBilanByLaverie = async (req, res) => {
  try {
    const { laverieId } = req.params;
    const { month } = req.query;

    // Validation de l'ID
    const laverieIdNum = Number.parseInt(laverieId, 10);
    if (Number.isNaN(laverieIdNum)) {
      return res.status(400).json({
        success: false,
        message: 'ID de laverie invalide'
      });
    }

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

    // Récupérer le bilan
    const bilan = await bilanService.getBilanByLaverie(laverieIdNum, targetMonth);

    return res.status(200).json({
      success: true,
      data: bilan
    });

  } catch (error) {
    console.error('Erreur getBilanByLaverie:', error);
    
    if (error.message === 'Laverie non trouvée') {
      return res.status(404).json({
        success: false,
        message: error.message
      });
    }

    return res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération du bilan',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

module.exports = {
  getBilanByLaverie
};
