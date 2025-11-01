/**
 * Service de gestion de la fidélité client
 * 
 * Nouveau système simple :
 * - Le client accumule des points (1 point = 500 FCFA payés)
 * - Dès que le client atteint 40 points, conversion automatique en 2000 FCFA de crédit
 * - Le client consomme directement son crédit disponible lors des commandes
 */

const prisma = require('../utils/prismaClient');
const config = require('../config/config');

// ========================================
// CONSTANTES
// ========================================

const FIDELITY_CONSTANTS = {
  POINTS_PER_FCFA: 500,              // 1 point = 500 FCFA payés
  POINTS_FOR_CONVERSION: 40,          // 40 points = 1 pack
  CREDIT_PER_PACK: 2000,              // 1 pack = 2000 FCFA crédit
  CREDIT_PER_POINT: 50                // 1 point = 50 FCFA (pour info)
};

// ========================================
// FONCTIONS UTILITAIRES
// ========================================

/**
 * Calcule les points gagnés à partir du montant payé
 * @param {number} montantPaye - Montant payé en FCFA
 * @returns {{ pointsEntiers: number, fraction: number }}
 */
function calculatePointsFromAmount(montantPaye) {
  const pointsExacts = montantPaye / FIDELITY_CONSTANTS.POINTS_PER_FCFA;
  const pointsEntiers = Math.floor(pointsExacts);
  const fraction = pointsExacts - pointsEntiers;
  
  return { pointsEntiers, fraction };
}

/**
 * Convertit automatiquement les points en crédit
 * @param {number} pointsDisponibles - Points disponibles
 * @returns {{ creditGenere: number, pointsConsommes: number, pointsRestants: number }}
 */
function convertPointsToCredit(pointsDisponibles) {
  const paquetsComplets = Math.floor(pointsDisponibles / FIDELITY_CONSTANTS.POINTS_FOR_CONVERSION);
  
  if (paquetsComplets === 0) {
    return {
      creditGenere: 0,
      pointsConsommes: 0,
      pointsRestants: pointsDisponibles
    };
  }
  
  const creditGenere = paquetsComplets * FIDELITY_CONSTANTS.CREDIT_PER_PACK;
  const pointsConsommes = paquetsComplets * FIDELITY_CONSTANTS.POINTS_FOR_CONVERSION;
  const pointsRestants = pointsDisponibles - pointsConsommes;
  
  return { creditGenere, pointsConsommes, pointsRestants };
}

/**
 * Calcule le crédit à utiliser pour une commande
 * @param {number} creditDisponible - Crédit disponible
 * @param {number} montantAPayer - Montant à payer
 * @returns {{ creditUtilise: number, montantFinal: number }}
 */
function calculateCreditUsage(creditDisponible, montantAPayer) {
  const creditUtilise = Math.min(creditDisponible, montantAPayer);
  const montantFinal = Math.max(0, montantAPayer - creditUtilise);
  
  return { creditUtilise, montantFinal };
}

// ========================================
// FONCTIONS PRINCIPALES
// ========================================

/**
 * Ajoute des points de fidélité après une commande
 * Gère l'accumulation, la conversion automatique et la consommation de crédit
 * 
 * @param {Object} tx - Transaction Prisma
 * @param {Object} order - Commande créée
 * @param {number} order.clientUserId - ID du client
 * @param {number} order.prixPaye - Prix payé (après toutes réductions)
 * @param {number} order.masseClientIndicativeKg - Poids de la commande
 * @param {number} order.montantReductionPoints - Crédit utilisé pour cette commande
 * @returns {Promise<Object>} - Fidélité mise à jour
 */
