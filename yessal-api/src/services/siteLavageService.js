const prisma = require('../utils/prismaClient');
const logger = require('../utils/logger');

/**
 * Service for laundry site-related operations
 */
class SiteLavageService {
  /**
   * Get all laundry sites with filtering and pagination
   * @param {Object} filters - Filter conditions
   * @param {number} page - Page number
   * @param {number} limit - Items per page
   * @returns {Promise<Object>} - Sites and pagination info
   */
  async getSiteLavages(filters, page, limit) {
    const { search, ville, statut } = filters;
    const where = {};
    
    if (search) {
      where.OR = [
        { nom: { contains: search } },
        { adresseText: { contains: search } },
        { ville: { contains: search } }
      ];
    }
    
    if (ville) {
      where.ville = ville;
    }
    
    if (statut !== undefined) {
      where.statutOuverture = statut === 'true';
    }
    
    const skip = (page - 1) * limit;
    
    const [siteLavages, total] = await Promise.all([
      prisma.siteLavage.findMany({
        where,
        include: {
          machines: true
        },
        skip,
        take: limit,
        orderBy: { nom: 'asc' }
      }),
      prisma.siteLavage.count({ where })
    ]);
    
    return {
      siteLavages,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    };
  }
  
  /**
   * Get a single laundry site by ID
   * @param {number} siteId - Site ID
   * @returns {Promise<Object>} - Laundry site
   */
  async getSiteLavageById(siteId) {
    return prisma.siteLavage.findUnique({
      where: { id: Number(siteId) },
      include: {
        machines: true
      }
    });
  }
  
  /**
   * Create a new laundry site
   * @param {Object} siteData - Site data
   * @param {number} adminUserId - Admin user ID
   * @returns {Promise<Object>} - Created site
   */
  async createSiteLavage(siteData, adminUserId) {
    const {
      nom,
      adresseText,
      ville,
      latitude,
      longitude,
      telephone,
      horaireOuvertureText,
      statutOuverture = false
    } = siteData;
    
    const newSiteLavage = await prisma.siteLavage.create({
      data: {
        nom,
        adresseText,
        ville,
        latitude,
        longitude,
        telephone,
        horaireOuvertureText,
        statutOuverture
      }
    });
    
    // Log admin action
    await prisma.logAdminAction.create({
      data: {
        adminUserId,
        typeAction: 'CREATE',
        entite: 'SiteLavage',
        entiteId: newSiteLavage.id,
        description: `Laundry site ${nom} created by admin #${adminUserId}`
      }
    });
    
    return newSiteLavage;
  }
  
  /**
   * Update a laundry site
   * @param {number} siteId - Site ID
   * @param {Object} siteData - Site data to update
   * @param {number} adminUserId - Admin user ID
   * @returns {Promise<Object>} - Updated site
   */
  async updateSiteLavage(siteId, siteData, adminUserId) {
    const {
      nom,
      adresseText,
      ville,
      latitude,
      longitude,
      telephone,
      horaireOuvertureText,
      statutOuverture
    } = siteData;
    
    // Check if site exists
    const existingSite = await prisma.siteLavage.findUnique({
      where: { id: Number(siteId) }
    });
    
    if (!existingSite) {
      return null;
    }
    
    // Update site
    const updatedSiteLavage = await prisma.siteLavage.update({
      where: { id: Number(siteId) },
      data: {
        nom,
        adresseText,
        ville,
        latitude,
        longitude,
        telephone,
        horaireOuvertureText,
        statutOuverture
      }
    });
    
    // Log admin action
    await prisma.logAdminAction.create({
      data: {
        adminUserId,
        typeAction: 'UPDATE',
        entite: 'SiteLavage',
        entiteId: updatedSiteLavage.id,
        description: `Laundry site ${updatedSiteLavage.nom} updated by admin #${adminUserId}`
      }
    });
    
    return updatedSiteLavage;
  }
  
  /**
   * Delete a laundry site
   * @param {number} siteId - Site ID
   * @param {number} adminUserId - Admin user ID
   * @returns {Promise<boolean>} - Success flag
   */
  async deleteSiteLavage(siteId, adminUserId) {
    try {
      // Check if site exists
      const existingSite = await prisma.siteLavage.findUnique({
        where: { id: Number(siteId) }
      });
      
      if (!existingSite) {
        return false;
      }
      
      // Check if site has related records
      const relatedOrders = await prisma.commande.count({
        where: { siteLavageId: Number(siteId) }
      });
      
      if (relatedOrders > 0) {
        throw new Error('Cannot delete laundry site with related orders');
      }
      
      // Delete machines first
      await prisma.machineLavage.deleteMany({
        where: { siteLavageId: Number(siteId) }
      });
      
      // Delete site stats
      await prisma.statJournalSite.deleteMany({
        where: { siteLavageId: Number(siteId) }
      });
      
      // Delete site
      await prisma.siteLavage.delete({
        where: { id: Number(siteId) }
      });
      
      // Log admin action
      await prisma.logAdminAction.create({
        data: {
          adminUserId,
          typeAction: 'DELETE',
          entite: 'SiteLavage',
          entiteId: Number(siteId),
          description: `Laundry site ${existingSite.nom} deleted by admin #${adminUserId}`
        }
      });
      
      return true;
    } catch (error) {
      logger.error(`Failed to delete site ${siteId}:`, error);
      throw error;
    }
  }
  
