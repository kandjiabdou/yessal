const prisma = require('../utils/prismaClient');

// Helper: sort abonnements relative to current month -> current/next first then future, then past
function sortAbonnementsRelative(abonnements) {
  if (!Array.isArray(abonnements)) return abonnements;
  const now = new Date();
  const curY = now.getFullYear();
  const curM = now.getMonth() + 1;

  return abonnements.slice().sort((a, b) => {
    const diffA = (a.annee - curY) * 12 + (a.mois - curM);
    const diffB = (b.annee - curY) * 12 + (b.mois - curM);

    const keyA = diffA >= 0 ? diffA : 100000 + Math.abs(diffA);
    const keyB = diffB >= 0 ? diffB : 100000 + Math.abs(diffB);

    return keyA - keyB;
  });
}

/**
 * Ensure a user's typeClient matches presence of a current-month premium abonnement.
 * If mismatch, update the DB and the passed user object.
 */
async function reconcileTypeClientForUser(user) {
  if (!user || typeof user !== 'object') return user;
  try {
    const now = new Date();
    const curY = now.getFullYear();
    const curM = now.getMonth() + 1;

    const hasCurrent = Array.isArray(user.abonnementsPremium) && user.abonnementsPremium.some(ab => Number(ab.annee) === curY && Number(ab.mois) === curM);

    if (hasCurrent && user.typeClient !== 'Premium') {
      await prisma.user.update({ where: { id: Number(user.id) }, data: { typeClient: 'Premium' } });
      user.typeClient = 'Premium';
    } else if (!hasCurrent && user.typeClient === 'Premium') {
      await prisma.user.update({ where: { id: Number(user.id) }, data: { typeClient: 'Standard' } });
      user.typeClient = 'Standard';
    }
  } catch (e) {
    console.error('Error reconciling user.typeClient for user', user && user.id, e);
  }

  return user;
}

/**
 * Get all users with optional filtering
 */
