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
      description,
      actionnaire,
      dateEcheance
    } = fluxData;

    const baseData = {
      type,
      montant,
      dateFluxFinancier: new Date(dateFluxFinancier),
      devise: fluxData.devise || 'FCFA',
      motif,
      beneficiaire,
      sourceFinancement,
      description,
      laverieRefId,
      createdByRefId: userRefId,
      sourceApp: 'ASSOCIE',
      status: 'pending'
    };

    // Ajouter les champs spécifiques aux emprunts/prêts
    if (type === 'emprunt' || type === 'pret') {
      if (actionnaire) baseData.actionnaire = actionnaire;
      if (dateEcheance) baseData.dateEcheance = new Date(dateEcheance);
    }

    return baseData;
  }

  /**
   * Créer un nouveau flux financier (tous types: depense, recette, emprunt, pret)
   * @param {Object} fluxData - Données du flux financier
   * @returns {Promise<Object>} Le flux créé
   */
  async createFlux(fluxData) {
    const { preuves, laverieId, createdBy, type } = fluxData;

    // Validation: type doit être valide
    if (!['depense', 'recette', 'emprunt', 'pret'].includes(type)) {
      throw new Error('Le type de flux doit être "depense", "recette", "emprunt" ou "pret"');
    }

    // Validation spécifique pour emprunt/pret
    if ((type === 'emprunt' || type === 'pret') && !fluxData.actionnaire) {
      throw new Error(`Le champ "actionnaire" est obligatoire pour un ${type}`);
    }

    // Obtenir ou créer la référence utilisateur
    const userRefId = await userReferenceService.getOrCreateUserRef(createdBy, 'ASSOCIE');

    // Obtenir ou créer la référence laverie si laverieId est fourni
    const laverieRefId = laverieId 
      ? await laverieReferenceService.getOrCreateLaverieRef(laverieId, 'ASSOCIE')
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
    if (!id || typeof id !== 'number' || isNaN(id)) {
      throw new Error('ID du flux invalide');
    }

    const flux = await prismaShared.fluxFinancier.findUnique({
      where: { id },
      include: this._getFluxIncludes()
    });

    return normalizeFluxMontant(flux);
  }

  /**
   * Construire les conditions de requête pour getAllFlux
   * @param {Object} filters - Filtres
   * @returns {Object} Conditions where de Prisma
   */
  _buildFluxWhereConditions(filters) {
    const {
      type,
      startDate,
      endDate,
      month,
      year,
      status,
      sourceApp
    } = filters;

    const where = {};

    // Filtrer par type (tous les types possibles pour associé)
    if (type && ['depense', 'recette', 'emprunt', 'pret'].includes(type)) {
      where.type = type;
    }

    // Filtrer par sourceApp (voir flux manager + associé)
    if (sourceApp && ['MANAGER', 'ASSOCIE'].includes(sourceApp)) {
      where.sourceApp = sourceApp;
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
   * @returns {Promise<Array>} Liste des flux (simple ou groupé)
   */
  async getAllFlux(filters = {}) {
    const { laverieIds, page = 1, limit = 20, groupByLaverie = false } = filters;

    // Construire les conditions de base
    const where = {
      flagged: true,
      ...this._buildFluxWhereConditions(filters)
    };

    // Filtrer par laveries spécifiques si fourni (array de IDs)
    if (laverieIds && Array.isArray(laverieIds) && laverieIds.length > 0) {
      const laverieRefIds = await Promise.all(
        laverieIds.map(id => 
          laverieReferenceService.getOrCreateLaverieRef(Number.parseInt(id, 10), 'ASSOCIE')
        )
      );
      where.OR = [
        { laverieRefId: { in: laverieRefIds } },
        { laverieRefId: null } // Inclure les flux associés à l'entreprise
      ];
    }

    // Mode simple: liste triée par date
    if (!groupByLaverie) {
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

    // Mode groupé: regrouper par laverie
    const flux = await prismaShared.fluxFinancier.findMany({
      where,
      orderBy: { dateFluxFinancier: 'desc' },
      include: this._getFluxIncludes()
    });

    // Grouper les flux par laverie
    const grouped = {};
    
    for (const f of flux) {
      const key = f.laverieRefId || 'entreprise'; // null = entreprise
      
      if (!grouped[key]) {
        grouped[key] = {
          laverieRefId: f.laverieRefId,
          laverieRef: f.laverieRef,
          flux: [],
          stats: {
            depenses: { total: 0, count: 0 },
            recettes: { total: 0, count: 0 },
            emprunts: { total: 0, count: 0 },
            prets: { total: 0, count: 0 }
          }
        };
      }

      grouped[key].flux.push(f);

      // Calculer les stats par laverie
      const montant = Number(f.montant);
      if (f.type === 'depense') {
        grouped[key].stats.depenses.total += montant;
        grouped[key].stats.depenses.count++;
      } else if (f.type === 'recette') {
        grouped[key].stats.recettes.total += montant;
        grouped[key].stats.recettes.count++;
      } else if (f.type === 'emprunt') {
        grouped[key].stats.emprunts.total += montant;
        grouped[key].stats.emprunts.count++;
      } else if (f.type === 'pret') {
        grouped[key].stats.prets.total += montant;
        grouped[key].stats.prets.count++;
      }
    }

    // Convertir en array et normaliser
    const groupedArray = Object.values(grouped).map(group => ({
      ...group,
      flux: normalizeFluxMontant(group.flux)
    }));

    return {
      data: groupedArray,
      total: flux.length
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
    const laverieRefId = await laverieReferenceService.getOrCreateLaverieRef(laverieId, 'ASSOCIE');

    const where = {
      laverieRefId,
      sourceApp: 'ASSOCIE',
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

    if (flux.sourceApp !== 'ASSOCIE') {
      throw new Error('Impossible de ' + action + ' ce flux');
    }

    // Vérifier que l'utilisateur est le créateur
    const userRefId = await userReferenceService.getOrCreateUserRef(userId, 'ASSOCIE');
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
   * @returns {Promise<Object>} Statistiques des flux financiers (tous types)
   */
  async getStatistics(laverieId, period = {}) {
    const dateRange = this._buildDateRange(period);

    // Construire les conditions de base
    const fluxWhere = {
      sourceApp: 'ASSOCIE',
      flagged: true
    };

    // Ajouter le filtre de laverie si fourni
    if (laverieId) {
      const laverieIdInt = Number.parseInt(laverieId, 10);
      const laverieRefId = await laverieReferenceService.getOrCreateLaverieRef(laverieIdInt, 'ASSOCIE');
      fluxWhere.laverieRefId = laverieRefId;
    }

    // Ajouter le filtre de date si présent
    if (dateRange) {
      fluxWhere.dateFluxFinancier = dateRange;
    }

    // Récupérer les données des flux financiers pour les 4 types
    const [depensesData, recettesData, empruntsData, pretsData] = await Promise.all([
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
      }),
      // Emprunts
      prismaShared.fluxFinancier.aggregate({
        where: { ...fluxWhere, type: 'emprunt' },
        _sum: { montant: true },
        _count: true
      }),
      // Prêts
      prismaShared.fluxFinancier.aggregate({
        where: { ...fluxWhere, type: 'pret' },
        _sum: { montant: true },
        _count: true
      })
    ]);

    // Calculer les totaux
    const depensesTotal = Number(depensesData._sum.montant || 0);
    const recettesTotal = Number(recettesData._sum.montant || 0);
    const empruntsTotal = Number(empruntsData._sum.montant || 0);
    const pretsTotal = Number(pretsData._sum.montant || 0);
    
    // Calcul du solde : recettes + emprunts - dépenses - prêts
    // (emprunt = argent reçu, prêt = argent donné)
    const solde = recettesTotal + empruntsTotal - depensesTotal - pretsTotal;

    return {
      depenses: {
        total: depensesTotal,
        count: depensesData._count
      },
      recettes: {
        total: recettesTotal,
        count: recettesData._count
      },
      emprunts: {
        total: empruntsTotal,
        count: empruntsData._count
      },
      prets: {
        total: pretsTotal,
        count: pretsData._count
      },
      solde,
      devise: 'FCFA'
    };
  }
}

module.exports = new FluxFinancierService();
