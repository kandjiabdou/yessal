const laverieReferenceService = require('../services/laverieReferenceService');

/**
 * Obtenir toutes les laveries disponibles
 */
const getAllLaveries = async (req, res) => {
  try {
    const laveries = await laverieReferenceService.getAllLaveries('ASSOCIE');
    
    return res.status(200).json({
      success: true,
      data: laveries
    });
  } catch (error) {
    console.error('Erreur lors de la récupération des laveries:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Erreur lors de la récupération des laveries'
    });
  }
};

module.exports = {
  getAllLaveries
};
