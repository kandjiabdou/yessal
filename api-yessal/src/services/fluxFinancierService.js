const prismaShared = require('../utils/prismaSharedClient');
const userReferenceService = require('./userReferenceService');
const laverieReferenceService = require('./laverieReferenceService');

/**
 * Convertir les montants Decimal de Prisma en nombres
 * @param {Object} flux - Flux financier ou tableau de flux
 * @returns {Object} Flux avec montant converti en nombre
 */
const normalizeFluxMontant = (flux) => {
  if (!flux) return flux;
  
  // Si c'est un tableau
  if (Array.isArray(flux)) {
    return flux.map(f => normalizeFluxMontant(f));
  }
  
  // Si c'est un objet flux
  return {
    ...flux,
    montant: flux.montant ? Number(flux.montant) : flux.montant
  };
};

/**
 * Service pour gérer les flux financiers (dépenses et recettes)
 * Utilise la base de données partagée pour les flux financiers
 */
class FluxFinancierService {
  /**
   * Préparer les données communes de flux
   * @param {Object} fluxData - Données du flux
   * @param {string} userRefId - ID de la référence utilisateur
   * @param {string|null} laverieRefId - ID de la référence laverie
   * @returns {Object} Données formatées pour Prisma
   */
  _prepareFluxData(fluxData, userRefId, laverieRefId = null) {
    const {
      type,
      montant,
      dateFluxFinancier,
      motif,
      beneficiaire,
      sourceFinancement,
      description
    } = fluxData;

    return {
      type,
      montant,
      dateFluxFinancier: new Date(dateFluxFinancier),
      devise: 'FCFA',
      motif,
      beneficiaire,
      sourceFinancement,
      description,
      laverieRefId,
      createdByRefId: userRefId,
      sourceApp: 'manager',
      status: 'pending'
    };
  }

  /**
   * Créer un nouveau flux financier (dépense ou recette)
   * @param {Object} fluxData - Données du flux financier
   * @returns {Promise<Object>} Le flux créé
   */
  async createFlux(fluxData) {
    const { preuves, laverieId, createdBy } = fluxData;

    // Validation: type doit être 'depense' ou 'recette'
    if (!['depense', 'recette'].includes(fluxData.type)) {
      throw new Error('Le type de flux doit être "depense" ou "recette"');
    }

    // Obtenir ou créer la référence utilisateur
    const userRefId = await userReferenceService.getOrCreateUserRef(createdBy, 'manager');

    // Obtenir ou créer la référence laverie si laverieId est fourni
    const laverieRefId = laverieId 
      ? await laverieReferenceService.getOrCreateLaverieRef(laverieId, 'manager')
      : null;

    // Préparer les données du flux
    const fluxBaseData = this._prepareFluxData(fluxData, userRefId, laverieRefId);

    // Créer le flux financier dans la base partagée
    const flux = await prismaShared.fluxFinancier.create({
      data: {
        ...fluxBaseData,
        // Créer les preuves si présentes
        preuves: preuves && preuves.length > 0 ? {
          create: preuves.map(preuve => ({
            fileId: preuve.fileId,
            filename: preuve.filename,
            downloadUrl: preuve.downloadUrl,
            mimetype: preuve.mimetype,
            size: preuve.size
          }))
        } : undefined
      },
      include: {
        preuves: true,
        createdByRef: true,
        validatedByRef: true,
        laverieRef: true
      }
    });

    return normalizeFluxMontant(flux);
  }

  /**
   * Inclusions standard pour les requêtes flux
   * @returns {Object} Include Prisma
   */
  _getFluxIncludes() {
    return {
      preuves: true,
      createdByRef: true,
      validatedByRef: true,
      laverieRef: true
    };
  }

  /**
   * Obtenir un flux financier par ID
   * @param {number} id - ID du flux
   * @returns {Promise<Object|null>} Le flux trouvé
   */
  async getFluxById(id) {
    const flux = await prismaShared.fluxFinancier.findUnique({
      where: { id },
      include: this._getFluxIncludes()
    });

    return normalizeFluxMontant(flux);
  }

