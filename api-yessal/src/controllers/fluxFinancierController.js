const fluxFinancierService = require('../services/fluxFinancierService');

/**
 * Helper pour gérer les erreurs communes
 */
const handleFluxError = (error, res, defaultMessage) => {
  console.error('Erreur flux financier:', error);
  
  if (error.message.includes('non trouvé') || error.message.includes('non trouvée')) {
    return res.status(404).json({
      success: false,
      message: error.message
    });
  }
  
  if (error.message.includes('modifier') || error.message.includes('supprimer') || 
      error.message.includes('créateur') || error.message.includes('Impossible') ||
      error.message.includes('ajouter')) {
    return res.status(403).json({
      success: false,
      message: error.message
    });
  }

  return res.status(500).json({
    success: false,
    message: error.message || defaultMessage
  });
};

/**
 * Créer un nouveau flux financier (dépense ou recette)
 * Note: Les pièces jointes doivent être uploadées séparément via addPreuve
 */
const createFlux = async (req, res) => {
  try {
    const {
      type,
      montant,
      dateFluxFinancier,
      motif,
      beneficiaire,
      sourceFinancement,
      description,
      laverieId
    } = req.body;

    // Validation des champs requis
    if (!type || !montant || !dateFluxFinancier) {
      return res.status(400).json({
        success: false,
        message: 'Les champs type, montant et dateFluxFinancier sont obligatoires'
      });
    }

    // Validation du type
    if (!['depense', 'recette'].includes(type)) {
      return res.status(400).json({
        success: false,
        message: 'Le type doit être "depense" ou "recette"'
      });
    }

    // Validation du montant
    if (Number.isNaN(Number(montant)) || Number(montant) <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Le montant doit être un nombre positif'
      });
    }

    const fluxData = {
      type,
      montant: Number(montant),
      dateFluxFinancier,
      motif,
      beneficiaire,
      sourceFinancement,
      description,
      laverieId: laverieId ? Number.parseInt(laverieId, 10) : null,
      createdBy: req.user.id
    };

    const flux = await fluxFinancierService.createFlux(fluxData);

    return res.status(201).json({
      success: true,
      message: 'Flux financier créé avec succès',
      data: flux
    });
  } catch (error) {
    return handleFluxError(error, res, 'Erreur lors de la création du flux financier');
  }
};

/**
 * Ajouter une preuve à un flux financier
 */
const addPreuve = async (req, res) => {
  try {
    const { id } = req.params;
    const { fileId, filename, downloadUrl, mimetype, size } = req.body;

    if (!fileId || !filename || !downloadUrl || !mimetype || !size) {
      return res.status(400).json({
        success: false,
        message: 'Tous les champs de la preuve sont obligatoires'
      });
    }

    const preuveData = {
      fileId,
      filename,
      downloadUrl,
      mimetype,
      size: Number.parseInt(size, 10)
    };

    const preuve = await fluxFinancierService.addPreuve(
      Number.parseInt(id, 10),
      req.user.id,
      preuveData
    );

    return res.status(201).json({
      success: true,
      message: 'Preuve ajoutée avec succès',
      data: preuve
    });
  } catch (error) {
    return handleFluxError(error, res, 'Erreur lors de l\'ajout de la preuve');
  }
};

/**
 * Supprimer une preuve d'un flux financier
 */
const deletePreuve = async (req, res) => {
  try {
    const { preuveId } = req.params;

    await fluxFinancierService.deletePreuve(
      Number.parseInt(preuveId, 10),
      req.user.id
    );

    return res.status(200).json({
      success: true,
      message: 'Preuve supprimée avec succès'
    });
  } catch (error) {
    return handleFluxError(error, res, 'Erreur lors de la suppression de la preuve');
  }
};

/**
 * Obtenir un flux financier par ID
 */
