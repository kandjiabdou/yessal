const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function testClientSearch() {
  try {
    console.log('🔍 Test de la recherche client avec numéro de carte...\n');
    
    // Récupérer quelques exemples de clients avec carte
    const clientsWithCards = await prisma.fidelite.findMany({
      take: 3,
      include: {
        clientUser: {
          select: {
            id: true,
            nom: true,
            prenom: true,
            telephone: true
          }
        }
      }
    });
    
    if (clientsWithCards.length === 0) {
      console.log('❌ Aucun client avec carte de fidélité trouvé');
      return;
    }
    
    console.log('📋 Clients disponibles pour les tests:');
    clientsWithCards.forEach((card, index) => {
      console.log(`  ${index + 1}. ${card.clientUser.nom} ${card.clientUser.prenom}`);
      console.log(`     📇 Carte: ${card.numeroCarteFidelite}`);
      console.log(`     📞 Tél: ${card.clientUser.telephone}\n`);
    });
    
    // Test 1: Recherche par numéro de carte exact
    console.log('🎯 Test 1: Recherche par numéro de carte exact');
    const testCard = clientsWithCards[0];
    console.log(`   Recherche: "${testCard.numeroCarteFidelite}"`);
    
    const exactSearch = await prisma.user.findMany({
      where: {
        role: 'Client',
        fidelite: {
          numeroCarteFidelite: testCard.numeroCarteFidelite
        }
      },
      include: {
        fidelite: {
          select: {
            numeroCarteFidelite: true
          }
        }
      }
    });
    
    console.log(`   ✅ Résultat: ${exactSearch.length} client(s) trouvé(s)`);
    if (exactSearch.length > 0) {
      console.log(`   👤 ${exactSearch[0].nom} ${exactSearch[0].prenom} - ${exactSearch[0].fidelite.numeroCarteFidelite}`);
    }
    
    // Test 2: Recherche partielle par numéro
    console.log('\n🔍 Test 2: Recherche partielle par numéro de carte');
    const partialNumber = testCard.numeroCarteFidelite.substring(0, 5); // TH123
    console.log(`   Recherche: "${partialNumber}"`);
    
    const partialSearch = await prisma.user.findMany({
      where: {
        role: 'Client',
        fidelite: {
          numeroCarteFidelite: {
            contains: partialNumber
          }
        }
      },
      include: {
        fidelite: {
          select: {
            numeroCarteFidelite: true
          }
        }
      },
      take: 3
    });
    
    console.log(`   ✅ Résultat: ${partialSearch.length} client(s) trouvé(s)`);
    partialSearch.forEach(client => {
      console.log(`   👤 ${client.nom} ${client.prenom} - ${client.fidelite.numeroCarteFidelite}`);
    });
    
    // Test 3: Recherche par nom
    console.log('\n👤 Test 3: Recherche par nom');
    const testNom = testCard.clientUser.nom;
    console.log(`   Recherche: "${testNom}"`);
    
    const nameSearch = await prisma.user.findMany({
      where: {
        role: 'Client',
        nom: {
          contains: testNom,
          mode: 'insensitive'
        }
      },
      include: {
        fidelite: {
          select: {
            numeroCarteFidelite: true
          }
        }
      },
      take: 3
    });
    
    console.log(`   ✅ Résultat: ${nameSearch.length} client(s) trouvé(s)`);
    nameSearch.forEach(client => {
      console.log(`   👤 ${client.nom} ${client.prenom} - ${client.fidelite?.numeroCarteFidelite || 'Pas de carte'}`);
    });
    
    console.log('\n🎉 Tests terminés avec succès !');
    
  } catch (error) {
    console.error('💥 Erreur lors des tests:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

testClientSearch(); 