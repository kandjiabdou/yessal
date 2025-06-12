const logger = require('./logger');
const config = require('../config/config');

/**
 * Service de calcul de prix pour les formules de lavage
 */
class PriceCalculator {
  constructor() {
    // Prix des machines
    this.PRIX_MACHINE_20KG = 4000; // FCFA
    this.PRIX_MACHINE_6KG = 2000; // FCFA
    
    // Prix formule détaillée
    this.PRIX_AU_KILO = 600; // FCFA/kg (collecte, lavage, séchage, repassage, livraison inclus)
    
    // Options
    this.PRIX_LIVRAISON = 1000; // FCFA
    this.PRIX_SECHAGE_PAR_KG = 150; // FCFA/kg
    this.PRIX_EXPRESS = 1000; // FCFA
    
    // Réductions
    this.REDUCTION_ETUDIANT = 0.1; // 10%
    this.REDUCTION_OUVERTURE = 0.05; // 5%
    
    // Premium
    this.QUOTA_PREMIUM_MENSUEL = 40; // kg/mois
  }

  /**
   * Calcule la répartition optimale des machines pour la formule de base
   * @param {number} poids - Poids total en kg
   * @returns {Object} - Répartition des machines et prix
   */
  calculerRepartitionMachines(poids) {
    // 1. n = entier(poids / 20) : nombre de fois à utiliser la machine 20 kg
    const n = Math.floor(poids / 20);
    
    // 2. r = poids mod 20 : restant après utilisation des machines 20 kg
    const r = poids % 20;
    
    let nombreMachine20kg = n;
    let nombreMachine6kg = 0;
    let prixTotal = 0;
    
    if (r > 0) {
      // Calculer le nombre de machines 6kg nécessaires pour le restant
      const nombreMachine6kgPourReste = Math.ceil(r / 6);
      const prixMachine6kgPourReste = nombreMachine6kgPourReste * this.PRIX_MACHINE_6KG;
      
      // 3. Si M6 ×(r/6) > M20 → on prend une machine 20kg supplémentaire
      if (prixMachine6kgPourReste > this.PRIX_MACHINE_20KG) {
        nombreMachine20kg = n + 1;
        nombreMachine6kg = 0;
        prixTotal = nombreMachine20kg * this.PRIX_MACHINE_20KG;
      } else {
        // 4. Sinon on utilise les machines 6kg pour le reste
        nombreMachine20kg = n;
        nombreMachine6kg = nombreMachine6kgPourReste;
        prixTotal = (n * this.PRIX_MACHINE_20KG) + prixMachine6kgPourReste;
      }
    } else {
      // Pas de reste, utiliser seulement les machines 20kg
      prixTotal = n * this.PRIX_MACHINE_20KG;
    }

    return {
      nombreMachine20kg,
      nombreMachine6kg,
      prixMachines: prixTotal,
      repartition: {
        machine20kg: nombreMachine20kg,
        machine6kg: nombreMachine6kg
      }
    };
  }

  /**
   * Calcule le prix pour la formule de base (à la machine)
   * @param {number} poids - Poids en kg
   * @param {Object} options - Options sélectionnées
   * @param {boolean} estLivraison - Livraison demandée
   * @returns {Object} - Détails du prix
   */
  calculerPrixFormuleBase(poids, options = {}, estLivraison = false) {
    // Prix de base avec répartition des machines
    const repartition = this.calculerRepartitionMachines(poids);
    let prixTotal = repartition.prixMachines;
    
    const detailsPrix = {
      prixBase: repartition.prixMachines,
      repartitionMachines: repartition.repartition,
      options: {},
      prixOptions: 0
    };

    // Options supplémentaires
    let prixOptions = 0;

    // Livraison (cochée par défaut)
    if (estLivraison) {
      prixOptions += this.PRIX_LIVRAISON;
      detailsPrix.options.livraison = this.PRIX_LIVRAISON;
    }

    // Séchage (seulement si livraison)
    if (options.aOptionSechage && estLivraison) {
      const prixSechage = poids * this.PRIX_SECHAGE_PAR_KG;
      prixOptions += prixSechage;
      detailsPrix.options.sechage = {
        prix: prixSechage,
        prixParKg: this.PRIX_SECHAGE_PAR_KG,
        poids: poids
      };
    }

    // Express (seulement si livraison)
    if (options.aOptionExpress && estLivraison) {
      prixOptions += this.PRIX_EXPRESS;
      detailsPrix.options.express = this.PRIX_EXPRESS;
    }

    detailsPrix.prixOptions = prixOptions;
    prixTotal += prixOptions;

    return {
      ...detailsPrix,
      prixTotal
    };
  }

