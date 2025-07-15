/**
 * Script de test pour l'ajustement automatique des abonnements Premium
 * Ce script peut être utilisé pour tester manuellement la fonctionnalité
 */

// Exemple d'utilisation avec des données de test
const testScenario = {
  // Données de base
  clientId: 41, // Client Premium avec abonnement actuel
  orderId: 123, // ID d'une commande existante
  
  // Scénario de test
  scenario: {
    // État initial
    kgUtilisesInitial: 10,
    poidsCommandeInitial: 15,
    kgUtilisesApresCreation: 25, // 10 + 15
    
    // Correction par le manager
    nouveauPoidsCommande: 20,
    kgUtilisesApresCorrection: 30, // 10 + 20
    
    // Calculs
    difference: 5, // 20 - 15
    impact: "Les kg utilisés passent de 25 à 30 (+5kg)"
  }
};

console.log('=== SCENARIO DE TEST ===');
console.log('Client Premium ID:', testScenario.clientId);
console.log('Commande ID:', testScenario.orderId);
console.log('');
console.log('1. État initial de l\'abonnement:', testScenario.scenario.kgUtilisesInitial + 'kg utilisés');
console.log('2. Création commande avec poids:', testScenario.scenario.poidsCommandeInitial + 'kg');
console.log('3. Abonnement après création:', testScenario.scenario.kgUtilisesApresCreation + 'kg utilisés');
console.log('4. Manager corrige le poids à:', testScenario.scenario.nouveauPoidsCommande + 'kg');
console.log('5. Différence calculée:', testScenario.scenario.difference + 'kg');
console.log('6. Résultat final:', testScenario.scenario.kgUtilisesApresCorrection + 'kg utilisés');
console.log('');
console.log('Impact:', testScenario.scenario.impact);

// Exemple de requête API pour tester
const exampleApiRequest = {
  method: 'PUT',
  url: `/api/orders/${testScenario.orderId}`,
  headers: {
    'Authorization': 'Bearer <manager_token>',
    'Content-Type': 'application/json'
  },
  body: {
    masseVerifieeKg: testScenario.scenario.nouveauPoidsCommande
  }
};

console.log('\n=== REQUÊTE API D\'EXEMPLE ===');
console.log(JSON.stringify(exampleApiRequest, null, 2));

module.exports = {
  testScenario,
  exampleApiRequest
};
