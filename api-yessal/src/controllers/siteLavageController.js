const prisma = require("../utils/prismaClient");
const sessionService = require("../services/sessionService");

/**
 * Obtenir la liste des sites de lavage
 */
const getSites = async (req, res, next) => {
  try {
    const { ville, statutOuverture } = req.query;

    const where = {};
    if (ville) {
      where.ville = ville;
    }
    if (statutOuverture !== undefined) {
      where.statutOuverture = statutOuverture === "true";
    }

    const sites = await prisma.sitelavage.findMany({
      where,
      include: {
        machines: {
          select: {
            id: true,
            numero: true,
            type: true,
            poidsKg: true,
          },
        },
        _count: {
          select: {
            commandes: true,
          },
        },
      },
    });

    // Enrichir chaque site avec les informations de session
    const sitesWithSessionInfo = sites.map(site => {
      const activeManagers = sessionService.getActiveManagersOnSite(site.id);
      const shouldBeOpen = sessionService.shouldSiteBeOpen(site.id);
      
      return {
        ...site,
        sessionInfo: {
          activeManagersCount: activeManagers.length,
          activeManagerIds: activeManagers,
          shouldBeOpen,
          isStatusCorrect: site.statutOuverture === shouldBeOpen
        }
      };
    });

    res.status(200).json({
      success: true,
      data: sitesWithSessionInfo,
    });
  } catch (error) {
    console.log("Erreur lors de la récupération des sites:", error);
    next(error);
  }
};

/**
 * Obtenir un site par son ID
 */
const getSiteById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const site = await prisma.sitelavage.findUnique({
      where: { id: parseInt(id) },
      include: {
        machines: {
          select: {
            id: true,
            numero: true,
            type: true,
            poidsKg: true,
          },
        },
        gerants: {
          select: {
            id: true,
            nom: true,
            prenom: true,
            email: true,
            telephone: true,
          },
        },
        _count: {
          select: {
            commandes: true,
          },
        },
      },
    });

    if (!site) {
      return res.status(404).json({
        success: false,
        message: "Site non trouvé",
      });
    }

    // Ajouter les informations de session
    const activeManagers = sessionService.getActiveManagersOnSite(site.id);
    const shouldBeOpen = sessionService.shouldSiteBeOpen(site.id);

    const siteWithSessionInfo = {
      ...site,
      sessionInfo: {
        activeManagersCount: activeManagers.length,
        activeManagerIds: activeManagers,
        shouldBeOpen,
        isStatusCorrect: site.statutOuverture === shouldBeOpen
      }
    };

    res.status(200).json({
      success: true,
      data: siteWithSessionInfo,
    });
  } catch (error) {
    console.log("Erreur lors de la récupération du site:", error);
    next(error);
  }
};

/**
 * Créer un nouveau site
 */
const createSite = async (req, res, next) => {
  try {
    const {
      nom,
      adresseText,
      ville,
      latitude,
      longitude,
      telephone,
      heureOuverture,
      heureFermeture,
      statutOuverture,
    } = req.body;

    // Le statut d'ouverture initial est toujours false (aucun manager actif au début)
    const site = await prisma.sitelavage.create({
      data: {
        nom,
        adresseText,
        ville,
        latitude,
        longitude,
        telephone,
        heureOuverture,
        heureFermeture,
        statutOuverture: false, // Force à false indépendamment de l'input
      },
    });

    res.status(201).json({
      success: true,
      message: "Site créé avec succès",
      data: site,
    });
  } catch (error) {
    console.log("Erreur lors de la création du site:", error);
    next(error);
  }
};

/**
 * Mettre à jour un site
 * Note: Le statutOuverture est maintenant calculé automatiquement et ne peut plus être modifié manuellement
 */
