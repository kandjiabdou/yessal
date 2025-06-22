import { Navigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';

const AuthRedirect = () => {
  const { isAuthenticated, user } = useAuth();

  // Si l'utilisateur est connecté et est un Manager, rediriger vers le dashboard
  if (isAuthenticated && user && user.role === 'Manager') {
    return <Navigate to="/dashboard" replace />;
  }

  // Sinon, rediriger vers la page de login
  return <Navigate to="/login" replace />;
};

export default AuthRedirect; 