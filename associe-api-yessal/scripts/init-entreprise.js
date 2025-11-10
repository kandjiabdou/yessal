const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

try {
  // Vérifier si une entreprise existe déjà
  const existingEntreprise = await prisma.entreprise.findFirst();
  
  if (existingEntreprise) {
    console.log('Une entreprise existe déjà:', existingEntreprise.nom);
  } else {
    // Créer l'entreprise par défaut
    const entreprise = await prisma.entreprise.create({
      data: {
        nom: 'Yessal Lavage SARL',
        adresse: '123 Avenue des Affaires',
        ville: 'Dakar',
        telephone: '+221 33 123 45 67',
        email: 'contact@yessal.sn',
        devise: 'FCFA',
        tauxConversion: 655.96
      }
    });

    console.log('✅ Entreprise créée avec succès:', entreprise.nom);
    console.log('   ID:', entreprise.id);
    console.log('   Devise:', entreprise.devise);
    console.log('   Taux:', entreprise.tauxConversion);
  }

} catch (error) {
  console.error('❌ Erreur lors de la création de l\'entreprise:', error);
  process.exit(1);
} finally {
  await prisma.$disconnect();
}
