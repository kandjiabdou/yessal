const prisma = require('./prismaClient');

/**
 * Récupère l'abonnement premium le plus récent pour un client
 * @param {number} clientId - ID du client
 * @returns {Promise<Object|null>} - Abonnement premium ou null
 */
async function getCurrentPremiumSubscription(clientId) {
  return await prisma.abonnementpremiummensuel.findFirst({
    where: {
      clientUserId: clientId
    },
    orderBy: [
      { annee: 'desc' },
      { mois: 'desc' }
    ],
    select: {
      id: true,
      annee: true,
      mois: true,
      limiteKg: true,
      kgUtilises: true
    }
  });
}

/**
 * Enrichit les données client avec l'abonnement premium si applicable
 * @param {Object} client - Données client de base
 * @returns {Promise<Object>} - Client enrichi avec abonnement premium
 */
async function enrichClientWithPremiumData(client) {
  if (!client || client.typeClient !== 'Premium') {
    return {
      ...client,
      abonnementPremium: null
    };
  }

  const abonnementPremium = await getCurrentPremiumSubscription(client.id);
  
  return {
    ...client,
    abonnementPremium
  };
}

/**
 * Enrichit une liste de clients avec leurs abonnements premium
 * @param {Array} clients - Liste des clients
 * @returns {Promise<Array>} - Clients enrichis
 */
async function enrichClientsWithPremiumData(clients) {
  const enrichedClients = await Promise.all(
    clients.map(client => enrichClientWithPremiumData(client))
  );
  
  return enrichedClients;
}

module.exports = {
  getCurrentPremiumSubscription,
  enrichClientWithPremiumData,
  enrichClientsWithPremiumData
}; 