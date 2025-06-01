const prisma = require('../utils/prismaClient');
const logger = require('../utils/logger');
const { AppError } = require('../utils/errors');

/**
 * Rechercher des clients
 */
const searchClients = async (req, res, next) => {
  try {
    const { q } = req.query;

    if (!q || q.trim().length < 2) {
      return res.status(400).json({
        success: false,
        message: 'Le terme de recherche doit contenir au moins 2 caractères'
      });
    }

    const searchTerm = q.trim();

    // Recherche dans la table User avec le rôle Client
    const clients = await prisma.user.findMany({
      where: {
        role: 'Client',
        OR: [
          { nom: { contains: searchTerm } },
          { prenom: { contains: searchTerm } },
          { telephone: { contains: searchTerm } }
        ]
      },
      select: {
        id: true,
        nom: true,
        prenom: true,
        email: true,
        telephone: true,
        adresseText: true,
        typeClient: true,
        estEtudiant: true,
        latitude: true,
        longitude: true,
        fidelite: {
          select: {
            nombreLavageTotal: true,
            poidsTotalLaveKg: true,
            lavagesGratuits6kgRestants: true
          }
        },
        abonnementsPremium: {
          where: {
            AND: [
              {
                createdAt: {
                  lte: new Date()
                }
              },
              {
                updatedAt: {
                  gte: new Date()
                }
              }
            ]
          },
          select: {
            createdAt: true,
            updatedAt: true,
            id: true
          },
          take: 1,
          orderBy: {
            updatedAt: 'desc'
          }
        }
      },
      take: 10
    });

    // Transformer les données pour correspondre à l'interface Client
    const transformedClients = clients.map(client => ({
      id: client.id,
      nom: client.nom,
      prenom: client.prenom,
      email: client.email,
      telephone: client.telephone,
      adresseText: client.adresseText,
      typeClient: client.typeClient,
      estEtudiant: client.estEtudiant,
      coordonnees: client.latitude && client.longitude ? {
        latitude: client.latitude,
        longitude: client.longitude
      } : undefined,
      fidelite: client.fidelite
    }));

    res.status(200).json({
      success: true,
      data: transformedClients
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Obtenir les détails d'un client
 */
const getClientDetails = async (req, res, next) => {
  try {
    const { id } = req.params;
    const clientId = Number(id);

    const client = await prisma.user.findUnique({
      where: {
        id: clientId,
        role: 'Client'
      },
      select: {
        id: true,
        nom: true,
        prenom: true,
        email: true,
        telephone: true,
        adresseText: true,
        typeClient: true,
        estEtudiant: true,
        latitude: true,
        longitude: true,
        fidelite: {
          select: {
            nombreLavageTotal: true,
            poidsTotalLaveKg: true,
            lavagesGratuits6kgRestants: true
          }
        },
        abonnementsPremium: {
          where: {
            AND: [
              {
                createdAt: {
                  lte: new Date()
                }
              },
              {
                updatedAt: {
                  gte: new Date()
                }
              }
            ]
          },
          select: {
            createdAt: true,
            updatedAt: true,
            id: true
          },
          take: 1,
          orderBy: {
            updatedAt: 'desc'
          }
        }
      }
    });

    if (!client) {
      throw new AppError('Client non trouvé', 404);
    }

    // Transformer les données pour correspondre à l'interface Client
    const transformedClient = {
      id: client.id,
      nom: client.nom,
      prenom: client.prenom,
      email: client.email,
      telephone: client.telephone,
      adresseText: client.adresseText,
      typeClient: client.typeClient,
      estEtudiant: client.estEtudiant,
      coordonnees: client.latitude && client.longitude ? {
        latitude: client.latitude,
        longitude: client.longitude
      } : undefined,
      fidelite: client.fidelite
    };

    res.status(200).json({
      success: true,
      data: transformedClient
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Créer un client invité
 */
const createGuestClient = async (req, res, next) => {
  try {
    const { nom, prenom, telephone, email, adresseText } = req.body;

    // Validation de base
    if (!nom || !prenom || !telephone) {
      throw new AppError('Nom, prénom et téléphone sont requis', 400);
    }

    // Créer le client invité
    const clientInvite = await prisma.clientInvite.create({
      data: {
        nom,
        prenom,
        telephone,
        email,
        adresseText
      }
    });

    res.status(201).json({
      success: true,
      data: {
        id: clientInvite.id,
        ...clientInvite
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Créer un nouveau compte client
 */
const createClientAccount = async (req, res, next) => {
  try {
    const { nom, prenom, telephone, email, adresseText } = req.body;

    // Validation de base
    if (!nom || !prenom || !telephone) {
      throw new AppError('Nom, prénom et téléphone sont requis', 400);
    }

    // Vérifier si le téléphone est déjà utilisé
    const existingUser = await prisma.user.findFirst({
      where: {
        telephone
      }
    });

    if (existingUser) {
      throw new AppError('Ce numéro de téléphone est déjà utilisé', 400);
    }

    // Créer le compte client
    const client = await prisma.user.create({
      data: {
        nom,
        prenom,
        telephone,
        email,
        adresseText,
        role: 'Client',
        typeClient: 'Standard',
        estEtudiant: false,
        fidelite: {
          create: {
            nombreLavageTotal: 0,
            poidsTotalLaveKg: 0,
            lavagesGratuits6kgRestants: 0
          }
        }
      }
    });

    res.status(201).json({
      success: true,
      data: {
        id: client.id,
        nom: client.nom,
        prenom: client.prenom,
        telephone: client.telephone,
        email: client.email,
        adresseText: client.adresseText,
        typeClient: client.typeClient,
        estEtudiant: client.estEtudiant
      }
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  searchClients,
  getClientDetails,
  createGuestClient,
  createClientAccount
}; 