  /**
   * Construire les conditions de requête pour getAllFlux
   * @param {Object} filters - Filtres
   * @param {string} laverieRefId - ID de la référence laverie (optionnel)
   * @returns {Object} Conditions where de Prisma
   */
  _buildFluxWhereConditions(filters, laverieRefId = null) {
    const {
      type,
      startDate,
      endDate,
      month,
      year,
      status
    } = filters;

    const where = {
      sourceApp: 'manager',
      flagged: true
    };

    // Filtrer par laverie (tous les managers de la laverie voient les mêmes flux)
    if (laverieRefId) {
      where.laverieRefId = laverieRefId;
    }

    if (type && ['depense', 'recette'].includes(type)) {
      where.type = type;
    }

    // Filtrage par date
    const dateRange = this._buildDateRange({ startDate, endDate, month, year });
    if (dateRange) {
      where.dateFluxFinancier = dateRange;
    }

    if (status) {
      where.status = status;
    }

    return where;
  }

  /**
   * Obtenir tous les flux financiers avec filtres
   * @param {Object} filters - Filtres de recherche
   * @returns {Promise<Array>} Liste des flux
   */
  async getAllFlux(filters = {}) {
    const { laverieId, page = 1, limit = 20 } = filters;

    // Obtenir la référence laverie si laverieId est fourni
    const laverieRefId = laverieId 
      ? await laverieReferenceService.getOrCreateLaverieRef(Number.parseInt(laverieId, 10), 'manager')
      : null;

    // Construire les conditions
    const where = this._buildFluxWhereConditions(filters, laverieRefId);
    const skip = (page - 1) * limit;

    const [flux, total] = await Promise.all([
      prismaShared.fluxFinancier.findMany({
        where,
        orderBy: { dateFluxFinancier: 'desc' },
        skip,
        take: Number.parseInt(limit, 10),
        include: this._getFluxIncludes()
      }),
      prismaShared.fluxFinancier.count({ where })
    ]);

    return {
      data: normalizeFluxMontant(flux),
      pagination: {
        total,
        page: Number.parseInt(page, 10),
        limit: Number.parseInt(limit, 10),
        totalPages: Math.ceil(total / limit)
      }
    };
  }

  /**
   * Obtenir les flux par laverie
   * @param {number} laverieId - ID de la laverie
   * @param {Object} options - Options de pagination
   * @returns {Promise<Object>} Flux et métadonnées
   */
  async getFluxByLaverie(laverieId, options = {}) {
    const { page = 1, limit = 20, startDate, endDate, month, year, type } = options;

    // Obtenir la référence de laverie
    const laverieRefId = await laverieReferenceService.getOrCreateLaverieRef(laverieId, 'manager');

    const where = {
      laverieRefId,
      sourceApp: 'manager',
      flagged: true
    };

    if (type && ['depense', 'recette'].includes(type)) {
      where.type = type;
    }

    // Filtrage par date
    const dateRange = this._buildDateRange({ startDate, endDate, month, year });
    if (dateRange) {
      where.dateFluxFinancier = dateRange;
    }

    const skip = (page - 1) * limit;

    const [flux, total] = await Promise.all([
      prismaShared.fluxFinancier.findMany({
        where,
        orderBy: { dateFluxFinancier: 'desc' },
        skip,
        take: Number.parseInt(limit, 10),
        include: this._getFluxIncludes()
      }),
      prismaShared.fluxFinancier.count({ where })
    ]);

    return {
      data: normalizeFluxMontant(flux),
      pagination: {
        total,
        page: Number.parseInt(page, 10),
        limit: Number.parseInt(limit, 10),
        totalPages: Math.ceil(total / limit)
      }
    };
  }

  /**
   * Vérifier les permissions sur un flux
   * @param {Object} flux - Le flux financier
   * @param {number} userId - ID de l'utilisateur
   * @param {string} action - Action à vérifier (modifier, supprimer, etc.)
   * @returns {Promise<void>} Lance une erreur si non autorisé
   */
  async _checkFluxPermissions(flux, userId, action) {
    if (!flux) {
      throw new Error('Flux financier non trouvé');
    }

    if (flux.sourceApp !== 'manager') {
      throw new Error('Impossible de ' + action + ' ce flux');
    }

    // Vérifier que l'utilisateur est le créateur
    const userRefId = await userReferenceService.getOrCreateUserRef(userId, 'manager');
    if (flux.createdByRefId !== userRefId) {
      throw new Error('Seul le créateur peut ' + action + ' ce flux');
    }

    if (flux.status !== 'pending') {
      throw new Error('Impossible de ' + action + ' un flux déjà validé ou rejeté');
    }
  }

