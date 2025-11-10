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
      select: { id: true, nom: true, prenom: true, email: true }
    });
    
    return user;
  }

  /**
   * Obtenir ou créer une référence utilisateur
   * @param {number} userId - ID de l'utilisateur local
   * @param {string} sourceApp - 'ASSOCIE' ou 'ASSOCIE'
   * @returns {Promise<string>} ID de la référence utilisateur
   */
  async getOrCreateUserRef(userId, sourceApp = 'ASSOCIE') {
    const sourceUserId = String(userId);

    // Récupérer les infos locales (inclut email)
    const userInfo = await this._getLocalUserInfo(userId);
    if (!userInfo) {
      throw new Error('Utilisateur non trouvé');
    }

    // Si l'email existe, tenter de retrouver une référence existante par email
    if (userInfo.email) {
      const existingByEmail = await prismaShared.userReference.findFirst({ where: { email: userInfo.email } });
      if (existingByEmail) {
        return existingByEmail.id;
      }
    }

    // Sinon, tenter par sourceApp + sourceUserId
    let userRef = await prismaShared.userReference.findUnique({
      where: {
        sourceApp_sourceUserId: {
          sourceApp,
          sourceUserId
        }
      }
    });

    if (userRef) return userRef.id;

    // Créer une nouvelle référence
    userRef = await prismaShared.userReference.create({
      data: {
        sourceApp,
        sourceUserId,
        email: userInfo.email || null,
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

    // Mettre à jour si les infos ont changé (nom / prenom / email)
    if (userInfo.nom !== userRef.nom || userInfo.prenom !== userRef.prenom || userInfo.email !== userRef.email) {
      await prismaShared.userReference.update({
        where: { id: userRefId },
        data: {
          nom: userInfo.nom || null,
          prenom: userInfo.prenom || null,
          email: userInfo.email || null,
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
