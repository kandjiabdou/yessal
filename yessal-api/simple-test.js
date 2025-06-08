const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function simpleTest() {
  try {
    console.log('🔍 Test simple de connexion...');
    
    // Test simple - compter les clients
    const clientCount = await prisma.user.count({
      where: { role: 'Client' }
    });
    console.log(`✅ ${clientCount} clients trouvés`);
    
    // Test recherche basique sans fidelite
    const basicSearch = await prisma.user.findMany({
      where: {
        role: 'Client',
        nom: { contains: 'sow' }
      },
      select: {
        id: true,
        nom: true,
        prenom: true
      },
      take: 5
    });
    console.log(`✅ Recherche basique: ${basicSearch.length} résultats`);
    
    if (basicSearch.length > 0) {
      console.log('Exemple:', basicSearch[0].nom, basicSearch[0].prenom);
    }
    
  } catch (error) {
    console.error('💥 Erreur:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

simpleTest(); 