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
    password: Joi.string().min(6).allow(null, ''),
    adresseText: Joi.string().allow(null, ''),
    latitude: Joi.number().allow(null),
    longitude: Joi.number().allow(null),
    typeClient: Joi.string().valid('Standard', 'Premium').default('Standard'),
    estEtudiant: Joi.boolean().default(false),
    siteLavagePrincipalGerantId: Joi.number().allow(null),
    createdByUserId: Joi.number().integer().positive().allow(null)
  })
  .or('email', 'telephone')
  .custom((value, helpers) => {
    // Si typeClient est 'Premium', siteLavagePrincipalGerantId est requis
    if (value.typeClient === 'Premium' && !value.siteLavagePrincipalGerantId) {
      return helpers.error('custom.siteLavageRequiredForPremium');
    }
    return value;
  })
  .messages({
    'custom.siteLavageRequiredForPremium': 'siteLavagePrincipalGerantId est requis pour les clients Premium'
  }),
  
  userUpdate: Joi.object({
    nom: Joi.string(),
    prenom: Joi.string(),
    email: Joi.string().email().allow(null, ''),
    telephone: Joi.string().pattern(/^\d{9}$/).allow(null, ''),
    adresseText: Joi.string().allow(null, ''),
    latitude: Joi.number().allow(null),
    longitude: Joi.number().allow(null),
    typeClient: Joi.string().valid('Standard', 'Premium'),
    estEtudiant: Joi.boolean(),
    siteLavagePrincipalGerantId: Joi.number().allow(null)
  }),
  
  login: Joi.object({
    email: Joi.string().email(),
    telephone: Joi.string().pattern(/^\d{9}$/),
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
    telephone: Joi.string().pattern(/^[\d+\s]+$/).allow(null, ''),
    heureOuverture: Joi.string().pattern(/^([01]?\d|2[0-3]):[0-5]\d$/).default("09:00"),
    heureFermeture: Joi.string().pattern(/^([01]?\d|2[0-3]):[0-5]\d$/).default("20:00"),
    statutOuverture: Joi.boolean().default(false)
  }),
  
  siteLavageUpdate: Joi.object({
    nom: Joi.string(),
    adresseText: Joi.string(),
    ville: Joi.string(),
    latitude: Joi.number().min(-90).max(90),
    longitude: Joi.number().min(-180).max(180),
    telephone: Joi.string().pattern(/^[\d+\s]+$/).allow(null, ''),
    heureOuverture: Joi.string().pattern(/^([01]?\d|2[0-3]):[0-5]\d$/),
    heureFermeture: Joi.string().pattern(/^([01]?\d|2[0-3]):[0-5]\d$/),
    statutOuverture: Joi.boolean()
  }),

  // Commande related schemas
  commandeCreate: Joi.object({
    clientUserId: Joi.number().integer().positive().allow(null),
    clientInvite: Joi.object({
      nom: Joi.string().allow(null, ''),
      prenom: Joi.string().allow(null, ''),
      telephone: Joi.string().pattern(/^[\d+\s]*$/).allow(null, ''),
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
    }).allow(null),
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
    // Ajustement de prix manuel (optionnel)
    ajustementType: Joi.string().valid('Augmentation', 'Diminution').allow(null),
    ajustementMethode: Joi.string().valid('Pourcentage', 'Absolu').allow(null),
    ajustementValeur: Joi.number().min(0).allow(null),
    ajustementRaison: Joi.string().allow(null, ''),
    // Prix calculés côté frontend - OBLIGATOIRES
    prixCalcule: Joi.object({
      prixBase: Joi.number().min(0).required(),
      prixOptions: Joi.number().min(0).required(),
      prixSousTotal: Joi.number().min(0).required(),
      prixFinal: Joi.number().min(0).required(),
      prixApresReduction: Joi.number().min(0).required(), // NOUVEAU
      prixPaye: Joi.number().min(0).required(), // NOUVEAU
      formule: Joi.string().valid('BaseMachine', 'Detail', 'Premium').required(),
      // Options détaillées (optionnel)
      options: Joi.object({
        livraison: Joi.number().min(0),
        sechage: Joi.object({
          prix: Joi.number().min(0).required(),
          prixParKg: Joi.number().min(0).required(),
          poids: Joi.number().min(0).required(),
          nombreUtilisations: Joi.number().min(0).allow(null)
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
      // NOUVEAU: Ajustement détaillé
      ajustement: Joi.object({
        type: Joi.string().valid('Augmentation', 'Diminution').required(),
        methode: Joi.string().valid('Pourcentage', 'Absolu').required(),
        valeur: Joi.number().min(0).required(),
        montant: Joi.number().min(0).required(),
        raison: Joi.string().allow(null, '')
      }).allow(null),
      // NOUVEAU: Fidélité - Application automatique du crédit (système simple)
      fidelite: Joi.object({
        pointsDisponibles: Joi.number().min(0).required(),
        pointsFraction: Joi.number().min(0).required(),
        creditDisponible: Joi.number().min(0).required(), // Crédit disponible en FCFA
        creditUtilise: Joi.number().min(0).required(), // Crédit utilisé pour cette commande
        pointsRestants: Joi.number().min(0).required() // Points restants après la commande
      }).allow(null),
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
  }).custom((value, helpers) => {
    // Validation de l'adresse de livraison : requise si estEnLivraison est true
    if (value.estEnLivraison && !value.adresseLivraison) {
      return helpers.error('custom.adresseLivraisonRequired', { value });
    }
    
    // Validation des ajustements : si un champ est fourni, les autres doivent l'être aussi
    const hasAdjustmentType = value.ajustementType;
    const hasAdjustmentMethod = value.ajustementMethode;
    const hasAdjustmentValue = value.ajustementValeur;
    const hasAdjustmentReason = value.ajustementRaison;
    
    if (hasAdjustmentType || hasAdjustmentMethod || hasAdjustmentValue || hasAdjustmentReason) {
      if (!hasAdjustmentType) {
        return helpers.error('custom.ajustementType', { value });
      }
      if (!hasAdjustmentMethod) {
        return helpers.error('custom.ajustementMethode', { value });
      }
      if (!hasAdjustmentValue || hasAdjustmentValue <= 0) {
        return helpers.error('custom.ajustementValeur', { value });
      }
      if (!hasAdjustmentReason || !hasAdjustmentReason.trim()) {
        return helpers.error('custom.ajustementRaison', { value });
      }
    }
    
    return value;
  }, 'Validation des ajustements de prix').messages({
    'custom.adresseLivraisonRequired': 'L\'adresse de livraison est requise quand estEnLivraison est true',
    'custom.ajustementType': 'Le type d\'ajustement est requis quand un ajustement est défini',
    'custom.ajustementMethode': 'La méthode d\'ajustement est requise quand un ajustement est défini',
    'custom.ajustementValeur': 'La valeur d\'ajustement doit être supérieure à 0',
    'custom.ajustementRaison': 'La raison de l\'ajustement est requise'
  }),

  commandeUpdate: Joi.object({
    masseVerifieeKg: Joi.number().min(config.business.minOrderWeightKg),
    statut: Joi.string().valid('PrisEnCharge', 'LavageEnCours', 'Repassage', 'Livraison', 'Livre'),
    livreurId: Joi.number().integer().positive().allow(null),
    gerantReceptionUserId: Joi.number().integer().positive().allow(null),
    modePaiement: Joi.string().valid('Espece', 'MobileMoney', 'Autre'),
    typeReduction: Joi.string().valid('Ouverture', 'Etudiant').allow(null),
    estEnLivraison: Joi.boolean(),
    options: Joi.object({
      aOptionRepassage: Joi.boolean(),
      aOptionSechage: Joi.boolean(),
      aOptionLivraison: Joi.boolean(),
      aOptionExpress: Joi.boolean()
    }),
    // Ajustement de prix manuel (optionnel)
    ajustementType: Joi.string().valid('Augmentation', 'Diminution').allow(null),
    ajustementMethode: Joi.string().valid('Pourcentage', 'Absolu').allow(null),
    ajustementValeur: Joi.number().min(0).allow(null),
    ajustementRaison: Joi.string().allow(null, ''),
    // NOUVEAU: Prix calculés côté frontend pour la mise à jour
    prixCalcule: Joi.object({
      prixBase: Joi.number().min(0).required(),
      prixOptions: Joi.number().min(0).required(),
      prixSousTotal: Joi.number().min(0).required(),
      prixFinal: Joi.number().min(0).required(),
      prixApresReduction: Joi.number().min(0).required(),
      prixPaye: Joi.number().min(0).required(),
      formule: Joi.string().valid('BaseMachine', 'Detail', 'Premium').required(),
      options: Joi.object({
        livraison: Joi.number().min(0),
        sechage: Joi.object({
          prix: Joi.number().min(0).required(),
          prixParKg: Joi.number().min(0).required(),
          poids: Joi.number().min(0).required(),
          nombreUtilisations: Joi.number().min(0).allow(null)
        }),
        express: Joi.number().min(0),
        repassage: Joi.number().min(0)
      }).allow(null),
      reduction: Joi.object({
        tauxReduction: Joi.number().min(0).max(100).required(),
        montantReduction: Joi.number().min(0).required(),
        raisonReduction: Joi.string().allow(null),
        prixApresReduction: Joi.number().min(0).required()
      }).allow(null),
      ajustement: Joi.object({
        type: Joi.string().valid('Augmentation', 'Diminution').required(),
        methode: Joi.string().valid('Pourcentage', 'Absolu').required(),
        valeur: Joi.number().min(0).required(),
        montant: Joi.number().min(0).required(),
        raison: Joi.string().allow(null, '')
      }).allow(null),
      fidelite: Joi.object({
        pointsDisponibles: Joi.number().min(0).required(),
        pointsFraction: Joi.number().min(0).required(),
        creditDisponible: Joi.number().min(0).required(), // Crédit disponible en FCFA
        creditUtilise: Joi.number().min(0).required(), // Crédit utilisé pour cette commande
        pointsRestants: Joi.number().min(0).required() // Points restants après la commande
      }).allow(null),
      repartitionMachines: Joi.object({
        machine20kg: Joi.number().min(0).required(),
        machine6kg: Joi.number().min(0).required()
      }).allow(null),
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
      }).allow(null)
    }).allow(null) // Optionnel pour la mise à jour
  }),
  
  // Manager related schemas
  managerSiteUpdate: Joi.object({
    siteId: Joi.number().integer().positive().required()
  }),

  managerWorkSessionUpdate: Joi.object({
    siteId: Joi.number().integer().positive().allow(null)
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
    telephone: Joi.string().required().pattern(/^\+?\d{8,15}$/),
    email: Joi.string().email().allow(null, ''),
    adresseText: Joi.string().allow(null, '').max(200),
    siteLavageId: Joi.number().integer().positive().allow(null),
    createdByUserId: Joi.number().integer().positive().allow(null)
  }),

  // Création de compte client
  clientCreate: Joi.object({
    nom: Joi.string().required().min(2).max(50),
    prenom: Joi.string().required().min(2).max(50),
    telephone: Joi.string().required().pattern(/^\+?\d{8,15}$/),
    email: Joi.string().email().allow(null, ''),
    adresseText: Joi.string().allow(null, '').max(200),
    siteLavagePrincipalGerantId: Joi.number().integer().positive().allow(null),
    createdByUserId: Joi.number().integer().positive().allow(null)
  }),

  // Vérification d'existence de client
  clientCheck: Joi.object({
    telephone: Joi.string().pattern(/^\+?\d{8,15}$/).allow(''),
    email: Joi.string().email().allow('', null)
  }).or('telephone', 'email'),

  // Abonnement Premium
  abonnementCreate: Joi.object({
    siteLavageId: Joi.number().integer().positive().required(),
    start: Joi.string().valid('this', 'next').default('this'),
    startMonth: Joi.string().pattern(/^\d{4}-\d{2}$/).allow(null), // Format: YYYY-MM
    count: Joi.number().integer().min(1).max(12).default(1),
    limiteKg: Joi.number().min(0).allow(null)
  }),

  abonnementUpdate: Joi.object({
    limiteKg: Joi.number().min(0),
    kgUtilises: Joi.number().min(0)
  })
};

module.exports = {
  validate,
  schemas
};
