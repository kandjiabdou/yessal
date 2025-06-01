import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import AuthService from '@/services/auth';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const navigate = useNavigate();

  useEffect(() => {
    const checkAuth = () => {
      const isAuthenticated = AuthService.isAuthenticated();
      const user = AuthService.getUser();

      if (!isAuthenticated || !user) {
        navigate('/');
        return;
      }

      // Vérifier que l'utilisateur est bien un Manager
      if (user.role !== 'Manager') {
        AuthService.logout();
        navigate('/');
      }
    };

    checkAuth();
  }, [navigate]);

  return <>{children}</>;
};

export default ProtectedRoute; 