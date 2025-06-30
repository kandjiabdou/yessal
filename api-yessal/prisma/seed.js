const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Démarrage du seeding...');

  // Vérifier que les sites existent d'abord
  let sites = await prisma.siteLavage.findMany();
  console.log(`📍 Sites disponibles : ${sites.length}`);
  
  if (sites.length === 0) {
    console.log('⚠️  Aucun site trouvé, création des sites de base...');
    
    // Créer les sites de base
    await prisma.siteLavage.createMany({
      data: [
        {
          nom: 'Site Dakar',
          adresseText: 'Quartier Grand Yoff',
          ville: 'Dakar',
          latitude: 15.459215,
          longitude: -16.493975,
          telephone: '+221793884127',
          statutOuverture: true,
        },
        {
          nom: 'Site Thiès',
          adresseText: 'Quartier Grand Yoff',
          ville: 'Thiès',
          latitude: 14.691727,
          longitude: -16.136461,
          telephone: '+221776870799',
          statutOuverture: true,
        }
      ]
    });
    
    console.log('✅ Sites créés');
    // Récupérer les sites après création
    sites = await prisma.siteLavage.findMany();
  }

  // Afficher les sites disponibles
  sites.forEach(site => {
    console.log(`   - ${site.nom} (${site.ville}) - ID: ${site.id}`);
  });

  // Récupérer le premier site disponible
  const premierSite = sites[0];
  console.log(`🏢 Site principal sélectionné : ${premierSite.nom} (ID: ${premierSite.id})`);

  // Hasher le mot de passe "123"
  const motDePasseHash = await bcrypt.hash('123', 10);

  // Créer le manager Fatou Mbaye
  const manager = await prisma.user.upsert({
    where: { email: 'fatou.mbaye@yessal.sn' },
    update: {
      motDePasseHash: motDePasseHash,
      siteLavagePrincipalGerantId: premierSite.id,
    },
    create: {
      role: 'Manager',
      nom: 'Mbaye',
      prenom: 'Fatou',
      email: 'fatou.mbaye@yessal.sn',
      telephone: '+221771234567',
      motDePasseHash: motDePasseHash,
      adresseText: 'Dakar, Sénégal',
      aGeolocalisationEnregistree: false,
      typeClient: null,
      estEtudiant: false,
      siteLavagePrincipalGerantId: premierSite.id,
    },
  });

  console.log('✅ Manager créé :', {
    id: manager.id,
    nom: manager.nom,
    prenom: manager.prenom,
    email: manager.email,
    role: manager.role,
    siteId: manager.siteLavagePrincipalGerantId
  });

  console.log('🎉 Seeding terminé !');
  console.log('');
  console.log('🔑 Connexion Manager :');
  console.log('   Email    : fatou.mbaye@yessal.sn');
  console.log('   Password : 123');
}

main()
  .catch((e) => {
    console.error('❌ Erreur lors du seeding :', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  }); 