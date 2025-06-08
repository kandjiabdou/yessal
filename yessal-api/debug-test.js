const { PrismaClient } = require('@prisma/client');

console.log('🚀 Démarrage du test de debug...');

const prisma = new PrismaClient({
  log: ['query', 'info', 'warn', 'error'],
});

async function debugTest() {
  try {
    console.log('📊 Test de connexion Prisma...');
    
    const result = await prisma.$queryRaw`SELECT 1 as test`;
    console.log('✅ Connexion réussie:', result);
    
    console.log('🔍 Test de count...');
    const count = await prisma.user.count();
    console.log('✅ Nombre total d\'utilisateurs:', count);
    
  } catch (error) {
    console.error('💥 Erreur complète:', error);
    console.error('💥 Message:', error.message);
    console.error('💥 Stack:', error.stack);
  } finally {
    console.log('🔚 Fermeture de la connexion...');
    await prisma.$disconnect();
    console.log('✅ Connexion fermée');
  }
}

debugTest(); 