const updateSite = async (req, res, next) => {
  try {
    const { id } = req.params;
    const {
      nom,
      adresseText,
      ville,
      latitude,
      longitude,
      telephone,
      heureOuverture,
      heureFermeture,
      // statutOuverture est ignoré - calculé automatiquement
    } = req.body;

    // Vérifier si le site existe
    const existingSite = await prisma.sitelavage.findUnique({
      where: { id: parseInt(id) },
    });

    if (!existingSite) {
      return res.status(404).json({
        success: false,
        message: "Site non trouvé",
      });
    }

    // Calculer le statut d'ouverture automatiquement
    const statutOuverture = sessionService.shouldSiteBeOpen(parseInt(id));

    const updatedSite = await prisma.sitelavage.update({
      where: { id: parseInt(id) },
      data: {
        nom,
        adresseText,
        ville,
        latitude,
        longitude,
        telephone,
        heureOuverture,
        heureFermeture,
        statutOuverture, // Calculé automatiquement
      },
    });

    // Ajouter les informations de session dans la réponse
    const activeManagers = sessionService.getActiveManagersOnSite(parseInt(id));

    res.status(200).json({
      success: true,
      message: "Site mis à jour avec succès",
      data: {
        ...updatedSite,
        sessionInfo: {
          activeManagersCount: activeManagers.length,
          activeManagerIds: activeManagers,
          shouldBeOpen: statutOuverture,
          isStatusCorrect: true // Toujours correct car calculé automatiquement
        }
      },
    });
  } catch (error) {
    console.log("Erreur lors de la mise à jour du site:", error);
    next(error);
  }
};

/**
 * Supprimer un site
 */
const deleteSite = async (req, res, next) => {
  try {
    const { id } = req.params;

    // Vérifier si le site existe
    const existingSite = await prisma.sitelavage.findUnique({
      where: { id: parseInt(id) },
    });

    if (!existingSite) {
      return res.status(404).json({
        success: false,
        message: "Site non trouvé",
      });
    }

    // Vérifier s'il y a des commandes liées à ce site
    const ordersCount = await prisma.commande.count({
      where: { siteLavageId: parseInt(id) },
    });

    if (ordersCount > 0) {
      return res.status(400).json({
        success: false,
        message:
          "Impossible de supprimer le site, il y a des commandes associées",
      });
    }

    // Supprimer toutes les machines liées au site
    await prisma.machinelavage.deleteMany({
      where: { siteLavageId: parseInt(id) },
      });

    // Supprimer le site
    await prisma.sitelavage.delete({
      where: { id: parseInt(id) },
    });

    res.status(200).json({
      success: true,
      message: "Site supprimé avec succès",
    });
  } catch (error) {
    console.log("Erreur lors de la suppression du site:", error);
    next(error);
  }
};

/**
 * Récupère le statut en temps réel de tous les sites avec les informations de session
 */
const getSitesRealtimeStatus = async (req, res, next) => {
  try {
    // Mettre à jour tous les statuts d'ouverture
    await sessionService.updateSiteStatuses();

    // Récupérer tous les sites avec leur statut mis à jour
    const sites = await prisma.sitelavage.findMany({
      select: {
        id: true,
        nom: true,
        adresseText: true,
        ville: true,
        statutOuverture: true,
        heureOuverture: true,
        heureFermeture: true,
      },
    });

    // Enrichir avec les informations de session
    const sitesWithSessionInfo = sites.map(site => {
      const activeManagers = sessionService.getActiveManagersOnSite(site.id);
      const shouldBeOpen = sessionService.shouldSiteBeOpen(site.id);
      
      return {
        ...site,
        sessionInfo: {
          activeManagersCount: activeManagers.length,
          activeManagerIds: activeManagers,
          shouldBeOpen,
          isStatusCorrect: site.statutOuverture === shouldBeOpen
        }
      };
    });

    res.status(200).json({
      success: true,
      message: "Statuts des sites mis à jour et récupérés avec succès",
      data: sitesWithSessionInfo,
    });
  } catch (error) {
    console.log("Erreur lors de la récupération du statut en temps réel:", error);
    next(error);
  }
};

