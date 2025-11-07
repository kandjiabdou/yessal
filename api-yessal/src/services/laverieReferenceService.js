const prismaShared = require('../utils/prismaSharedClient');
const prisma = require('../utils/prismaClient');

/**
 * Service pour gérer les références de laveries dans la base partagée
 * Synchronise les informations des laveries entre les applications
 */
class LaverieReferenceService {
  /**
   * Récupérer les informations d'une laverie depuis la base locale
   * @param {number} laverieId - ID de la laverie
   * @returns {Promise<Object|null>} Informations de la laverie
   */
  async _getLocalLaverieInfo(laverieId) {
    const laverie = await prisma.sitelavage.findUnique({
      where: { id: laverieId },
      select: {
        nom: true,
        adresseText: true,
        telephone: true
      }
    });

    if (!laverie) return null;

    // Mapper adresseText vers adresse et extraire ville si possible
    return {
      nom: laverie.nom,
      adresse: laverie.adresseText || null,
      telephone: laverie.telephone || null,
      ville: this._extractVilleFromAddress(laverie.adresseText)
    };
  }

  /**
   * Extraire la ville depuis l'adresse (heuristique simple)
   * @param {string|null} adresse - Adresse complète
   * @returns {string|null} Ville extraite ou null
   */
  _extractVilleFromAddress(adresse) {
    if (!adresse) return null;
    
    // Villes communes au Sénégal
    const villes = ['Dakar', 'Thiès', 'Rufisque', 'Mbour', 'Saint-Louis', 'Kaolack', 'Ziguinchor', 'Louga', 'Tambacounda', 'Kolda'];
    
    for (const ville of villes) {
      if (adresse.toLowerCase().includes(ville.toLowerCase())) {
        return ville;
      }
    }
    
    return null;
  }

  /**
   * Obtenir ou créer une référence de laverie
   * @param {number} laverieId - ID de la laverie dans l'app source
   * @param {string} sourceApp - Application source ('manager' ou 'associe')
   * @returns {Promise<string>} UUID de la référence de laverie
   */
  async getOrCreateLaverieRef(laverieId, sourceApp = 'manager') {
    if (!laverieId) return null;

    const laverieIdInt = Number.parseInt(laverieId, 10);

    // Vérifier si la référence existe déjà
    let laverieRef = await prismaShared.laverieReference.findUnique({
      where: {
        sourceApp_sourceLaverieId: {
          sourceApp,
          sourceLaverieId: laverieIdInt
        }
      }
    });

    if (laverieRef) {
      return laverieRef.id;
    }

    // Récupérer les infos de la laverie depuis la base locale
    const laverieInfo = await this._getLocalLaverieInfo(laverieIdInt);

    if (!laverieInfo) {
      throw new Error(`Laverie ${laverieId} non trouvée dans la base locale`);
    }

    // Créer la référence de laverie
    laverieRef = await prismaShared.laverieReference.create({
      data: {
        sourceApp,
        sourceLaverieId: laverieIdInt,
        nom: laverieInfo.nom,
        adresse: laverieInfo.adresse,
        telephone: laverieInfo.telephone,
        ville: laverieInfo.ville
      }
    });

    return laverieRef.id;
  }

  /**
   * Synchroniser les informations d'une laverie
   * Met à jour les données dans LaverieReference depuis la base locale
   * @param {string} laverieRefId - UUID de la référence de laverie
   * @returns {Promise<Object>} Référence mise à jour
   */
  async syncLaverieInfo(laverieRefId) {
    const laverieRef = await prismaShared.laverieReference.findUnique({
      where: { id: laverieRefId }
    });

    if (!laverieRef) {
      throw new Error('Référence de laverie non trouvée');
    }

    // Récupérer les infos actualisées depuis la base locale
    const laverieInfo = await this._getLocalLaverieInfo(laverieRef.sourceLaverieId);

    if (!laverieInfo) {
      throw new Error(`Laverie ${laverieRef.sourceLaverieId} non trouvée dans la base locale`);
    }

    // Mettre à jour la référence
    return await prismaShared.laverieReference.update({
      where: { id: laverieRefId },
      data: {
        nom: laverieInfo.nom,
        adresse: laverieInfo.adresse,
        telephone: laverieInfo.telephone,
        ville: laverieInfo.ville,
        lastSyncedAt: new Date()
      }
    });
  }

  /**
   * Obtenir une référence de laverie par son ID
   * @param {string} laverieRefId - UUID de la référence
   * @returns {Promise<Object|null>} Référence de laverie
   */
  async getLaverieRefById(laverieRefId) {
    return await prismaShared.laverieReference.findUnique({
      where: { id: laverieRefId }
    });
  }

  /**
   * Rechercher des laveries par nom
   * @param {string} searchTerm - Terme de recherche
   * @param {string} sourceApp - Application source
   * @returns {Promise<Array>} Liste des laveries trouvées
   */
  async searchLaveries(searchTerm, sourceApp = 'manager') {
    return await prismaShared.laverieReference.findMany({
      where: {
        sourceApp,
        nom: {
          contains: searchTerm
        }
      },
      orderBy: {
        nom: 'asc'
      }
    });
  }
}

module.exports = new LaverieReferenceService();
