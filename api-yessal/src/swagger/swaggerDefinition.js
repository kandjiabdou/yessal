const config = require('../config/config');

// Swagger definition
const swaggerDefinition = {
  openapi: '3.0.0',
  info: {
    title: 'Yessal Laundry API',
    version: '1.0.0',
    description: 'API documentation for Yessal Laundry Service',
    license: {
      name: 'Private',
      url: 'https://yessal-laundry.com',
    },
    contact: {
      name: 'API Support',
      url: 'https://yessal-laundry.com/support',
      email: 'support@yessal-laundry.com',
    },
  },
  servers: [
    {
      url: `http://localhost:${config.port}`,
      description: 'Development server',
    },
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
      },
    },
    schemas: {
      UserCreate: {
        type: 'object',
        required: ['role', 'nom', 'prenom', 'password'],
        properties: {
          role: {
            type: 'string',
            enum: ['Client', 'Manager'],
            description: 'User role',
          },
          nom: {
            type: 'string',
            description: 'User last name',
          },
          prenom: {
            type: 'string',
            description: 'User first name',
          },
          email: {
            type: 'string',
            format: 'email',
            description: 'User email (unique)',
          },
          telephone: {
            type: 'string',
            description: 'User phone number (unique)',
          },
          password: {
            type: 'string',
            format: 'password',
            minLength: 6,
            description: 'User password',
          },
          adresseText: {
            type: 'string',
            description: 'User address',
          },
          latitude: {
            type: 'number',
            description: 'User address latitude',
          },
          longitude: {
            type: 'number',
            description: 'User address longitude',
          },
          typeClient: {
            type: 'string',
            enum: ['Standard', 'Premium'],
            description: 'Client type (only for Client role)',
          },
          siteLavagePrincipalGerantId: {
            type: 'integer',
            description: 'Primary laundry site ID (only for Manager role)',
          },
        },
      },
      UserUpdate: {
        type: 'object',
        properties: {
          nom: {
            type: 'string',
            description: 'User last name',
          },
          prenom: {
            type: 'string',
            description: 'User first name',
          },
          email: {
            type: 'string',
            format: 'email',
            description: 'User email (unique)',
          },
          telephone: {
            type: 'string',
            description: 'User phone number (unique)',
          },
          adresseText: {
            type: 'string',
            description: 'User address',
          },
          latitude: {
            type: 'number',
            description: 'User address latitude',
          },
          longitude: {
            type: 'number',
            description: 'User address longitude',
          },
          aGeolocalisationEnregistree: {
            type: 'boolean',
            description: 'Whether user has saved geolocation',
          },
          typeClient: {
            type: 'string',
            enum: ['Standard', 'Premium', 'Etudiant'],
            description: 'Client type (only for Client role, can only be updated by Manager)',
          },
          siteLavagePrincipalGerantId: {
            type: 'integer',
            description: 'Primary laundry site ID (only for Manager role, can only be updated by Manager)',
          },
        },
      },
      Login: {
        type: 'object',
        properties: {
          email: {
            type: 'string',
            format: 'email',
            description: 'User email',
          },
          telephone: {
            type: 'string',
            description: 'User phone number',
          },
          password: {
            type: 'string',
            format: 'password',
            description: 'User password',
          },
        },
        oneOf: [
          { required: ['email', 'password'] },
          { required: ['telephone', 'password'] }
        ],
      },
      GoogleLogin: {
        type: 'object',
        required: ['googleToken'],
        properties: {
          googleToken: {
            type: 'string',
            description: 'Google OAuth ID token',
          },
        },
      },
      OrderCreate: {
        type: 'object',
        required: ['siteLavageId', 'masseClientIndicativeKg', 'formuleCommande'],
        properties: {
          clientUserId: {
            type: 'integer',
            description: 'Client user ID (if order is for a registered client)',
          },
          clientInvite: {
            type: 'object',
            description: 'Guest client information (if order is not for a registered client)',
            properties: {
              nom: {
                type: 'string',
                description: 'Guest client name',
              },
              telephone: {
                type: 'string',
                description: 'Guest client phone number',
              },
              email: {
                type: 'string',
                description: 'Guest client email',
              },
            },
          },
          siteLavageId: {
            type: 'integer',
            description: 'Laundry site ID',
          },
          estEnLivraison: {
            type: 'boolean',
            default: false,
            description: 'Whether the order includes delivery',
          },
          adresseLivraison: {
            type: 'object',
            description: 'Delivery address (required if estEnLivraison is true)',
            properties: {
              adresseText: {
                type: 'string',
                description: 'Delivery address text',
              },
              latitude: {
                type: 'number',
                description: 'Delivery address latitude',
              },
              longitude: {
                type: 'number',
                description: 'Delivery address longitude',
              },
            },
          },
          masseClientIndicativeKg: {
            type: 'number',
            minimum: 6,
            description: 'Indicative weight in kg',
          },
          masseVerifieeKg: {
            type: 'number',
            minimum: 6,
            description: 'Verified weight in kg (typically set by manager)',
          },
          formuleCommande: {
            type: 'string',
            enum: ['Standard', 'Abonnement', 'AuKilo', 'Premium', 'Detail'],
            description: 'Order formula',
          },
          typeReduction: {
            type: 'string',
            enum: ['Ouverture', 'Etudiant'],
            description: 'Reduction type',
          },
          options: {
            type: 'object',
            properties: {
              aOptionRepassage: {
                type: 'boolean',
                default: false,
                description: 'Ironing option',
              },
              aOptionSechage: {
                type: 'boolean',
                default: false,
                description: 'Drying option',
              },
            },
          },
        },
      },
      OrderUpdate: {
        type: 'object',
        properties: {
          masseVerifieeKg: {
            type: 'number',
            minimum: 6,
            description: 'Verified weight in kg',
          },
          statut: {
            type: 'string',
            enum: ['PrisEnCharge', 'LavageEnCours', 'Repassage', 'Collecte', 'Livraison', 'Livre'],
            description: 'Order status',
          },
          livreurId: {
            type: 'integer',
            description: 'Delivery person ID',
          },
          gerantReceptionUserId: {
            type: 'integer',
            description: 'Receiving manager ID',
          },
          modePaiement: {
            type: 'string',
            enum: ['Espece', 'MobileMoney', 'Autre'],
            description: 'Payment method',
          },
          typeReduction: {
            type: 'string',
            enum: ['Ouverture', 'Etudiant'],
            description: 'Reduction type',
          },
          options: {
            type: 'object',
            properties: {
              aOptionRepassage: {
                type: 'boolean',
                description: 'Ironing option',
              },
              aOptionSechage: {
                type: 'boolean',
                description: 'Drying option',
              },
            },
          },
        },
      },
      SiteLavageCreate: {
        type: 'object',
        required: ['nom', 'adresseText', 'ville', 'latitude', 'longitude'],
        properties: {
          nom: {
            type: 'string',
            description: 'Laundry site name',
          },
          adresseText: {
            type: 'string',
            description: 'Laundry site address',
          },
          ville: {
            type: 'string',
            description: 'City where the laundry site is located',
          },
          latitude: {
            type: 'number',
            description: 'Laundry site latitude',
          },
          longitude: {
            type: 'number',
            description: 'Laundry site longitude',
          },
          telephone: {
            type: 'string',
            description: 'Laundry site phone number',
          },
          horaireOuverture: {
            type: 'string',
            description: 'Opening hours',
          },
          horaireFermeture: {
            type: 'string',
            description: 'Opening hours',
          },
          statutOuverture: {
            type: 'boolean',
            default: false,
            description: 'Whether the site is currently open',
          },
        },
      },
      SiteLavageUpdate: {
        type: 'object',
        properties: {
          nom: {
            type: 'string',
            description: 'Laundry site name',
          },
          adresseText: {
            type: 'string',
            description: 'Laundry site address',
          },
          ville: {
            type: 'string',
            description: 'City where the laundry site is located',
          },
          latitude: {
            type: 'number',
            description: 'Laundry site latitude',
          },
          longitude: {
            type: 'number',
            description: 'Laundry site longitude',
          },
          telephone: {
            type: 'string',
            description: 'Laundry site phone number',
          },
          horaireOuverture: {
            type: 'string',
            description: 'Opening hours',
          },
          horaireFermeture: {
            type: 'string',
            description: 'Opening hours',
          },
          statutOuverture: {
            type: 'boolean',
            description: 'Whether the site is currently open',
          },
        },
      },
      LivreurCreate: {
        type: 'object',
        required: ['nom', 'prenom'],
        properties: {
          nom: {
            type: 'string',
            description: 'Delivery person last name',
          },
          prenom: {
            type: 'string',
            description: 'Delivery person first name',
          },
          email: {
            type: 'string',
            format: 'email',
            description: 'Delivery person email',
          },
          telephone: {
            type: 'string',
            description: 'Delivery person phone number',
          },
          adresseText: {
            type: 'string',
            description: 'Delivery person address',
          },
          moyenLivraison: {
            type: 'string',
            description: 'Delivery method/vehicle',
          },
          statutDisponibilite: {
            type: 'boolean',
            default: true,
            description: 'Whether the delivery person is currently available',
          },
        },
      },
      LivreurUpdate: {
        type: 'object',
        properties: {
          nom: {
            type: 'string',
            description: 'Delivery person last name',
          },
          prenom: {
            type: 'string',
            description: 'Delivery person first name',
          },
          email: {
            type: 'string',
            format: 'email',
            description: 'Delivery person email',
          },
          telephone: {
            type: 'string',
            description: 'Delivery person phone number',
          },
          adresseText: {
            type: 'string',
            description: 'Delivery person address',
          },
          moyenLivraison: {
            type: 'string',
            description: 'Delivery method/vehicle',
          },
          statutDisponibilite: {
            type: 'boolean',
            description: 'Whether the delivery person is currently available',
          },
        },
      },
    },
    responses: {
      UnauthorizedError: {
        description: 'Access token is missing or invalid',
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                success: {
                  type: 'boolean',
                  example: false,
                },
                message: {
                  type: 'string',
                  example: 'Authentication required. No token provided.',
                },
              },
            },
          },
        },
      },
      ForbiddenError: {
        description: 'User does not have permission to perform this action',
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                success: {
                  type: 'boolean',
                  example: false,
                },
                message: {
                  type: 'string',
                  example: 'Access forbidden. You do not have permission to access this resource.',
                },
              },
            },
          },
        },
      },
      NotFoundError: {
        description: 'The requested resource was not found',
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                success: {
                  type: 'boolean',
                  example: false,
                },
                message: {
                  type: 'string',
                  example: 'Resource not found',
                },
              },
            },
          },
        },
      },
      ValidationError: {
        description: 'Validation failed',
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                success: {
                  type: 'boolean',
                  example: false,
                },
                message: {
                  type: 'string',
                  example: 'Validation failed',
                },
                errors: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      field: {
                        type: 'string',
                        example: 'email',
                      },
                      message: {
                        type: 'string',
                        example: 'must be a valid email',
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  },
  // Define security globally
  security: [
    {
      bearerAuth: [],
    },
  ],
};

module.exports = swaggerDefinition;
