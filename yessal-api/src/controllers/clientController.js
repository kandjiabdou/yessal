const prisma = require('../utils/prismaClient');
const logger = require('../utils/logger');
const { AppError } = require('../utils/errors');
const { validerFormatNumeroCarte } = require('../utils/fideliteUtils');
const fideliteService = require('../services/fideliteService');

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
    let clients = [];

    // Vérifier si le terme de recherche correspond au format d'un numéro de carte de fidélité
    const isLoyaltyCardFormat = validerFormatNumeroCarte(searchTerm);

    if (isLoyaltyCardFormat) {
      // Recherche spécifique par numéro de carte de fidélité
      const loyaltyClient = await prisma.fidelite.findUnique({
        where: {
          numeroCarteFidelite: searchTerm
        },
        include: {
          clientUser: {
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
          }
        }
      });

      if (loyaltyClient) {
        clients = [{
          ...loyaltyClient.clientUser,
          fidelite: {
            numeroCarteFidelite: loyaltyClient.numeroCarteFidelite,
            nombreLavageTotal: loyaltyClient.nombreLavageTotal,
            poidsTotalLaveKg: loyaltyClient.poidsTotalLaveKg,
            lavagesGratuits6kgRestants: loyaltyClient.lavagesGratuits6kgRestants,
            lavagesGratuits20kgRestants: loyaltyClient.lavagesGratuits20kgRestants
          }
        }];
      }
    } else {
      // Recherche générale dans les informations client + numéro de carte partiel
      clients = await prisma.user.findMany({
        where: {
          role: 'Client',
          OR: [
            { nom: { contains: searchTerm } },
            { prenom: { contains: searchTerm } },
            { telephone: { contains: searchTerm } },
            { email: { contains: searchTerm } },
            {
              fidelite: {
                numeroCarteFidelite: {
                  contains: searchTerm
                }
              }
            }
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
              numeroCarteFidelite: true,
              nombreLavageTotal: true,
              poidsTotalLaveKg: true,
              lavagesGratuits6kgRestants: true,
              lavagesGratuits20kgRestants: true
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
        take: 10,
        orderBy: [
          { nom: 'asc' },
          { prenom: 'asc' }
        ]
      });
    }

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
      data: transformedClients,
      searchInfo: {
        term: searchTerm,
        isLoyaltyCardSearch: isLoyaltyCardFormat,
        totalResults: transformedClients.length
      }
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
            numeroCarteFidelite: true,
            nombreLavageTotal: true,
            poidsTotalLaveKg: true,
            lavagesGratuits6kgRestants: true,
            lavagesGratuits20kgRestants: true
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

    // Nettoyer l'email (null si vide)
    const cleanEmail = email && email.trim() !== '' ? email.trim() : null;

    // Vérifier si le téléphone est déjà utilisé
    const existingUserByPhone = await prisma.user.findFirst({
      where: {
        telephone
      }
    });

    if (existingUserByPhone) {
      throw new AppError('Ce numéro de téléphone est déjà utilisé', 400);
    }

    // Vérifier si l'email est déjà utilisé (seulement s'il est fourni)
    if (cleanEmail) {
      const existingUserByEmail = await prisma.user.findFirst({
        where: {
          email: cleanEmail
        }
      });

      if (existingUserByEmail) {
        throw new AppError('Cette adresse email est déjà utilisée', 400);
      }
    }

    // Créer le compte client
    const client = await prisma.user.create({
      data: {
        nom,
        prenom,
        telephone,
        email: cleanEmail,
        adresseText: adresseText && adresseText.trim() !== '' ? adresseText.trim() : null,
        role: 'Client',
        typeClient: 'Standard',
        estEtudiant: false
      }
    });

    // Initialiser la fidélité avec numéro de carte automatique
    await fideliteService.initializeClientFidelite(client.id);

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

/**
 * Vérifier l'existence d'un client par téléphone ou email
 */
const checkClientExists = async (req, res, next) => {
  try {
    const { telephone, email } = req.body;

    // Nettoyer les champs vides
    const cleanTelephone = telephone && telephone.trim() !== '' ? telephone.trim() : null;
    const cleanEmail = email && email.trim() !== '' ? email.trim() : null;

    // Validation : au moins un critère requis
    if (!cleanTelephone && !cleanEmail) {
      return res.status(400).json({
        exists: false,
        message: 'Téléphone ou email requis pour la vérification'
      });
    }

    // Construire la condition de recherche
    const whereCondition = {
      role: 'Client',
      OR: []
    };

    if (cleanTelephone) {
      whereCondition.OR.push({ telephone: cleanTelephone });
    }

    if (cleanEmail) {
      whereCondition.OR.push({ email: cleanEmail });
    }

    // Rechercher le client existant
    const existingClient = await prisma.user.findFirst({
      where: whereCondition,
      select: {
        id: true,
        nom: true,
        prenom: true,
        telephone: true,
        email: true
      }
    });

    if (existingClient) {
      // Déterminer le critère qui correspond
      let matchedField = '';
      if (cleanTelephone && existingClient.telephone === cleanTelephone) {
        matchedField = 'téléphone';
      } else if (cleanEmail && existingClient.email === cleanEmail) {
        matchedField = 'email';
      }

      return res.status(200).json({
        exists: true,
        message: `Un client avec ce ${matchedField} existe déjà`,
        client: existingClient
      });
    }

    res.status(200).json({
      exists: false,
      message: 'Aucun client trouvé avec ces informations'
    });

  } catch (error) {
    next(error);
  }
};

module.exports = {
  searchClients,
  getClientDetails,
  createGuestClient,
  createClientAccount,
  checkClientExists
}; 