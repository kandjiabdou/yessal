const { validate, schemas } = require('../../src/middleware/validation');
const config = require('../../src/config/config');

function makeReq(body = {}) {
  return { body };
}

function makeRes() {
  const json = jest.fn();
  const status = jest.fn(() => ({ json }));
  return { status, json };
}

describe('validation middleware and schemas', () => {
  test('validate middleware calls next on valid userCreate', () => {
    const req = makeReq({ role: 'CLIENT', nom: 'A', prenom: 'B', telephone: '123456789' });
    const res = makeRes();
    const next = jest.fn();

    const mw = validate(schemas.userCreate, 'body');
    mw(req, res, next);
    expect(next).toHaveBeenCalled();
  });

  test('validate middleware returns 400 on invalid userCreate', () => {
    const req = makeReq({}); // missing required fields
    const res = makeRes();
    const next = jest.fn();

    const mw = validate(schemas.userCreate, 'body');
    mw(req, res, next);
    expect(res.status).toHaveBeenCalledWith(400);
  expect(res.status().json).toHaveBeenCalledWith(expect.objectContaining({ success: false, message: 'Validation error' }));
    expect(next).not.toHaveBeenCalled();
  });

  // Helper to create a minimal prixCalcule object satisfying required fields
  function basePrixCalcule() {
    return {
      prixBase: 1000,
      prixOptions: 0,
      prixSousTotal: 1000,
      prixFinal: 1000,
      prixApresReduction: 1000,
      prixPaye: 1000,
      formule: 'BaseMachine',
      options: null,
      reduction: { tauxReduction: 0, montantReduction: 0, raisonReduction: null, prixApresReduction: 1000 },
      ajustement: null,
      fidelite: null,
      repartitionMachines: { machine20kg: 1, machine6kg: 0 }
    };
  }

  test('commandeCreate custom validator: missing ajustementType triggers custom error', () => {
    const prix = basePrixCalcule();

    const body = {
      siteLavageId: 1,
      masseClientIndicativeKg: config.business.minOrderWeightKg,
      formuleCommande: 'BaseMachine',
      modePaiement: 'Espece',
      options: { aOptionRepassage: false, aOptionSechage: false, aOptionLivraison: false, aOptionExpress: false },
      prixCalcule: prix,
      // Simulate partial adjustment provided: missing type
      ajustementType: null,
      ajustementMethode: 'Pourcentage',
      ajustementValeur: 10,
      ajustementRaison: 'Promo'
    };

    const req = makeReq(body);
    const res = makeRes();
    const next = jest.fn();

    const mw = validate(schemas.commandeCreate, 'body');
    mw(req, res, next);

    expect(res.status).toHaveBeenCalledWith(400);
    const called = res.status().json.mock.calls[0][0];
    // Joi returns details array with message matching our custom message
    expect(JSON.stringify(called.errors || called)).toMatch(/ajustement/);
    expect(next).not.toHaveBeenCalled();
  });

  test('commandeCreate custom validator: ajustementValeur <=0 triggers custom error', () => {
    const prix = basePrixCalcule();

    const body = {
      siteLavageId: 1,
      masseClientIndicativeKg: config.business.minOrderWeightKg,
      formuleCommande: 'BaseMachine',
      modePaiement: 'Espece',
      options: { aOptionRepassage: false, aOptionSechage: false, aOptionLivraison: false, aOptionExpress: false },
      prixCalcule: prix,
      ajustementType: 'Augmentation',
      ajustementMethode: 'Pourcentage',
      ajustementValeur: 0, // invalid -> should trigger custom.ajustementValeur
      ajustementRaison: 'Promo'
    };

    const req = makeReq(body);
    const res = makeRes();
    const next = jest.fn();

    const mw = validate(schemas.commandeCreate, 'body');
    mw(req, res, next);

    expect(res.status).toHaveBeenCalledWith(400);
    const called = res.status().json.mock.calls[0][0];
    expect(JSON.stringify(called.errors || called)).toMatch(/ajustement/);
    expect(next).not.toHaveBeenCalled();
  });

  test('commandeCreate custom validator: missing ajustementMethode triggers custom error', () => {
    const prix = basePrixCalcule();

    const body = {
      siteLavageId: 1,
      masseClientIndicativeKg: config.business.minOrderWeightKg,
      formuleCommande: 'BaseMachine',
      modePaiement: 'Espece',
      options: { aOptionRepassage: false, aOptionSechage: false, aOptionLivraison: false, aOptionExpress: false },
      prixCalcule: prix,
      ajustementType: 'Augmentation',
      ajustementMethode: null, // missing method
      ajustementValeur: 10,
      ajustementRaison: 'Promo'
    };

    const req = makeReq(body);
    const res = makeRes();
    const next = jest.fn();

    const mw = validate(schemas.commandeCreate, 'body');
    mw(req, res, next);

    expect(res.status).toHaveBeenCalledWith(400);
    const called = res.status().json.mock.calls[0][0];
    expect(JSON.stringify(called.errors || called)).toMatch(/ajustement/);
    expect(next).not.toHaveBeenCalled();
  });

  test('commandeCreate custom validator: empty ajustementRaison triggers custom error', () => {
    const prix = basePrixCalcule();

    const body = {
      siteLavageId: 1,
      masseClientIndicativeKg: config.business.minOrderWeightKg,
      formuleCommande: 'BaseMachine',
      modePaiement: 'Espece',
      options: { aOptionRepassage: false, aOptionSechage: false, aOptionLivraison: false, aOptionExpress: false },
      prixCalcule: prix,
      ajustementType: 'Augmentation',
      ajustementMethode: 'Pourcentage',
      ajustementValeur: 10,
      ajustementRaison: '   ' // whitespace only - should trigger custom.ajustementRaison
    };

    const req = makeReq(body);
    const res = makeRes();
    const next = jest.fn();

    const mw = validate(schemas.commandeCreate, 'body');
    mw(req, res, next);

    expect(res.status).toHaveBeenCalledWith(400);
    const called = res.status().json.mock.calls[0][0];
    expect(JSON.stringify(called.errors || called)).toMatch(/ajustement/);
    expect(next).not.toHaveBeenCalled();
  });
});
