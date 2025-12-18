import { OrderOptions } from './order';

// Types pour les détails de prix
export interface MachineRepartition {
  machine20kg: number;
  machine6kg: number;
}

export interface PremiumDetails {
  quotaMensuel: number;
  cumulMensuel: number;
  quotaRestant: number;
  poidsCouvert: number;
  surplus: number;
  estCouvertParAbonnement: boolean;
  surplusDetails?: {
    formule: 'BaseMachine' | 'Detail';
    obligatoire: boolean;
    choixPossible?: string[];
    raison?: string;
  };
  inclus?: string[];
}

export interface FidelityDetails {
  pointsDisponibles: number;
  pointsFraction: number;
  creditDisponible: number; // Crédit disponible en FCFA
  creditUtilise: number; // Crédit utilisé pour cette commande
  pointsRestants: number; // Points après cette commande (affichage uniquement)
}

export interface PriceDetails {
  prixBase: number;
  prixOptions: number;
  prixSousTotal: number;
  prixFinal: number;
  prixApresReduction: number;
  prixPaye: number; // Prix final après ajustements ET fidélité
  repartitionMachines?: MachineRepartition;
  options: {
    livraison?: number;
    sechage?: {
      prix: number;
      prixParKg: number;
      poids: number;
      nombreUtilisations: number;
    };
    express?: number;
    repassage?: number;
  };
  reduction?: {
    tauxReduction: number;
    montantReduction: number;
    raisonReduction: string | null;
    prixApresReduction: number;
  };
  ajustement?: {
    type: 'Augmentation' | 'Diminution';
    methode: 'Pourcentage' | 'Absolu';
    valeur: number;
    montant: number;
    raison?: string;
  };
  fidelite?: FidelityDetails; // Détails de l'utilisation des points
  inclus?: string[];
  premiumDetails?: PremiumDetails;
}

export class PriceService {
  // Prix des machines
  static readonly PRIX_MACHINE_20KG = 4000; // FCFA
  static readonly PRIX_MACHINE_6KG = 2000; // FCFA

  // Prix formule détaillée
  static readonly PRIX_AU_KILO = 600; // FCFA/kg

  // Options
  static readonly PRIX_LIVRAISON = 1000; // FCFA
  static readonly PRIX_SECHAGE_PAR_KG = 150; // FCFA par kg
  static readonly PRIX_EXPRESS = 1000; // FCFA

  // Réductions
  static readonly REDUCTION_ETUDIANT = 0.1; // 10%
  static readonly REDUCTION_OUVERTURE = 0.05; // 5%

  // Premium
  static readonly QUOTA_PREMIUM_MENSUEL = 40; // kg/mois

  // Fidélité - Nouveau système simple
  static readonly FIDELITY_POINTS_PER_FCFA = 500; // 1 point = 500 FCFA payés
  static readonly FIDELITY_POINTS_FOR_CONVERSION = 40; // 40 points → conversion automatique
  static readonly FIDELITY_CREDIT_PER_PACK = 2000; // 1 pack = 2000 FCFA crédit

  /**
   * Calcule la répartition optimale des machines pour la formule de base
   * Formule exacte selon les spécifications utilisateur
   */
  static calculerRepartitionMachines(poids: number): {
    nombreMachine20kg: number;
    nombreMachine6kg: number;
    prixMachines: number;
  } {
    // 1. n = entier(poids / 20)
    const n = Math.floor(poids / 20);

    // 2. r = poids mod 20
    const r = poids % 20;

    let nombreMachine20kg = n;
    let nombreMachine6kg = 0;
    let prixTotal = 0;

    if (r > 0) {
      // 3. Si M6 ×(r/6) > M20 → on prend une machine 20kg supplémentaire
      const prixMachine6kgPourReste = this.PRIX_MACHINE_6KG * (r / 6);

      if (prixMachine6kgPourReste > this.PRIX_MACHINE_20KG) {
        nombreMachine20kg = n + 1;
        nombreMachine6kg = 0;
        prixTotal = nombreMachine20kg * this.PRIX_MACHINE_20KG;
      } else {
        // 4. Sinon → prix = n×M20 + (entier(r/6) + 1 si reste(r/6) > 1.5)×M6
        const entierR6 = Math.floor(r / 6);
        const resteR6 = r % 6;
        const ajoutSiReste = resteR6 > 1.5 ? 1 : 0;

        nombreMachine20kg = n;
        nombreMachine6kg = entierR6 + ajoutSiReste;
        prixTotal =
          n * this.PRIX_MACHINE_20KG + nombreMachine6kg * this.PRIX_MACHINE_6KG;
      }
    } else {
      // Pas de reste, utiliser seulement les machines 20kg
      prixTotal = n * this.PRIX_MACHINE_20KG;
    }

    return {
      nombreMachine20kg,
      nombreMachine6kg,
      prixMachines: prixTotal,
    };
  }

