import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';

const PrivateRoute = () => {
  const { isAuthenticated, user } = useAuth();
  const location = useLocation();

  if (!isAuthenticated || !user) {
    // Rediriger vers la page de connexion en conservant l'URL de destination
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Vérifier que l'utilisateur est bien un Manager
  if (user.role !== 'MANAGER') {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
};

export default PrivateRoute; 