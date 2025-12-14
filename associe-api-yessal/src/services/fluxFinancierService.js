const fluxFinancierService = require("../utils/prismaSharedClient");
const prisma = require("../utils/prismaClient");
const userReferenceService = require("./userReferenceService");
const laverieReferenceService = require("./laverieReferenceService");
const comptabiliteService = require("./comptabiliteService");

/**
 * Convertir les montants Decimal de Prisma en nombres
 * @param {Object} flux - Flux financier ou tableau de flux
 * @returns {Object} Flux avec montant converti en nombre
 */
const normalizeFluxMontant = (flux) => {
  if (!flux) return flux;

  // Si c'est un tableau
  if (Array.isArray(flux)) {
    return flux.map((f) => normalizeFluxMontant(f));
  }

  // Si c'est un objet flux
  return {
    ...flux,
    montant: flux.montant ? Number(flux.montant) : flux.montant,
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
      dateEcheance,
    } = fluxData;

    const baseData = {
      type,
      montant,
      dateFluxFinancier: new Date(dateFluxFinancier),
      devise: fluxData.devise || "FCFA",
      motif,
      beneficiaire,
      sourceFinancement,
      description,
      laverieRefId,
      createdByRefId: userRefId,
      sourceApp: "ASSOCIE",
      status: "pending",
    };

    // Ajouter les champs spécifiques aux apports/retraits
    if (type === "apport" || type === "retrait") {
      if (actionnaire) baseData.actionnaire = actionnaire;
      if (dateEcheance) baseData.dateEcheance = new Date(dateEcheance);
    }

    return baseData;
  }

  /**
   * Créer un nouveau flux financier (tous types: depense, recette, apport, retrait)
   * @param {Object} fluxData - Données du flux financier
   * @returns {Promise<Object>} Le flux créé
   */
  async createFlux(fluxData) {
    const { preuves, laverieId, createdBy, type } = fluxData;

    // Validation: type doit être valide
    if (!["depense", "recette", "apport", "retrait"].includes(type)) {
      throw new Error(
        'Le type de flux doit être "depense", "recette", "apport" ou "retrait"'
      );
    }

    // Obtenir ou créer la référence utilisateur
    const userRefId = await userReferenceService.getOrCreateUserRef(
      createdBy,
      "ASSOCIE"
    );

    // Obtenir ou créer la référence laverie si laverieId est fourni
    const laverieRefId = laverieId
      ? await laverieReferenceService.getOrCreateLaverieRef(
          laverieId,
          "MANAGER"
        )
      : null;

    // Préparer les données du flux
    const fluxBaseData = this._prepareFluxData(
      fluxData,
      userRefId,
      laverieRefId
    );

    // Créer le flux financier dans la base partagée
    const flux = await prismaShared.fluxFinancier.create({
      data: {
        ...fluxBaseData,
        // Créer les preuves si présentes
        preuves:
          preuves && preuves.length > 0
            ? {
                create: preuves.map((preuve) => ({
                  fileId: preuve.fileId,
                  filename: preuve.filename,
                  downloadUrl: preuve.downloadUrl,
                  mimetype: preuve.mimetype,
                  size: preuve.size,
                })),
              }
            : undefined,
      },
      include: {
        preuves: true,
        createdByRef: true,
        validatedByRef: true,
        laverieRef: true,
      },
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
      laverieRef: true,
    };
  }

  /**
   * Obtenir un flux financier par ID
   * @param {number} id - ID du flux
   * @returns {Promise<Object|null>} Le flux trouvé
   */
  async getFluxById(id) {
    if (!id || typeof id !== "number" || Number.isNaN(id)) {
      throw new Error("ID du flux invalide");
    }

    const flux = await prismaShared.fluxFinancier.findUnique({
      where: { id },
      include: this._getFluxIncludes(),
    });

    return normalizeFluxMontant(flux);
  }

  /**
   * Construire les conditions de requête pour getAllFlux
   * @param {Object} filters - Filtres
   * @returns {Object} Conditions where de Prisma
   */
  _buildFluxWhereConditions(filters) {
    const { type, startDate, endDate, month, year, status, sourceApp } =
      filters;

    const where = {};

    // Filtrer par type (tous les types possibles pour associé)
    if (type && ["depense", "recette", "apport", "retrait"].includes(type)) {
      where.type = type;
    }

    // Filtrer par sourceApp (voir flux manager + associé)
    if (sourceApp && ["MANAGER", "ASSOCIE"].includes(sourceApp)) {
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
    const {
      laverieIds,
      page = 1,
      limit = 20,
      groupByLaverie = false,
    } = filters;

    // Construire les conditions de base
    const where = {
      flagged: true,
      ...this._buildFluxWhereConditions(filters),
    };

    // Filtrer par laveries spécifiques si fourni (array de IDs)
    if (laverieIds && Array.isArray(laverieIds) && laverieIds.length > 0) {
      const laverieRefIds = await Promise.all(
        laverieIds.map((id) =>
          laverieReferenceService.getOrCreateLaverieRef(
            Number.parseInt(id, 10),
            "MANAGER"
          )
        )
      );
      where.OR = [{ laverieRefId: { in: laverieRefIds } }];
    }

    // Mode simple: liste triée par date
    if (!groupByLaverie) {
      const skip = (page - 1) * limit;

      const [flux, total] = await Promise.all([
        prismaShared.fluxFinancier.findMany({
          where,
          orderBy: { dateFluxFinancier: "desc" },
          skip,
          take: Number.parseInt(limit, 10),
          include: this._getFluxIncludes(),
        }),
        prismaShared.fluxFinancier.count({ where }),
      ]);

      return {
        data: normalizeFluxMontant(flux),
        pagination: {
          total,
          page: Number.parseInt(page, 10),
          limit: Number.parseInt(limit, 10),
          totalPages: Math.ceil(total / limit),
        },
      };
    }

    // Mode groupé: regrouper par laverie
    const flux = await prismaShared.fluxFinancier.findMany({
      where,
      orderBy: { dateFluxFinancier: "desc" },
      include: this._getFluxIncludes(),
    });

    // Grouper les flux par laverie
    const grouped = {};

    for (const f of flux) {
      const key = f.laverieRefId || "entreprise"; // null = entreprise

      if (!grouped[key]) {
        grouped[key] = {
          laverieRefId: f.laverieRefId,
          laverieRef: f.laverieRef,
          flux: [],
          stats: {
            depenses: { total: 0, count: 0 },
            recettes: { total: 0, count: 0 },
            apports: { total: 0, count: 0 },
            retraits: { total: 0, count: 0 },
          },
        };
      }

      grouped[key].flux.push(f);

      // Calculer les stats par laverie
      const montant = Number(f.montant);
      if (f.type === "depense") {
        grouped[key].stats.depenses.total += montant;
        grouped[key].stats.depenses.count++;
      } else if (f.type === "recette") {
        grouped[key].stats.recettes.total += montant;
        grouped[key].stats.recettes.count++;
      } else if (f.type === "apport") {
        grouped[key].stats.apports.total += montant;
        grouped[key].stats.apports.count++;
      } else if (f.type === "retrait") {
        grouped[key].stats.retraits.total += montant;
        grouped[key].stats.retraits.count++;
      }
    }

    // Convertir en array et normaliser
    const groupedArray = Object.values(grouped).map((group) => ({
      ...group,
      flux: normalizeFluxMontant(group.flux),
    }));

    return {
      data: groupedArray,
      total: flux.length,
    };
  }

  /**
   * Obtenir les flux par laverie
   * @param {number} laverieId - ID de la laverie
   * @param {Object} options - Options de pagination
   * @returns {Promise<Object>} Flux et métadonnées
   */
  async getFluxByLaverie(laverieId, options = {}) {
    const {
      page = 1,
      limit = 20,
      startDate,
      endDate,
      month,
      year,
      type,
    } = options;

    // Obtenir la référence de laverie
    const laverieRefId = await laverieReferenceService.getOrCreateLaverieRef(
      laverieId,
      "MANAGER"
    );

    const where = {
      laverieRefId,
      sourceApp: "MANAGER",
      flagged: true,
    };

    if (type && ["depense", "recette"].includes(type)) {
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
        orderBy: { dateFluxFinancier: "desc" },
        skip,
        take: Number.parseInt(limit, 10),
        include: this._getFluxIncludes(),
      }),
      prismaShared.fluxFinancier.count({ where }),
    ]);

    return {
      data: normalizeFluxMontant(flux),
      pagination: {
        total,
        page: Number.parseInt(page, 10),
        limit: Number.parseInt(limit, 10),
        totalPages: Math.ceil(total / limit),
      },
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
      throw new Error("Flux financier non trouvé");
    }

    // Récupérer l'email de l'utilisateur local (si possible)
    let localEmail = null;
    try {
      const localUser = await prisma.user.findUnique({
        where: { id: userId },
        select: { email: true },
      });
      if (localUser && localUser.email) localEmail = localUser.email;
    } catch (err) {
      // Could not retrieve local user email; log and continue with fallback
      console.warn(
        "Unable to lookup local user email for permission check:",
        err && err.message ? err.message : err
      );
    }

    // Récupérer la référence de créateur du flux
    const creatorRef = flux.createdByRefId
      ? await prismaShared.userReference.findUnique({
          where: { id: flux.createdByRefId },
        })
      : null;
    // Comparaison par email si disponible (permet de reconnaître le même utilisateur présent dans les deux apps)
    if (
      localEmail &&
      creatorRef &&
      creatorRef.email &&
      localEmail.toLowerCase() === creatorRef.email.toLowerCase()
    ) {
      // OK : même email -> autorisé
    } else {
      // Fallback : comparer par userRef id en convertissant l'utilisateur courant
      const userRefId = await userReferenceService.getOrCreateUserRef(
        userId,
        "ASSOCIE"
      );
      if (!creatorRef || creatorRef.id !== userRefId) {
        throw new Error("Seul le créateur peut " + action + " ce flux");
      }
    }

    if (flux.status !== "pending") {
      throw new Error(
        "Impossible de " + action + " un flux déjà validé ou rejeté"
      );
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
      where: { id },
    });

    await this._checkFluxPermissions(flux, userId, "modifier");

    const allowedFields = [
      "montant",
      "dateFluxFinancier",
      "motif",
      "beneficiaire",
      "sourceFinancement",
      "description",
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
      include: this._getFluxIncludes(),
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
      where: { id: fluxId },
    });

    await this._checkFluxPermissions(flux, userId, "ajouter une preuve à");

    const preuve = await prismaShared.fluxFinancierPreuve.create({
      data: {
        fluxFinancierId: fluxId,
        fileId: preuveData.fileId,
        filename: preuveData.filename,
        downloadUrl: preuveData.downloadUrl,
        mimetype: preuveData.mimetype,
        size: preuveData.size,
      },
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
            preuves: true, // Inclure toutes les preuves pour compter
          },
        },
      },
    });

    if (!preuve) {
      throw new Error("Preuve non trouvée");
    }

    await this._checkFluxPermissions(
      preuve.fluxFinancier,
      userId,
      "supprimer une preuve de"
    );

    // Vérifier qu'il reste au moins 2 preuves (après suppression il en restera 1)
    const preuvesCount = preuve.fluxFinancier.preuves.length;
    if (preuvesCount <= 1) {
      throw new Error(
        "Impossible de supprimer la dernière preuve. Au moins une preuve est obligatoire."
      );
    }

    // Supprimer la référence de la preuve en base de données
    await prismaShared.fluxFinancierPreuve.delete({
      where: { id: preuveId },
    });

    // Retourner les infos de la preuve pour que le frontend puisse supprimer le fichier
    return {
      id: preuve.id,
      fileId: preuve.fileId,
      filename: preuve.filename,
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
        preuves: true, // Inclure les preuves pour récupérer les fileIds
      },
    });

    await this._checkFluxPermissions(flux, userId, "supprimer");

    // Récupérer les fileIds avant de supprimer les preuves
    const fileIds = flux.preuves.map((preuve) => preuve.fileId);

    // Supprimer toutes les preuves associées
    if (flux.preuves.length > 0) {
      await prismaShared.fluxFinancierPreuve.deleteMany({
        where: { fluxFinancierId: id },
      });
    }

    // Marquer le flux comme flagged (soft delete)
    const deletedFlux = await prismaShared.fluxFinancier.update({
      where: { id },
      data: { flagged: false },
    });

    return {
      flux: normalizeFluxMontant(deletedFlux),
      fileIds, // Retourner les fileIds pour que le frontend puisse les supprimer
      preuvesCount: fileIds.length,
    };
  }

  /**
   * Valider un flux financier (ASSOCIE only)
   * Conditions:
   * - Au moins une preuve
   * - Le validateur ne doit pas être le créateur
   * - Mise à jour du solde lors de la validation
   */
  async validateFlux(id, userId) {
    const flux = await prismaShared.fluxFinancier.findUnique({
      where: { id },
      include: { preuves: true, createdByRef: true },
    });

    if (!flux) throw new Error("Flux financier non trouvé");

    if (!flux.preuves || flux.preuves.length === 0) {
      throw new Error("Impossible de valider un flux sans preuve");
    }

    if (flux.status !== "pending") {
      throw new Error("Impossible de valider un flux déjà validé ou rejeté");
    }

    // Récupérer la référence utilisateur du validateur (créera ou récupèrera en preferant l'email)
    const validatorRefId = await userReferenceService.getOrCreateUserRef(
      userId,
      "ASSOCIE"
    );

    // Vérifier que le validateur n'est pas le créateur
    if (flux.createdByRefId === validatorRefId) {
      throw new Error(
        "Un utilisateur ne peut pas valider un flux qu'il a créé"
      );
    }

    // Récupérer l'email du créateur pour mettre à jour son solde
    const creatorEmail = flux.createdByRef?.email;
    if (!creatorEmail) {
      throw new Error("Email du créateur non trouvé");
    }

    // Trouver l'utilisateur créateur dans la base locale par email
    const creator = await prisma.user.findUnique({
      where: { email: creatorEmail },
    });

    if (creator) {
      // Vérifier le solde pour les retraits avant validation
      const montant = Number(flux.montant);
      if (flux.type === "retrait") {
        const soldeActuel = Number(creator.solde);

        if (soldeActuel < montant) {
          throw new Error(
            `Solde insuffisant pour valider ce retrait. Solde actuel: ${soldeActuel} FCFA, Montant du retrait: ${montant} FCFA`
          );
        }
      }
      // Mettre à jour le solde du créateur après validation
      if (flux.type === "apport" && flux.sourceFinancement === "propre") {
        // Incrémenter le solde lors d'un apport en fonds propres validé
        await prisma.user.update({
          where: { id: creator.id },
          data: {
            solde: {
              increment: montant,
            },
          },
        });
      } else if (flux.type === "retrait") {
        // Décrémenter le solde lors d'un retrait validé
        await prisma.user.update({
          where: { id: creator.id },
          data: {
            solde: {
              decrement: montant,
            },
          },
        });
      }
    }

    // Valider le flux
    const updated = await prismaShared.fluxFinancier.update({
      where: { id },
      data: {
        status: "validated",
        validatedByRefId: validatorRefId,
        validatedAt: new Date(),
      },
      include: {
        preuves: true,
        createdByRef: true,
        validatedByRef: true,
        laverieRef: true,
      },
    });

    // Déclencher la mise à jour comptable automatique
    try {
      await comptabiliteService.onFluxValide(id);
    } catch (error) {
      console.error('Erreur lors de la mise à jour comptable:', error);
      // Ne pas bloquer la validation du flux si la mise à jour comptable échoue
    }

    return normalizeFluxMontant(updated);
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
      const [yearStr, monthStr] = month.split("-");
      const monthStart = new Date(
        Number.parseInt(yearStr),
        Number.parseInt(monthStr) - 1,
        1
      );
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
      sourceApp: "ASSOCIE",
      flagged: true,
    };

    // Ajouter le filtre de laverie si fourni
    if (laverieId) {
      const laverieIdInt = Number.parseInt(laverieId, 10);
      const laverieRefId = await laverieReferenceService.getOrCreateLaverieRef(
        laverieIdInt,
        "MANAGER"
      );
      fluxWhere.laverieRefId = laverieRefId;
    }

    // Ajouter le filtre de date si présent
    if (dateRange) {
      fluxWhere.dateFluxFinancier = dateRange;
    }

    // Ajouter le filtre de statut si présent
    if (period.status) {
      fluxWhere.status = period.status;
    }

    // Récupérer les données des flux financiers pour les 4 types
    const [depensesData, recettesData, apportsData, retraitsData] =
      await Promise.all([
        // Dépenses
        prismaShared.fluxFinancier.aggregate({
          where: { ...fluxWhere, type: "depense" },
          _sum: { montant: true },
          _count: true,
        }),
        // Recettes
        prismaShared.fluxFinancier.aggregate({
          where: { ...fluxWhere, type: "recette" },
          _sum: { montant: true },
          _count: true,
        }),
        // Apports
        prismaShared.fluxFinancier.aggregate({
          where: { ...fluxWhere, type: "apport" },
          _sum: { montant: true },
          _count: true,
        }),
        // Retraits
        prismaShared.fluxFinancier.aggregate({
          where: { ...fluxWhere, type: "retrait" },
          _sum: { montant: true },
          _count: true,
        }),
      ]);

    // Calculer les totaux
    const depensesTotal = Number(depensesData._sum.montant || 0);
    const recettesTotal = Number(recettesData._sum.montant || 0);
    const apportsTotal = Number(apportsData._sum.montant || 0);
    const retraitsTotal = Number(retraitsData._sum.montant || 0);

    // Calcul du solde : recettes + apports - dépenses - retraits
    // (apport = argent reçu, retrait = argent donné)
    const solde = recettesTotal + apportsTotal - depensesTotal - retraitsTotal;

    return {
      depenses: {
        total: depensesTotal,
        count: depensesData._count,
      },
      recettes: {
        total: recettesTotal,
        count: recettesData._count,
      },
      apports: {
        total: apportsTotal,
        count: apportsData._count,
      },
      retraits: {
        total: retraitsTotal,
        count: retraitsData._count,
      },
      solde,
      devise: "FCFA",
    };
  }
}

module.exports = new FluxFinancierService();
