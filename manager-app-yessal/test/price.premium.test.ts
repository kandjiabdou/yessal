/// <reference types="jest" />
import { PriceService } from '../src/services/price';
import { OrderOptions } from '../src/services/order';

describe('PriceService - Abonnement Premium', () => {
  const optionsBase: OrderOptions = {
    aOptionSechage: false,
    aOptionExpress: false,
    aOptionRepassage: false,
    aOptionLivraison: false,
  };

  describe('calculerPrixPremium', () => {
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

    it('devrait calculer avec cumul mensuel négatif (edge case)', () => {
      // Tester avec cumul mensuel négatif (ne devrait jamais arriver mais couvre le Math.max)
      const result = PriceService.calculerPrixPremium(-10, 0, optionsBase);
      expect(result.premiumDetails?.quotaRestant).toBe(40);
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
  });
});
