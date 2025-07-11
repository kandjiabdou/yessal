const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fixEnumData() {
  try {
    console.log('🔍 Vérification des données...');
    
    // Compter les enregistrements avec "Collecte"
    const historiqueCount = await prisma.$queryRaw`
      SELECT COUNT(*) as count FROM historiquestatutcommande WHERE statut = 'Collecte'
    `;
    
    const commandeCount = await prisma.$queryRaw`
      SELECT COUNT(*) as count FROM commande WHERE statut = 'Collecte'
    `;
    
    console.log(`📊 Trouvé ${historiqueCount[0].count} historiques et ${commandeCount[0].count} commandes avec "Collecte"`);
    
    if (historiqueCount[0].count > 0 || commandeCount[0].count > 0) {
      console.log('🔧 Correction des données...');
      
      // Corriger les données
      await prisma.$executeRaw`
        UPDATE historiquestatutcommande 
        SET statut = 'Livraison' 
        WHERE statut = 'Collecte'
      `;
      
      await prisma.$executeRaw`
        UPDATE commande 
        SET statut = 'Livraison' 
        WHERE statut = 'Collecte'
      `;
      
      console.log('✅ Données corrigées !');
    }
    
  } catch (error) {
    console.error('❌ Erreur:', error);
  } finally {
    await prisma.$disconnect();
  }
}

fixEnumData();