async function addFidelityPoints(tx, order) {
  const fidelite = await tx.fidelite.findUnique({
    where: { clientUserId: order.clientUserId }
  });
  
  if (!fidelite) {
    console.log(`⚠️ No fidelity record found for client ${order.clientUserId}`);
    return null;
  }

  const poids = order.masseVerifieeKg || order.masseClientIndicativeKg || 0;
  const montantPaye = order.prixPaye === undefined ? (order.prixTotal || 0) : order.prixPaye;
  const creditUtilise = order.montantReductionPoints || 0;

  // 1. Mise à jour des statistiques de base
  const updatePayload = {
    nombreLavageTotal: fidelite.nombreLavageTotal + 1,
    poidsTotalLaveKg: fidelite.poidsTotalLaveKg + poids,
    prixTotalPaye: fidelite.prixTotalPaye + montantPaye
  };

  // 2. Déduction du crédit utilisé
  let creditDisponible = Math.max(0, fidelite.creditDisponible - creditUtilise);

  // 3. Calcul et ajout des nouveaux points
  if (montantPaye > 0) {
    const { pointsEntiers, fraction } = calculatePointsFromAmount(montantPaye);
    
    let pointsDisponible = (fidelite.pointsDisponible || 0) + pointsEntiers;
    let pointsFraction = (fidelite.pointsFraction || 0) + fraction;

    // Convertir les fractions accumulées en points entiers
    const extraPoints = Math.floor(pointsFraction);
    if (extraPoints > 0) {
      pointsDisponible += extraPoints;
      pointsFraction -= extraPoints;
    }

    // 4. Conversion automatique des points en crédit (40 pts → 2000 FCFA)
    const conversion = convertPointsToCredit(pointsDisponible);
    
    if (conversion.creditGenere > 0) {
      creditDisponible += conversion.creditGenere;
      pointsDisponible = conversion.pointsRestants;
    }

    // 5. Mise à jour finale
    updatePayload.pointsDisponible = pointsDisponible;
    updatePayload.pointsFraction = pointsFraction;
    updatePayload.creditDisponible = creditDisponible;
  } else {
    // Pas de points gagnés, mais mise à jour du crédit
    updatePayload.creditDisponible = creditDisponible;
  }

  return await tx.fidelite.update({
    where: { id: fidelite.id },
    data: updatePayload
  });
}

/**
 * Retire les points de fidélité lors de l'annulation d'une commande
 * Recalcule complètement la fidélité en excluant la commande annulée
 * Cette approche garantit la cohérence même si des conversions automatiques ont eu lieu
 * 
 * @param {Object} tx - Transaction Prisma
 * @param {Object} order - Commande annulée
 * @returns {Promise<Object>} - Fidélité mise à jour
 */
async function removeFidelityPoints(tx, order) {
  const fidelite = await tx.fidelite.findUnique({
    where: { clientUserId: order.clientUserId }
  });
  
  if (!fidelite) {
    console.log(`⚠️ No fidelity record found for client ${order.clientUserId}`);
    return null;
  }

  // Recalculer TOUTES les commandes du client SAUF celle annulée
  const commandes = await tx.commande.findMany({
    where: {
      clientUserId: order.clientUserId,
      flag: true, // Commandes actives uniquement
      id: { not: order.id } // EXCLURE la commande annulée
    },
    select: {
      id: true,
      masseVerifieeKg: true,
      masseClientIndicativeKg: true,
      prixPaye: true
    }
  });

  // Recalcul complet simple (même logique que recalculate-fidelite.js)
  let nombreLavageTotal = 0;
  let poidsTotalLaveKg = 0;
  let prixTotalPaye = 0;

  for (const cmd of commandes) {
    nombreLavageTotal += 1;
    const poids = cmd.masseVerifieeKg || cmd.masseClientIndicativeKg || 0;
    poidsTotalLaveKg += poids;
    prixTotalPaye += (cmd.prixPaye || 0);
  }

  // Calculer les points totaux à partir du prix payé
  const pointsExactsTotal = prixTotalPaye / FIDELITY_CONSTANTS.POINTS_PER_FCFA;
  
  // Conversion automatique: combien de packs de 40 points ?
  const nombrePacksComplets = Math.floor(pointsExactsTotal / FIDELITY_CONSTANTS.POINTS_FOR_CONVERSION);
  const creditDisponible = nombrePacksComplets * FIDELITY_CONSTANTS.CREDIT_PER_PACK;
  
  // Le reste devient points disponibles
  const pointsRestants = pointsExactsTotal - (nombrePacksComplets * FIDELITY_CONSTANTS.POINTS_FOR_CONVERSION);
  const pointsDisponible = Math.floor(pointsRestants);
  const pointsFraction = pointsRestants - pointsDisponible;

  const updatePayload = {
    nombreLavageTotal,
    poidsTotalLaveKg,
    prixTotalPaye,
    pointsDisponible,
    pointsFraction,
    creditDisponible
  };

  return await tx.fidelite.update({
    where: { id: fidelite.id },
    data: updatePayload
  });
}

