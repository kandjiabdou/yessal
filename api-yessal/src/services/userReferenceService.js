const prismaShared = require('../utils/prismaSharedClient');
const prisma = require('../utils/prismaClient');

/**
 * Service pour gérer les références utilisateurs dans la base partagée
 */
class UserReferenceService {
  /**
   * Récupérer les informations d'un utilisateur local
   * @param {number} userId - ID de l'utilisateur
   * @returns {Promise<Object|null>} Informations utilisateur
   */
  async _getLocalUserInfo(userId) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, nom: true, prenom: true }
    });
    
    return user;
  }

  /**
   * Obtenir ou créer une référence utilisateur
   * @param {number} userId - ID de l'utilisateur local
   * @param {string} sourceApp - 'manager' ou 'associe'
   * @returns {Promise<string>} ID de la référence utilisateur
   */
  async getOrCreateUserRef(userId, sourceApp = 'manager') {
    const sourceUserId = String(userId);

    // Chercher la référence existante
    let userRef = await prismaShared.userReference.findUnique({
      where: {
        sourceApp_sourceUserId: {
          sourceApp,
          sourceUserId
        }
      }
    });

    // Si elle existe déjà, retourner son ID
    if (userRef) {
      return userRef.id;
    }

    // Sinon, récupérer les infos et créer la référence
    const userInfo = await this._getLocalUserInfo(userId);

    if (!userInfo) {
      throw new Error('Utilisateur non trouvé');
    }

    userRef = await prismaShared.userReference.create({
      data: {
        sourceApp,
        sourceUserId,
        nom: userInfo.nom || null,
        prenom: userInfo.prenom || null
      }
    });

    return userRef.id;
  }

  /**
   * Synchroniser les informations d'un utilisateur
   * Met à jour nom/prenom si ils ont changé dans la base locale
   * @param {string} userRefId - ID de la référence utilisateur
   * @returns {Promise<void>}
   */
  async syncUserInfo(userRefId) {
    const userRef = await prismaShared.userReference.findUnique({
      where: { id: userRefId }
    });

    if (!userRef) return;

    const userId = Number.parseInt(userRef.sourceUserId);
    const userInfo = await this._getLocalUserInfo(userId);

    if (!userInfo) return;

    // Mettre à jour si les infos ont changé
    if (userInfo.nom !== userRef.nom || userInfo.prenom !== userRef.prenom) {
      await prismaShared.userReference.update({
        where: { id: userRefId },
        data: {
          nom: userInfo.nom || null,
          prenom: userInfo.prenom || null,
          lastSyncedAt: new Date()
        }
      });
    }
  }

  /**
   * Batch : obtenir ou créer plusieurs références utilisateurs
   * @param {Array<{userId: number, sourceApp: string}>} users
   * @returns {Promise<Map<string, string>>} Map(userId -> userRefId)
   */
  async getOrCreateUserRefsBatch(users) {
    const results = new Map();

    for (const { userId, sourceApp } of users) {
      const userRefId = await this.getOrCreateUserRef(userId, sourceApp);
      results.set(String(userId), userRefId);
    }

    return results;
  }
}

module.exports = new UserReferenceService();
