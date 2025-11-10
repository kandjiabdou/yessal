const parametreService = require('../services/parametreService');
const { AppError } = require('../utils/errors');

/**
 * Récupère les informations de l'entreprise
 */
const getEntrepriseInfo = async (req, res, next) => {
  try {
    const entreprise = await parametreService.getEntrepriseInfo();
    
    res.json({
      success: true,
      data: entreprise
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Récupère les informations de l'utilisateur connecté
 */
const getUserInfo = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const user = await parametreService.getUserInfo(userId);
    
    res.json({
      success: true,
      data: user
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Met à jour la préférence de devise de l'utilisateur
 */
const updateDevisePreference = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { devise } = req.body;
    
    const user = await parametreService.updateUserDevisePreference(userId, devise);
    
    res.json({
      success: true,
      message: 'Préférence de devise mise à jour',
      data: user
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Liste tous les associés
 */
const listAssocies = async (req, res, next) => {
  try {
    const associes = await parametreService.listAssocies();
    
    res.json({
      success: true,
      data: associes
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getEntrepriseInfo,
  getUserInfo,
  updateDevisePreference,
  listAssocies
};
