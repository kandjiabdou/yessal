const controller = require('../../src/controllers/orderController');
const helpers = controller._test;
const clientUtils = require('../../src/utils/clientUtils');

describe('orderController internal helpers', () => {
  beforeEach(() => jest.clearAllMocks());

  test('calculateAdjustedPrice various cases', () => {
    const { calculateAdjustedPrice } = helpers;
    expect(calculateAdjustedPrice(100, null, null, null)).toBe(100);
    expect(calculateAdjustedPrice(100, 'Augmentation', 'Pourcentage', 10)).toBeCloseTo(110);
    expect(calculateAdjustedPrice(100, 'Diminution', 'Pourcentage', 10)).toBeCloseTo(90);
    expect(calculateAdjustedPrice(100, 'Augmentation', 'Absolu', 20)).toBe(120);
    expect(calculateAdjustedPrice(50, 'Diminution', 'Absolu', 100)).toBe(0);
  });

  test('enrichOrderWithPremiumData returns original if no clientUser', async () => {
    const { enrichOrderWithPremiumData } = helpers;
    const o = { id: 1 };
    const out = await enrichOrderWithPremiumData(o);
    expect(out).toBe(o);
  });

  test('enrichOrderWithPremiumData calls clientUtils.enrichClientWithPremiumData', async () => {
    const { enrichOrderWithPremiumData } = helpers;
    jest.spyOn(clientUtils, 'enrichClientWithPremiumData').mockResolvedValue({ id: 5, nom: 'Z' });
    const o = { id: 1, clientUser: { id: 5, nom: 'X' } };
    const out = await enrichOrderWithPremiumData(o);
    expect(clientUtils.enrichClientWithPremiumData).toHaveBeenCalled();
    expect(out.clientUser).toEqual({ id: 5, nom: 'Z' });
  });

  test('enrichOrdersWithPremiumData maps orders', async () => {
    const { enrichOrdersWithPremiumData } = helpers;
    jest.spyOn(clientUtils, 'enrichClientWithPremiumData').mockImplementation(async (c) => ({ ...c, premium: true }));
    const orders = [{ id: 1, clientUser: { id: 1 } }, { id: 2 }];
    const out = await enrichOrdersWithPremiumData(orders);
    expect(out[0].clientUser.premium).toBe(true);
    expect(out[1]).toBeDefined();
  });

  test('canDeactivateOrder respects 24h limit', () => {
    const { canDeactivateOrder } = helpers;
    const now = new Date();
    const recent = new Date(now.getTime() - 1000 * 3600 * 2);
    const old = new Date(now.getTime() - 1000 * 3600 * 48);
    expect(canDeactivateOrder(recent).canDeactivate).toBe(true);
    expect(canDeactivateOrder(old).canDeactivate).toBe(false);
  });

  test('adjustPremiumSubscriptionOnCancel updates when subscription found', async () => {
    const { adjustPremiumSubscriptionOnCancel } = helpers;
    const tx = {
      user: { findUnique: jest.fn().mockResolvedValue({ typeClient: 'Premium' }) },
      abonnementpremiummensuel: {
        findUnique: jest.fn().mockResolvedValue({ id: 99, kgUtilises: 10 }),
        update: jest.fn().mockResolvedValue({})
      }
    };
    const order = { clientUserId: 7, masseVerifieeKg: 2, dateHeureCommande: new Date().toISOString() };
    await adjustPremiumSubscriptionOnCancel(tx, order, 123);
    expect(tx.abonnementpremiummensuel.update).toHaveBeenCalled();
  });

  test('adjustPremiumSubscriptionOnCancel logs when subscription missing', async () => {
    const { adjustPremiumSubscriptionOnCancel } = helpers;
    const tx = {
      user: { findUnique: jest.fn().mockResolvedValue({ typeClient: 'Premium' }) },
      abonnementpremiummensuel: { findUnique: jest.fn().mockResolvedValue(null) }
    };
    const order = { clientUserId: 7, masseVerifieeKg: 2, dateHeureCommande: new Date().toISOString() };
    // Should not throw
    await adjustPremiumSubscriptionOnCancel(tx, order, 456);
  });

  test('deactivateOrderRelatedRecords updates all related tables', async () => {
    const { deactivateOrderRelatedRecords } = helpers;
    const tx = {
      repartitionmachine: { updateMany: jest.fn().mockResolvedValue({}) },
      adresselivraison: { updateMany: jest.fn().mockResolvedValue({}) },
      paiement: { updateMany: jest.fn().mockResolvedValue({}) },
      historiquestatutcommande: { updateMany: jest.fn().mockResolvedValue({}) },
      commande: { update: jest.fn().mockResolvedValue({}) }
    };
    await deactivateOrderRelatedRecords(tx, 321);
    expect(tx.repartitionmachine.updateMany).toHaveBeenCalled();
    expect(tx.commande.update).toHaveBeenCalledWith({ where: { id: 321 }, data: { flag: false } });
  });

  test('sendDeliverySmsNotification logs when conditions met', () => {
    const { sendDeliverySmsNotification } = helpers;
    const spy = jest.spyOn(console, 'log').mockImplementation(() => {});
    sendDeliverySmsNotification('Livraison', 12, { estEnLivraison: true });
    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });
});
