import axios, { AxiosResponse, AxiosError } from 'axios';
import { API_URL } from '@/config/env';

// Créer une instance axios configurée
const apiClient = axios.create({
  baseURL: API_URL,
});

// Intercepteur de requête pour ajouter automatiquement le token
apiClient.interceptors.request.use(
  (config) => {
    // Récupérer le token depuis le localStorage directement
    // car on ne peut pas utiliser le hook useAuth ici
    try {
      const auth = localStorage.getItem('auth-storage');
      if (auth) {
        const { state } = JSON.parse(auth);
        if (state.token) {
          config.headers.Authorization = `Bearer ${state.token}`;
        }
      }
    } catch (error) {
      console.error('Erreur lors de la lecture du token:', error);
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Intercepteur de réponse pour gérer les erreurs 401
apiClient.interceptors.response.use(
  (response: AxiosResponse) => {
    return response;
  },
  async (error: AxiosError) => {
    // Si on reçoit une erreur 401, déconnecter l'utilisateur
    if (error.response?.status === 401) {
      console.log('Token expiré, déconnexion automatique...');
      
      // Nettoyer le localStorage
      localStorage.removeItem('auth-storage');
      
      // Déclencher une actualisation de l'état Zustand en important dynamiquement
      try {
        // Import dynamique pour éviter les problèmes de circular dependencies
        const { useAuth } = await import('@/hooks/useAuth');
        const authStore = useAuth.getState();
        authStore.clearAuth();
        console.log('État Zustand nettoyé');
      } catch (e) {
        // Si ça échoue, c'est pas grave, on a déjà nettoyé le localStorage
        console.log('Impossible de nettoyer l\'état Zustand, localStorage nettoyé');
      }
      
      // Rediriger vers la page de connexion
      if (typeof window !== 'undefined') {
        window.location.href = '/login';
      }
    }
    
    return Promise.reject(error);
  }
);

export default apiClient; 