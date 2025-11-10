const prisma = require('../utils/prismaClient');
const { AppError } = require('../utils/errors');

/**
 * Service pour gérer les paramètres utilisateurs et entreprise
 */
class ParametreService {
  /**
   * Récupère les informations de l'entreprise
   * @returns {Promise<Object>} Informations entreprise
   */
  async getEntrepriseInfo() {
    // Récupère la première entreprise (il n'y en a qu'une)
    const entreprise = await prisma.entreprise.findFirst();
    
    if (!entreprise) {
      // Créer une entreprise par défaut si elle n'existe pas
      return await prisma.entreprise.create({
        data: {
          nom: 'Mon Entreprise',
          devise: 'FCFA',
          tauxConversion: 655.96
        }
      });
    }
    
    return entreprise;
  }

  /**
   * Récupère les informations d'un utilisateur
   * @param {number} userId - ID de l'utilisateur
   * @returns {Promise<Object>} Informations utilisateur
   */
  async getUserInfo(userId) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        role: true,
        nom: true,
        prenom: true,
        email: true,
        telephone: true,
        pourcentageParts: true,
        devisePreference: true
      }
    });

    if (!user) {
      throw new AppError('Utilisateur non trouvé', 404);
    }

    return user;
  }

  /**
   * Met à jour la préférence de devise d'un utilisateur
   * @param {number} userId - ID de l'utilisateur
   * @param {string} devise - Nouvelle devise (FCFA ou EUR)
   * @returns {Promise<Object>} Utilisateur mis à jour
   */
  async updateUserDevisePreference(userId, devise) {
    if (!['FCFA', 'EUR'].includes(devise)) {
      throw new AppError('Devise invalide. Choisissez FCFA ou EUR', 400);
    }

    const user = await prisma.user.update({
      where: { id: userId },
      data: { devisePreference: devise },
      select: {
        id: true,
        devisePreference: true
      }
    });

    return user;
  }

  /**
   * Liste tous les associés
   * @returns {Promise<Array>} Liste des associés
   */
  async listAssocies() {
    const associes = await prisma.user.findMany({
      where: {
        role: 'ASSOCIE',
        flag: true
      },
      select: {
        id: true,
        nom: true,
        prenom: true,
        email: true,
        telephone: true,
        pourcentageParts: true
      },
      orderBy: {
        nom: 'asc'
      }
    });

    return associes;
  }
}

module.exports = new ParametreService();
