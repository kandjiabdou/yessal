const prismaShared = require('../utils/prismaSharedClient');
const prisma = require('../utils/prismaClient');

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
   * Créer un nouveau flux financier (dépense ou recette)
   * @param {Object} fluxData - Données du flux financier
   * @returns {Promise<Object>} Le flux créé
   */
  async createFlux(fluxData) {
    const {
      type,
      montant,
      dateFluxFinancier,
      motif,
      beneficiaire,
      sourceFinancement,
      description,
      preuves, // Tableau de pièces jointes
      laverieId,
      createdBy
    } = fluxData;

    // Validation: type doit être 'depense' ou 'recette'
    if (!['depense', 'recette'].includes(type)) {
      throw new Error('Le type de flux doit être "depense" ou "recette"');
    }

    // Vérifier que la laverie existe
    if (laverieId) {
      const laverie = await prisma.sitelavage.findUnique({
        where: { id: laverieId }
      });

      if (!laverie) {
        throw new Error('Laverie non trouvée');
      }
    }

    // Vérifier que l'utilisateur existe
    const user = await prisma.user.findUnique({
      where: { id: createdBy }
    });

    if (!user) {
      throw new Error('Utilisateur non trouvé');
    }

    // Créer le flux financier dans la base partagée
    const flux = await prismaShared.fluxFinancier.create({
      data: {
        type,
        montant,
        dateFluxFinancier: new Date(dateFluxFinancier),
        devise: 'FCFA',
        motif,
        beneficiaire,
        sourceFinancement,
        description,
        laverieId,
        laverieName: laverieId ? (await prisma.sitelavage.findUnique({ 
          where: { id: laverieId }, 
          select: { nom: true } 
        }))?.nom : null,
        createdBy: String(createdBy),
        sourceApp: 'manager',
        statut: 'pending',
        validationStatus: 'pending',
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
        preuves: true // Inclure les preuves dans la réponse
      }
    });

    return normalizeFluxMontant(flux);
  }

  /**
   * Obtenir un flux financier par ID
   * @param {number} id - ID du flux
   * @returns {Promise<Object|null>} Le flux trouvé
   */
  async getFluxById(id) {
    const flux = await prismaShared.fluxFinancier.findUnique({
      where: { id },
      include: {
        preuves: true // Inclure les pièces jointes
      }
    });

    return normalizeFluxMontant(flux);
  }

  /**
   * Obtenir tous les flux financiers avec filtres
   * @param {Object} filters - Filtres de recherche
   * @returns {Promise<Array>} Liste des flux
   */
  async getAllFlux(filters = {}) {
    const {
      type,
      laverieId,
      createdBy,
      startDate,
      endDate,
      month, // Format: YYYY-MM
      year,
      validationStatus,
      page = 1,
      limit = 20
    } = filters;

    const where = {
      sourceApp: 'manager',
      flagged: true
    };

    if (type && ['depense', 'recette'].includes(type)) {
      where.type = type;
    }

    if (laverieId) {
      where.laverieId = Number.parseInt(laverieId, 10);
    }

    if (createdBy) {
      where.createdBy = String(createdBy);
    }

    // Filtrage par mois (prioritaire sur startDate/endDate)
    if (month) {
      const [yearStr, monthStr] = month.split('-');
      const monthDate = new Date(Number.parseInt(yearStr), Number.parseInt(monthStr) - 1, 1);
      const nextMonth = new Date(monthDate);
      nextMonth.setMonth(nextMonth.getMonth() + 1);

      where.dateFluxFinancier = {
        gte: monthDate,
        lt: nextMonth
      };
    } else if (year) {
      // Filtrage par année
      const yearDate = new Date(Number.parseInt(year), 0, 1);
      const nextYear = new Date(Number.parseInt(year) + 1, 0, 1);

      where.dateFluxFinancier = {
        gte: yearDate,
        lt: nextYear
      };
    } else if (startDate || endDate) {
      // Filtrage par plage de dates
      where.dateFluxFinancier = {};
      if (startDate) {
        where.dateFluxFinancier.gte = new Date(startDate);
      }
      if (endDate) {
        where.dateFluxFinancier.lte = new Date(endDate);
      }
    }

    if (validationStatus) {
      where.validationStatus = validationStatus;
    }

    const skip = (page - 1) * limit;

    const [flux, total] = await Promise.all([
      prismaShared.fluxFinancier.findMany({
        where,
        orderBy: { dateFluxFinancier: 'desc' },
        skip,
        take: Number.parseInt(limit, 10),
        include: {
          preuves: true // Inclure les pièces jointes
        }
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

    const where = {
      laverieId: Number.parseInt(laverieId, 10),
      sourceApp: 'manager',
      flagged: true
    };

    if (type && ['depense', 'recette'].includes(type)) {
      where.type = type;
    }

    // Filtrage par mois (prioritaire sur startDate/endDate)
    if (month) {
      const [yearStr, monthStr] = month.split('-');
      const monthDate = new Date(Number.parseInt(yearStr), Number.parseInt(monthStr) - 1, 1);
      const nextMonth = new Date(monthDate);
      nextMonth.setMonth(nextMonth.getMonth() + 1);

      where.dateFluxFinancier = {
        gte: monthDate,
        lt: nextMonth
      };
    } else if (year) {
      // Filtrage par année
      const yearDate = new Date(Number.parseInt(year), 0, 1);
      const nextYear = new Date(Number.parseInt(year) + 1, 0, 1);

      where.dateFluxFinancier = {
        gte: yearDate,
        lt: nextYear
      };
    } else if (startDate || endDate) {
      // Filtrage par plage de dates
      where.dateFluxFinancier = {};
      if (startDate) {
        where.dateFluxFinancier.gte = new Date(startDate);
      }
      if (endDate) {
        where.dateFluxFinancier.lte = new Date(endDate);
      }
    }

    const skip = (page - 1) * limit;

    const [flux, total] = await Promise.all([
      prismaShared.fluxFinancier.findMany({
        where,
        orderBy: { dateFluxFinancier: 'desc' },
        skip,
        take: Number.parseInt(limit, 10),
        include: {
          preuves: true // Inclure les pièces jointes
        }
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

    if (!flux) {
      throw new Error('Flux financier non trouvé');
    }

    // Vérifier que c'est bien un flux du manager
    if (flux.sourceApp !== 'manager') {
      throw new Error('Impossible de modifier ce flux');
    }

    // Vérifier que l'utilisateur est le créateur du flux
    if (flux.createdBy !== String(userId)) {
      throw new Error('Seul le créateur peut modifier ce flux');
    }

    // Ne permettre la modification que si le flux est en attente
    if (flux.validationStatus !== 'pending') {
      throw new Error('Impossible de modifier un flux déjà validé ou rejeté');
    }

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
      include: {
        preuves: true // Inclure les preuves dans la réponse
      }
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

    if (!flux) {
      throw new Error('Flux financier non trouvé');
    }

    if (flux.sourceApp !== 'manager') {
      throw new Error('Impossible d\'ajouter une preuve à ce flux');
    }

    if (flux.createdBy !== String(userId)) {
      throw new Error('Seul le créateur peut ajouter une preuve');
    }

    if (flux.validationStatus !== 'pending') {
      throw new Error('Impossible d\'ajouter une preuve à un flux déjà validé ou rejeté');
    }

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
   * @param {number} preuveId - ID de la preuve
   * @param {number} userId - ID de l'utilisateur
   * @returns {Promise<Object>} La preuve supprimée (avec fileId pour suppression côté frontend)
   */
  async deletePreuve(preuveId, userId) {
    const preuve = await prismaShared.fluxFinancierPreuve.findUnique({
      where: { id: preuveId },
      include: {
        fluxFinancier: true
      }
    });

    if (!preuve) {
      throw new Error('Preuve non trouvée');
    }

    const flux = preuve.fluxFinancier;

    if (flux.sourceApp !== 'manager') {
      throw new Error('Impossible de supprimer cette preuve');
    }

    if (flux.createdBy !== String(userId)) {
      throw new Error('Seul le créateur peut supprimer cette preuve');
    }

    if (flux.validationStatus !== 'pending') {
      throw new Error('Impossible de supprimer une preuve d\'un flux déjà validé ou rejeté');
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

    if (!flux) {
      throw new Error('Flux financier non trouvé');
    }

    // Vérifier que c'est bien un flux du manager
    if (flux.sourceApp !== 'manager') {
      throw new Error('Impossible de supprimer ce flux');
    }

    // Vérifier que l'utilisateur est le créateur du flux
    if (flux.createdBy !== String(userId)) {
      throw new Error('Seul le créateur peut supprimer ce flux');
    }

    // Ne permettre la suppression que si le flux est en attente
    if (flux.validationStatus !== 'pending') {
      throw new Error('Impossible de supprimer un flux déjà validé ou rejeté');
    }

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
   * Obtenir les statistiques des flux pour une laverie
   * @param {number} laverieId - ID de la laverie
   * @param {Object} period - Période (startDate, endDate, month, year)
   * @returns {Promise<Object>} Statistiques
   */
  async getStatistics(laverieId, period = {}) {
    const laverieIdInt = Number.parseInt(laverieId, 10);
    const dateRange = this._buildDateRange(period);

    // Construire les conditions de base
    const fluxWhere = {
      laverieId: laverieIdInt,
      sourceApp: 'manager',
      flagged: true
    };

    const commandesWhere = {
      siteLavageId: laverieIdInt,
      flag: true
    };

    const abonnementsWhere = {
      siteLavageId: laverieIdInt,
      flag: true
    };

    // Ajouter le filtre de date si présent
    if (dateRange) {
      fluxWhere.dateFluxFinancier = dateRange;
      commandesWhere.dateHeureCommande = dateRange;
      abonnementsWhere.createdAt = dateRange;
    }

    // Récupérer toutes les données en parallèle
    const [depensesData, recettesFluxData, commandesData, abonnementsData] = await Promise.all([
      // Dépenses
      prismaShared.fluxFinancier.aggregate({
        where: { ...fluxWhere, type: 'depense' },
        _sum: { montant: true },
        _count: true
      }),
      // Recettes (flux financiers uniquement)
      prismaShared.fluxFinancier.aggregate({
        where: { ...fluxWhere, type: 'recette' },
        _sum: { montant: true },
        _count: true
      }),
      // Revenus des commandes
      prisma.commande.aggregate({
        where: commandesWhere,
        _sum: { prixPaye: true },
        _count: true
      }),
      // Revenus des abonnements premium
      prisma.abonnementpremiummensuel.aggregate({
        where: abonnementsWhere,
        _sum: { montant: true },
        _count: true
      })
    ]);

    // Calculer les totaux
    const depensesTotal = Number(depensesData._sum.montant || 0);
    const recettesFluxTotal = Number(recettesFluxData._sum.montant || 0);
    const commandesRevenu = Number(commandesData._sum.prixPaye || 0);
    const abonnementsRevenu = Number(abonnementsData._sum.montant || 0);
    const recettesTotal = recettesFluxTotal + commandesRevenu + abonnementsRevenu;
    const solde = recettesTotal - depensesTotal;

    return {
      depenses: {
        total: depensesTotal,
        count: depensesData._count
      },
      recettes: {
        total: recettesTotal,
        fluxFinanciers: recettesFluxTotal,
        commandes: commandesRevenu,
        abonnements: abonnementsRevenu,
        count: recettesFluxData._count,
        commandesCount: commandesData._count,
        abonnementsCount: abonnementsData._count
      },
      solde,
      devise: 'FCFA'
    };
  }
}

module.exports = new FluxFinancierService();
