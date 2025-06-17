const prisma = require('../utils/prismaClient');
const logger = require('../utils/logger');

/**
 * Obtenir la liste des machines de lavage
 */
const getMachines = async (req, res, next) => {
  try {
    const { siteLavageId } = req.query;
    
    const where = {};
    if (siteLavageId) {
      where.siteLavageId = parseInt(siteLavageId);
    }
    
    const machines = await prisma.machinelavage.findMany({
      where,
      include: {
        siteLavage: {
          select: {
            nom: true,
            ville: true
          }
        }
      }
    });
    
    res.status(200).json({
      success: true,
      data: machines
    });
  } catch (error) {
    logger.error('Erreur lors de la récupération des machines:', error);
    next(error);
  }
};

/**
 * Obtenir une machine par son ID
 */
const getMachineById = async (req, res, next) => {
  try {
    const { id } = req.params;
    
    const machine = await prisma.machinelavage.findUnique({
      where: { id: parseInt(id) },
      include: {
        siteLavage: {
          select: {
            nom: true,
            ville: true
          }
        }
      }
    });
    
    if (!machine) {
      return res.status(404).json({
        success: false,
        message: 'Machine non trouvée'
      });
    }
    
    res.status(200).json({
      success: true,
      data: machine
    });
  } catch (error) {
    logger.error('Erreur lors de la récupération de la machine:', error);
    next(error);
  }
};

/**
 * Créer une nouvelle machine
 */
const createMachine = async (req, res, next) => {
  try {
    const { siteLavageId, numero, nom, type, poidsKg } = req.body;
    
    // Vérifier si le site existe
    const siteLavage = await prisma.sitelavage.findUnique({
      where: { id: siteLavageId }
    });
    
    if (!siteLavage) {
      return res.status(404).json({
        success: false,
        message: 'Site de lavage non trouvé'
      });
    }
    
    // Vérifier si le numéro est déjà utilisé dans ce site
    const existingMachine = await prisma.machinelavage.findFirst({
      where: {
        siteLavageId,
        numero
      }
    });
    
    if (existingMachine) {
      return res.status(409).json({
        success: false,
        message: 'Une machine avec ce numéro existe déjà dans ce site'
      });
    }
    
    const machine = await prisma.machinelavage.create({
      data: {
        siteLavageId,
        numero,
        nom,
        type,
        poidsKg
      }
    });
    
    res.status(201).json({
      success: true,
      message: 'Machine créée avec succès',
      data: machine
    });
  } catch (error) {
    logger.error('Erreur lors de la création de la machine:', error);
    next(error);
  }
};

/**
 * Mettre à jour une machine
 */
const updateMachine = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { numero, nom, type, poidsKg } = req.body;
    
    // Vérifier si la machine existe
    const existingMachine = await prisma.machinelavage.findUnique({
      where: { id: parseInt(id) }
    });
    
    if (!existingMachine) {
      return res.status(404).json({
        success: false,
        message: 'Machine non trouvée'
      });
    }
    
    // Vérifier si le nouveau numéro n'est pas déjà utilisé
    if (numero && numero !== existingMachine.numero) {
      const duplicateNumber = await prisma.machinelavage.findFirst({
        where: {
          siteLavageId: existingMachine.siteLavageId,
          numero,
          id: { not: parseInt(id) }
        }
      });
      
      if (duplicateNumber) {
        return res.status(409).json({
          success: false,
          message: 'Une machine avec ce numéro existe déjà dans ce site'
        });
      }
    }
    
    const updatedMachine = await prisma.machinelavage.update({
      where: { id: parseInt(id) },
      data: {
        numero,
        nom,
        type,
        poidsKg
      }
    });
    
    res.status(200).json({
      success: true,
      message: 'Machine mise à jour avec succès',
      data: updatedMachine
    });
  } catch (error) {
    logger.error('Erreur lors de la mise à jour de la machine:', error);
    next(error);
  }
};

/**
 * Supprimer une machine
 */
const deleteMachine = async (req, res, next) => {
  try {
    const { id } = req.params;
    
    // Vérifier si la machine existe
    const machine = await prisma.machinelavage.findUnique({
      where: { id: parseInt(id) }
    });
    
    if (!machine) {
      return res.status(404).json({
        success: false,
        message: 'Machine non trouvée'
      });
    }
    
    await prisma.machinelavage.delete({
      where: { id: parseInt(id) }
    });
    
    res.status(200).json({
      success: true,
      message: 'Machine supprimée avec succès'
    });
  } catch (error) {
    logger.error('Erreur lors de la suppression de la machine:', error);
    next(error);
  }
};

module.exports = {
  getMachines,
  getMachineById,
  createMachine,
  updateMachine,
  deleteMachine
}; 