const getFluxById = async (req, res) => {
  try {
    const { id } = req.params;

    const flux = await fluxFinancierService.getFluxById(Number.parseInt(id, 10));

    if (!flux) {
      return res.status(404).json({
        success: false,
        message: 'Flux financier non trouvé'
      });
    }

    // Vérifier que le flux appartient au manager (sourceApp = 'manager')
    if (flux.sourceApp !== 'manager') {
      return res.status(403).json({
        success: false,
        message: 'Accès refusé à ce flux'
      });
    }

    return res.status(200).json({
      success: true,
      data: flux
    });
  } catch (error) {
    return handleFluxError(error, res, 'Erreur lors de la récupération du flux financier');
  }
};

/**
 * Obtenir tous les flux financiers avec filtres
 */
const getAllFlux = async (req, res) => {
  try {
    const {
      type,
      laverieId,
      startDate,
      endDate,
      month, // Format: YYYY-MM
      year,
      validationStatus,
      page,
      limit
    } = req.query;

    const filters = {
      type,
      laverieId,
      createdBy: req.user.id, // Seulement les flux créés par le manager connecté
      startDate,
      endDate,
      month,
      year,
      validationStatus,
      page,
      limit
    };

    const result = await fluxFinancierService.getAllFlux(filters);

    return res.status(200).json({
      success: true,
      data: result.data,
      pagination: result.pagination
    });
  } catch (error) {
    return handleFluxError(error, res, 'Erreur lors de la récupération des flux financiers');
  }
};

/**
 * Obtenir les flux par laverie
 */
const getFluxByLaverie = async (req, res) => {
  try {
    const { laverieId } = req.params;
    const { page, limit, startDate, endDate, month, year, type } = req.query;

    const options = {
      page,
      limit,
      startDate,
      endDate,
      month,
      year,
      type
    };

    const result = await fluxFinancierService.getFluxByLaverie(
      Number.parseInt(laverieId, 10),
      options
    );

    return res.status(200).json({
      success: true,
      data: result.data,
      pagination: result.pagination
    });
  } catch (error) {
    return handleFluxError(error, res, 'Erreur lors de la récupération des flux de la laverie');
  }
};

/**
 * Mettre à jour un flux financier
 */
const updateFlux = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    const flux = await fluxFinancierService.updateFlux(
      Number.parseInt(id, 10),
      req.user.id,
      updateData
    );

    return res.status(200).json({
      success: true,
      message: 'Flux financier mis à jour avec succès',
      data: flux
    });
  } catch (error) {
    return handleFluxError(error, res, 'Erreur lors de la mise à jour du flux financier');
  }
};

/**
 * Supprimer un flux financier
 */
const deleteFlux = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await fluxFinancierService.deleteFlux(
      Number.parseInt(id, 10),
      req.user.id
    );

    const message = result.preuvesCount > 0
      ? `Flux financier supprimé avec succès (${result.preuvesCount} preuve(s) à supprimer)`
      : 'Flux financier supprimé avec succès';

    return res.status(200).json({
      success: true,
      message,
      data: {
        fileIds: result.fileIds, // Pour que le frontend puisse supprimer les fichiers
        preuvesCount: result.preuvesCount
      }
    });
  } catch (error) {
    return handleFluxError(error, res, 'Erreur lors de la suppression du flux financier');
  }
};

/**
 * Obtenir les statistiques des flux pour une laverie
 */
const getStatistics = async (req, res) => {
  try {
    const { laverieId } = req.params;
    const { startDate, endDate, month, year } = req.query;

    const statistics = await fluxFinancierService.getStatistics(
      Number.parseInt(laverieId, 10),
      { startDate, endDate, month, year }
    );

    return res.status(200).json({
      success: true,
      data: statistics
    });
  } catch (error) {
    return handleFluxError(error, res, 'Erreur lors de la récupération des statistiques');
  }
};

module.exports = {
  createFlux,
  getFluxById,
  getAllFlux,
  getFluxByLaverie,
  updateFlux,
  deleteFlux,
  getStatistics,
  addPreuve,
  deletePreuve
};
