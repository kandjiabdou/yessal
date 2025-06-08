const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function testSearchFix() {
  try {
    console.log('🔧 Test de la correction de recherche...\n');
    
    // Test avec une recherche simple par nom (similaire à ce qui causait l'erreur)
    const searchTerm = 'sow';
    console.log(`🔍 Test de recherche: "${searchTerm}"`);
    
    const clients = await prisma.user.findMany({
      where: {
        role: 'Client',
        OR: [
          { nom: { contains: searchTerm } },
          { prenom: { contains: searchTerm } },
          { telephone: { contains: searchTerm } },
          { email: { contains: searchTerm } },
          {
            fidelite: {
              numeroCarteFidelite: {
                contains: searchTerm
              }
            }
          }
        ]
      },
      select: {
        id: true,
        nom: true,
        prenom: true,
        email: true,
        telephone: true,
        fidelite: {
          select: {
            numeroCarteFidelite: true,
            nombreLavageTotal: true,
            poidsTotalLaveKg: true,
            lavagesGratuits6kgRestants: true,
            lavagesGratuits20kgRestants: true
          }
        }
      },
      take: 10,
      orderBy: [
        { nom: 'asc' },
        { prenom: 'asc' }
      ]
    });
    
    console.log(`✅ Recherche réussie ! ${clients.length} résultat(s) trouvé(s)`);
    
    clients.forEach((client, index) => {
      console.log(`${index + 1}. ${client.nom} ${client.prenom}`);
      if (client.fidelite) {
        console.log(`   📇 Carte: ${client.fidelite.numeroCarteFidelite}`);
      }
      if (client.telephone) {
        console.log(`   📞 Tél: ${client.telephone}`);
      }
      console.log('');
    });
    
    console.log('🎉 Test de correction réussi ! La recherche fonctionne maintenant.');
    
  } catch (error) {
    console.error('💥 Erreur lors du test:', error.message);
    console.log('\n🔧 Vérifiez que :');
    console.log('  1. La base de données est accessible');
    console.log('  2. Le client Prisma est à jour');
    console.log('  3. La syntaxe SQL est compatible MySQL');
  } finally {
    await prisma.$disconnect();
  }
}

testSearchFix(); 