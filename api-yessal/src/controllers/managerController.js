const prisma = require('../utils/prismaClient');
const { AppError } = require('../utils/errors');
const sessionService = require('../services/sessionService');

const updateManagerSite = async (req, res, next) => {
  try {
    const managerId = Number.parseInt(req.params.id);
    const { siteId } = req.body;

    // Vérifier que le manager existe
    const manager = await prisma.user.findUnique({
      where: { id: managerId, role: 'Manager' }
    });

    if (!manager) {
      throw new AppError('Manager non trouvé', 404);
    }

    // Vérifier que le site existe
    const site = await prisma.sitelavage.findUnique({
      where: { id: siteId }
    });

    if (!site) {
      throw new AppError('Site de lavage non trouvé', 404);
    }

    // Vérifier que le manager qui fait la requête est bien celui qui est concerné
    if (req.user.id !== managerId) {
      throw new AppError('Vous ne pouvez pas modifier le site principal d\'un autre manager', 403);
    }

    // Mettre à jour le site principal du manager
    const updatedManager = await prisma.user.update({
      where: { id: managerId },
      data: { siteLavagePrincipalGerantId: siteId }
    });

    res.json({
      success: true,
      message: 'Site principal mis à jour avec succès',
      data: {
        id: updatedManager.id,
        siteLavagePrincipalGerantId: updatedManager.siteLavagePrincipalGerantId
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Démarre ou met à jour une session de travail pour un manager
 */
const setWorkSession = async (req, res, next) => {
  try {
    const managerId = Number.parseInt(req.params.id);
    const { siteId } = req.body; // siteId peut être null pour "Hors site - Fermer"

    // Vérifier que le manager qui fait la requête est bien celui qui est concerné
    if (req.user.id !== managerId) {
      throw new AppError('Vous ne pouvez pas modifier la session de travail d\'un autre manager', 403);
    }

    // Mettre à jour la session de travail
    const success = await sessionService.setManagerSession(managerId, siteId);

    if (!success) {
      throw new AppError('Erreur lors de la mise à jour de la session de travail', 500);
    }

    // Mettre à jour le site principal du manager si siteId n'est pas null
    if (siteId !== null) {
      await prisma.user.update({
        where: { id: managerId },
        data: { siteLavagePrincipalGerantId: siteId }
      });
    }

    // Récupérer l'état actuel de la session
    const currentSession = sessionService.getManagerSession(managerId);

    res.json({
      success: true,
      message: siteId ? 'Session de travail mise à jour avec succès' : 'Session de travail fermée avec succès',
      data: {
        managerId,
        currentSessionSiteId: currentSession
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Récupère la session de travail actuelle d'un manager
 */
const getWorkSession = async (req, res, next) => {
  try {
    const managerId = Number.parseInt(req.params.id);

    // Vérifier que le manager qui fait la requête est bien celui qui est concerné
    if (req.user.id !== managerId) {
      throw new AppError('Vous ne pouvez pas consulter la session de travail d\'un autre manager', 403);
    }

    const currentSession = sessionService.getManagerSession(managerId);
    
    let sessionData = {
      managerId,
      currentSessionSiteId: currentSession,
      isActive: currentSession !== null
    };

    // Si une session est active, récupérer les détails du site
    if (currentSession) {
      const site = await prisma.sitelavage.findUnique({
        where: { id: currentSession },
        select: {
          id: true,
          nom: true,
          adresseText: true,
          ville: true,
          statutOuverture: true,
          heureOuverture: true,
          heureFermeture: true
        }
      });

      sessionData.site = site;
    }

    res.json({
      success: true,
      data: sessionData
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Met à jour l'activité d'un manager (pour éviter l'expiration de session)
 */
const updateActivity = async (req, res, next) => {
  try {
    const managerId = Number.parseInt(req.params.id);

    // Vérifier que le manager qui fait la requête est bien celui qui est concerné
    if (req.user.id !== managerId) {
      throw new AppError('Vous ne pouvez pas mettre à jour l\'activité d\'un autre manager', 403);
    }

    sessionService.updateManagerActivity(managerId);

    res.json({
      success: true,
      message: 'Activité mise à jour avec succès'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Récupère toutes les sessions actives (pour les administrateurs)
 */
const getAllActiveSessions = async (req, res, next) => {
  try {
    const sessions = await sessionService.getAllActiveSessions();

    res.json({
      success: true,
      data: sessions
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  updateManagerSite,
  setWorkSession,
  getWorkSession,
  updateActivity,
  getAllActiveSessions
}; 