const prisma = require('./prismaClient');

// Import reconcileTypeClientForUser - using dynamic import to avoid circular dependency
let reconcileTypeClientForUser;
try {
  const userController = require('../controllers/userController');
  reconcileTypeClientForUser = userController.reconcileTypeClientForUser;
} catch (e) {
  console.warn('Could not import reconcileTypeClientForUser, will skip reconciliation');
}

/**
 * Récupère l'abonnement premium le plus récent pour un client
 * @param {number} clientId - ID du client
 * @returns {Promise<Object|null>} - Abonnement premium ou null
 */
async function getCurrentPremiumSubscription(clientId) {
  const today = new Date();
  const currentYear = today.getFullYear();
  const currentMonth = today.getMonth() + 1;

  return await prisma.abonnementpremiummensuel.findFirst({
    where: {
      clientUserId: clientId,
      annee: currentYear,
      mois: currentMonth
    },
    select: {
      id: true,
      annee: true,
      mois: true,
      limiteKg: true,
      kgUtilises: true,
      montant: true
    }
  });
}

/**
 * Enrichit les données client avec l'abonnement premium si applicable
 * @param {Object} client - Données client de base
 * @returns {Promise<Object>} - Client enrichi avec abonnement premium
 */
async function enrichClientWithPremiumData(client) {
  if (!client) {
    return {
      ...client,
      abonnementPremium: null
    };
  }

  // D'abord, récupérer l'abonnement premium actuel pour avoir les données complètes
  const abonnementPremium = await getCurrentPremiumSubscription(client.id);
  
  // Ajouter l'abonnement au client pour la réconciliation
  const clientWithAbonnement = {
    ...client,
    abonnementsPremium: abonnementPremium ? [abonnementPremium] : []
  };

  // Réconcilier le type de client (Premium/Standard) en fonction de l'abonnement et du quota
  if (reconcileTypeClientForUser && typeof reconcileTypeClientForUser === 'function') {
    await reconcileTypeClientForUser(clientWithAbonnement);
  }

  // Maintenant vérifier le type client après réconciliation
  if (clientWithAbonnement.typeClient !== 'Premium') {
    return {
      ...clientWithAbonnement,
      abonnementPremium: null
    };
  }

  return {
    ...clientWithAbonnement,
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