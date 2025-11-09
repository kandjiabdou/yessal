const { PrismaClient } = require('@prisma/client');

// Create a new PrismaClient instance for the manager database
// Note: This uses the associe schema but connects to the manager database
// We'll use raw queries to access manager tables
const prismaManager = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_MANAGER_URL || 'mysql://root:admin@localhost:3306/yessal'
    }
  }
});

// Log database errors
prismaManager.$on('error', (e) => {
  console.log('Prisma Manager Error:', e);
});

// Helper functions for raw queries on manager database
prismaManager.sitelavage = {
  async findMany(options = {}) {
    const { where = {}, select = {}, orderBy = {} } = options;
    
    let query = 'SELECT ';
    const selectFields = Object.keys(select).length > 0 
      ? Object.keys(select).filter(k => select[k]).join(', ')
      : '*';
    query += selectFields + ' FROM sitelavage WHERE 1=1';
    
    const params = [];
    if (where.flag !== undefined) {
      query += ' AND flag = ?';
      params.push(where.flag);
    }
    
    if (orderBy.nom) {
      query += ' ORDER BY nom ' + (orderBy.nom === 'asc' ? 'ASC' : 'DESC');
    }
    
    return await prismaManager.$queryRawUnsafe(query, ...params);
  },
  
  async findUnique(options = {}) {
    const { where = {}, select = {} } = options;
    
    let query = 'SELECT ';
    const selectFields = Object.keys(select).length > 0 
      ? Object.keys(select).filter(k => select[k]).join(', ')
      : '*';
    query += selectFields + ' FROM sitelavage WHERE id = ? LIMIT 1';
    
    const result = await prismaManager.$queryRawUnsafe(query, where.id);
    return result.length > 0 ? result[0] : null;
  }
};

prismaManager.commande = {
  async aggregate(options = {}) {
    const { where = {}, _sum = {}, _count = {} } = options;
    
    let query = 'SELECT ';
    const selectParts = [];
    
    if (_sum.prixPaye) selectParts.push('SUM(prixPaye) as prixPaye');
    if (_count.id) selectParts.push('COUNT(id) as id');
    
    query += selectParts.join(', ') + ' FROM commande WHERE 1=1';
    
    const params = [];
    if (where.siteLavageId) {
      query += ' AND siteLavageId = ?';
      params.push(where.siteLavageId);
    }
    if (where.flag !== undefined) {
      query += ' AND flag = ?';
      params.push(where.flag);
    }
    if (where.dateHeureCommande?.gte) {
      query += ' AND dateHeureCommande >= ?';
      params.push(where.dateHeureCommande.gte);
    }
    if (where.dateHeureCommande?.lte) {
      query += ' AND dateHeureCommande <= ?';
      params.push(where.dateHeureCommande.lte);
    }
    
    const result = await prismaManager.$queryRawUnsafe(query, ...params);
    return {
      _sum: { prixPaye: result[0]?.prixPaye || 0 },
      _count: { id: Number(result[0]?.id) || 0 }
    };
  }
};

prismaManager.abonnementpremiummensuel = {
  async aggregate(options = {}) {
    const { where = {}, _sum = {}, _count = {} } = options;
    
    let query = 'SELECT ';
    const selectParts = [];
    
    if (_sum.montant) selectParts.push('SUM(montant) as montant');
    if (_count.id) selectParts.push('COUNT(id) as id');
    
    query += selectParts.join(', ') + ' FROM abonnementpremiummensuel WHERE 1=1';
    
    const params = [];
    if (where.siteLavageId) {
      query += ' AND siteLavageId = ?';
      params.push(where.siteLavageId);
    }
    if (where.annee) {
      query += ' AND annee = ?';
      params.push(where.annee);
    }
    if (where.mois) {
      query += ' AND mois = ?';
      params.push(where.mois);
    }
    if (where.flag !== undefined) {
      query += ' AND flag = ?';
      params.push(where.flag);
    }
    
    const result = await prismaManager.$queryRawUnsafe(query, ...params);
    return {
      _sum: { montant: result[0]?.montant || 0 },
      _count: { id: Number(result[0]?.id) || 0 }
    };
  }
};

// Handle process termination to close the Prisma connection
process.on('SIGINT', async () => {
  await prismaManager.$disconnect();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  await prismaManager.$disconnect();
  process.exit(0);
});

module.exports = prismaManager;
