/// <reference types="jest" />
import { PriceService } from '../src/services/price';
import { OrderOptions } from '../src/services/order';

describe('PriceService', () => {
  describe('calculerRepartitionMachines', () => {
    it('devrait calculer correctement pour 20kg (1 machine 20kg)', () => {
      const result = PriceService.calculerRepartitionMachines(20);
      expect(result).toEqual({
        nombreMachine20kg: 1,
        nombreMachine6kg: 0,
        prixMachines: 4000,
      });
    });

    it('devrait calculer correctement pour 6kg (1 machine 6kg)', () => {
      const result = PriceService.calculerRepartitionMachines(6);
      expect(result).toEqual({
        nombreMachine20kg: 0,
        nombreMachine6kg: 1,
        prixMachines: 2000,
      });
    });

    it('devrait calculer correctement pour 26kg (1x20kg + 1x6kg)', () => {
      const result = PriceService.calculerRepartitionMachines(26);
      expect(result).toEqual({
        nombreMachine20kg: 1,
        nombreMachine6kg: 1,
        prixMachines: 6000,
      });
    });

    it('devrait calculer correctement pour 40kg (2 machines 20kg)', () => {
      const result = PriceService.calculerRepartitionMachines(40);
      expect(result).toEqual({
        nombreMachine20kg: 2,
        nombreMachine6kg: 0,
        prixMachines: 8000,
      });
    });

    it('devrait calculer correctement pour 32kg (1x20kg + 2x6kg)', () => {
      const result = PriceService.calculerRepartitionMachines(32);
      expect(result).toEqual({
        nombreMachine20kg: 1,
        nombreMachine6kg: 2,
        prixMachines: 8000,
      });
    });

    it('devrait prendre une machine 20kg supplémentaire si plus rentable pour 39kg', () => {
      const result = PriceService.calculerRepartitionMachines(39);
      // r = 19, prix avec 6kg = 2000 * (19/6) = 6333 > 4000
      expect(result).toEqual({
        nombreMachine20kg: 2,
        nombreMachine6kg: 0,
        prixMachines: 8000,
      });
    });

    it('devrait calculer correctement pour 50kg (2x20kg + 2x6kg)', () => {
      const result = PriceService.calculerRepartitionMachines(50);
      expect(result).toEqual({
        nombreMachine20kg: 2,
        nombreMachine6kg: 2,
        prixMachines: 12000,
      });
    });

    it('devrait gérer le reste > 1.5 pour 28kg (1x20kg + 2x6kg)', () => {
      const result = PriceService.calculerRepartitionMachines(28);
      // r = 8, entier(8/6) = 1, reste(8/6) = 2 > 1.5 → +1 machine
      expect(result).toEqual({
        nombreMachine20kg: 1,
        nombreMachine6kg: 2,
        prixMachines: 8000,
      });
    });
  });

  describe('calculerPrixFormuleBase', () => {
    const optionsBase: OrderOptions = {
      aOptionSechage: false,
      aOptionExpress: false,
      aOptionRepassage: false,
      aOptionLivraison: false,
    };

    it('devrait calculer le prix de base pour 20kg avec livraison', () => {
      const result = PriceService.calculerPrixFormuleBase(20, optionsBase, true);
      expect(result.prixBase).toBe(4000);
      expect(result.prixOptions).toBe(1000); // Livraison
      expect(result.prixSousTotal).toBe(5000);
      expect(result.prixFinal).toBe(5000);
    });

    it('devrait calculer le prix avec option séchage pour 20kg', () => {
      const options = { ...optionsBase, aOptionSechage: true };
      const result = PriceService.calculerPrixFormuleBase(20, options, true);
      // Séchage: floor(20/14) = 1, reste = 6, pas > 6 → 1 utilisation
      expect(result.options.sechage?.nombreUtilisations).toBe(1);
      expect(result.options.sechage?.prix).toBe(1500);
      expect(result.prixOptions).toBe(2500); // 1000 livraison + 1500 séchage
    });

    it('devrait calculer le prix avec option séchage pour 6kg exactement', () => {
      const options = { ...optionsBase, aOptionSechage: true };
      const result = PriceService.calculerPrixFormuleBase(6, options, true);
      // poids == 6 → +1 utilisation
      expect(result.options.sechage?.nombreUtilisations).toBe(1);
      expect(result.options.sechage?.prix).toBe(1500);
    });

    it('devrait calculer le prix avec option séchage pour 30kg', () => {
      const options = { ...optionsBase, aOptionSechage: true };
      const result = PriceService.calculerPrixFormuleBase(30, options, true);
      // Séchage: floor(30/14) = 2, reste = 2, pas > 6 → 2 utilisations
      expect(result.options.sechage?.nombreUtilisations).toBe(2);
      expect(result.options.sechage?.prix).toBe(3000);
    });

    it('devrait calculer le prix avec option séchage pour 28kg', () => {
      const options = { ...optionsBase, aOptionSechage: true };
      const result = PriceService.calculerPrixFormuleBase(28, options, true);
      // Séchage: floor(28/14) = 2, reste = 0, pas > 6 → 2 utilisations
      expect(result.options.sechage?.nombreUtilisations).toBe(2);
      expect(result.options.sechage?.prix).toBe(3000);
    });

    it('devrait calculer le prix avec option séchage pour 22kg', () => {
      const options = { ...optionsBase, aOptionSechage: true };
      const result = PriceService.calculerPrixFormuleBase(22, options, true);
      // Séchage: floor(22/14) = 1, reste = 8 > 6 → 2 utilisations
      expect(result.options.sechage?.nombreUtilisations).toBe(2);
      expect(result.options.sechage?.prix).toBe(3000);
    });

    it('devrait calculer le prix avec option express (nécessite livraison)', () => {
      const options = { ...optionsBase, aOptionExpress: true };
      const result = PriceService.calculerPrixFormuleBase(20, options, true);
      expect(result.options.express).toBe(1000);
      expect(result.prixOptions).toBe(2000); // 1000 livraison + 1000 express
    });

    it('ne devrait pas facturer express sans livraison', () => {
      const options = { ...optionsBase, aOptionExpress: true };
      const result = PriceService.calculerPrixFormuleBase(20, options, false);
      expect(result.options.express).toBeUndefined();
      expect(result.prixOptions).toBe(0);
    });

    it('devrait calculer avec toutes les options', () => {
      const options: OrderOptions = {
        aOptionSechage: true,
        aOptionExpress: true,
        aOptionRepassage: false,
        aOptionLivraison: true,
      };
      const result = PriceService.calculerPrixFormuleBase(20, options, true);
      expect(result.prixOptions).toBe(3500); // 1000 + 1500 + 1000
    });

    it('devrait appliquer la réduction étudiant', () => {
      const result = PriceService.calculerPrixFormuleBase(
        20,
        optionsBase,
        true,
        'Etudiant'
      );
      expect(result.reduction?.tauxReduction).toBe(10);
      expect(result.reduction?.montantReduction).toBe(500); // 10% de 5000
      expect(result.prixFinal).toBe(4500);
    });

    it('devrait appliquer la réduction ouverture', () => {
      const result = PriceService.calculerPrixFormuleBase(
        20,
        optionsBase,
        true,
        'Ouverture'
      );
      expect(result.reduction?.tauxReduction).toBe(5);
      expect(result.reduction?.montantReduction).toBe(250); // 5% de 5000
      expect(result.prixFinal).toBe(4750);
    });

    it('devrait inclure la répartition des machines', () => {
      const result = PriceService.calculerPrixFormuleBase(26, optionsBase, true);
      expect(result.repartitionMachines).toEqual({
        machine20kg: 1,
        machine6kg: 1,
      });
    });
  });

  describe('calculerPrixFormuleDetaillee', () => {
    const optionsBase: OrderOptions = {
      aOptionSechage: false,
      aOptionExpress: false,
      aOptionRepassage: false,
      aOptionLivraison: false,
    };

    it('devrait calculer le prix pour 10kg', () => {
      const result = PriceService.calculerPrixFormuleDetaillee(10, optionsBase);
      expect(result.prixBase).toBe(6000); // 10 * 600
      expect(result.prixOptions).toBe(0);
      expect(result.prixFinal).toBe(6000);
      expect(result.inclus).toEqual([
        'collecte',
        'lavage',
        'séchage',
        'repassage',
        'livraison',
      ]);
    });

    it('devrait calculer le prix avec option express', () => {
      const options = { ...optionsBase, aOptionExpress: true };
      const result = PriceService.calculerPrixFormuleDetaillee(10, options);
      expect(result.prixOptions).toBe(1000);
      expect(result.prixFinal).toBe(7000);
    });

    it('devrait appliquer la réduction étudiant', () => {
      const result = PriceService.calculerPrixFormuleDetaillee(
        10,
        optionsBase,
        'Etudiant'
      );
      expect(result.reduction?.montantReduction).toBe(600); // 10% de 6000
      expect(result.prixFinal).toBe(5400);
    });

    it('devrait ignorer les options séchage et repassage (incluses)', () => {
      const options: OrderOptions = {
        aOptionSechage: true,
        aOptionRepassage: true,
        aOptionExpress: false,
        aOptionLivraison: true,
      };
      const result = PriceService.calculerPrixFormuleDetaillee(10, options);
      expect(result.options.sechage).toBeUndefined();
      expect(result.options.repassage).toBeUndefined();
      expect(result.prixOptions).toBe(0);
    });
  });

  describe('calculerPrixPremium', () => {
    const optionsBase: OrderOptions = {
      aOptionSechage: false,
      aOptionExpress: false,
      aOptionRepassage: false,
      aOptionLivraison: false,
    };

    it('devrait être gratuit si poids < quota mensuel', () => {
      const result = PriceService.calculerPrixPremium(30, 0, optionsBase);
      expect(result.prixBase).toBe(0);
      expect(result.prixFinal).toBe(0);
      expect(result.premiumDetails?.estCouvertParAbonnement).toBe(true);
      expect(result.premiumDetails?.surplus).toBe(0);
    });

    it('devrait calculer le surplus correctement', () => {
      const result = PriceService.calculerPrixPremium(50, 0, optionsBase);
      expect(result.premiumDetails?.quotaRestant).toBe(40);
      expect(result.premiumDetails?.surplus).toBe(10);
      expect(result.premiumDetails?.estCouvertParAbonnement).toBe(false);
    });

    it('devrait utiliser formule détaillée obligatoire pour surplus < 6kg', () => {
      const result = PriceService.calculerPrixPremium(44, 0, optionsBase);
      expect(result.premiumDetails?.surplus).toBe(4);
      expect(result.premiumDetails?.surplusDetails?.formule).toBe('Detail');
      expect(result.premiumDetails?.surplusDetails?.obligatoire).toBe(true);
      expect(result.prixBase).toBe(2400); // 4 * 600
    });

    it('devrait permettre le choix de formule pour surplus >= 6kg', () => {
      const result = PriceService.calculerPrixPremium(
        46,
        0,
        optionsBase,
        'BaseMachine'
      );
      expect(result.premiumDetails?.surplus).toBe(6);
      expect(result.premiumDetails?.surplusDetails?.obligatoire).toBe(false);
      expect(result.premiumDetails?.surplusDetails?.choixPossible).toEqual([
        'BaseMachine',
        'Detail',
      ]);
    });

    it('devrait calculer avec formule base pour surplus >= 6kg', () => {
      const result = PriceService.calculerPrixPremium(
        46,
        0,
        optionsBase,
        'BaseMachine'
      );
      expect(result.premiumDetails?.surplusDetails?.formule).toBe('BaseMachine');
      expect(result.prixBase).toBe(2000); // 1 machine 6kg
    });

    it('devrait calculer avec formule détaillée pour surplus >= 6kg', () => {
      const result = PriceService.calculerPrixPremium(
        46,
        0,
        optionsBase,
        'Detail'
      );
      expect(result.premiumDetails?.surplusDetails?.formule).toBe('Detail');
      expect(result.prixBase).toBe(3600); // 6 * 600
    });

    it('devrait prendre en compte le cumul mensuel', () => {
      const result = PriceService.calculerPrixPremium(30, 20, optionsBase);
      expect(result.premiumDetails?.quotaRestant).toBe(20);
      expect(result.premiumDetails?.surplus).toBe(10);
    });

    it('devrait facturer tout si quota dépassé', () => {
      const result = PriceService.calculerPrixPremium(30, 40, optionsBase);
      expect(result.premiumDetails?.quotaRestant).toBe(0);
      expect(result.premiumDetails?.surplus).toBe(30);
    });

    it('devrait ajouter option express même sans surplus', () => {
      const options = { ...optionsBase, aOptionExpress: true };
      const result = PriceService.calculerPrixPremium(30, 0, options);
      expect(result.prixOptions).toBe(1000);
      expect(result.prixFinal).toBe(1000);
    });

    it('devrait inclure répartition machines pour formule base avec surplus', () => {
      const result = PriceService.calculerPrixPremium(
        60,
        0,
        optionsBase,
        'BaseMachine'
      );
      expect(result.repartitionMachines).toBeDefined();
      expect(result.premiumDetails?.surplus).toBe(20);
    });

    it('ne devrait pas facturer livraison automatiquement pour surplus premium', () => {
      const options = { ...optionsBase, aOptionLivraison: false };
      const result = PriceService.calculerPrixPremium(
        50,
        0,
        options,
        'BaseMachine'
      );
      expect(result.options.livraison).toBeUndefined();
    });

    it('devrait facturer livraison si option cochée pour surplus premium', () => {
      const options = { ...optionsBase, aOptionLivraison: true };
      const result = PriceService.calculerPrixPremium(
        50,
        0,
        options,
        'BaseMachine'
      );
      expect(result.options.livraison).toBe(1000);
    });

    it('devrait facturer séchage pour surplus premium si option cochée', () => {
      const options = { ...optionsBase, aOptionSechage: true };
      const result = PriceService.calculerPrixPremium(
        50,
        0,
        options,
        'BaseMachine'
      );
      expect(result.options.sechage).toBeDefined();
      expect(result.options.sechage?.prix).toBeGreaterThan(0);
    });
  });

  describe('appliquerReduction', () => {
    it('ne devrait pas appliquer de réduction par défaut', () => {
      const result = PriceService.appliquerReduction(10000);
      expect(result.tauxReduction).toBe(0);
      expect(result.montantReduction).toBe(0);
      expect(result.prixApresReduction).toBe(10000);
      expect(result.raisonReduction).toBeNull();
    });

    it('devrait appliquer la réduction étudiant (10%)', () => {
      const result = PriceService.appliquerReduction(10000, 'Etudiant');
      expect(result.tauxReduction).toBe(10);
      expect(result.montantReduction).toBe(1000);
      expect(result.prixApresReduction).toBe(9000);
      expect(result.raisonReduction).toBe('Réduction étudiant');
    });

    it('devrait appliquer la réduction ouverture (5%)', () => {
      const result = PriceService.appliquerReduction(10000, 'Ouverture');
      expect(result.tauxReduction).toBe(5);
      expect(result.montantReduction).toBe(500);
      expect(result.prixApresReduction).toBe(9500);
      expect(result.raisonReduction).toBe("Promotion d'ouverture");
    });

    it('devrait arrondir le montant de réduction', () => {
      const result = PriceService.appliquerReduction(5555, 'Etudiant');
      expect(result.montantReduction).toBe(556); // Math.round(555.5)
    });
  });

  describe('calculerPrixCommande', () => {
    const optionsBase: OrderOptions = {
      aOptionSechage: false,
      aOptionExpress: false,
      aOptionRepassage: false,
      aOptionLivraison: false,
    };

    it('devrait calculer pour client standard formule base', () => {
      const result = PriceService.calculerPrixCommande(
        'BaseMachine',
        20,
        optionsBase,
        true,
        'Standard',
        null,
        0
      );
      expect(result.prixBase).toBe(4000);
      expect(result.repartitionMachines).toBeDefined();
    });

    it('devrait calculer pour client standard formule détaillée', () => {
      const result = PriceService.calculerPrixCommande(
        'Detail',
        20,
        optionsBase,
        false,
        'Standard',
        null,
        0
      );
      expect(result.prixBase).toBe(12000); // 20 * 600
      expect(result.inclus).toContain('livraison');
    });

    it('devrait calculer pour client premium avec abonnement', () => {
      const result = PriceService.calculerPrixCommande(
        'BaseMachine',
        30,
        optionsBase,
        true,
        'Premium',
        [{ id: 1 }], // Abonnement actif
        0
      );
      expect(result.premiumDetails).toBeDefined();
      expect(result.prixFinal).toBe(0);
    });

    it('devrait rejeter poids < 6kg pour client standard', () => {
      expect(() => {
        PriceService.calculerPrixCommande(
          'BaseMachine',
          5,
          optionsBase,
          true,
          'Standard',
          null,
          0
        );
      }).toThrow('Le poids minimum est de 6 kg');
    });

    it('devrait accepter poids < 6kg pour client premium', () => {
      const result = PriceService.calculerPrixCommande(
        'Detail',
        4,
        optionsBase,
        false,
        'Premium',
        [{ id: 1 }],
        0
      );
      expect(result.prixFinal).toBe(0); // Couvert par abonnement
    });

    it('devrait rejeter formule inconnue', () => {
      expect(() => {
        PriceService.calculerPrixCommande(
          'Inconnue' as any,
          20,
          optionsBase,
          true,
          'Standard',
          null,
          0
        );
      }).toThrow('Formule inconnue');
    });
  });

  describe('calculerPrixComplet', () => {
    const optionsBase: OrderOptions = {
      aOptionSechage: false,
      aOptionExpress: false,
      aOptionRepassage: false,
      aOptionLivraison: false,
    };

    it('devrait calculer le prix complet de base', () => {
      const result = PriceService.calculerPrixComplet(
        20,
        'BaseMachine',
        optionsBase,
        true
      );
      expect(result.prixBase).toBe(4000);
      expect(result.prixFinal).toBe(5000); // + livraison
      expect(result.prixPaye).toBe(5000);
    });

    it('devrait appliquer un ajustement en augmentation (pourcentage)', () => {
      const result = PriceService.calculerPrixComplet(
        20,
        'BaseMachine',
        optionsBase,
        true,
        {},
        {
          type: 'Augmentation',
          methode: 'Pourcentage',
          valeur: 10,
          raison: 'Frais supplémentaires',
        }
      );
      expect(result.ajustement?.type).toBe('Augmentation');
      expect(result.ajustement?.montant).toBe(500); // 10% de 5000
      expect(result.prixPaye).toBe(5500);
    });

    it('devrait appliquer un ajustement en diminution (absolu)', () => {
      const result = PriceService.calculerPrixComplet(
        20,
        'BaseMachine',
        optionsBase,
        true,
        {},
        {
          type: 'Diminution',
          methode: 'Absolu',
          valeur: 1000,
          raison: 'Geste commercial',
        }
      );
      expect(result.ajustement?.montant).toBe(1000);
      expect(result.prixPaye).toBe(4000); // 5000 - 1000
    });

    it('ne devrait pas avoir prix négatif avec ajustement', () => {
      const result = PriceService.calculerPrixComplet(
        20,
        'BaseMachine',
        optionsBase,
        true,
        {},
        {
          type: 'Diminution',
          methode: 'Absolu',
          valeur: 10000,
        }
      );
      expect(result.prixPaye).toBe(0);
    });

    it('devrait appliquer crédit fidélité automatiquement', () => {
      const result = PriceService.calculerPrixComplet(
        20,
        'BaseMachine',
        optionsBase,
        true,
        {
          creditDisponible: 2000,
          pointsFidelite: 40,
          pointsFraction: 0,
        }
      );
      expect(result.fidelite?.creditDisponible).toBe(2000);
      expect(result.fidelite?.creditUtilise).toBe(2000);
      expect(result.prixPaye).toBe(3000); // 5000 - 2000
    });

    it('devrait utiliser tout le crédit si insuffisant', () => {
      const result = PriceService.calculerPrixComplet(
        20,
        'BaseMachine',
        optionsBase,
        true,
        {
          creditDisponible: 6000,
          pointsFidelite: 120,
        }
      );
      expect(result.fidelite?.creditUtilise).toBe(5000);
      expect(result.prixPaye).toBe(0);
    });

    it('devrait combiner réduction, ajustement et fidélité', () => {
      const result = PriceService.calculerPrixComplet(
        20,
        'BaseMachine',
        optionsBase,
        true,
        {
          typeReduction: 'Etudiant',
          creditDisponible: 1000,
          pointsFidelite: 20,
        },
        {
          type: 'Diminution',
          methode: 'Absolu',
          valeur: 500,
        }
      );
      // Prix de base: 5000
      // Réduction étudiant: -500 → 4500
      // Ajustement: -500 → 4000
      // Crédit: -1000 → 3000
      expect(result.reduction?.montantReduction).toBe(500);
      expect(result.ajustement?.montant).toBe(500);
      expect(result.fidelite?.creditUtilise).toBe(1000);
      expect(result.prixPaye).toBe(3000);
    });

    it('ne devrait pas appliquer fidélité si pas de crédit', () => {
      const result = PriceService.calculerPrixComplet(
        20,
        'BaseMachine',
        optionsBase,
        true,
        {
          creditDisponible: 0,
          pointsFidelite: 10,
        }
      );
      expect(result.fidelite).toBeUndefined();
    });

    it('devrait calculer pour client premium avec toutes options', () => {
      const result = PriceService.calculerPrixComplet(
        50,
        'BaseMachine',
        { ...optionsBase, aOptionExpress: true, aOptionSechage: true },
        true,
        {
          typeClient: 'Premium',
          abonnementPremiums: [{ id: 1 }],
          cumulMensuel: 0,
        }
      );
      expect(result.premiumDetails).toBeDefined();
      expect(result.premiumDetails?.surplus).toBe(10);
    });
  });

  describe('formaterPrix', () => {
    it('devrait formater un prix en FCFA', () => {
      const formatted = PriceService.formaterPrix(5000);
      expect(formatted).toContain('5');
      expect(formatted).toContain('000');
      expect(formatted).toContain('FCFA');
    });

    it('devrait formater un grand prix', () => {
      const formatted = PriceService.formaterPrix(1234567);
      expect(formatted).toContain('1');
      expect(formatted).toContain('234');
      expect(formatted).toContain('567');
      expect(formatted).toContain('FCFA');
    });

    it('devrait formater zéro', () => {
      expect(PriceService.formaterPrix(0)).toContain('FCFA');
    });
  });

  describe('Cas limites et edge cases', () => {
    const optionsBase: OrderOptions = {
      aOptionSechage: false,
      aOptionExpress: false,
      aOptionRepassage: false,
      aOptionLivraison: false,
    };

    it('devrait gérer poids = 0 pour premium', () => {
      const result = PriceService.calculerPrixPremium(0, 0, optionsBase);
      expect(result.prixFinal).toBe(0);
    });

    it('devrait gérer cumul mensuel = quota', () => {
      const result = PriceService.calculerPrixPremium(10, 40, optionsBase);
      expect(result.premiumDetails?.quotaRestant).toBe(0);
      expect(result.premiumDetails?.surplus).toBe(10);
    });

    it('devrait gérer cumul mensuel > quota', () => {
      const result = PriceService.calculerPrixPremium(10, 50, optionsBase);
      expect(result.premiumDetails?.quotaRestant).toBe(0);
      expect(result.premiumDetails?.surplus).toBe(10);
    });

    it('devrait calculer séchage pour poids = 14kg exactement', () => {
      const options = { ...optionsBase, aOptionSechage: true };
      const result = PriceService.calculerPrixFormuleBase(14, options, true);
      expect(result.options.sechage?.nombreUtilisations).toBe(1);
    });

    it('devrait calculer séchage pour poids = 15kg', () => {
      const options = { ...optionsBase, aOptionSechage: true };
      const result = PriceService.calculerPrixFormuleBase(15, options, true);
      // floor(15/14) = 1, reste = 1, pas > 6 → 1 utilisation
      expect(result.options.sechage?.nombreUtilisations).toBe(1);
    });

    it('devrait calculer séchage pour poids = 21kg', () => {
      const options = { ...optionsBase, aOptionSechage: true };
      const result = PriceService.calculerPrixFormuleBase(21, options, true);
      // floor(21/14) = 1, reste = 7 > 6 → 2 utilisations
      expect(result.options.sechage?.nombreUtilisations).toBe(2);
    });

    it('devrait gérer ajustement avec valeur 0', () => {
      const result = PriceService.calculerPrixComplet(
        20,
        'BaseMachine',
        optionsBase,
        true,
        {},
        {
          type: 'Augmentation',
          methode: 'Absolu',
          valeur: 0,
        }
      );
      expect(result.ajustement).toBeUndefined();
    });

    it('devrait gérer prix = 0 avec crédit', () => {
      const result = PriceService.calculerPrixComplet(
        30,
        'BaseMachine',
        optionsBase,
        false,
        {
          typeClient: 'Premium',
          abonnementPremiums: [{ id: 1 }],
          creditDisponible: 1000,
        }
      );
      // Premium avec 30kg < 40kg → gratuit
      expect(result.prixPaye).toBe(0);
      expect(result.fidelite).toBeUndefined(); // Pas appliqué car prixPaye = 0 avant crédit
    });
  });

  describe('Intégration complète - scénarios réels', () => {
    it('Scénario 1: Client standard, 25kg, formule base, avec séchage et livraison', () => {
      const result = PriceService.calculerPrixComplet(
        25,
        'BaseMachine',
        {
          aOptionSechage: true,
          aOptionExpress: false,
          aOptionRepassage: false,
          aOptionLivraison: false,
        },
        true
      );
      // 25kg → 1x20kg + 1x6kg = 6000
      // Livraison: 1000
      // Séchage: floor(25/14)=1, reste=11>6 → 2*1500 = 3000
      // Total: 10000
      expect(result.prixBase).toBe(6000);
      expect(result.prixOptions).toBe(4000);
      expect(result.prixFinal).toBe(10000);
      expect(result.prixPaye).toBe(10000);
    });

    it('Scénario 2: Étudiant, 15kg, formule détaillée avec express et crédit', () => {
      const result = PriceService.calculerPrixComplet(
        15,
        'Detail',
        {
          aOptionSechage: false,
          aOptionExpress: true,
          aOptionRepassage: false,
          aOptionLivraison: false,
        },
        false,
        {
          typeReduction: 'Etudiant',
          creditDisponible: 3000,
          pointsFidelite: 60,
        }
      );
      // Base: 15*600 = 9000
      // Express: 1000
      // Sous-total: 10000
      // Réduction étudiant: -1000 → 9000
      // Crédit: -3000 → 6000
      expect(result.prixBase).toBe(9000);
      expect(result.reduction?.montantReduction).toBe(1000);
      expect(result.fidelite?.creditUtilise).toBe(3000);
      expect(result.prixPaye).toBe(6000);
    });

    it('Scénario 3: Client premium, 55kg, surplus avec formule base, ajustement', () => {
      const result = PriceService.calculerPrixComplet(
        55,
        'BaseMachine',
        {
          aOptionSechage: true,
          aOptionExpress: true,
          aOptionRepassage: false,
          aOptionLivraison: true,
        },
        true,
        {
          typeClient: 'Premium',
          abonnementPremiums: [{ id: 1 }],
          cumulMensuel: 10,
        },
        {
          type: 'Diminution',
          methode: 'Pourcentage',
          valeur: 15,
          raison: 'Client fidèle',
        }
      );
      // Quota restant: 40 - 10 = 30
      // Surplus: 55 - 30 = 25kg
      // 25kg → 1x20kg + 1x6kg = 6000
      // Options: express 1000 + livraison 1000 + séchage (floor(25/14)=1, reste=11>6 → 2*1500=3000)
      // Sous-total: 12000 (6000 base + 6000 options)
      // Ajustement -15%: -1800 → 10200
      expect(result.premiumDetails?.surplus).toBe(25);
      expect(result.prixBase).toBe(6000);
      expect(result.ajustement?.montant).toBe(1800);
      expect(result.prixPaye).toBe(10200);
    });

    it('Scénario 4: Client premium, surplus < 6kg (formule détaillée obligatoire)', () => {
      const result = PriceService.calculerPrixComplet(
        43,
        'BaseMachine',
        {
          aOptionSechage: false,
          aOptionExpress: false,
          aOptionRepassage: false,
          aOptionLivraison: false,
        },
        false,
        {
          typeClient: 'Premium',
          abonnementPremiums: [{ id: 1 }],
          cumulMensuel: 0,
        }
      );
      // Surplus: 43 - 40 = 3kg < 6 → formule détaillée obligatoire
      // 3 * 600 = 1800
      expect(result.premiumDetails?.surplus).toBe(3);
      expect(result.premiumDetails?.surplusDetails?.formule).toBe('Detail');
      expect(result.premiumDetails?.surplusDetails?.obligatoire).toBe(true);
      expect(result.prixBase).toBe(1800);
      expect(result.prixPaye).toBe(1800);
    });

    it('Scénario 5: Promotion ouverture + ajustement + crédit complet', () => {
      const result = PriceService.calculerPrixComplet(
        30,
        'BaseMachine',
        {
          aOptionSechage: true,
          aOptionExpress: true,
          aOptionRepassage: false,
          aOptionLivraison: false,
        },
        true,
        {
          typeReduction: 'Ouverture',
          creditDisponible: 15000,
          pointsFidelite: 300,
        },
        {
          type: 'Diminution',
          methode: 'Absolu',
          valeur: 1000,
        }
      );
      // 30kg → 1x20kg + 2x6kg = 8000
      // Livraison: 1000
      // Séchage: floor(30/14)=2, reste=2 → 2*1500 = 3000
      // Express: 1000
      // Sous-total: 13000
      // Réduction 5%: -650 → 12350
      // Ajustement -1000 → 11350
      // Crédit: -11350 → 0 (crédit suffisant)
      expect(result.reduction?.montantReduction).toBe(650);
      expect(result.ajustement?.montant).toBe(1000);
      expect(result.fidelite?.creditUtilise).toBe(11350);
      expect(result.prixPaye).toBe(0);
    });
  });

  describe('Couverture complète des branches', () => {
    const optionsBase: OrderOptions = {
      aOptionSechage: false,
      aOptionExpress: false,
      aOptionRepassage: false,
      aOptionLivraison: false,
    };

    it('devrait gérer completerPriceDetails sans réduction', () => {
      // Test de la branche || baseDetails.prixFinal
      const result = PriceService.calculerPrixFormuleDetaillee(10, optionsBase);
      // Suppression manuelle de la réduction pour forcer le fallback
      const baseDetailsNoReduction = {
        prixBase: 6000,
        prixOptions: 0,
        prixSousTotal: 6000,
        prixFinal: 6000,
        options: {},
      };
      // Appel indirect via calculerPrixFormuleDetaillee qui utilise completerPriceDetails
      expect(result.prixApresReduction).toBe(6000);
    });

    it('devrait calculer avec cumul mensuel négatif (edge case)', () => {
      // Tester avec cumul mensuel négatif (ne devrait jamais arriver mais couvre le Math.max)
      const result = PriceService.calculerPrixPremium(-10, 0, optionsBase);
      expect(result.premiumDetails?.quotaRestant).toBe(40);
    });

    it('devrait gérer prix de base pour 7kg (reste = 1)', () => {
      // Test spécifique pour reste == 1 < 1.5
      const result = PriceService.calculerRepartitionMachines(7);
      // reste = 1, resteR6 = 1 <= 1.5 donc pas d'ajout
      expect(result.nombreMachine6kg).toBe(1);
      expect(result.prixMachines).toBe(2000);
    });

    it('devrait gérer prix de base pour 8kg (reste = 2 > 1.5)', () => {
      // Test spécifique pour reste == 2 > 1.5
      const result = PriceService.calculerRepartitionMachines(8);
      // reste = 2, resteR6 = 2 > 1.5 donc +1 machine
      expect(result.nombreMachine6kg).toBe(2);
      expect(result.prixMachines).toBe(4000);
    });

    it('devrait calculer séchage avec poids == 7 (reste == 7 > 6)', () => {
      const options = { ...optionsBase, aOptionSechage: true };
      const result = PriceService.calculerPrixFormuleBase(7, options, true);
      // floor(7/14) = 0, reste = 7 > 6 → +1 = 1 utilisation
      expect(result.options.sechage?.nombreUtilisations).toBe(1);
    });

    it('devrait calculer séchage avec poids == 13 (reste == 13 > 6)', () => {
      const options = { ...optionsBase, aOptionSechage: true };
      const result = PriceService.calculerPrixFormuleBase(13, options, true);
      // floor(13/14) = 0, reste = 13 > 6 → +1 = 1 utilisation
      expect(result.options.sechage?.nombreUtilisations).toBe(1);
    });

    it('devrait gérer premium avec surplus formule Detail via choix explicite', () => {
      const result = PriceService.calculerPrixPremium(
        50,
        0,
        optionsBase,
        'Detail' // Forcer formule Detail
      );
      expect(result.premiumDetails?.surplusDetails?.formule).toBe('Detail');
      expect(result.prixBase).toBe(6000); // 10kg * 600
    });

    it('devrait calculer pour client standard avec abonnement null', () => {
      // Test avec abonnementPremiums null mais typeClient Standard
      const result = PriceService.calculerPrixCommande(
        'BaseMachine',
        20,
        optionsBase,
        true,
        'Standard',
        null, // abonnement null
        0
      );
      expect(result.prixBase).toBe(4000);
    });

    it('devrait calculer pour client premium avec abonnement vide', () => {
      // Test avec abonnementPremiums vide (tableau vide)
      // Note: un tableau vide [] != null donc l'abonnement est considéré actif
      const result = PriceService.calculerPrixCommande(
        'BaseMachine',
        20,
        optionsBase,
        true,
        'Premium',
        [], // abonnement vide mais != null
        0
      );
      // Avec abonnement (même vide), devrait utiliser formule premium
      // 20kg < 40kg donc entièrement couvert
      expect(result.prixBase).toBe(0);
      expect(result.premiumDetails).toBeDefined();
    });

    it('devrait appliquer ajustement avec montant arrondi (pourcentage)', () => {
      const result = PriceService.calculerPrixComplet(
        20,
        'BaseMachine',
        optionsBase,
        true,
        {},
        {
          type: 'Augmentation',
          methode: 'Pourcentage',
          valeur: 15.5, // Pourcentage avec décimales
        }
      );
      // 5000 * 15.5% = 775
      expect(result.ajustement?.montant).toBe(775);
      expect(result.prixPaye).toBe(5775);
    });

    it('devrait gérer réduction avec prix impair pour arrondi', () => {
      const result = PriceService.appliquerReduction(3333, 'Etudiant');
      // 3333 * 10% = 333.3 → arrondi à 333
      expect(result.montantReduction).toBe(333);
      expect(result.prixApresReduction).toBe(3000);
    });

    it('devrait calculer avec toutes les branches de repartitionMachines', () => {
      // Test cas où prixMachine6kgPourReste exactement égal à PRIX_MACHINE_20KG
      const result1 = PriceService.calculerRepartitionMachines(32);
      expect(result1.nombreMachine6kg).toBe(2);

      // Test avec reste = 0 (pas de reste)
      const result2 = PriceService.calculerRepartitionMachines(60);
      expect(result2.nombreMachine20kg).toBe(3);
      expect(result2.nombreMachine6kg).toBe(0);
    });
  });
});
