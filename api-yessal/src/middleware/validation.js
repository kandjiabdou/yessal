const Joi = require('joi');
const config = require('../config/config');

/**
 * Middleware for validating request data
 * @param {Joi.Schema} schema - Joi validation schema
 * @param {string} property - Request property to validate ('body', 'query', 'params')
 */
const validate = (schema, property = 'body') => {
  return (req, res, next) => {
    const { error } = schema.validate(req[property], { abortEarly: false });
    
    if (error) {
      const errors = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message
      }));
      
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors
      });
    }
    
    next();
  };
};

// Common validation schemas
const schemas = {
  // User related schemas
  userCreate: Joi.object({
    role: Joi.string().valid('Client', 'Manager').required(),
    nom: Joi.string().required(),
    prenom: Joi.string().required(),
    email: Joi.string().email().allow(null, ''),
    telephone: Joi.string().pattern(/^\d{9}$/).allow(null, ''),
    password: Joi.string().min(6).required(),
    adresseText: Joi.string().allow(null, ''),
    latitude: Joi.number().allow(null),
    longitude: Joi.number().allow(null),
    typeClient: Joi.string().valid('Standard', 'Premium').default('Standard'),
    estEtudiant: Joi.boolean().default(false),
    siteLavagePrincipalGerantId: Joi.number().allow(null)
  }).or('email', 'telephone'),
  
  userUpdate: Joi.object({
    nom: Joi.string(),
    prenom: Joi.string(),
    email: Joi.string().email(),
    telephone: Joi.string().pattern(/^\d{2}(\s\d{3}){2}\s\d{2}$/),
    adresseText: Joi.string(),
    latitude: Joi.number(),
    longitude: Joi.number(),
    typeClient: Joi.string().valid('Standard', 'Premium'),
    siteLavagePrincipalGerantId: Joi.number()
  }),
  
  login: Joi.object({
    email: Joi.string().email(),
    telephone: Joi.string().pattern(/^\d{2}(\s\d{3}){2}\s\d{2}$/),
    password: Joi.string().required()
  }).or('email', 'telephone'),
  
  googleLogin: Joi.object({
    googleToken: Joi.string().required()
  }),

  // Machine related schemas
  machineCreate: Joi.object({
    siteLavageId: Joi.number().integer().positive().required(),
    numero: Joi.number().integer().positive().required(),
    nom: Joi.string(),
    type: Joi.string().required(),
    poidsKg: Joi.number().positive().required()
  }),

  machineUpdate: Joi.object({
    numero: Joi.number().integer().positive(),
    nom: Joi.string(),
    type: Joi.string(),
    poidsKg: Joi.number().positive()
  }),

  // Site Lavage related schemas
  siteLavageCreate: Joi.object({
    nom: Joi.string().required(),
    adresseText: Joi.string().required(),
    ville: Joi.string().required(),
    latitude: Joi.number().min(-90).max(90).required(),
    longitude: Joi.number().min(-180).max(180).required(),
    telephone: Joi.string().pattern(/^[0-9+\s]+$/).allow(null, ''),
    heureOuverture: Joi.string().pattern(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/).default("09:00"),
    heureFermeture: Joi.string().pattern(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/).default("20:00"),
    statutOuverture: Joi.boolean().default(false)
  }),
  
  siteLavageUpdate: Joi.object({
    nom: Joi.string(),
    adresseText: Joi.string(),
    ville: Joi.string(),
    latitude: Joi.number().min(-90).max(90),
    longitude: Joi.number().min(-180).max(180),
    telephone: Joi.string().pattern(/^[0-9+\s]+$/).allow(null, ''),
    heureOuverture: Joi.string().pattern(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/),
    heureFermeture: Joi.string().pattern(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/),
    statutOuverture: Joi.boolean()
  }),

  // Commande related schemas
  commandeCreate: Joi.object({
    clientUserId: Joi.number().integer().positive().allow(null),
    clientInvite: Joi.object({
      nom: Joi.string().allow(null, ''),
      prenom: Joi.string().allow(null, ''),
      telephone: Joi.string().pattern(/^[0-9+\s]*$/).allow(null, ''),
      email: Joi.string().email().allow(null, ''),
      adresseText: Joi.string().allow(null, ''),
      creerCompte: Joi.boolean().default(false)
    }).allow(null),
    siteLavageId: Joi.number().integer().positive().required(),
    estEnLivraison: Joi.boolean().default(false),
    adresseLivraison: Joi.object({
      adresseText: Joi.string().allow(null, ''),
      latitude: Joi.number().min(-90).max(90).allow(null),
      longitude: Joi.number().min(-180).max(180).allow(null)
    }).when('estEnLivraison', { is: true, then: Joi.required() }),
    masseClientIndicativeKg: Joi.number().min(config.business.minOrderWeightKg).required(),
    masseVerifieeKg: Joi.number().min(config.business.minOrderWeightKg).allow(null),
    formuleCommande: Joi.string().valid('BaseMachine', 'Detail').required(),
    typeReduction: Joi.string().valid('Ouverture', 'Etudiant').allow(null),
    modePaiement: Joi.string().valid('Espece', 'MobileMoney', 'Autre').required(),
    options: Joi.object({
      aOptionRepassage: Joi.boolean().default(false),
      aOptionSechage: Joi.boolean().default(false),
      aOptionLivraison: Joi.boolean().default(false),
      aOptionExpress: Joi.boolean().default(false)
    }).required(),
    // Prix calculés côté frontend - OBLIGATOIRES
    prixCalcule: Joi.object({
      prixBase: Joi.number().min(0).required(),
      prixOptions: Joi.number().min(0).required(),
      prixSousTotal: Joi.number().min(0).required(),
      prixFinal: Joi.number().min(0).required(),
      formule: Joi.string().valid('BaseMachine', 'Detail', 'Premium').required(),
      // Options détaillées (optionnel)
      options: Joi.object({
        livraison: Joi.number().min(0),
        sechage: Joi.object({
          prix: Joi.number().min(0).required(),
          prixParKg: Joi.number().min(0).required(),
          poids: Joi.number().min(0).required()
        }),
        express: Joi.number().min(0),
        repassage: Joi.number().min(0)
      }).allow(null),
      // Réduction détaillée
      reduction: Joi.object({
        tauxReduction: Joi.number().min(0).max(100).required(),
        montantReduction: Joi.number().min(0).required(),
        raisonReduction: Joi.string().allow(null),
        prixApresReduction: Joi.number().min(0).required()
      }),
      // Répartition des machines pour formule de base (optionnel)
      repartitionMachines: Joi.object({
        machine20kg: Joi.number().min(0).required(),
        machine6kg: Joi.number().min(0).required()
      }),
      // Détails premium
      premiumDetails: Joi.object({
        quotaMensuel: Joi.number().required(),
        cumulMensuel: Joi.number().required(),
        quotaRestant: Joi.number().required(),
        poidsCouvert: Joi.number().required(),
        surplus: Joi.number().required(),
        estCouvertParAbonnement: Joi.boolean().required(),
        inclus: Joi.array().items(Joi.string()).allow(null),
        surplusDetails: Joi.object({
          formule: Joi.string().valid('BaseMachine', 'Detail').required(),
          obligatoire: Joi.boolean().required(),
          raison: Joi.string().allow(null),
          choixPossible: Joi.array().items(Joi.string().valid('BaseMachine', 'Detail')).default([])
        }).allow(null)
      })
    }).required()
  }),
  
  commandeUpdate: Joi.object({
    masseVerifieeKg: Joi.number().min(config.business.minOrderWeightKg),
    statut: Joi.string().valid('PrisEnCharge', 'LavageEnCours', 'Repassage', 'Collecte', 'Livraison', 'Livre'),
    livreurId: Joi.number().integer().positive().allow(null),
    gerantReceptionUserId: Joi.number().integer().positive().allow(null),
    modePaiement: Joi.string().valid('Espece', 'MobileMoney', 'Autre'),
    typeReduction: Joi.string().valid('Ouverture', 'Etudiant').allow(null),
    options: Joi.object({
      aOptionRepassage: Joi.boolean(),
      aOptionSechage: Joi.boolean(),
      aOptionLivraison: Joi.boolean(),
      aOptionExpress: Joi.boolean()
    })
  }),
  
  // Manager related schemas
  managerSiteUpdate: Joi.object({
    siteId: Joi.number().integer().positive().required()
  }),
  
  // ID validation
  idParam: Joi.object({
    id: Joi.number().integer().required()
  }),

  // Site ID validation
  siteIdParam: Joi.object({
    siteId: Joi.number().integer().required()
  }),

  // Client invité
  clientGuest: Joi.object({
    nom: Joi.string().required().min(2).max(50),
    prenom: Joi.string().required().min(2).max(50),
    telephone: Joi.string().required().pattern(/^\+?[0-9]{8,15}$/),
    email: Joi.string().email().allow(null, ''),
    adresseText: Joi.string().allow(null, '').max(200)
  }),

  // Création de compte client
  clientCreate: Joi.object({
    nom: Joi.string().required().min(2).max(50),
    prenom: Joi.string().required().min(2).max(50),
    telephone: Joi.string().required().pattern(/^\+?[0-9]{8,15}$/),
    email: Joi.string().email().allow(null, ''),
    adresseText: Joi.string().allow(null, '').max(200)
  }),

  // Vérification d'existence de client
  clientCheck: Joi.object({
    telephone: Joi.string().pattern(/^\+?[0-9]{8,15}$/).allow(''),
    email: Joi.string().email().allow('', null)
  }).or('telephone', 'email')
};

module.exports = {
  validate,
  schemas
};