/**
 * Force la mise à jour des statuts de tous les sites
 */
const forceUpdateSiteStatuses = async (req, res, next) => {
  try {
    await sessionService.updateSiteStatuses();

    res.status(200).json({
      success: true,
      message: "Statuts des sites mis à jour avec succès",
    });
  } catch (error) {
    console.log("Erreur lors de la mise à jour forcée des statuts:", error);
    next(error);
  }
};

/**
 * Obtenir les machines d'un site
 */
const getSiteMachines = async (req, res, next) => {
  try {
    const { id } = req.params;

    // Vérifier si le site existe
    const site = await prisma.sitelavage.findUnique({
      where: { id: parseInt(id) },
    });

    if (!site) {
      return res.status(404).json({
        success: false,
        message: "Site non trouvé",
      });
    }

    // Récupérer les machines du site
    const machines = await prisma.machinelavage.findMany({
      where: { siteLavageId: parseInt(id) },
      orderBy: { numero: "asc" },
    });

    res.status(200).json({
      success: true,
      data: machines,
    });
  } catch (error) {
    console.log("Erreur lors de la récupération des machines du site:", error);
    next(error);
  }
};

/**
 * Ajouter une machine à un site
 */
const addMachineToSite = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { numero, nom, type, poidsKg } = req.body;

    // Vérifier si le site existe
    const site = await prisma.sitelavage.findUnique({
      where: { id: parseInt(id) },
    });

    if (!site) {
      return res.status(404).json({
        success: false,
        message: "Site non trouvé",
      });
    }

    // Vérifier si le numéro est déjà utilisé dans ce site
    const existingMachine = await prisma.machinelavage.findFirst({
      where: {
        siteLavageId: parseInt(id),
        numero,
      },
    });

    if (existingMachine) {
      return res.status(409).json({
        success: false,
        message: "Une machine avec ce numéro existe déjà dans ce site",
      });
    }

    // Créer la nouvelle machine
    const machine = await prisma.machinelavage.create({
      data: {
        siteLavageId: parseInt(id),
        numero,
        nom,
        type,
        poidsKg,
      },
    });

    res.status(201).json({
      success: true,
      message: "Machine ajoutée avec succès",
      data: machine,
    });
  } catch (error) {
    console.log("Erreur lors de l'ajout de la machine:", error);
    next(error);
  }
};

/**
 * Mettre à jour une machine
 */
const updateMachine = async (req, res, next) => {
  try {
    const { siteId, machineId } = req.params;
    const { numero, nom, type, poidsKg } = req.body;

    // Vérifier si le site existe
    const site = await prisma.sitelavage.findUnique({
      where: { id: parseInt(siteId) },
    });

    if (!site) {
      return res.status(404).json({
        success: false,
        message: "Site non trouvé",
      });
    }

    // Vérifier si la machine existe
    const existingMachine = await prisma.machinelavage.findUnique({
      where: { id: parseInt(machineId) },
    });

    if (!existingMachine) {
      return res.status(404).json({
        success: false,
        message: "Machine non trouvée",
      });
    }

    // Vérifier si la machine appartient au site
    if (existingMachine.siteLavageId !== parseInt(siteId)) {
      return res.status(400).json({
        success: false,
        message: "Cette machine n'appartient pas à ce site",
      });
    }

    // Vérifier si le nouveau numéro n'est pas déjà utilisé
    if (numero && numero !== existingMachine.numero) {
      const duplicateNumber = await prisma.machinelavage.findFirst({
        where: {
          siteLavageId: parseInt(siteId),
          numero,
          id: { not: parseInt(machineId) },
        },
      });

      if (duplicateNumber) {
        return res.status(409).json({
          success: false,
          message: "Une machine avec ce numéro existe déjà dans ce site",
        });
      }
    }

    // Mettre à jour la machine
    const updatedMachine = await prisma.machinelavage.update({
      where: { id: parseInt(machineId) },
      data: {
        numero,
        nom,
        type,
        poidsKg,
      },
    });

    res.status(200).json({
      success: true,
      message: "Machine mise à jour avec succès",
      data: updatedMachine,
    });
  } catch (error) {
    console.log("Erreur lors de la mise à jour de la machine:", error);
    next(error);
  }
};