  /**
   * Calcule le prix pour la formule de base (à la machine)
   */
  static calculerPrixFormuleBase(
    poids: number,
    options: OrderOptions,
    estLivraison: boolean,
    typeReduction?: "Etudiant" | "Ouverture"
  ): PriceDetails {
    // Prix de base avec répartition des machines
    const repartition = this.calculerRepartitionMachines(poids);
    const prixBase = repartition.prixMachines;

    const detailsOptions: PriceDetails["options"] = {};
    let prixOptions = 0;

    // Livraison (cochée par défaut)
    if (estLivraison) {
      prixOptions += this.PRIX_LIVRAISON;
      detailsOptions.livraison = this.PRIX_LIVRAISON;
    }

    if (options.aOptionSechage) {
      // Formule séchage : 150 FCFA par kg
      const prixSechage = poids * this.PRIX_SECHAGE_PAR_KG;

      prixOptions += prixSechage;
      detailsOptions.sechage = {
        prix: prixSechage,
        prixParKg: this.PRIX_SECHAGE_PAR_KG,
        poids: poids,
        nombreUtilisations: 0, // Non applicable pour tarif au kg
      };
    }

    // Express (seulement si livraison)
    if (options.aOptionExpress && estLivraison) {
      prixOptions += this.PRIX_EXPRESS;
      detailsOptions.express = this.PRIX_EXPRESS;
    }

    const prixSousTotal = prixBase + prixOptions;

    // Application des réductions
    const reduction = this.appliquerReduction(prixSousTotal, typeReduction);

    return {
      prixBase,
      prixOptions,
      prixSousTotal,
      prixFinal: reduction.prixApresReduction,
      prixApresReduction: reduction.prixApresReduction,
      prixPaye: reduction.prixApresReduction, // Par défaut, pas d'ajustement supplémentaire
      repartitionMachines: {
        machine20kg: repartition.nombreMachine20kg,
        machine6kg: repartition.nombreMachine6kg,
      },
      options: detailsOptions,
      reduction,
    };
  }

  /**
   * Calcule le prix pour la formule détaillée (au kilo)
   */
  static calculerPrixFormuleDetaillee(
    poids: number,
    options: OrderOptions,
    typeReduction?: "Etudiant" | "Ouverture"
  ): PriceDetails {
    // Prix de base (tout inclus)
    const prixBase = poids * this.PRIX_AU_KILO;

    // Calculer la répartition des machines (même si le prix est au kilo, 
    // on a besoin de savoir combien de machines seront utilisées physiquement)
    const repartition = this.calculerRepartitionMachines(poids);

    const detailsOptions: PriceDetails["options"] = {};
    let prixOptions = 0;

    // Seule option possible : Express
    if (options.aOptionExpress) {
      prixOptions += this.PRIX_EXPRESS;
      detailsOptions.express = this.PRIX_EXPRESS;
    }

    const prixSousTotal = prixBase + prixOptions;

    // Application des réductions
    const reduction = this.appliquerReduction(prixSousTotal, typeReduction);

    return this.completerPriceDetails({
      prixBase,
      prixOptions,
      prixSousTotal,
      prixFinal: reduction.prixApresReduction,
      repartitionMachines: {
        machine20kg: repartition.nombreMachine20kg,
        machine6kg: repartition.nombreMachine6kg,
      },
      options: detailsOptions,
      reduction,
      inclus: ["collecte", "lavage", "séchage", "repassage", "livraison"],
    });
  }

