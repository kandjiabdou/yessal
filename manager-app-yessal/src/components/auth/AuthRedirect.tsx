import { Navigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useEffect, useState } from 'react';
import AuthService, { WorkSession } from '@/services/auth';

const AuthRedirect = () => {
  const { isAuthenticated, user } = useAuth();
  const [workSession, setWorkSession] = useState<WorkSession | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadSession = async () => {
      if (isAuthenticated && user?.role === 'MANAGER') {
        console.log('[AuthRedirect] Chargement de la session pour le manager...');
        try {
          const session = await AuthService.getWorkSession();
          console.log('[AuthRedirect] Session chargée:', session);
          console.log('[AuthRedirect] Session.site:', session?.site);
          console.log('[AuthRedirect] Flags site:', {
            estLaverie: session?.site?.estLaverie,
            estBoutique: session?.site?.estBoutique,
            estVirtuel: session?.site?.estVirtuel
          });
          setWorkSession(session);
        } catch (error) {
          console.error('[AuthRedirect] Erreur lors du chargement de la session:', error);
        }
      }
      setLoading(false);
    };
    loadSession();
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