  /**
   * Calcule le prix pour la formule détaillée (au kilo)
   * @param {number} poids - Poids en kg
   * @param {Object} options - Options sélectionnées
   * @returns {Object} - Détails du prix
   */
  calculerPrixFormuleDetaillee(poids, options = {}) {
    // Prix de base (tout inclus : collecte, lavage, séchage, repassage, livraison)
    const prixBase = poids * this.PRIX_AU_KILO;
    let prixTotal = prixBase;

    const detailsPrix = {
      prixBase,
      prixParKg: this.PRIX_AU_KILO,
      poids,
      options: {},
      prixOptions: 0,
      inclus: ['collecte', 'lavage', 'sechage', 'repassage', 'livraison']
    };

    // Seule option possible : Express
    let prixOptions = 0;
    if (options.aOptionExpress) {
      prixOptions += this.PRIX_EXPRESS;
      detailsPrix.options.express = this.PRIX_EXPRESS;
    }

    detailsPrix.prixOptions = prixOptions;
    prixTotal += prixOptions;

    return {
      ...detailsPrix,
      prixTotal
    };
  }

  /**
   * Calcule le prix pour un client premium avec abonnement
   * @param {number} poids - Poids en kg
   * @param {number} cumulMensuel - Cumul mensuel en kg
   * @param {Object} options - Options sélectionnées
   * @returns {Object} - Détails du prix premium
   */
  calculerPrixPremium(poids, cumulMensuel = 0, options = {}) {
    const poidsTotal = poids + cumulMensuel;
    const quotaRestant = Math.max(0, this.QUOTA_PREMIUM_MENSUEL - cumulMensuel);
    const poidsCouvert = Math.min(poids, quotaRestant);
    const surplus = Math.max(0, poids - quotaRestant);

    const detailsPrix = {
      quotaMensuel: this.QUOTA_PREMIUM_MENSUEL,
      cumulMensuel,
      quotaRestant,
      poidsCouvert,
      surplus,
      prixBase: 0,
      prixOptions: 0,
      prixTotal: 0,
      estCouvertParAbonnement: surplus === 0,
      options: {},
      surplusDetails: null
    };

    // Option Express (toujours disponible, même si couvert par abonnement)
    let prixOptions = 0;
    if (options.aOptionExpress) {
      prixOptions += this.PRIX_EXPRESS;
      detailsPrix.options.express = this.PRIX_EXPRESS;
    }

    detailsPrix.prixOptions = prixOptions;

    // Si pas de surplus, tout est couvert par l'abonnement
    if (surplus === 0) {
      detailsPrix.prixTotal = prixOptions;
      detailsPrix.inclus = ['collecte', 'lavage', 'sechage', 'repassage', 'livraison'];
      return detailsPrix;
    }

    // Si surplus, calculer le prix du surplus selon les règles
    if (surplus < 6) {
      // Surplus < 6kg : formule détaillée obligatoire
      const surplusDetails = this.calculerPrixFormuleDetaillee(surplus, { aOptionExpress: false });
      detailsPrix.surplusDetails = {
        ...surplusDetails,
        formule: 'Detail',
        obligatoire: true,
        raison: 'Surplus inférieur à 6 kg'
      };
      detailsPrix.prixBase = surplusDetails.prixBase;
    } else {
      // Surplus ≥ 6kg : choix entre formule de base et détaillée
      // Par défaut, on retourne la formule de base (le client pourra choisir)
      const surplusDetails = this.calculerPrixFormuleBase(surplus, options, true);
      detailsPrix.surplusDetails = {
        ...surplusDetails,
        formule: 'BaseMachine',
        obligatoire: false,
        choixPossible: ['BaseMachine', 'Detail']
      };
      detailsPrix.prixBase = surplusDetails.prixBase;
    }

    detailsPrix.prixTotal = detailsPrix.prixBase + prixOptions;

    return detailsPrix;
  }