  /**
   * Get all machines for a specific laundry site
   * @param {number} siteId - Site ID
   * @returns {Promise<Array>} - List of machines
   */
  async getSiteMachines(siteId) {
    return prisma.machineLavage.findMany({
      where: { siteLavageId: Number(siteId) },
      orderBy: { numero: 'asc' }
    });
  }
  
  /**
   * Add a new machine to a laundry site
   * @param {number} siteId - Site ID
   * @param {Object} machineData - Machine data
   * @param {number} adminUserId - Admin user ID
   * @returns {Promise<Object>} - Created machine
   */
  async addMachineToSite(siteId, machineData, adminUserId) {
    const {
      numero,
      nom,
      type,
      poidsKg
    } = machineData;
    
    // Check if site exists
    const existingSite = await prisma.siteLavage.findUnique({
      where: { id: Number(siteId) }
    });
    
    if (!existingSite) {
      throw new Error('Laundry site not found');
    }
    
    // Check if machine number already exists at this site
    const existingMachine = await prisma.machineLavage.findFirst({
      where: {
        siteLavageId: Number(siteId),
        numero
      }
    });
    
    if (existingMachine) {
      throw new Error('A machine with this number already exists at this site');
    }
    
    // Create new machine
    const newMachine = await prisma.machineLavage.create({
      data: {
        siteLavageId: Number(siteId),
        numero,
        nom,
        type,
        poidsKg
      }
    });
    
    // Log admin action
    await prisma.logAdminAction.create({
      data: {
        adminUserId,
        typeAction: 'CREATE',
        entite: 'MachineLavage',
        entiteId: newMachine.id,
        description: `Machine ${numero} added to site ${existingSite.nom} by admin #${adminUserId}`
      }
    });
    
    return newMachine;
  }
  
  /**
   * Update a machine
   * @param {number} siteId - Site ID
   * @param {number} machineId - Machine ID
   * @param {Object} machineData - Machine data
   * @param {number} adminUserId - Admin user ID
   * @returns {Promise<Object>} - Updated machine
   */
  async updateMachine(siteId, machineId, machineData, adminUserId) {
    const {
      numero,
      nom,
      type,
      poidsKg
    } = machineData;
    
    // Check if machine exists
    const existingMachine = await prisma.machineLavage.findFirst({
      where: {
        id: Number(machineId),
        siteLavageId: Number(siteId)
      }
    });
    
    if (!existingMachine) {
      throw new Error('Machine not found');
    }
    
    // Check if new machine number conflicts with existing one
    if (numero && numero !== existingMachine.numero) {
      const conflictingMachine = await prisma.machineLavage.findFirst({
        where: {
          siteLavageId: Number(siteId),
          numero,
          id: { not: Number(machineId) }
        }
      });
      
      if (conflictingMachine) {
        throw new Error('A machine with this number already exists at this site');
      }
    }
    
    // Update machine
    const updatedMachine = await prisma.machineLavage.update({
      where: { id: Number(machineId) },
      data: {
        numero,
        nom,
        type,
        poidsKg
      }
    });
    
    // Log admin action
    await prisma.logAdminAction.create({
      data: {
        adminUserId,
        typeAction: 'UPDATE',
        entite: 'MachineLavage',
        entiteId: updatedMachine.id,
        description: `Machine ${updatedMachine.numero} updated by admin #${adminUserId}`
      }
    });
    
    return updatedMachine;
  }
  
  /**
   * Delete a machine
   * @param {number} siteId - Site ID
   * @param {number} machineId - Machine ID
   * @param {number} adminUserId - Admin user ID
   * @returns {Promise<boolean>} - Success flag
   */
  async deleteMachine(siteId, machineId, adminUserId) {
    try {
      // Check if machine exists
      const existingMachine = await prisma.machineLavage.findFirst({
        where: {
          id: Number(machineId),
          siteLavageId: Number(siteId)
        }
      });
      
      if (!existingMachine) {
        return false;
      }
      
      // Delete machine
      await prisma.machineLavage.delete({
        where: { id: Number(machineId) }
      });
      
      // Log admin action
      await prisma.logAdminAction.create({
        data: {
          adminUserId,
          typeAction: 'DELETE',
          entite: 'MachineLavage',
          entiteId: Number(machineId),
          description: `Machine ${existingMachine.numero} deleted by admin #${adminUserId}`
        }
      });
      
      return true;
    } catch (error) {
      logger.error(`Failed to delete machine ${machineId}:`, error);
      throw error;
    }
  }
  
