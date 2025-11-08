const prisma = require('../utils/prismaClient');
const { AppError } = require('../utils/errors');

const updateassocieSite = async (req, res, next) => {
  try {
    const associeId = Number.parseInt(req.params.id);
    const { siteId } = req.body;

    // Vérifier que le associe existe
    const associe = await prisma.user.findUnique({
      where: { id: associeId, role: 'ASSOCIE' }
    });

    if (!associe) {
      throw new AppError('Associe non trouvé', 404);
    }

    // Vérifier que le site existe
    const site = await prisma.sitelavage.findUnique({
      where: { id: siteId }
    });

    if (!site) {
      throw new AppError('Site de lavage non trouvé', 404);
    }

    // Vérifier que le associe qui fait la requête est bien celui qui est concerné
    if (req.user.id !== associeId) {
      throw new AppError('Vous ne pouvez pas modifier le site principal d\'un autre associe', 403);
    }

    // Mettre à jour le site principal du associe
    const updatedassocie = await prisma.user.update({
      where: { id: associeId },
      data: { siteLavagePrincipalGerantId: siteId }
    });

    res.json({
      success: true,
      message: 'Site principal mis à jour avec succès',
      data: {
        id: updatedassocie.id,
        siteLavagePrincipalGerantId: updatedassocie.siteLavagePrincipalGerantId
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Démarre ou met à jour une session de travail pour un associe
 * (Simplifié pour l'application associé - pas de gestion de session en mémoire)
 */
const setWorkSession = async (req, res, next) => {
  try {
    const associeId = Number.parseInt(req.params.id);
    const { siteId } = req.body; // siteId peut être null

    // Vérifier que le associe qui fait la requête est bien celui qui est concerné
    if (req.user.id !== associeId) {
      throw new AppError('Vous ne pouvez pas modifier la session de travail d\'un autre associe', 403);
    }

    // Mettre à jour le site principal du associe si siteId n'est pas null
    if (siteId !== null) {
      await prisma.user.update({
        where: { id: associeId },
        data: { siteLavagePrincipalGerantId: siteId }
      });
    }

    res.json({
      success: true,
      message: siteId ? 'Session de travail mise à jour avec succès' : 'Session de travail fermée avec succès',
      data: {
        associeId,
        currentSessionSiteId: siteId
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Récupère la session de travail actuelle d'un associe
 * (Simplifié - retourne le site principal de l'utilisateur)
 */
const getWorkSession = async (req, res, next) => {
  try {
    const associeId = Number.parseInt(req.params.id);

    // Vérifier que le associe qui fait la requête est bien celui qui est concerné
    if (req.user.id !== associeId) {
      throw new AppError('Vous ne pouvez pas consulter la session de travail d\'un autre associe', 403);
    }

    // Récupérer l'utilisateur avec son site principal
    const user = await prisma.user.findUnique({
      where: { id: associeId },
      select: { siteLavagePrincipalGerantId: true }
    });

    const currentSiteId = user?.siteLavagePrincipalGerantId;
    
    let sessionData = {
      associeId,
      currentSessionSiteId: currentSiteId,
      isActive: currentSiteId !== null
    };

    // Si une session est active, récupérer les détails du site
    if (currentSiteId) {
      const site = await prisma.sitelavage.findUnique({
        where: { id: currentSiteId },
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
 * Met à jour l'activité d'un associe (simplifié - juste un endpoint no-op)
 */
const updateActivity = async (req, res, next) => {
  try {
    const associeId = Number.parseInt(req.params.id);

    // Vérifier que le associe qui fait la requête est bien celui qui est concerné
    if (req.user.id !== associeId) {
      throw new AppError('Vous ne pouvez pas mettre à jour l\'activité d\'un autre associe', 403);
    }

    // Pas de gestion de session en mémoire pour l'application associé
    res.json({
      success: true,
      message: 'Activité mise à jour avec succès'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Récupère toutes les sessions actives (simplifié - retourne les associés actifs)
 */
const getAllActiveSessions = async (req, res, next) => {
  try {
    // Retourner les associés avec un site principal défini
    const activeUsers = await prisma.user.findMany({
      where: {
        role: 'ASSOCIE',
        siteLavagePrincipalGerantId: { not: null }
      },
      select: {
        id: true,
        nom: true,
        prenom: true,
        siteLavagePrincipalGerantId: true
      }
    });

    res.json({
      success: true,
      data: activeUsers
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  updateassocieSite,
  setWorkSession,
  getWorkSession,
  updateActivity,
  getAllActiveSessions
}; 