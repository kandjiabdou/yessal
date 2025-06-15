// Test de la répartition des machines pour clients Premium
// Simuler les imports (en réalité, cela viendrait du service TypeScript)

const PRIX_MACHINE_20KG = 4000;
const PRIX_MACHINE_6KG = 2000;
const QUOTA_PREMIUM_MENSUEL = 40;

function calculerRepartitionMachines(poids) {
  const n = Math.floor(poids / 20);
  const r = poids % 20;
  
  let nombreMachine20kg = n;
  let nombreMachine6kg = 0;
  
  if (r > 0) {
    const prixMachine6kgPourReste = PRIX_MACHINE_6KG * (r / 6);
    
    if (prixMachine6kgPourReste > PRIX_MACHINE_20KG) {
      nombreMachine20kg = n + 1;
      nombreMachine6kg = 0;
    } else {
      const entierR6 = Math.floor(r / 6);
      const resteR6 = r % 6;
      const ajoutSiReste = resteR6 > 1.5 ? 1 : 0;
      
      nombreMachine20kg = n;
      nombreMachine6kg = entierR6 + ajoutSiReste;
    }
  }
  
  return {
    machine20kg: nombreMachine20kg,
    machine6kg: nombreMachine6kg
  };
}

function testPremiumMachines() {
  console.log('🧪 Test de la répartition des machines pour clients Premium\n');
  
  // Test 1: Client Premium sans dépassement
  console.log('📋 Test 1: Client Premium - 30kg (pas de dépassement)');
  const cumulMensuel1 = 5;
  const poids1 = 30;
  const quotaRestant1 = QUOTA_PREMIUM_MENSUEL - cumulMensuel1;
  const surplus1 = Math.max(0, poids1 - quotaRestant1);
  
  console.log(`  - Cumul mensuel: ${cumulMensuel1} kg`);
  console.log(`  - Quota restant: ${quotaRestant1} kg`);
  console.log(`  - Poids commande: ${poids1} kg`);
  console.log(`  - Surplus: ${surplus1} kg`);
  console.log(`  - Répartition machines: ${surplus1 > 0 ? 'OUI (pour surplus)' : 'NON (couvert par abonnement)'}\n`);
  
  // Test 2: Client Premium avec dépassement < 6kg
  console.log('📋 Test 2: Client Premium - 25kg avec cumul 20kg (surplus 5kg < 6kg)');
  const cumulMensuel2 = 20;
  const poids2 = 25;
  const quotaRestant2 = QUOTA_PREMIUM_MENSUEL - cumulMensuel2;
  const surplus2 = Math.max(0, poids2 - quotaRestant2);
  
  console.log(`  - Cumul mensuel: ${cumulMensuel2} kg`);
  console.log(`  - Quota restant: ${quotaRestant2} kg`);
  console.log(`  - Poids commande: ${poids2} kg`);
  console.log(`  - Surplus: ${surplus2} kg`);
  console.log(`  - Formule surplus: Détaillée (obligatoire car < 6kg)`);
  console.log(`  - Répartition machines: NON (formule détaillée)\n`);
  
  // Test 3: Client Premium avec dépassement >= 6kg, formule de base
  console.log('📋 Test 3: Client Premium - 30kg avec cumul 25kg (surplus 15kg, formule base)');
  const cumulMensuel3 = 25;
  const poids3 = 30;
  const quotaRestant3 = QUOTA_PREMIUM_MENSUEL - cumulMensuel3;
  const surplus3 = Math.max(0, poids3 - quotaRestant3);
  const repartition3 = calculerRepartitionMachines(surplus3);
  
  console.log(`  - Cumul mensuel: ${cumulMensuel3} kg`);
  console.log(`  - Quota restant: ${quotaRestant3} kg`);
  console.log(`  - Poids commande: ${poids3} kg`);
  console.log(`  - Surplus: ${surplus3} kg`);
  console.log(`  - Formule surplus: Base (choix possible)`);
  console.log(`  - Répartition machines: OUI`);
  console.log(`    • Machine 20kg × ${repartition3.machine20kg}`);
  console.log(`    • Machine 6kg × ${repartition3.machine6kg}\n`);
  
  // Test 4: Client Standard pour comparaison
  console.log('📋 Test 4: Client Standard - 25kg (formule base)');
  const poids4 = 25;
  const repartition4 = calculerRepartitionMachines(poids4);
  
  console.log(`  - Poids commande: ${poids4} kg`);
  console.log(`  - Formule: Base`);
  console.log(`  - Répartition machines: OUI`);
  console.log(`    • Machine 20kg × ${repartition4.machine20kg}`);
  console.log(`    • Machine 6kg × ${repartition4.machine6kg}\n`);
  
  console.log('✅ Conclusion: La répartition des machines doit s\'afficher pour:');
  console.log('   - Clients Standard avec formule de base');
  console.log('   - Clients Premium avec surplus ≥ 6kg et formule de base choisie');
  console.log('   - PAS pour clients Premium avec surplus < 6kg (formule détaillée obligatoire)');
  console.log('   - PAS pour clients Premium sans surplus (couvert par abonnement)');
}

testPremiumMachines(); 