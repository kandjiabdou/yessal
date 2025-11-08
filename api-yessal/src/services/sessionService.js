const prisma = require('../utils/prismaClient');

/**
 * Service pour gérer les sessions de travail des managers
 * Une session représente un manager actuellement actif sur un site
 */
class SessionService {
  constructor() {
    // Map pour stocker les sessions actives: managerId -> siteId
    // En production, ceci devrait être dans Redis ou une base de données
    this.activeSessions = new Map();
    
    // Map pour stocker les timestamps de dernière activité: managerId -> timestamp
    this.lastActivity = new Map();
    
    // Durée d'inactivité avant expiration (en millisecondes) - 8 heures
    this.sessionTimeout = 8 * 60 * 60 * 1000;
  }

  /**
   * Démarre ou met à jour une session de travail pour un manager
   * @param {number} managerId - ID du manager
   * @param {number} siteId - ID du site (null pour "Hors site - Fermer")
   * @returns {Promise<boolean>} - Succès de l'opération
   */
  async setManagerSession(managerId, siteId) {
    try {
      // Vérifier que le manager existe
      const manager = await prisma.user.findUnique({
        where: { id: managerId, role: 'MANAGER' }
      });

      if (!manager) {
        throw new Error('Manager non trouvé');
      }

      // Si siteId est null, retirer le manager de sa session actuelle
      if (siteId === null) {
        this.activeSessions.delete(managerId);
        this.lastActivity.delete(managerId);
      } else {
        // Vérifier que le site existe
        const site = await prisma.sitelavage.findUnique({
          where: { id: siteId }
        });

        if (!site) {
          throw new Error('Site non trouvé');
        }

        // Mettre à jour la session active
        this.activeSessions.set(managerId, siteId);
        this.lastActivity.set(managerId, Date.now());
      }

      // Mettre à jour automatiquement les statuts des sites affectés
      await this.updateSiteStatuses();

      return true;
    } catch (error) {
      console.error('Erreur lors de la mise à jour de la session:', error);
      return false;
    }
  }

  /**
   * Récupère la session active d'un manager
   * @param {number} managerId - ID du manager
   * @returns {number|null} - ID du site ou null si pas de session active
   */
  getManagerSession(managerId) {
    this.cleanExpiredSessions();
    return this.activeSessions.get(managerId) || null;
  }

  /**
   * Récupère tous les managers actifs sur un site
   * @param {number} siteId - ID du site
   * @returns {number[]} - Liste des IDs des managers actifs
   */
  getActiveManagersOnSite(siteId) {
    this.cleanExpiredSessions();
    const activeManagers = [];
    
    for (const [managerId, sessionSiteId] of this.activeSessions.entries()) {
      if (sessionSiteId === siteId) {
        activeManagers.push(managerId);
      }
    }
    
    return activeManagers;
  }

  /**
   * Calcule si un site devrait être ouvert basé sur les sessions actives
   * @param {number} siteId - ID du site
   * @returns {boolean} - true si le site devrait être ouvert
   */
  shouldSiteBeOpen(siteId) {
    return this.getActiveManagersOnSite(siteId).length > 0;
  }

  /**
   * Met à jour automatiquement les statuts d'ouverture de tous les sites
   * basé sur les sessions actives
   */
  async updateSiteStatuses() {
    try {
      this.cleanExpiredSessions();
      
      // Récupérer tous les sites
      const sites = await prisma.sitelavage.findMany();
      
      // Mettre à jour le statut de chaque site
      for (const site of sites) {
        const shouldBeOpen = this.shouldSiteBeOpen(site.id);
        
        if (site.statutOuverture !== shouldBeOpen) {
          await prisma.sitelavage.update({
            where: { id: site.id },
            data: { statutOuverture: shouldBeOpen }
          });
        }
      }
    } catch (error) {
      console.error('Erreur lors de la mise à jour des statuts des sites:', error);
    }
  }

  /**
   * Nettoie les sessions expirées
   */
  cleanExpiredSessions() {
    const now = Date.now();
    const expiredManagers = [];

    for (const [managerId, lastActivityTime] of this.lastActivity.entries()) {
      if (now - lastActivityTime > this.sessionTimeout) {
        expiredManagers.push(managerId);
      }
    }

    // Supprimer les sessions expirées
    for (const managerId of expiredManagers) {
      this.activeSessions.delete(managerId);
      this.lastActivity.delete(managerId);
    }
  }

  /**
   * Met à jour la dernière activité d'un manager (pour éviter l'expiration)
   * @param {number} managerId - ID du manager
   */
  updateManagerActivity(managerId) {
    if (this.activeSessions.has(managerId)) {
      this.lastActivity.set(managerId, Date.now());
    }
  }

  /**
   * Récupère toutes les sessions actives avec les informations des sites
   * @returns {Promise<Array>} - Liste des sessions avec détails
   */
  async getAllActiveSessions() {
    this.cleanExpiredSessions();
    const sessions = [];

    for (const [managerId, siteId] of this.activeSessions.entries()) {
      try {
        const [manager, site] = await Promise.all([
          prisma.user.findUnique({
            where: { id: managerId },
            select: { id: true, nom: true, prenom: true, email: true }
          }),
          prisma.sitelavage.findUnique({
            where: { id: siteId },
            select: { id: true, nom: true, adresseText: true }
          })
        ]);

        if (manager && site) {
          sessions.push({
            managerId,
            manager,
            siteId,
            site,
            lastActivity: this.lastActivity.get(managerId)
          });
        }
      } catch (error) {
        console.error(`Erreur lors de la récupération des détails pour la session ${managerId}:`, error);
      }
    }

    return sessions;
  }
}

// Instance singleton
const sessionService = new SessionService();

module.exports = sessionService; 