const getUsers = async (req, res, next) => {
  try {
    const { role, search, typeClient, siteLavageId, estEtudiant, page = 1, limit = 10 } = req.query;
    // Compute current year and month to filter out past subscriptions
    const now = new Date();
    const curY = now.getFullYear();
    const curM = now.getMonth() + 1;
    
    // Build filter conditions
    const where = {};
    
    if (role) {
      where.role = role;
    }
    
    if (search) {
      where.OR = [
        { nom: { contains: search } },
        { prenom: { contains: search } },
        { email: { contains: search } },
        { telephone: { contains: search } }
      ];
    }
    
    // Filter by client type
    if (typeClient) {
      where.typeClient = typeClient;
    }
    
    // Filter by site
    if (siteLavageId) {
      where.siteLavagePrincipalGerantId = Number(siteLavageId);
    }
    
    // Filter by student status
    if (estEtudiant !== undefined) {
      where.estEtudiant = estEtudiant === 'true';
    }
    
    // Calculate pagination
    const skip = (page - 1) * Number(limit);
    
    // Get users
    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        select: {
          id: true,
          role: true,
          nom: true,
          prenom: true,
          email: true,
          telephone: true,
          adresseText: true,
          latitude: true,
          longitude: true,
          aGeolocalisationEnregistree: true,
          typeClient: true,
          estEtudiant: true,
          siteLavagePrincipalGerantId: true,
          createdAt: true,
          updatedAt: true,
          fidelite: {
            select: {
              numeroCarteFidelite: true,
              nombreLavageTotal: true,
              poidsTotalLaveKg: true,
              prixTotalPaye: true,
              pointsDisponible: true,
              pointsFraction: true
            }
          },
          abonnementsPremium: {
            where: {
              OR: [
                { annee: { gt: curY } },
                { AND: [ { annee: curY }, { mois: { gte: curM } } ] }
              ]
            },
            select: {
              id: true,
              annee: true,
              mois: true,
              limiteKg: true,
              kgUtilises: true,
              createdAt: true
              ,
              createdBy: {
                select: {
                  id: true,
                  nom: true,
                  prenom: true
                }
              }
            },
            orderBy: [
              { annee: 'desc' },
              { mois: 'desc' }
            ]
          }
        },
        skip,
        take: Number(limit),
        orderBy: { createdAt: 'desc' }
      }),
      prisma.user.count({ where })
    ]);
    
    // Calculate pagination metadata
    const totalPages = Math.ceil(total / Number(limit));
    
    // Map, normalize abonnements and reconcile typeClient for each user
    const normalizedUsers = await Promise.all(users.map(async (u) => {
      const u2 = {
        ...u,
        abonnementsPremium: sortAbonnementsRelative((u.abonnementsPremium || []).map(ab => ({
          ...ab,
          createdBy: ab.createdBy ? `${ab.createdBy.prenom || ''} ${ab.createdBy.nom || ''}`.trim() : null
        })))
      };

      // Reconcile DB status based on current-month abonnement presence
      await reconcileTypeClientForUser(u2);
      return u2;
    }));

    res.status(200).json({
      success: true,
      data: normalizedUsers,
      meta: {
        total,
        page: Number(page),
        limit: Number(limit),
        totalPages
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get a single user by ID
 */
const getUserById = async (req, res, next) => {
  try {
    const { id } = req.params;
    
    const now = new Date();
    const curY = now.getFullYear();
    const curM = now.getMonth() + 1;

    const user = await prisma.user.findUnique({
      where: { id: Number(id) },
      select: {
        id: true,
        role: true,
        nom: true,
        prenom: true,
        email: true,
        telephone: true,
        adresseText: true,
        latitude: true,
        longitude: true,
        aGeolocalisationEnregistree: true,
        typeClient: true,
        siteLavagePrincipalGerantId: true,
        createdAt: true,
        updatedAt: true,
        // Include related info for clients
        fidelite: req.user.role === 'Manager' ? {
          select: {
            nombreLavageTotal: true,
            poidsTotalLaveKg: true,
            prixTotalPaye: true,
            pointsDisponible: true,
            pointsFraction: true
          }
        } : false,
        abonnementsPremium: {
          where: {
            OR: [
              { annee: { gt: curY } },
              { AND: [ { annee: curY }, { mois: { gte: curM } } ] }
            ]
          },
          select: {
            id: true,
            annee: true,
            mois: true,
            limiteKg: true,
            kgUtilises: true,
            createdAt: true
            ,
            createdBy: {
              select: {
                id: true,
                nom: true,
                prenom: true
              }
            }
          },
          orderBy: [
            { annee: 'desc' },
            { mois: 'desc' }
          ]
        }
      }
    });
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    // Reconcile and persist typeClient based on abonnements we already fetched
    await reconcileTypeClientForUser(user);
    
    // Map createdBy into a friendly string then sort abonnements so current/next are first
    if (user.abonnementsPremium) {
      user.abonnementsPremium = sortAbonnementsRelative(user.abonnementsPremium.map(ab => ({
        ...ab,
        createdBy: ab.createdBy ? `${ab.createdBy.prenom || ''} ${ab.createdBy.nom || ''}`.trim() : null
      })));
    }

    res.status(200).json({
      success: true,
      data: user
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get current authenticated user
 */
const getCurrentUser = async (req, res, next) => {
  try {
    const userId = req.user.id;
    
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        role: true,
        nom: true,
        prenom: true,
        email: true,
        telephone: true,
        adresseText: true,
        latitude: true,
        longitude: true,
        aGeolocalisationEnregistree: true,
        typeClient: true,
        siteLavagePrincipalGerantId: true,
        createdAt: true,
        updatedAt: true,
        // Include fidelity info for clients
        fidelite: req.user.role === 'Client' ? {
          select: {
            nombreLavageTotal: true,
            poidsTotalLaveKg: true,
            prixTotalPaye: true,
            pointsDisponible: true,
            pointsFraction: true
          }
        } : false,
        // Include premium subscription info for premium clients
        abonnementsPremium: req.user.role === 'Client' && req.user.typeClient === 'Premium' ? {
          where: {
            // Get current month subscription
            AND: [
              { annee: new Date().getFullYear() },
              { mois: new Date().getMonth() + 1 }
            ]
          },
          select: {
            limiteKg: true,
            kgUtilises: true,
            createdBy: {
              select: {
                id: true,
                nom: true,
                prenom: true
              }
            }
          }
        } : false
      }
    });
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    // Reconcile and persist typeClient based on abonnements we already fetched
    await reconcileTypeClientForUser(user);

    if (user.abonnementsPremium) {
      user.abonnementsPremium = sortAbonnementsRelative(user.abonnementsPremium.map(ab => ({
        ...ab,
        createdBy: ab.createdBy ? `${ab.createdBy.prenom || ''} ${ab.createdBy.nom || ''}`.trim() : null
      })));
    }

    res.status(200).json({
      success: true,
      data: user
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update user
 */
const updateUser = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = Number(id);
    
    // Check permissions - only managers can update other users
    if (req.user.role !== 'Manager' && req.user.id !== userId) {
      return res.status(403).json({
        success: false,
        message: 'You are not authorized to update this user'
      });
    }
    
    // Extract updatable fields
    const {
      nom,
      prenom,
      email,
      telephone,
      adresseText,
      latitude,
      longitude,
      typeClient,
      estEtudiant,
      siteLavagePrincipalGerantId
    } = req.body;
    
    // Check if user exists
    const existingUser = await prisma.user.findUnique({
      where: { id: userId }
    });
    
    if (!existingUser) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    // Only managers can update typeClient and siteLavagePrincipalGerantId
    const updateData = {
      nom,
      prenom,
      email: email && email.trim() !== '' ? email.trim() : null,
      telephone: telephone && telephone.trim() !== '' ? telephone.trim() : null,
      adresseText: adresseText && adresseText.trim() !== '' ? adresseText.trim() : null,
      latitude,
      longitude,
      aGeolocalisationEnregistree: !!(latitude && longitude)
    };

    // Only managers can update estEtudiant
    if (req.user.role === 'Manager' && estEtudiant !== undefined) {
      updateData.estEtudiant = estEtudiant;
    }
    
    if (req.user.role === 'Manager') {
      if (typeClient !== undefined) {
        updateData.typeClient = typeClient;
      }
      
      if (siteLavagePrincipalGerantId !== undefined) {
        updateData.siteLavagePrincipalGerantId = siteLavagePrincipalGerantId;
      }
    }
    
    // Update user
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: updateData,
      select: {
        id: true,
        role: true,
        nom: true,
        prenom: true,
        email: true,
        telephone: true,
        adresseText: true,
        latitude: true,
        longitude: true,
        aGeolocalisationEnregistree: true,
        typeClient: true,
        estEtudiant: true,
        siteLavagePrincipalGerantId: true,
        createdAt: true,
        updatedAt: true
      }
    });
    
    res.status(200).json({
      success: true,
      message: 'User updated successfully',
      data: updatedUser
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete user
 */
const deleteUser = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = Number(id);
    
    // Only managers can delete users
    if (req.user.role !== 'Manager') {
      return res.status(403).json({
        success: false,
        message: 'Only managers can delete users'
      });
    }
    
    // Check if user exists
    const existingUser = await prisma.user.findUnique({
      where: { id: userId }
    });
    
    if (!existingUser) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Delete user and all related records in a transaction
    await prisma.$transaction(async (tx) => {
      // First, get all user's commands to delete related records
      const userCommands = await tx.commande.findMany({
        where: { clientUserId: userId },
        select: { id: true }
      });
      
      const commandIds = userCommands.map(cmd => cmd.id);
      
      // Delete all records related to user's commands
      if (commandIds.length > 0) {
        // Delete command-related records in proper order
        await tx.adresselivraison.deleteMany({
          where: { commandeId: { in: commandIds } }
        });
        
        await tx.commandeoptions.deleteMany({
          where: { commandeId: { in: commandIds } }
        });
        
        await tx.repartitionmachine.deleteMany({
          where: { commandeId: { in: commandIds } }
        });
        
        await tx.historiquestatutcommande.deleteMany({
          where: { commandeId: { in: commandIds } }
        });
        
        await tx.paiement.deleteMany({
          where: { commandeId: { in: commandIds } }
        });
      }

      // Delete user's orders
      await tx.commande.deleteMany({
        where: { clientUserId: userId }
      });

      // Delete premium subscriptions
      await tx.abonnementpremiummensuel.deleteMany({
        where: { clientUserId: userId }
      });

      // Delete fidelity record
      await tx.fidelite.deleteMany({
        where: { clientUserId: userId }
      });

      // Finally delete the user
      await tx.user.delete({
        where: { id: userId }
      });
    });
    
    res.status(200).json({
      success: true,
      message: 'User deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update user geolocation
 */
const updateUserGeolocation = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { latitude, longitude, adresseText, saveAsDefault } = req.body;
    
    // Update user's geolocation
    const updateData = {
      latitude,
      longitude,
      adresseText
    };
    
    if (saveAsDefault) {
      updateData.aGeolocalisationEnregistree = true;
    }
    
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: updateData,
      select: {
        id: true,
        latitude: true,
        longitude: true,
        adresseText: true,
        aGeolocalisationEnregistree: true
      }
    });
    
    res.status(200).json({
      success: true,
      message: 'Geolocation updated successfully',
      data: updatedUser
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get guest clients (clients invités)
 */
const getGuestClients = async (req, res, next) => {
  try {
    const { search, page = 1, limit = 10 } = req.query;
    
    // Build filter conditions
    const where = {};
    
    if (search) {
      where.OR = [
        { nom: { contains: search } },
        { prenom: { contains: search } },
        { email: { contains: search } },
        { telephone: { contains: search } }
      ];
    }
    
    // Calculate pagination
    const skip = (page - 1) * Number(limit);
    
    // Get guest clients
    const [guestClients, total] = await Promise.all([
      prisma.clientinvite.findMany({
        where,
        select: {
          id: true,
          nom: true,
          prenom: true,
          email: true,
          telephone: true,
          adresseText: true
        },
        skip,
        take: Number(limit),
        orderBy: { id: 'desc' }
      }),
      prisma.clientinvite.count({ where })
    ]);
    
    // Calculate pagination metadata
    const totalPages = Math.ceil(total / Number(limit));
    
    res.status(200).json({
      success: true,
      data: guestClients,
      meta: {
        total,
        page: Number(page),
        limit: Number(limit),
        totalPages
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Create premium subscription for a user
 */
const createAbonnementPremium = async (req, res, next) => {
  try {
    const { id } = req.params;
  // Payload: { start: 'this'|'next' } OR { startMonth: 'YYYY-MM' }, count: number, limiteKg?: number
  const { start = 'this', startMonth, count = 1, limiteKg } = req.body;

  const currentDate = new Date();

    // Vérifier que l'utilisateur existe et est un client Premium
    const user = await prisma.user.findUnique({
      where: { id: Number(id) },
      select: { id: true, typeClient: true, estEtudiant: true }
    });

    if (!user) {
      return res.status(404).json({ success: false, message: 'Utilisateur non trouvé' });
    }

    // Determine starting month: prefer explicit startMonth ('YYYY-MM'), else support 'this'/'next'
    let startMonthDate;
    if (startMonth) {
      // expect format YYYY-MM
      const parts = String(startMonth).split('-');
      const y = Number(parts[0]);
      const m = Number(parts[1]);
      if (!y || !m || m < 1 || m > 12) {
        return res.status(400).json({ success: false, message: 'startMonth must be in format YYYY-MM' });
      }
      startMonthDate = new Date(y, m - 1, 1);
    } else {
      startMonthDate = start === 'next' ? new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1) : new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
    }

    // Server-side enforcement: do not allow creating subscriptions starting in the past.
    const firstOfCurrentMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
    if (startMonthDate < firstOfCurrentMonth) {
      return res.status(400).json({ success: false, message: "Le mois de début ne peut pas être dans le passé" });
    }

    const toCreate = [];
    for (let i = 0; i < Number(count); i++) {
      const d = new Date(startMonthDate.getFullYear(), startMonthDate.getMonth() + i, 1);
      toCreate.push({ annee: d.getFullYear(), mois: d.getMonth() + 1 });
    }

    // Check duplicates
    const conflicts = [];
    for (const item of toCreate) {
      const exists = await prisma.abonnementpremiummensuel.findUnique({
        where: { clientUserId_annee_mois: { clientUserId: Number(id), annee: item.annee, mois: item.mois } }
      });
      if (exists) conflicts.push({ annee: item.annee, mois: item.mois });
    }

    if (conflicts.length > 0) {
      return res.status(409).json({ success: false, message: 'Des abonnements existent déjà pour certaines périodes', conflicts });
    }

    // create records in a transaction
    const created = [];
  const montantParMoisBase = 15000;
  // Apply 10% student discount when applicable
  const montantParMois = user.estEtudiant ? Math.round(montantParMoisBase * 0.9) : montantParMoisBase;
    const createdByUserId = req.user?.id ? Number(req.user.id) : null;

    await prisma.$transaction(async (tx) => {
      for (const item of toCreate) {
        const ab = await tx.abonnementpremiummensuel.create({
          data: {
            clientUserId: Number(id),
            annee: Number(item.annee),
            mois: Number(item.mois),
            limiteKg: limiteKg !== undefined ? Number(limiteKg) : undefined,
            kgUtilises: 0,
            montant: montantParMois,
            createdByUserId
          }
        });
        created.push(ab);
      }
    });

    res.status(201).json({ success: true, message: 'Abonnements premium créés avec succès', data: created });
  } catch (error) {
    next(error);
  }
};

/**
 * Update premium subscription
 */
const updateAbonnementPremium = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { limiteKg, kgUtilises } = req.body;
    
    // Vérifier que l'abonnement existe
    const abonnement = await prisma.abonnementpremiummensuel.findUnique({
      where: { id: Number(id) }
    });
    
    if (!abonnement) {
      return res.status(404).json({
        success: false,
        message: 'Abonnement non trouvé'
      });
    }
    
    // Préparer les données à mettre à jour
    const updateData = {};
    if (limiteKg !== undefined) updateData.limiteKg = Number(limiteKg);
    if (kgUtilises !== undefined) updateData.kgUtilises = Number(kgUtilises);
    
    // Mettre à jour l'abonnement
    const updatedAbonnement = await prisma.abonnementpremiummensuel.update({
      where: { id: Number(id) },
      data: updateData
    });
    
    res.status(200).json({
      success: true,
      message: 'Abonnement premium mis à jour avec succès',
      data: updatedAbonnement
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete premium subscription
 */
const deleteAbonnementPremium = async (req, res, next) => {
  try {
    const { id } = req.params;
    
    // Vérifier que l'abonnement existe
    const abonnement = await prisma.abonnementpremiummensuel.findUnique({
      where: { id: Number(id) }
    });
    
    if (!abonnement) {
      return res.status(404).json({
        success: false,
        message: 'Abonnement non trouvé'
      });
    }
    
    // Supprimer l'abonnement
    await prisma.abonnementpremiummensuel.delete({
      where: { id: Number(id) }
    });
    
    res.status(200).json({
      success: true,
      message: 'Abonnement premium supprimé avec succès'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Utility function to adjust kg used in Premium subscription
 */
const adjustPremiumSubscriptionKg = async (clientUserId, kgDifference, transaction = null) => {
  const tx = transaction || prisma;
  
  try {
    const currentDate = new Date();
    const currentYear = currentDate.getFullYear();
    const currentMonth = currentDate.getMonth() + 1;
    
    const subscription = await tx.abonnementpremiummensuel.findUnique({
      where: {
        clientUserId_annee_mois: {
          clientUserId: Number(clientUserId),
          annee: currentYear,
          mois: currentMonth
        }
      }
    });
    
    if (subscription) {
      const newKgUtilises = Math.max(0, subscription.kgUtilises + kgDifference);
      
      await tx.abonnementpremiummensuel.update({
        where: { id: subscription.id },
        data: {
          kgUtilises: newKgUtilises
        }
      });
      
      return {
        success: true,
        oldKgUtilises: subscription.kgUtilises,
        newKgUtilises: newKgUtilises,
        difference: kgDifference
      };
    }
    
    return {
      success: false,
      message: 'No Premium subscription found for current month'
    };
  } catch (error) {
    console.error('Error adjusting Premium subscription kg:', error);
    return {
      success: false,
      message: 'Error adjusting Premium subscription',
      error: error.message
    };
  }
};

/**
 * Test function to validate Premium subscription adjustment
 * This can be used for debugging and verification
 */
const testPremiumSubscriptionAdjustment = async (clientUserId, oldWeight, newWeight) => {
  try {
    console.log('=== Test Ajustement Abonnement Premium ===');
    console.log(`Client ID: ${clientUserId}`);
    console.log(`Ancien poids: ${oldWeight}kg`);
    console.log(`Nouveau poids: ${newWeight}kg`);
    console.log(`Différence: ${newWeight - oldWeight}kg`);
    
    const result = await adjustPremiumSubscriptionKg(clientUserId, newWeight - oldWeight);
    
    if (result.success) {
      console.log('✅ Ajustement réussi:', result);
    } else {
      console.log('❌ Ajustement échoué:', result);
    }
    
    return result;
  } catch (error) {
    console.error('❌ Erreur lors du test:', error);
    return { success: false, error: error.message };
  }
};

module.exports = {
  getUsers,
  getUserById,
  getCurrentUser,
  updateUser,
  deleteUser,
  updateUserGeolocation,
  getGuestClients,
  createAbonnementPremium,
  updateAbonnementPremium,
  deleteAbonnementPremium,
  adjustPremiumSubscriptionKg,
  testPremiumSubscriptionAdjustment
};