  /**
   * Mettre à jour un flux financier
   * @param {number} id - ID du flux
   * @param {number} userId - ID de l'utilisateur qui modifie
   * @param {Object} updateData - Données à mettre à jour
   * @returns {Promise<Object>} Le flux mis à jour
   */
  async updateFlux(id, userId, updateData) {
    const flux = await prismaShared.fluxFinancier.findUnique({
      where: { id }
    });

    await this._checkFluxPermissions(flux, userId, 'modifier');

    const allowedFields = [
      'montant',
      'dateFluxFinancier',
      'motif',
      'beneficiaire',
      'sourceFinancement',
      'description'
    ];

    const dataToUpdate = {};
    for (const field of allowedFields) {
      if (updateData[field] !== undefined) {
        dataToUpdate[field] = updateData[field];
      }
    }

    // Convertir la date si nécessaire
    if (dataToUpdate.dateFluxFinancier) {
      dataToUpdate.dateFluxFinancier = new Date(dataToUpdate.dateFluxFinancier);
    }

    const updatedFlux = await prismaShared.fluxFinancier.update({
      where: { id },
      data: dataToUpdate,
      include: this._getFluxIncludes()
    });

    return normalizeFluxMontant(updatedFlux);
  }

  /**
   * Ajouter une preuve à un flux financier
   * @param {number} fluxId - ID du flux
   * @param {number} userId - ID de l'utilisateur
   * @param {Object} preuveData - Données de la preuve
   * @returns {Promise<Object>} La preuve créée
   */
  async addPreuve(fluxId, userId, preuveData) {
    const flux = await prismaShared.fluxFinancier.findUnique({
      where: { id: fluxId }
    });

    await this._checkFluxPermissions(flux, userId, 'ajouter une preuve à');

    const preuve = await prismaShared.fluxFinancierPreuve.create({
      data: {
        fluxFinancierId: fluxId,
        fileId: preuveData.fileId,
        filename: preuveData.filename,
        downloadUrl: preuveData.downloadUrl,
        mimetype: preuveData.mimetype,
        size: preuveData.size
      }
    });

    return preuve;
  }

  /**
   * Supprimer une preuve d'un flux financier
   * Note: La suppression du fichier physique doit être effectuée par le frontend
   * avant d'appeler cette méthode
   * Note: La suppression est interdite s'il ne reste qu'une seule preuve (au moins une preuve obligatoire)
   * @param {number} preuveId - ID de la preuve
   * @param {number} userId - ID de l'utilisateur
   * @returns {Promise<Object>} La preuve supprimée (avec fileId pour suppression côté frontend)
   */
  async deletePreuve(preuveId, userId) {
    const preuve = await prismaShared.fluxFinancierPreuve.findUnique({
      where: { id: preuveId },
      include: {
        fluxFinancier: {
          include: {
            preuves: true // Inclure toutes les preuves pour compter
          }
        }
      }
    });

    if (!preuve) {
      throw new Error('Preuve non trouvée');
    }

    await this._checkFluxPermissions(preuve.fluxFinancier, userId, 'supprimer une preuve de');

    // Vérifier qu'il reste au moins 2 preuves (après suppression il en restera 1)
    const preuvesCount = preuve.fluxFinancier.preuves.length;
    if (preuvesCount <= 1) {
      throw new Error('Impossible de supprimer la dernière preuve. Au moins une preuve est obligatoire.');
    }

    // Supprimer la référence de la preuve en base de données
    await prismaShared.fluxFinancierPreuve.delete({
      where: { id: preuveId }
    });

    // Retourner les infos de la preuve pour que le frontend puisse supprimer le fichier
    return {
      id: preuve.id,
      fileId: preuve.fileId,
      filename: preuve.filename
    };
  }

