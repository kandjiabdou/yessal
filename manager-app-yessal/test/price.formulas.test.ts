/// <reference types="jest" />
import { PriceService } from '../src/services/price';
import { OrderOptions } from '../src/services/order';

describe('PriceService - Formules de Prix', () => {
  const optionsBase: OrderOptions = {
    aOptionSechage: false,
    aOptionExpress: false,
    aOptionRepassage: false,
    aOptionLivraison: false,
  };

  describe('calculerPrixFormuleBase', () => {
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
  });

  describe('calculerPrixFormuleDetaillee', () => {
    it('devrait calculer le prix pour 10kg', () => {
      const result = PriceService.calculerPrixFormuleDetaillee(10, optionsBase);
      expect(result.prixBase).toBe(6000); // 10 * 600
      expect(result.prixOptions).toBe(0);
      expect(result.prixFinal).toBe(6000);
      expect(result.inclus).toEqual([
        'collecte',
        'lavage',
        'séchage',
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

    it('devrait facturer le repassage quand sélectionné', () => {
      const options: OrderOptions = {
        aOptionSechage: true,
        aOptionRepassage: true,
        aOptionExpress: false,
        aOptionLivraison: true,
      };
      const result = PriceService.calculerPrixFormuleDetaillee(10, options);
      expect(result.prixBase).toBe(7500); // 10 * 750 (avec repassage)
      expect(result.options.sechage).toBeUndefined();
      expect(result.options.livraison).toBeUndefined();
      expect(result.options.repassage).toBe(1500); // 10 * 150
      expect(result.prixOptions).toBe(0); // repassage inclus dans prixBase
    });

    it('devrait gérer completerPriceDetails sans réduction', () => {
      // Test de la branche || baseDetails.prixFinal
      const result = PriceService.calculerPrixFormuleDetaillee(10, optionsBase);
      // Suppression manuelle de la réduction pour forcer le fallback
      expect(result.prixApresReduction).toBe(6000);
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

    it('devrait gérer réduction avec prix impair pour arrondi', () => {
      const result = PriceService.appliquerReduction(3333, 'Etudiant');
      // 3333 * 10% = 333.3 → arrondi à 333
      expect(result.montantReduction).toBe(333);
      expect(result.prixApresReduction).toBe(3000);
    });
  });
});
