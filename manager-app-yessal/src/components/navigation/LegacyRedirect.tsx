import { Navigate, useLocation } from 'react-router-dom';

/**
 * Composant de redirection pour les anciennes routes vers le module laverie
 * Utilisé pour maintenir la compatibilité avec les anciens liens
 */
const LegacyRedirect = () => {
  const location = useLocation();
  
  // Mapper les anciennes routes vers les nouvelles
  const routeMap: Record<string, string> = {
    '/dashboard': '/laverie/dashboard',
    '/search': '/laverie/search',
    '/new-order': '/laverie/new-order',
    '/order-recap': '/laverie/order-recap',
    '/orders': '/laverie/orders',
    '/order-details': '/laverie/order-details',
  };

  const newPath = routeMap[location.pathname] || '/laverie/dashboard';
  
  return <Navigate to={newPath} state={location.state} replace />;
};

export default LegacyRedirect;
