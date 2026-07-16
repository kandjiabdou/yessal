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

// --- Rafraîchissement automatique du token sur 401 ---
// Un seul refresh à la fois, partagé entre les requêtes concurrentes.
let refreshPromise: Promise<string | null> | null = null;

const readRefreshToken = (): string | null => {
  try {
    const auth = localStorage.getItem('auth-storage');
    if (auth) {
      const { state } = JSON.parse(auth);
      return state.refreshToken ?? null;
    }
  } catch (error) {
    console.error('Erreur lors de la lecture du refresh token:', error);
  }
  return null;
};

const forceLogout = async () => {
  localStorage.removeItem('auth-storage');
  try {
    const { useAuth } = await import('@/hooks/useAuth');
    useAuth.getState().clearAuth();
  } catch (e) {
    // localStorage déjà nettoyé, on ignore
  }
  if (typeof window !== 'undefined') {
    window.location.href = '/login';
  }
};

const refreshAccessToken = async (): Promise<string | null> => {
  const refreshToken = readRefreshToken();
  if (!refreshToken) return null;

  try {
    // axios "brut" (et non apiClient) pour éviter la boucle d'intercepteur
    const resp = await axios.post(`${API_URL}/auth/refresh`, { refreshToken });
    const newToken: string | undefined = resp.data?.data?.accessToken;
    if (!newToken) return null;

    const { useAuth } = await import('@/hooks/useAuth');
    useAuth.getState().setToken(newToken);
    return newToken;
  } catch (e) {
    return null;
  }
};

// Intercepteur de réponse : tente un refresh sur 401, puis rejoue la requête
apiClient.interceptors.response.use(
  (response: AxiosResponse) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as
      | (NonNullable<AxiosError['config']> & { _retry?: boolean })
      | undefined;

    if (error.response?.status === 401 && originalRequest && !originalRequest._retry) {
      originalRequest._retry = true;

      refreshPromise = refreshPromise ?? refreshAccessToken();
      const newToken = await refreshPromise;
      refreshPromise = null;

      if (newToken) {
        originalRequest.headers.Authorization = `Bearer ${newToken}`;
        return apiClient(originalRequest);
      }

      // Échec du refresh (pas de refresh token ou refresh expiré) -> déconnexion
      await forceLogout();
    }

    return Promise.reject(error);
  }
);

export default apiClient; 