  /**
   * Calcule le prix pour un client premium avec abonnement
   */
  static calculerPrixPremium(
    poids: number,
    cumulMensuel: number = 0,
    options: OrderOptions,
    formuleChoisie?: "BaseMachine" | "Detail",
    typeReduction?: "Etudiant" | "Ouverture"
  ): PriceDetails {
    const quotaRestant = Math.max(0, this.QUOTA_PREMIUM_MENSUEL - cumulMensuel);
    const poidsCouvert = Math.min(poids, quotaRestant);
    const surplus = Math.max(0, poids - quotaRestant);

    const premiumDetails: PremiumDetails = {
      quotaMensuel: this.QUOTA_PREMIUM_MENSUEL,
      cumulMensuel,
      quotaRestant,
      poidsCouvert,
      surplus,
      estCouvertParAbonnement: surplus === 0,
    };

    const detailsOptions: PriceDetails["options"] = {};
    let prixOptions = 0;
    let prixBase = 0;

    // Option Express (toujours disponible)
    if (options.aOptionExpress) {
      prixOptions += this.PRIX_EXPRESS;
      detailsOptions.express = this.PRIX_EXPRESS;
    }

    // Si pas de surplus, tout est couvert par l'abonnement
    if (surplus === 0) {
      premiumDetails.inclus = [
        "collecte",
        "lavage",
        "séchage",
        "repassage",
        "livraison",
      ];

      const prixSousTotal = prixOptions;
      const reduction = this.appliquerReduction(prixSousTotal, typeReduction);

      return this.completerPriceDetails({
        prixBase: 0,
        prixOptions,
        prixSousTotal,
        prixFinal: reduction.prixApresReduction,
        options: detailsOptions,
        reduction,
        premiumDetails,
      });
    }

    // Si surplus, calculer selon les règles
    if (surplus < 6) {
      // Surplus < 6kg : formule détaillée obligatoire
      const surplusCalcul = this.calculerPrixFormuleDetaillee(surplus, {
        aOptionRepassage: false,
        aOptionSechage: false,
        aOptionLivraison: false,
        aOptionExpress: false,
      });
      prixBase = surplusCalcul.prixBase;

      premiumDetails.surplusDetails = {
        formule: "Detail",
        obligatoire: true,
        raison: "Surplus inférieur à 6 kg",
      };
    } else {
      // Surplus ≥ 6kg : choix entre formules
      premiumDetails.surplusDetails = {
        formule: formuleChoisie || "BaseMachine",
        obligatoire: false,
        choixPossible: ["BaseMachine", "Detail"],
      };

      if (formuleChoisie === "Detail") {
        const surplusCalcul = this.calculerPrixFormuleDetaillee(surplus, {
          aOptionRepassage: false,
          aOptionSechage: false,
          aOptionLivraison: false,
          aOptionExpress: false,
        });
        prixBase = surplusCalcul.prixBase;
      } else {
        // Formule de base par défaut
        // Pour les clients premium avec surplus, la livraison n'est PAS automatique
        // Elle est déjà couverte par l'abonnement pour la partie quota
        // On facture uniquement si l'option est explicitement cochée
        const surplusCalcul = this.calculerPrixFormuleBase(
          surplus,
          options,
          options.aOptionLivraison // Utiliser la valeur de l'option, pas true en dur
        );
        prixBase = surplusCalcul.prixBase;
        
        // IMPORTANT: Récupérer les options calculées pour le surplus (livraison, séchage)
        // et les ajouter aux options déjà présentes (express)
        const optionsSurplus = surplusCalcul.prixOptions;
        const prixOptionsSurplus = prixOptions + optionsSurplus;
        
        // Fusionner les détails des options
        const detailsOptionsFusion = {
          ...detailsOptions,
          ...surplusCalcul.options
        };

        // Inclure la répartition des machines pour la formule de base
        if (surplusCalcul.repartitionMachines) {
          return this.completerPriceDetails({
            prixBase,
            prixOptions: prixOptionsSurplus,
            prixSousTotal: prixBase + prixOptionsSurplus,
            prixFinal: this.appliquerReduction(
              prixBase + prixOptionsSurplus,
              typeReduction
            ).prixApresReduction,
            repartitionMachines: surplusCalcul.repartitionMachines,
            options: detailsOptionsFusion,
            reduction: this.appliquerReduction(
              prixBase + prixOptionsSurplus,
              typeReduction
            ),
            premiumDetails,
          });
        }
      }
    }

    const prixSousTotal = prixBase + prixOptions;
    const reduction = this.appliquerReduction(prixSousTotal, typeReduction);

    return this.completerPriceDetails({
      prixBase,
      prixOptions,
      prixSousTotal,
      prixFinal: reduction.prixApresReduction,
      options: detailsOptions,
      reduction,
      premiumDetails,
    });
  }

  /**
   * Applique les réductions selon le type de client
   */
  static appliquerReduction(
    prixTotal: number,
    typeReduction?: "Etudiant" | "Ouverture"
  ) {
    let tauxReduction = 0;
    let montantReduction = 0;
    let raisonReduction: string | null = null;

    switch (typeReduction) {
      case "Etudiant":
        tauxReduction = this.REDUCTION_ETUDIANT;
        raisonReduction = "Réduction étudiant";
        break;
      case "Ouverture":
        tauxReduction = this.REDUCTION_OUVERTURE;
        raisonReduction = "Promotion d'ouverture";
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
      prixApresReduction: prixTotal - montantReduction,
    };
  }

