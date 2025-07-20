// Test du calcul de semaine
function testWeekCalculation() {
  const today = new Date();
  
  const getCurrentWeekStart = (offset = 0) => {
    const date = new Date(today);
    const dayOfWeek = date.getDay(); // 0 = dimanche, 1 = lundi, etc.
    
    // Calculer les jours à reculer pour arriver au samedi de la semaine courante
    // Si on est dimanche (0), on recule de 1 jour pour arriver au samedi
    // Si on est lundi (1), on recule de 2 jours, etc.
    // Si on est samedi (6), on ne recule pas
    const daysToGoBack = dayOfWeek === 0 ? 1 : dayOfWeek + 1;
    date.setDate(date.getDate() - daysToGoBack);
    
    // Appliquer le décalage de semaines
    date.setDate(date.getDate() + (offset * 7));
    
    // Définir à minuit
    date.setHours(0, 0, 0, 0);
    
    return date;
  };
  
  console.log('Test du calcul de semaine fixe (samedi à vendredi)');
  console.log('Date actuelle:', today.toLocaleDateString('fr-FR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }));
  console.log('Jour de la semaine (0=dimanche, 6=samedi):', today.getDay());
  
  // Test pour semaine courante
  const startOfCurrentWeek = getCurrentWeekStart(0);
  const endOfCurrentWeek = new Date(startOfCurrentWeek);
  endOfCurrentWeek.setDate(endOfCurrentWeek.getDate() + 7);
  
  console.log('\nSemaine courante:');
  console.log('Début (samedi):', startOfCurrentWeek.toLocaleDateString('fr-FR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }));
  console.log('Fin (samedi suivant, exclus):', endOfCurrentWeek.toLocaleDateString('fr-FR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }));
  
  // Afficher tous les jours de la semaine
  console.log('Jours de la semaine:');
  for (let i = 0; i < 7; i++) {
    const day = new Date(startOfCurrentWeek);
    day.setDate(day.getDate() + i);
    console.log(`  ${day.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'numeric' })}`);
  }
  
  // Test pour semaine précédente
  const startOfPrevWeek = getCurrentWeekStart(-1);
  const endOfPrevWeek = new Date(startOfPrevWeek);
  endOfPrevWeek.setDate(endOfPrevWeek.getDate() + 7);
  
  console.log('\nSemaine précédente:');
  console.log('Début:', startOfPrevWeek.toLocaleDateString('fr-FR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }));
  console.log('Fin (exclus):', endOfPrevWeek.toLocaleDateString('fr-FR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }));
}

testWeekCalculation();
