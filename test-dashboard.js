const axios = require('axios');

const API_URL = 'http://localhost:4500/api';

// Données de test pour se connecter
const testManager = {
  email: 'manager@yessal.com',
  password: 'password123'
};

async function testDashboard() {
  try {
    console.log('🔐 Connexion du manager...');
    
    // Se connecter
    const loginResponse = await axios.post(`${API_URL}/auth/login`, testManager);
    const token = loginResponse.data.data.token;
    const user = loginResponse.data.data.user;
    
    console.log(`✅ Connecté: ${user.prenom} ${user.nom}`);
    console.log(`📍 Site principal: ${user.siteLavagePrincipalGerantId}`);
    
    if (!user.siteLavagePrincipalGerantId) {
      console.log('❌ Aucun site assigné au manager');
      return;
    }
    
    // Tester l'endpoint dashboard
    console.log('\n📊 Test de l\'endpoint dashboard...');
    const dashboardResponse = await axios.get(
      `${API_URL}/dashboard/${user.siteLavagePrincipalGerantId}`,
      {
        headers: {
          Authorization: `Bearer ${token}`
        }
      }
    );
    
    const dashboardData = dashboardResponse.data.data;
    
    console.log('✅ Dashboard récupéré avec succès!');
    console.log('\n📈 Statistiques du jour:');
    console.log(`  - Commandes: ${dashboardData.todayStats.totalCommandes}`);
    console.log(`  - Revenus: ${dashboardData.todayStats.totalRevenue} FCFA`);
    console.log(`  - Poids: ${dashboardData.todayStats.totalPoidsKg} kg`);
    console.log(`  - Livraisons: ${dashboardData.todayStats.totalLivraisons}`);
    
    console.log('\n📊 Statistiques de la semaine:');
    console.log(`  - Commandes: ${dashboardData.weekStats.totalCommandes}`);
    console.log(`  - Revenus: ${dashboardData.weekStats.totalRevenue} FCFA`);
    console.log(`  - Poids: ${dashboardData.weekStats.totalPoidsKg} kg`);
    console.log(`  - Livraisons: ${dashboardData.weekStats.totalLivraisons}`);
    
    console.log(`\n🏢 Site: ${dashboardData.siteName}`);
    console.log(`📋 Commandes récentes: ${dashboardData.recentOrders.length}`);
    
    if (dashboardData.recentOrders.length > 0) {
      console.log('\n🔍 Dernières commandes:');
      dashboardData.recentOrders.forEach((order, index) => {
        console.log(`  ${index + 1}. Commande #${order.id} - ${order.clientName} - ${order.prixTotal} FCFA - ${order.statut}`);
      });
    }
    
  } catch (error) {
    console.error('❌ Erreur:', error.response?.data || error.message);
  }
}

// Exécuter le test
testDashboard(); 