  /**
   * Calcule le prix d'une commande selon le type de client
   */
  static calculerPrixCommande(
    formule: "BaseMachine" | "Detail",
    poids: number,
    options: OrderOptions,
    estLivraison: boolean,
    typeClient: "Standard" | "Premium" = "Standard",
    abonnementPremiums,
    cumulMensuel: number = 0,
    typeReduction?: "Etudiant" | "Ouverture"
  ): PriceDetails {
    // Validation du poids minimum pour clients non-premium
    if (typeClient !== "Premium" && poids < 6) {
      throw new Error("Le poids minimum est de 6 kg");
    }

    // Logique premium
    if (typeClient === "Premium" && abonnementPremiums != null) {
      return this.calculerPrixPremium(
        poids,
        cumulMensuel,
        options,
        formule,
        typeReduction
      );
    }

    // Logique standard
    switch (formule) {
      case "BaseMachine":
        return this.calculerPrixFormuleBase(
          poids,
          options,
          estLivraison,
          typeReduction
        );
      case "Detail":
        return this.calculerPrixFormuleDetaillee(poids, options, typeReduction);
      default:
        throw new Error(`Formule inconnue: ${formule}`);
    }
  }

  /**
   * Formate un prix en FCFA
   */
  static formaterPrix(prix: number): string {
    return new Intl.NumberFormat("fr-FR").format(prix) + " FCFA";
  }

  /**
   * Calcul complet du prix avec tous les ajustements
   */
  static calculerPrixComplet(
    poids: number,
    formule: "BaseMachine" | "Detail",
    options: OrderOptions,
    estLivraison: boolean,
    configClient: {
      typeClient?: "Standard" | "Premium";
      abonnementPremiums?: object[] | null;
      typeReduction?: "Etudiant" | "Ouverture";
      cumulMensuel?: number;
      pointsFidelite?: number; // Points de fidélité disponibles
      pointsFraction?: number; // Fraction de points
      creditDisponible?: number; // Crédit disponible en FCFA (nouveau système)
    } = {},
    ajustement?: {
      type: "Augmentation" | "Diminution";
      methode: "Pourcentage" | "Absolu";
      valeur: number;
      raison?: string;
    }
  ): PriceDetails {
    // Calcul de base
    let priceDetails = this.calculerPrixCommande(
      formule,
      poids,
      options,
      estLivraison,
      configClient.typeClient || "Standard",
      configClient.abonnementPremiums,
      configClient.cumulMensuel || 0,
      configClient.typeReduction
    );

    // Calcul du prix après réduction
    let prixApresReduction = priceDetails.prixFinal;
    if (priceDetails.reduction) {
      prixApresReduction = priceDetails.reduction.prixApresReduction;
    }

    // Application de l'ajustement si présent
    let prixPaye = prixApresReduction;
    let ajustementDetails = undefined;

    if (ajustement && ajustement.valeur > 0) {
      let montantAjustement = 0;

      if (ajustement.methode === "Pourcentage") {
        montantAjustement = (prixApresReduction * ajustement.valeur) / 100;
      } else {
        montantAjustement = ajustement.valeur;
      }

      if (ajustement.type === "Augmentation") {
        prixPaye = prixApresReduction + montantAjustement;
      } else {
        prixPaye = Math.max(0, prixApresReduction - montantAjustement);
      }

      ajustementDetails = {
        type: ajustement.type,
        methode: ajustement.methode,
        valeur: ajustement.valeur,
        montant: montantAjustement,
        raison: ajustement.raison,
      };
    }

    // Application AUTOMATIQUE de la fidélité - NOUVEAU SYSTÈME SIMPLE
    let fideliteDetails = undefined;
    const creditDisponible = configClient.creditDisponible || 0;
    const pointsDisponibles = configClient.pointsFidelite || 0;
    const pointsFraction = configClient.pointsFraction || 0;

    if (creditDisponible > 0 && prixPaye > 0) {
      // Le client utilise directement son crédit disponible
      const creditUtilise = Math.min(creditDisponible, prixPaye);
      
      // Nouveau prix après utilisation du crédit
      prixPaye = Math.max(0, prixPaye - creditUtilise);

      fideliteDetails = {
        pointsDisponibles,
        pointsFraction,
        creditDisponible,
        creditUtilise,
        pointsRestants: pointsDisponibles, // Les points ne changent pas lors de la consommation
      };
    }

    return {
      ...priceDetails,
      prixApresReduction,
      prixPaye,
      ajustement: ajustementDetails,
      fidelite: fideliteDetails,
    };
  }

  /**
   * Ajoute les propriétés prixApresReduction et prixPaye à un objet de prix
   */
  private static completerPriceDetails(baseDetails: any): PriceDetails {
    const prixApresReduction =
      baseDetails.reduction?.prixApresReduction || baseDetails.prixFinal;
    return {
      ...baseDetails,
      prixApresReduction,
      prixPaye: prixApresReduction, // Par défaut, pas d'ajustement supplémentaire
    };
  }
}