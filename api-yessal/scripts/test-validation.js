/**
 * Script de test rapide pour valider les schémas de validation
 */

const { schemas } = require('../src/middleware/validation');

console.log('🧪 Test de validation des schémas\n');

// Test 1: Création d'utilisateur Premium sans site
console.log('Test 1: Utilisateur Premium sans siteLavagePrincipalGerantId');
const test1 = schemas.userCreate.validate({
  role: 'Client',
  nom: 'Diop',
  prenom: 'Amadou',
  email: 'amadou@test.com',
  typeClient: 'Premium',
  estEtudiant: false
});

if (test1.error) {
  console.log('❌ Validation échouée (attendu):', test1.error.message);
} else {
  console.log('✅ Validation réussie (inattendu!)');
}

// Test 2: Création d'utilisateur Premium avec site
console.log('\nTest 2: Utilisateur Premium avec siteLavagePrincipalGerantId');
const test2 = schemas.userCreate.validate({
  role: 'Client',
  nom: 'Diop',
  prenom: 'Amadou',
  email: 'amadou@test.com',
  typeClient: 'Premium',
  estEtudiant: false,
  siteLavagePrincipalGerantId: 3
});

if (test2.error) {
  console.log('❌ Validation échouée (inattendu):', test2.error.message);
} else {
  console.log('✅ Validation réussie (attendu)');
}

// Test 3: Création d'utilisateur Standard sans site
console.log('\nTest 3: Utilisateur Standard sans siteLavagePrincipalGerantId');
const test3 = schemas.userCreate.validate({
  role: 'Client',
  nom: 'Fall',
  prenom: 'Fatou',
  telephone: '771234567',
  typeClient: 'Standard'
});

if (test3.error) {
  console.log('❌ Validation échouée (inattendu):', test3.error.message);
} else {
  console.log('✅ Validation réussie (attendu)');
}

// Test 4: Création d'abonnement sans siteLavageId
console.log('\nTest 4: Création d\'abonnement sans siteLavageId');
const test4 = schemas.abonnementCreate.validate({
  start: 'this',
  count: 1,
  limiteKg: 40
});

if (test4.error) {
  console.log('❌ Validation échouée (attendu):', test4.error.message);
} else {
  console.log('✅ Validation réussie (inattendu!)');
}

// Test 5: Création d'abonnement avec siteLavageId
console.log('\nTest 5: Création d\'abonnement avec siteLavageId');
const test5 = schemas.abonnementCreate.validate({
  siteLavageId: 3,
  start: 'this',
  count: 2,
  limiteKg: 40
});

if (test5.error) {
  console.log('❌ Validation échouée (inattendu):', test5.error.message);
} else {
  console.log('✅ Validation réussie (attendu)');
  console.log('   Données validées:', test5.value);
}

// Test 6: Création d'abonnement avec startMonth
console.log('\nTest 6: Création d\'abonnement avec startMonth');
const test6 = schemas.abonnementCreate.validate({
  siteLavageId: 3,
  startMonth: '2025-12',
  count: 3
});

if (test6.error) {
  console.log('❌ Validation échouée (inattendu):', test6.error.message);
} else {
  console.log('✅ Validation réussie (attendu)');
  console.log('   Données validées:', test6.value);
}

console.log('\n✅ Tests de validation terminés!');
