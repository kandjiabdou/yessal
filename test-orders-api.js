const axios = require('axios');

const API_URL = 'http://localhost:4500/api';

// Token d'authentification - remplacez par un vrai token
const AUTH_TOKEN = 'your-auth-token-here';

const headers = {
  'Authorization': `Bearer ${AUTH_TOKEN}`,
  'Content-Type': 'application/json'
};

async function testOrdersAPI() {
  console.log('🧪 Test des APIs Orders et Livreurs...\n');

  try {
    // Test 1: Récupérer les commandes
    console.log('1. Test GET /api/orders');
    const ordersResponse = await axios.get(`${API_URL}/orders`, { headers });
    console.log(`✅ Commandes récupérées: ${ordersResponse.data.data.length} commandes`);
    
    // Test 2: Récupérer les livreurs
    console.log('\n2. Test GET /api/livreurs');
    const livreursResponse = await axios.get(`${API_URL}/livreurs`, { headers });
    console.log(`✅ Livreurs récupérés: ${livreursResponse.data.data.length} livreurs`);
    
    // Test 3: Récupérer les livreurs disponibles
    console.log('\n3. Test GET /api/livreurs?available=true');
    const availableLivreursResponse = await axios.get(`${API_URL}/livreurs?available=true`, { headers });
    console.log(`✅ Livreurs disponibles: ${availableLivreursResponse.data.data.length} livreurs`);
    
    // Afficher quelques exemples de données
    if (ordersResponse.data.data.length > 0) {
      console.log('\n📋 Exemple de commande:');
      const order = ordersResponse.data.data[0];
      console.log(`- ID: ${order.id}`);
      console.log(`- Statut: ${order.statut}`);
      console.log(`- Client: ${order.clientUser ? `${order.clientUser.prenom} ${order.clientUser.nom}` : 'Client invité'}`);
      console.log(`- Prix: ${order.prixTotal || 'Non calculé'} FCFA`);
    }
    
    if (livreursResponse.data.data.length > 0) {
      console.log('\n🚚 Exemple de livreur:');
      const livreur = livreursResponse.data.data[0];
      console.log(`- ID: ${livreur.id}`);
      console.log(`- Nom: ${livreur.prenom} ${livreur.nom}`);
      console.log(`- Téléphone: ${livreur.telephone || 'Non renseigné'}`);
      console.log(`- Disponible: ${livreur.statutDisponibilite ? 'Oui' : 'Non'}`);
    }
    
    console.log('\n🎉 Tous les tests sont passés avec succès !');
    
  } catch (error) {
    console.error('❌ Erreur lors des tests:', error.response?.data || error.message);
    
    if (error.response?.status === 401) {
      console.log('\n💡 Conseil: Vérifiez votre token d\'authentification');
    }
  }
}

// Instructions pour utiliser ce script
console.log('📝 Instructions:');
console.log('1. Assurez-vous que le serveur API est démarré (npm run dev dans yessal-api)');
console.log('2. Remplacez AUTH_TOKEN par un vrai token d\'authentification');
console.log('3. Exécutez: node test-orders-api.js\n');

// Décommenter la ligne suivante pour exécuter les tests
// testOrdersAPI(); 