const prisma = require('../utils/prismaClient');
const bcrypt = require('bcrypt');

/**
 * Service for user-related operations
 */
class UserService {
  /**
   * Create a new user
   * @param {Object} userData - User data
   * @returns {Promise<Object>} - Created user
   */
  async createUser(userData) {
    const { password, ...data } = userData;
    
    // Hash password if provided
    let hashedPassword = null;
    if (password) {
      hashedPassword = await bcrypt.hash(password, 10);
    }
    
    // Create user
    const user = await prisma.user.create({
      data: {
        ...data,
        motDePasseHash: hashedPassword,
        aGeolocalisationEnregistree: !!(data.latitude && data.longitude)
      }
    });
    
    // Create loyalty record if user is a client
    if (user.role === 'Client') {
      await prisma.fidelite.create({
        data: {
          clientUserId: user.id,
          nombreLavageTotal: 0,
          poidsTotalLaveKg: 0,
          lavagesGratuits6kgRestants: 0,
          lavagesGratuits20kgRestants: 0
        }
      });
    }
    
    // Remove sensitive data
    const { motDePasseHash, ...userWithoutPassword } = user;
    
    return userWithoutPassword;
  }
  
  /**
   * Find user by ID
   * @param {number} userId - User ID
   * @param {boolean} includeFidelite - Whether to include loyalty info
   * @returns {Promise<Object>} - Found user
   */
  async findUserById(userId, includeFidelite = false) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        fidelite: includeFidelite && { 
          select: {
            nombreLavageTotal: true,
            poidsTotalLaveKg: true,
            lavagesGratuits6kgRestants: true,
            lavagesGratuits20kgRestants: true
          }
        }
      }
    });
    
    if (!user) {
      return null;
    }
    
    // Remove sensitive data
    const { motDePasseHash, ...userWithoutPassword } = user;
    
    return userWithoutPassword;
  }
  
  /**
   * Find user by email or phone
   * @param {string} email - User email
   * @param {string} telephone - User phone number
   * @returns {Promise<Object>} - Found user (including password hash)
   */
  async findUserByEmailOrPhone(email, telephone) {
    return prisma.user.findFirst({
      where: {
        OR: [
          { email: email || null },
          { telephone: telephone || null }
        ]
      }
    });
  }
  
  /**
   * Find user by Google ID
   * @param {string} googleId - Google ID
   * @returns {Promise<Object>} - Found user
   */
  async findUserByGoogleId(googleId) {
    return prisma.user.findFirst({
      where: { loginGoogleId: googleId }
    });
  }
  
  /**
   * Update user
   * @param {number} userId - User ID
   * @param {Object} userData - User data to update
   * @returns {Promise<Object>} - Updated user
   */
  async updateUser(userId, userData) {
    const user = await prisma.user.update({
      where: { id: userId },
      data: userData
    });
    
    // Remove sensitive data
    const { motDePasseHash, ...userWithoutPassword } = user;
    
    return userWithoutPassword;
  }
  
  /**
   * Update user geolocation
   * @param {number} userId - User ID
   * @param {Object} geoData - Geolocation data
   * @returns {Promise<Object>} - Updated user
   */
  async updateUserGeolocation(userId, geoData) {
    const { latitude, longitude, adresseText, saveAsDefault } = geoData;
    
    const updateData = {
      latitude,
      longitude,
      adresseText
    };
    
    if (saveAsDefault) {
      updateData.aGeolocalisationEnregistree = true;
    }
    
    const user = await prisma.user.update({
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
    
    return user;
  }
  
  /**
   * Delete user
   * @param {number} userId - User ID
   * @returns {Promise<boolean>} - Success flag
   */
  async deleteUser(userId) {
    try {
      // Check if user is a client with loyalty record
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { role: true }
      });
      
      if (user?.role === 'Client') {
        // Delete loyalty record
        await prisma.fidelite.deleteMany({
          where: { clientUserId: userId }
        });
        
        // Delete premium subscriptions
        await prisma.abonnementpremiummensuel.deleteMany({
          where: { clientUserId: userId }
        });
      }
      
      // Delete user
      await prisma.user.delete({
        where: { id: userId }
      });
      
      return true;
    } catch (error) {
      console.log(`Failed to delete user ${userId}:`, error);
      return false;
    }
  }
  
  /**
   * Change user password
   * @param {number} userId - User ID
   * @param {string} newPassword - New password
   * @returns {Promise<boolean>} - Success flag
   */
  async changePassword(userId, newPassword) {
    try {
      const hashedPassword = await bcrypt.hash(newPassword, 10);
      
      await prisma.user.update({
        where: { id: userId },
        data: { motDePasseHash: hashedPassword }
      });
      
      return true;
    } catch (error) {
      console.log(`Failed to change password for user ${userId}:`, error);
      return false;
    }
  }
  
  /**
   * Get users with filtering and pagination
   * @param {Object} filters - Filter conditions
   * @param {number} page - Page number
   * @param {number} limit - Items per page
   * @returns {Promise<Object>} - Users and pagination info
   */
  async getUsers(filters, page, limit) {
    const { role, search } = filters;
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
    
    const skip = (page - 1) * limit;
    
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
          siteLavagePrincipalGerantId: true,
          createdAt: true,
          updatedAt: true
        },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' }
      }),
      prisma.user.count({ where })
    ]);
    
    return {
      users,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    };
  }
}

module.exports = new UserService();