/**
 * Met à jour les points de fidélité lors de la modification d'une commande
 * Recalcule la différence entre ancienne et nouvelle valeur
 * 
 * @param {Object} tx - Transaction Prisma
 * @param {Object} oldOrder - Ancienne commande
 * @param {Object} newOrder - Nouvelle commande
 * @returns {Promise<Object>} - Fidélité mise à jour
 */
async function updateFidelityPoints(tx, oldOrder, newOrder) {
  // Pour une modification de commande : ajuster la différence
  // Note : nombreLavageTotal ne change pas (même commande)
  
  const fidelite = await tx.fidelite.findUnique({
    where: { clientUserId: oldOrder.clientUserId }
  });
  
  if (!fidelite) {
    console.log(`⚠️ No fidelity record found for client ${oldOrder.clientUserId}`);
    return null;
  }

  // Calculer les anciennes valeurs (ce qui avait été ajouté)
  const oldMontantPaye = oldOrder.prixPaye === undefined ? (oldOrder.prixTotal || 0) : oldOrder.prixPaye;
  const oldPoids = oldOrder.masseVerifieeKg || oldOrder.masseClientIndicativeKg || 0;
  const oldPoints = calculatePointsFromAmount(oldMontantPaye);

  // Calculer les nouvelles valeurs (ce qui devrait être ajouté)
  const newMontantPaye = newOrder.prixPaye === undefined ? (newOrder.prixTotal || 0) : newOrder.prixPaye;
  const newPoids = newOrder.masseVerifieeKg || newOrder.masseClientIndicativeKg || 0;
  const newPoints = calculatePointsFromAmount(newMontantPaye);

  // Calculer les différences
  const diffPoids = newPoids - oldPoids;
  const diffMontant = newMontantPaye - oldMontantPaye;
  const diffPointsEntiers = newPoints.pointsEntiers - oldPoints.pointsEntiers;
  const diffFraction = newPoints.fraction - oldPoints.fraction;

  // Mise à jour des points
  let pointsDisponible = (fidelite.pointsDisponible || 0) + diffPointsEntiers;
  let pointsFraction = (fidelite.pointsFraction || 0) + diffFraction;

  // Gérer les fractions
  if (pointsFraction < 0) {
    pointsDisponible -= 1;
    pointsFraction += 1;
  } else if (pointsFraction >= 1) {
    const extraPoints = Math.floor(pointsFraction);
    pointsDisponible += extraPoints;
    pointsFraction -= extraPoints;
  }

  pointsDisponible = Math.max(0, pointsDisponible);
  pointsFraction = Math.max(0, pointsFraction);

  // Le crédit disponible n'est PAS modifié lors d'une mise à jour de commande
  // Il est géré uniquement par les conversions automatiques (40 pts → 2000 FCFA)
  let creditDisponible = fidelite.creditDisponible || 0;
  
  // Conversion automatique si nécessaire (si on a accumulé ≥40 points)
  const conversion = convertPointsToCredit(pointsDisponible);
  
  if (conversion.creditGenere > 0) {
    creditDisponible += conversion.creditGenere;
    pointsDisponible = conversion.pointsRestants;
    
    console.log(`💰 Conversion automatique (après modification): ${conversion.pointsConsommes} pts → ${conversion.creditGenere} FCFA`);
  }

  const updatePayload = {
    poidsTotalLaveKg: Math.max(0, fidelite.poidsTotalLaveKg + diffPoids),
    prixTotalPaye: Math.max(0, fidelite.prixTotalPaye + diffMontant),
    pointsDisponible,
    pointsFraction,
    creditDisponible
  };

  return await tx.fidelite.update({
    where: { id: fidelite.id },
    data: updatePayload
  });
}

