/// <reference types="jest" />
import { PriceService } from '../src/services/price';

describe('PriceService - Utilitaires', () => {
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

    it('devrait formater les nombres avec espaces de milliers', () => {
      const formatted = PriceService.formaterPrix(1000000);
      expect(formatted).toMatch(/1[\s\u202F]000[\s\u202F]000/);
    });

    it('devrait gérer les nombres négatifs', () => {
      const formatted = PriceService.formaterPrix(-5000);
      expect(formatted).toContain('FCFA');
    });
  });
});