  /**
   * Applique les réductions selon le type de client
   * @param {number} prixTotal - Prix total avant réduction
   * @param {string} typeReduction - Type de réduction
   * @returns {Object} - Détails de la réduction
   */
  appliquerReduction(prixTotal, typeReduction) {
    let tauxReduction = 0;
    let montantReduction = 0;
    let raisonReduction = null;

    switch (typeReduction) {
      case 'Etudiant':
        tauxReduction = this.REDUCTION_ETUDIANT;
        raisonReduction = 'Réduction étudiant';
        break;
      case 'Ouverture':
        tauxReduction = this.REDUCTION_OUVERTURE;
        raisonReduction = 'Promotion d\'ouverture';
        break;
      default:
        break;
    }

    if (tauxReduction > 0) {
      montantReduction = Math.round(prixTotal * tauxReduction);
    }

    return {
      tauxReduction: tauxReduction * 100, // Conversion en pourcentage
      montantReduction,
      raisonReduction,
      prixApresReduction: prixTotal - montantReduction
    };
  }

  /**
   * Calcule le prix total d'une commande
   * @param {Object} order - Données de la commande
   * @returns {Object} - Détails complets du prix
   */
  calculateOrderPrice(order) {
    const { 
      formuleCommande, 
      masseVerifieeKg, 
      typeReduction, 
      estEnLivraison = false,
      options = {},
      typeClient,
      cumulMensuelKg = 0
    } = order;
    
    const poids = masseVerifieeKg || 0;
    
    // Validation du poids minimum pour clients non-premium
    if (typeClient !== 'Premium' && poids < 6) {
      throw new Error('Le poids minimum est de 6 kg');
    }

    let detailsPrix;
    
    // Logique spéciale pour les clients Premium
    if (typeClient === 'Premium') {
      detailsPrix = this.calculerPrixPremium(poids, cumulMensuelKg, options);
      
      // Application des réductions seulement sur le surplus payant
      let reduction = { tauxReduction: 0, montantReduction: 0, raisonReduction: null, prixApresReduction: detailsPrix.prixTotal };
      if (detailsPrix.prixTotal > 0) {
        reduction = this.appliquerReduction(detailsPrix.prixTotal, typeReduction);
      }

      return {
        formule: 'Premium',
        typeClient,
        poids,
        prixBase: detailsPrix.prixBase,
        prixOptions: detailsPrix.prixOptions,
        prixSousTotal: detailsPrix.prixTotal,
        reduction,
        prixFinal: reduction.prixApresReduction,
        details: detailsPrix,
        timestamp: new Date().toISOString()
      };
    }
    
    // Calcul standard pour clients non-premium
    switch (formuleCommande) {
      case 'BaseMachine':
        detailsPrix = this.calculerPrixFormuleBase(poids, options, estEnLivraison);
        break;
        
      case 'Detail':
        detailsPrix = this.calculerPrixFormuleDetaillee(poids, options);
        break;
        
      default:
        throw new Error(`Formule inconnue: ${formuleCommande}`);
    }

    // Application des réductions
    const reduction = this.appliquerReduction(detailsPrix.prixTotal, typeReduction);

    // Assemblage du résultat final
    return {
      formule: formuleCommande,
      typeClient: typeClient || 'Standard',
      poids,
      prixBase: detailsPrix.prixBase,
      prixOptions: detailsPrix.prixOptions,
      prixSousTotal: detailsPrix.prixTotal,
      reduction,
      prixFinal: reduction.prixApresReduction,
      details: detailsPrix,
      timestamp: new Date().toISOString()
    };
  }
}

module.exports = new PriceCalculator();
