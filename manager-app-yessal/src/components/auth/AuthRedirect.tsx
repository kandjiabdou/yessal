import { Navigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useEffect, useState } from 'react';
import AuthService, { WorkSession } from '@/services/auth';

const AuthRedirect = () => {
  const { isAuthenticated, user } = useAuth();
  const [workSession, setWorkSession] = useState<WorkSession | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    let retryCount = 0;
    const maxRetries = 10;
    
    const loadSession = async () => {
      if (!mounted) return;
      
      if (isAuthenticated && user?.role === 'MANAGER') {
        try {
          const session = await AuthService.getWorkSession();
          
          if (mounted) {
            if (session) {
              setWorkSession(session);
              // Émettre un événement pour synchroniser les autres composants
              window.dispatchEvent(new CustomEvent('workSessionChanged', { detail: session }));
              setLoading(false);
            } else if (retryCount < maxRetries) {
              // Réessayer avec un délai court au début
              retryCount++;
              const delay = retryCount <= 3 ? 200 : retryCount * 500;
              setTimeout(() => loadSession(), delay);
            } else {
              // Après plusieurs tentatives, continuer avec null
              console.warn('Session non disponible après', maxRetries, 'tentatives');
              window.dispatchEvent(new CustomEvent('workSessionChanged', { detail: null }));
              setLoading(false);
            }
          }
        } catch (error) {
          console.error('Erreur chargement session AuthRedirect:', error);
          if (mounted && retryCount < maxRetries) {
            retryCount++;
            setTimeout(() => loadSession(), 500);
          } else {
            setLoading(false);
          }
        }
      } else {
        setLoading(false);
      }
    };
    
    loadSession();
    
    return () => {
      mounted = false;
    };
  }, [isAuthenticated, user]);

  // Attendre le chargement de la session pour les managers
  if (loading && isAuthenticated && user?.role === 'MANAGER') {
    return <div className="flex items-center justify-center min-h-screen">Chargement...</div>;
  }

  // Si l'utilisateur est connecté, rediriger selon son rôle
  if (isAuthenticated && user) {
    if (user.role === 'ADMIN') {
      return <Navigate to="/admin/dashboard" replace />;
    } else if (user.role === 'MANAGER') {
      // Déterminer le dashboard par défaut selon le type de site
      if (workSession?.site) {
        const { estLaverie, estBoutique, estVirtuel } = workSession.site;
        
        // Si c'est une laverie (et pas virtuelle), rediriger vers laverie
        if (estLaverie && !estVirtuel) {
          return <Navigate to="/laverie/dashboard" replace />;
        }
        // Si c'est une boutique (virtuelle ou non), rediriger vers boutique
        else if (estBoutique) {
          return <Navigate to="/shop/dashboard" replace />;
        }
      }
      
      // Par défaut, rediriger vers laverie
      return <Navigate to="/laverie/dashboard" replace />;
    }
  }

  // Sinon, rediriger vers la page de login
  return <Navigate to="/login" replace />;
};

export default AuthRedirect; 