/// <reference types="jest" />
import { PriceService } from '../src/services/price';

describe('PriceService - Répartition des Machines', () => {
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
