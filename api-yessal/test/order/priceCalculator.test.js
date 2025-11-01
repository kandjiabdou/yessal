const priceCalculator = require('../../src/utils/priceCalculator');

describe('PriceCalculator utils', () => {
  describe('calculerRepartitionMachines', () => {
    test('uses 6kg machines for small remainder', () => {
      const res = priceCalculator.calculerRepartitionMachines(45); // 2x20kg + remainder 5kg -> 1x6kg
      expect(res.nombreMachine20kg).toBe(2);
      expect(res.nombreMachine6kg).toBe(1);
      expect(res.prixMachines).toBe(2 * priceCalculator.PRIX_MACHINE_20KG + 1 * priceCalculator.PRIX_MACHINE_6KG);
    });

    test('prefers extra 20kg when 6kg cost more', () => {
      // remainder 13kg -> needs 3x6kg (6000) which is > one 20kg (4000)
      const res = priceCalculator.calculerRepartitionMachines(33); // 1x20kg + r=13 -> upgrade to 2x20kg
      expect(res.nombreMachine20kg).toBe(2);
      expect(res.nombreMachine6kg).toBe(0);
      expect(res.prixMachines).toBe(2 * priceCalculator.PRIX_MACHINE_20KG);
    });
  });

  describe('calculerPrixFormuleBase', () => {
    test('calculates base with livraison, sechage and express', () => {
      const poids = 10;
      const options = { aOptionSechage: true, aOptionExpress: true };
      const res = priceCalculator.calculerPrixFormuleBase(poids, options, true);

      // prixMachines computed from repartition
      expect(res.prixBase).toBeDefined();
      expect(res.prixOptions).toBeDefined();
      expect(res.options.livraison).toBe(priceCalculator.PRIX_LIVRAISON);
      expect(res.options.sechage.prix).toBe(poids * priceCalculator.PRIX_SECHAGE_PAR_KG);
      expect(res.options.express).toBe(priceCalculator.PRIX_EXPRESS);
      expect(res.prixTotal).toBe(res.prixBase + res.prixOptions);
    });

    test('does not add sechage or express when not in livraison', () => {
      const poids = 8;
      const options = { aOptionSechage: true, aOptionExpress: true };
      const res = priceCalculator.calculerPrixFormuleBase(poids, options, false);
      expect(res.options.livraison).toBeUndefined();
      expect(res.options.sechage).toBeUndefined();
      expect(res.options.express).toBeUndefined();
    });
  });

  describe('calculerPrixFormuleDetaillee', () => {
    test('calculates detaillee and adds express option', () => {
      const poids = 5;
      const res = priceCalculator.calculerPrixFormuleDetaillee(poids, { aOptionExpress: true });
      expect(res.prixBase).toBe(poids * priceCalculator.PRIX_AU_KILO);
      expect(res.prixOptions).toBe(priceCalculator.PRIX_EXPRESS);
      expect(res.prixTotal).toBe(res.prixBase + res.prixOptions);
      expect(res.inclus).toContain('lavage');
    });
  });

  describe('calculerPrixPremium', () => {
    test('when fully covered by quota, prixTotal equals options only', () => {
      const poids = 10;
      const cumulMensuel = 10; // quota remaining 30 -> covered
      const res = priceCalculator.calculerPrixPremium(poids, cumulMensuel, {});
      expect(res.surplus).toBe(0);
      expect(res.prixTotal).toBe(res.prixOptions);
      expect(res.estCouvertParAbonnement).toBe(true);
    });

    test('surplus < 6 uses Detail formule and marks obligatoire', () => {
      const poids = 5;
      const cumulMensuel = 39; // quotaRemaining = 1 -> surplus = 4 (<6)
      const res = priceCalculator.calculerPrixPremium(poids, cumulMensuel, {});
      expect(res.surplus).toBeGreaterThan(0);
      expect(res.surplusDetails).toBeDefined();
      expect(res.surplusDetails.formule).toBe('Detail');
      expect(res.surplusDetails.obligatoire).toBe(true);
    });

    test('surplus >= 6 returns BaseMachine choice by default', () => {
      const poids = 20;
      const cumulMensuel = 30; // quotaRemaining = 10 -> surplus = 10 (>=6)
      const res = priceCalculator.calculerPrixPremium(poids, cumulMensuel, { aOptionExpress: true });
      expect(res.surplus).toBeGreaterThanOrEqual(6);
      expect(res.surplusDetails.formule).toBe('BaseMachine');
      expect(res.surplusDetails.choixPossible).toContain('Detail');
    });
  });

  describe('appliquerReduction', () => {
    test('applies student reduction', () => {
      const prix = 10000;
      const res = priceCalculator.appliquerReduction(prix, 'Etudiant');
      expect(res.tauxReduction).toBe(10);
      expect(res.montantReduction).toBe(Math.round(prix * priceCalculator.REDUCTION_ETUDIANT));
      expect(res.prixApresReduction).toBe(prix - res.montantReduction);
    });

    test('unknown reduction returns zero', () => {
      const prix = 5000;
      const res = priceCalculator.appliquerReduction(prix, 'Unknown');
      expect(res.tauxReduction).toBe(0);
      expect(res.montantReduction).toBe(0);
      expect(res.prixApresReduction).toBe(prix);
    });
  });

  describe('calculateOrderPrice', () => {
    test('throws for non-premium with weight < 6', () => {
      const order = { formuleCommande: 'BaseMachine', masseVerifieeKg: 5, typeClient: 'Standard' };
      expect(() => priceCalculator.calculateOrderPrice(order)).toThrow('Le poids minimum est de 6 kg');
    });

    test('throws for unknown formule', () => {
      const order = { formuleCommande: 'Unknown', masseVerifieeKg: 10 };
      expect(() => priceCalculator.calculateOrderPrice(order)).toThrow('Formule inconnue: Unknown');
    });

    test('calculates price for Detail formula', () => {
      const order = { formuleCommande: 'Detail', masseVerifieeKg: 6, typeClient: 'Standard', typeReduction: null };
      const res = priceCalculator.calculateOrderPrice(order);
      expect(res.formule).toBe('Detail');
      expect(res.prixFinal).toBeDefined();
      expect(res.timestamp).toBeDefined();
    });

    test('calculates premium order and applies reduction only on surplus', () => {
      const order = { typeClient: 'Premium', masseVerifieeKg: 5, cumulMensuelKg: 0, typeReduction: 'Etudiant' };
      const res = priceCalculator.calculateOrderPrice(order);
      expect(res.formule).toBe('Premium');
      expect(res.reduction).toBeDefined();
      expect(res.prixFinal).toBeDefined();
      expect(res.timestamp).toBeDefined();
    });
  });
});
