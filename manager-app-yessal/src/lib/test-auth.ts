// Fichier de test temporaire pour vérifier l'intercepteur axios
import apiClient from './axios';

export const testAuthInterceptor = async () => {
  try {
    console.log('Test de l\'intercepteur 401...');
    // Cette requête devrait déclencher l'intercepteur si le token est expiré
    const response = await apiClient.get('/dashboard/1');
    console.log('Requête réussie:', response.data);
    return response.data;
  } catch (error) {
    console.log('Erreur capturée:', error);
    throw error;
  }
}; 