/// <reference types="jest" />
import { PriceService } from '../src/services/price';
import { OrderOptions } from '../src/services/order';

describe('PriceService - Calculs de Commande', () => {
  const optionsBase: OrderOptions = {
    aOptionSechage: false,
    aOptionExpress: false,
    aOptionRepassage: false,
    aOptionLivraison: false,
  };

  describe('calculerPrixCommande', () => {
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
  });

  describe('calculerPrixComplet', () => {
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
  });
});