  /**
   * Find nearest laundry sites based on geolocation
   * @param {number} latitude - Latitude
   * @param {number} longitude - Longitude
   * @param {number} radius - Search radius in km
   * @param {number} limit - Max number of results
   * @returns {Promise<Array>} - List of nearest sites
   */
  async findNearestSites(latitude, longitude, radius = 10, limit = 5) {
    // Basic validation
    if (!latitude || !longitude) {
      throw new Error('Latitude and longitude are required');
    }
    
    // Get all sites
    const allSites = await prisma.siteLavage.findMany({
      include: {
        machines: true
      }
    });
    
    // Calculate distance for each site
    const sitesWithDistance = allSites.map(site => {
      // Calculate distance using Haversine formula
      const R = 6371; // Radius of the Earth in km
      const dLat = (site.latitude - latitude) * Math.PI / 180;
      const dLon = (site.longitude - longitude) * Math.PI / 180;
      const a = 
        Math.sin(dLat/2) * Math.sin(dLat/2) +
        Math.cos(latitude * Math.PI / 180) * Math.cos(site.latitude * Math.PI / 180) * 
        Math.sin(dLon/2) * Math.sin(dLon/2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
      const distance = R * c; // Distance in km
      
      return {
        ...site,
        distance
      };
    });
    
    // Filter sites within radius and sort by distance
    const nearestSites = sitesWithDistance
      .filter(site => site.distance <= radius)
      .sort((a, b) => a.distance - b.distance)
      .slice(0, limit);
    
    return nearestSites;
  }
  
  /**
   * Get site statistics
   * @param {number} siteId - Site ID
   * @param {Date} startDate - Start date for filtering
   * @param {Date} endDate - End date for filtering
   * @returns {Promise<Object>} - Site statistics
   */
  async getSiteStats(siteId, startDate, endDate) {
    // Build filter conditions
    const where = {
      siteLavageId: Number(siteId)
    };
    
    if (startDate || endDate) {
      where.dateJour = {};
      
      if (startDate) {
        where.dateJour.gte = new Date(startDate);
      }
      
      if (endDate) {
        where.dateJour.lte = new Date(endDate);
      }
    }
    
    // Get statistics
    const stats = await prisma.statJournalSite.findMany({
      where,
      orderBy: { dateJour: 'desc' }
    });
    
    // Calculate totals
    const totals = stats.reduce((acc, stat) => {
      acc.totalCommandes += stat.totalCommandes;
      acc.totalPoidsKg += stat.totalPoidsKg;
      acc.totalRevenue += stat.totalRevenue;
      return acc;
    }, { totalCommandes: 0, totalPoidsKg: 0, totalRevenue: 0 });
    
    return { stats, totals };
  }
  
  /**
   * Generate daily statistics for a site
   * This would typically be run by a scheduled job
   * @param {number} siteId - Site ID
   * @param {Date} date - Date to generate stats for
   * @returns {Promise<Object>} - Generated statistics
   */
  async generateDailyStats(siteId, date = new Date()) {
    // Set the date to the beginning of the day
    const startDate = new Date(date);
    startDate.setHours(0, 0, 0, 0);
    
    // Set the date to the end of the day
    const endDate = new Date(date);
    endDate.setHours(23, 59, 59, 999);
    
    // Get all completed orders for this site on this day
    const orders = await prisma.commande.findMany({
      where: {
        siteLavageId: Number(siteId),
        dateHeureCommande: {
          gte: startDate,
          lte: endDate
        },
        statut: 'Livre' // Only count completed orders
      },
      include: {
        options: true,
        paiements: {
          where: {
            statut: 'Paye' // Only count paid payments
          }
        }
      }
    });
    
    // Calculate statistics
    const totalCommandes = orders.length;
    const totalPoidsKg = orders.reduce((sum, order) => sum + (order.masseVerifieeKg || 0), 0);
    const totalRevenue = orders.reduce((sum, order) => {
      return sum + order.paiements.reduce((pSum, payment) => pSum + payment.montant, 0);
    }, 0);
    
    // Check if stats already exist for this date
    const existingStats = await prisma.statJournalSite.findFirst({
      where: {
        siteLavageId: Number(siteId),
        dateJour: {
          gte: startDate,
          lte: endDate
        }
      }
    });
    
    let stats;
    
    if (existingStats) {
      // Update existing stats
      stats = await prisma.statJournalSite.update({
        where: { id: existingStats.id },
        data: {
          totalCommandes,
          totalPoidsKg,
          totalRevenue
        }
      });
    } else {
      // Create new stats
      stats = await prisma.statJournalSite.create({
        data: {
          siteLavageId: Number(siteId),
          dateJour: startDate,
          totalCommandes,
          totalPoidsKg,
          totalRevenue
        }
      });
    }
    
    return stats;
  }
}

module.exports = new SiteLavageService();