/**
 * Initialise la fidélité pour un nouveau client
 * Crée un enregistrement de fidélité avec un numéro de carte automatique
 * 
 * @param {number} clientId - ID du client
 * @returns {Promise<Object>} - Fidélité créée
 */
async function initializeClientFidelite(clientId) {
  try {
    // Vérifier si le client existe
    const client = await prisma.user.findUnique({
      where: { 
        id: Number(clientId),
        role: 'Client'
      }
    });
    
    if (!client) {
      throw new Error('Client not found');
    }
    
    // Vérifier si la fidélité existe déjà
    const existingFidelite = await prisma.fidelite.findUnique({
      where: { clientUserId: Number(clientId) }
    });
    
    if (existingFidelite) {
      console.log(`⚠️ Loyalty record already exists for client ${clientId}`);
      return existingFidelite;
    }
    
    // Générer le numéro de carte de fidélité
    const { genererNumeroCarteFidelite } = require('../utils/fideliteUtils');
    const numeroCarteFidelite = await genererNumeroCarteFidelite(client.nom);
    
    // Créer le nouvel enregistrement de fidélité
    const newFidelite = await prisma.fidelite.create({
      data: {
        clientUserId: Number(clientId),
        numeroCarteFidelite,
        nombreLavageTotal: 0,
        poidsTotalLaveKg: 0,
        prixTotalPaye: 0,
        pointsDisponible: 0,
        pointsFraction: 0,
        creditDisponible: 0
      }
    });
    
    console.log(`✅ Carte de fidélité créée pour ${client.nom} ${client.prenom}: ${numeroCarteFidelite}`);
    
    return newFidelite;
  } catch (error) {
    console.error(`❌ Erreur lors de l'initialisation de la fidélité pour le client ${clientId}:`, error);
    throw error;
  }
}

/**
 * Recherche un client par son numéro de carte de fidélité
 * 
 * @param {string} numeroCarteFidelite - Numéro de carte de fidélité
 * @returns {Promise<Object|null>} - Client avec informations de fidélité
 */
async function getClientByNumeroCarteFidelite(numeroCarteFidelite) {
  try {
    const fidelite = await prisma.fidelite.findUnique({
      where: { numeroCarteFidelite },
      include: {
        clientUser: {
          select: {
            id: true,
            nom: true,
            prenom: true,
            email: true,
            telephone: true,
            typeClient: true,
            estEtudiant: true,
            adresseText: true,
            latitude: true,
            longitude: true
          }
        }
      }
    });

    if (!fidelite) {
      return null;
    }

    return {
      client: fidelite.clientUser,
      fidelite: {
        id: fidelite.id,
        numeroCarteFidelite: fidelite.numeroCarteFidelite,
        nombreLavageTotal: fidelite.nombreLavageTotal,
        poidsTotalLaveKg: fidelite.poidsTotalLaveKg,
        prixTotalPaye: fidelite.prixTotalPaye,
        pointsDisponible: fidelite.pointsDisponible || 0,
        pointsFraction: fidelite.pointsFraction || 0,
        creditDisponible: fidelite.creditDisponible || 0,
        createdAt: fidelite.createdAt,
        updatedAt: fidelite.updatedAt
      }
    };
  } catch (error) {
    console.error(`❌ Erreur lors de la recherche du client par carte ${numeroCarteFidelite}:`, error);
    throw error;
  }
}

// ========================================
// EXPORTS
// ========================================

module.exports = {
  // Constantes
  FIDELITY_CONSTANTS,
  
  // Fonctions utilitaires
  calculatePointsFromAmount,
  convertPointsToCredit,
  calculateCreditUsage,
  
  // Fonctions principales
  addFidelityPoints,
  removeFidelityPoints,
  updateFidelityPoints,
  
  // Fonctions d'initialisation et recherche
  initializeClientFidelite,
  getClientByNumeroCarteFidelite
};
