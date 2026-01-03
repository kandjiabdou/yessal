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
        const session = await AuthService.getWorkSession();
        setWorkSession(session);
        
        // Émettre un événement pour synchroniser les autres composants
        if (session) {
          window.dispatchEvent(new CustomEvent('workSessionChanged', { detail: session }));
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