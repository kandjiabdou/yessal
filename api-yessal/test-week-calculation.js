// Test du calcul de semaine
function testWeekCalculation() {
  const today = new Date();
  
  const getCurrentWeekStart = (offset = 0) => {
    const date = new Date(today);
    const dayOfWeek = date.getDay(); // 0 = dimanche, 1 = lundi, etc.
    
    // Reculer au dimanche de la semaine courante
    date.setDate(date.getDate() - dayOfWeek);
    
    // Appliquer le décalage de semaines
    date.setDate(date.getDate() + (offset * 7));
    
    // Définir à minuit
    date.setHours(0, 0, 0, 0);
    
    return date;
  };
  
  console.log('Test du calcul de semaine fixe (dimanche à samedi)');
  console.log('Date actuelle:', today.toLocaleDateString('fr-FR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }));
  console.log('Jour de la semaine (0=dimanche, 6=samedi):', today.getDay());
  
  // Test pour semaine courante
  const startOfCurrentWeek = getCurrentWeekStart(0);
  const endOfCurrentWeek = new Date(startOfCurrentWeek);
  endOfCurrentWeek.setDate(endOfCurrentWeek.getDate() + 7);
  
  console.log('\nSemaine courante:');
  console.log('Début:', startOfCurrentWeek.toLocaleDateString('fr-FR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }));
  console.log('Fin (exclus):', endOfCurrentWeek.toLocaleDateString('fr-FR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }));
  
  // Test pour semaine précédente
  const startOfPrevWeek = getCurrentWeekStart(-1);
  const endOfPrevWeek = new Date(startOfPrevWeek);
  endOfPrevWeek.setDate(endOfPrevWeek.getDate() + 7);
  
  console.log('\nSemaine précédente:');
  console.log('Début:', startOfPrevWeek.toLocaleDateString('fr-FR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }));
  console.log('Fin (exclus):', endOfPrevWeek.toLocaleDateString('fr-FR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }));
  
  // Test pour semaine suivante
  const startOfNextWeek = getCurrentWeekStart(1);
  const endOfNextWeek = new Date(startOfNextWeek);
  endOfNextWeek.setDate(endOfNextWeek.getDate() + 7);
  
  console.log('\nSemaine suivante:');
  console.log('Début:', startOfNextWeek.toLocaleDateString('fr-FR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }));
  console.log('Fin (exclus):', endOfNextWeek.toLocaleDateString('fr-FR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }));
}

testWeekCalculation();