  /**
   * Supprimer un flux financier (soft delete) avec suppression des preuves
   * Note: Les fichiers physiques doivent être supprimés par le frontend
   * @param {number} id - ID du flux
   * @param {number} userId - ID de l'utilisateur
   * @returns {Promise<Object>} Le flux supprimé avec la liste des fileIds à supprimer
   */
  async deleteFlux(id, userId) {
    const flux = await prismaShared.fluxFinancier.findUnique({
      where: { id },
      include: {
        preuves: true // Inclure les preuves pour récupérer les fileIds
      }
    });

    await this._checkFluxPermissions(flux, userId, 'supprimer');

    // Récupérer les fileIds avant de supprimer les preuves
    const fileIds = flux.preuves.map(preuve => preuve.fileId);

    // Supprimer toutes les preuves associées
    if (flux.preuves.length > 0) {
      await prismaShared.fluxFinancierPreuve.deleteMany({
        where: { fluxFinancierId: id }
      });
    }

    // Marquer le flux comme flagged (soft delete)
    const deletedFlux = await prismaShared.fluxFinancier.update({
      where: { id },
      data: { flagged: false }
    });

    return {
      flux: normalizeFluxMontant(deletedFlux),
      fileIds, // Retourner les fileIds pour que le frontend puisse les supprimer
      preuvesCount: fileIds.length
    };
  }

  /**
   * Construire la plage de dates pour les filtres
   * @param {Object} period - Période (startDate, endDate, month, year)
   * @returns {Object|null} { gte, lt } pour les requêtes Prisma
   */
  _buildDateRange(period) {
    const { startDate, endDate, month, year } = period;

    // Filtrage par mois (prioritaire)
    if (month) {
      const [yearStr, monthStr] = month.split('-');
      const monthStart = new Date(Number.parseInt(yearStr), Number.parseInt(monthStr) - 1, 1);
      const monthEnd = new Date(monthStart);
      monthEnd.setMonth(monthEnd.getMonth() + 1);
      return { gte: monthStart, lt: monthEnd };
    }

    // Filtrage par année
    if (year) {
      const yearStart = new Date(Number.parseInt(year), 0, 1);
      const yearEnd = new Date(Number.parseInt(year) + 1, 0, 1);
      return { gte: yearStart, lt: yearEnd };
    }

    // Filtrage par plage de dates
    if (startDate || endDate) {
      const range = {};
      if (startDate) range.gte = new Date(startDate);
      if (endDate) range.lte = new Date(endDate);
      return range;
    }

    return null;
  }

  /**
   * Obtenir les statistiques des flux financiers uniquement pour une laverie
   * (dépenses et recettes enregistrées manuellement)
   * @param {number} laverieId - ID de la laverie
   * @param {Object} period - Période (startDate, endDate, month, year)
   * @returns {Promise<Object>} Statistiques des flux financiers uniquement
   */
  async getStatistics(laverieId, period = {}) {
    const laverieIdInt = Number.parseInt(laverieId, 10);
    const dateRange = this._buildDateRange(period);

    // Obtenir la référence de laverie
    const laverieRefId = await laverieReferenceService.getOrCreateLaverieRef(laverieIdInt, 'manager');

    // Construire les conditions de base
    const fluxWhere = {
      laverieRefId,
      sourceApp: 'manager',
      flagged: true
    };

    // Ajouter le filtre de date si présent
    if (dateRange) {
      fluxWhere.dateFluxFinancier = dateRange;
    }

    // Récupérer les données des flux financiers uniquement
    const [depensesData, recettesData] = await Promise.all([
      // Dépenses
      prismaShared.fluxFinancier.aggregate({
        where: { ...fluxWhere, type: 'depense' },
        _sum: { montant: true },
        _count: true
      }),
      // Recettes
      prismaShared.fluxFinancier.aggregate({
        where: { ...fluxWhere, type: 'recette' },
        _sum: { montant: true },
        _count: true
      })
    ]);

    // Calculer les totaux
    const depensesTotal = Number(depensesData._sum.montant || 0);
    const recettesTotal = Number(recettesData._sum.montant || 0);
    const solde = recettesTotal - depensesTotal;

    return {
      depenses: {
        total: depensesTotal,
        count: depensesData._count
      },
      recettes: {
        total: recettesTotal,
        count: recettesData._count
      },
      solde,
      devise: 'FCFA'
    };
  }
}

module.exports = new FluxFinancierService();
