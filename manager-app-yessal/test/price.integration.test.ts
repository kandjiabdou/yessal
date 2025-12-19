/// <reference types="jest" />
import { PriceService } from '../src/services/price';
import { OrderOptions } from '../src/services/order';

describe('PriceService - Scénarios d\'Intégration', () => {
  describe('Scénarios réels complets', () => {
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

    it('Scénario 6: Grande commande 100kg avec toutes les options', () => {
      const result = PriceService.calculerPrixComplet(
        100,
        'BaseMachine',
        {
          aOptionSechage: true,
          aOptionExpress: true,
          aOptionRepassage: false,
          aOptionLivraison: false,
        },
        true,
        {
          typeReduction: 'Etudiant',
          creditDisponible: 5000,
          pointsFidelite: 100,
        }
      );
      // 100kg → 5x20kg = 20000
      // Livraison: 1000
      // Séchage: floor(100/14)=7, reste=2 → 7*1500 = 10500
      // Express: 1000
      // Sous-total: 32500
      // Réduction 10%: -3250 → 29250
      // Crédit: -5000 → 24250
      expect(result.prixBase).toBe(20000);
      expect(result.reduction?.montantReduction).toBe(3250);
      expect(result.fidelite?.creditUtilise).toBe(5000);
      expect(result.prixPaye).toBe(24250);
    });

    it('Scénario 7: Client premium avec quota exactement atteint', () => {
      const result = PriceService.calculerPrixComplet(
        40,
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
      // 40kg = quota exact → gratuit
      expect(result.premiumDetails?.surplus).toBe(0);
      expect(result.premiumDetails?.estCouvertParAbonnement).toBe(true);
      expect(result.prixBase).toBe(0);
      expect(result.prixPaye).toBe(0);
    });

    it('Scénario 8: Combinaison extreme - premium + surplus + toutes options + ajustements', () => {
      const result = PriceService.calculerPrixComplet(
        75,
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
          cumulMensuel: 15,
          creditDisponible: 3000,
          pointsFidelite: 60,
        },
        {
          type: 'Diminution',
          methode: 'Absolu',
          valeur: 2000,
          raison: 'Compensation',
        }
      );
      // Quota restant: 40 - 15 = 25
      // Surplus: 75 - 25 = 50kg
      // 50kg → 2x20kg + 2x6kg = 12000
      // Options: express 1000 + livraison 1000 + séchage
      // Ajustement: -2000
      // Crédit: -3000
      expect(result.premiumDetails?.surplus).toBe(50);
      expect(result.ajustement?.montant).toBe(2000);
      expect(result.fidelite?.creditUtilise).toBe(3000);
    });
  });
});
