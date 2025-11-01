const { schemas } = require('../../src/middleware/validation');

describe('Order validation schema', () => {
  test('commandeCreate should fail when required fields missing', () => {
    const payload = { /* empty payload */ };
    const { error } = schemas.commandeCreate.validate(payload, { abortEarly: false });
    expect(error).toBeDefined();
    // Expect errors for required fields: siteLavageId, masseClientIndicativeKg, formuleCommande
    const messages = error.details.map(d => d.message).join(' ');
    expect(messages).toMatch(/siteLavageId|masseClientIndicativeKg|formuleCommande/i);
  });

  test('commandeCreate should pass with minimal valid payload', () => {
    const payload = {
      siteLavageId: 1,
      masseClientIndicativeKg: 6,
      formuleCommande: 'BaseMachine',
      modePaiement: 'Espece',
      options: {
        aOptionRepassage: false,
        aOptionSechage: false,
        aOptionLivraison: false,
        aOptionExpress: false
      },
      prixCalcule: {
        prixBase: 1200,
        prixOptions: 0,
        prixSousTotal: 1200,
        prixFinal: 1200,
        prixApresReduction: 1200,
        prixPaye: 1200,
        formule: 'BaseMachine',
        options: {},
        repartitionMachines: { machine20kg: 0, machine6kg: 1 },
        premiumDetails: { quotaMensuel: 0, cumulMensuel: 0, quotaRestant: 0, poidsCouvert: 0, surplus: 0, estCouvertParAbonnement: false }
      }
    };

    const { error } = schemas.commandeCreate.validate(payload, { abortEarly: false });
    expect(error).toBeUndefined();
  });
});
