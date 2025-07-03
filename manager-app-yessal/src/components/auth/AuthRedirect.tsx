import { Navigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';

const AuthRedirect = () => {
  const { isAuthenticated, user } = useAuth();

  // Si l'utilisateur est connecté, rediriger selon son rôle
  if (isAuthenticated && user) {
    if (user.role === 'Admin') {
      return <Navigate to="/admin/dashboard" replace />;
    } else if (user.role === 'Manager') {
      return <Navigate to="/dashboard" replace />;
    }
  }

  // Sinon, rediriger vers la page de login
  return <Navigate to="/login" replace />;
};

export default AuthRedirect; 