/**
 * Supprimer une machine
 */
const deleteMachine = async (req, res, next) => {
  try {
    const { siteId, machineId } = req.params;

    // Vérifier si le site existe
    const site = await prisma.sitelavage.findUnique({
      where: { id: parseInt(siteId) },
    });

    if (!site) {
      return res.status(404).json({
        success: false,
        message: "Site non trouvé",
      });
    }

    // Vérifier si la machine existe
    const machine = await prisma.machinelavage.findUnique({
      where: { id: parseInt(machineId) },
    });

    if (!machine) {
      return res.status(404).json({
        success: false,
        message: "Machine non trouvée",
      });
    }

    // Vérifier si la machine appartient au site
    if (machine.siteLavageId !== parseInt(siteId)) {
      return res.status(400).json({
        success: false,
        message: "Cette machine n'appartient pas à ce site",
      });
    }

    // Supprimer la machine
    await prisma.machinelavage.delete({
      where: { id: parseInt(machineId) },
    });

    res.status(200).json({
      success: true,
      message: "Machine supprimée avec succès",
    });
  } catch (error) {
    console.log("Erreur lors de la suppression de la machine:", error);
    next(error);
  }
};

/**
 * Trouver les sites les plus proches
 */
const findNearestSites = async (req, res, next) => {
  try {
    const { latitude, longitude, radius = 10, limit = 5 } = req.body;

    if (!latitude || !longitude) {
      return res.status(400).json({
        success: false,
        message: "La latitude et la longitude sont requises",
      });
    }

    // Convertir le rayon en degrés (approximatif)
    const radiusInDegrees = radius / 111.32; // 1 degré ≈ 111.32 km à l'équateur

    // Trouver les sites dans le rayon spécifié
    const sites = await prisma.sitelavage.findMany({
      where: {
        AND: [
          {
            latitude: {
              gte: latitude - radiusInDegrees,
              lte: latitude + radiusInDegrees,
            },
          },
          {
            longitude: {
              gte: longitude - radiusInDegrees,
              lte: longitude + radiusInDegrees,
            },
          },
        ],
      },
      include: {
        machines: {
          select: {
            id: true,
            numero: true,
            type: true,
            poidsKg: true,
          },
        },
      },
    });

    // Calculer la distance exacte et trier les sites
    const sitesWithDistance = sites.map((site) => {
      const distance = calculateDistance(
        latitude,
        longitude,
        site.latitude,
        site.longitude
      );
      return {
        ...site,
        distance,
      };
    });

    // Trier par distance et limiter le nombre de résultats
    const nearestSites = sitesWithDistance
      .sort((a, b) => a.distance - b.distance)
      .slice(0, limit);

    res.status(200).json({
      success: true,
      data: nearestSites,
    });
  } catch (error) {
    console.log(
      "Erreur lors de la recherche des sites les plus proches:",
      error
    );
    next(error);
  }
};

/**
 * Calculer la distance entre deux points en kilomètres
 * Utilise la formule de Haversine
 */
const calculateDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371; // Rayon de la Terre en km
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

const toRad = (value) => {
  return (value * Math.PI) / 180;
};

module.exports = {
  getSites,
  getSiteById,
  createSite,
  updateSite,
  deleteSite,
  getSitesRealtimeStatus,
  forceUpdateSiteStatuses,
  getSiteMachines,
  addMachineToSite,
  updateMachine,
  deleteMachine,
  findNearestSites,
};
