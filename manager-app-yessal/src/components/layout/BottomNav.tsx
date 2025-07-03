import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { Home, ShoppingCart, List, Users, Settings, MapPin, Truck, Package } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import AuthService from '@/services/auth';

export const BottomNav: React.FC = () => {
  const location = useLocation();
  const { user } = useAuth();
  
  const isActive = (path: string) => {
    return location.pathname === path;
  };

  const isManager = AuthService.isManager();
  const isAdmin = AuthService.isAdmin();

  // Navigation pour les Managers
  const managerNavItems = [
    {
      to: "/dashboard",
      icon: <Home className="h-5 w-5" />,
      label: "Accueil",
      isActive: isActive('/dashboard')
    },
    {
      to: "/search",
      icon: <ShoppingCart className="h-5 w-5" />,
      label: "Nouvelle",
      isActive: isActive('/search') || isActive('/new-order')
    },
    {
      to: "/orders",
      icon: <List className="h-5 w-5" />,
      label: "Commandes",
      isActive: isActive('/orders') || isActive('/order-details')
    },
    {
      to: "/clients",
      icon: <Users className="h-5 w-5" />,
      label: "Clients",
      isActive: isActive('/clients')
    }
  ];

  // Navigation pour les Administrateurs
  const adminNavItems = [
    {
      to: "/admin/dashboard",
      icon: <Home className="h-5 w-5" />,
      label: "Tableau de bord",
      isActive: isActive('/admin/dashboard')
    },
    {
      to: "/admin/sites",
      icon: <MapPin className="h-5 w-5" />,
      label: "Sites",
      isActive: isActive('/admin/sites')
    },
    {
      to: "/admin/users",
      icon: <Users className="h-5 w-5" />,
      label: "Utilisateurs",
      isActive: isActive('/admin/users')
    },
    {
      to: "/admin/deliveries",
      icon: <Truck className="h-5 w-5" />,
      label: "Livreurs",
      isActive: isActive('/admin/deliveries')
    },
    {
      to: "/admin/orders",
      icon: <Package className="h-5 w-5" />,
      label: "Commandes",
      isActive: isActive('/admin/orders')
    }
  ];

  const navItems = isAdmin ? adminNavItems : managerNavItems;
  const gridCols = isAdmin ? "grid-cols-5" : "grid-cols-4";

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 h-16 z-30">
      <div className={`grid ${gridCols} h-full`}>
        {navItems.map((item, index) => (
          <NavItem 
            key={index}
            to={item.to} 
            icon={item.icon} 
            label={item.label} 
            isActive={item.isActive} 
          />
        ))}
      </div>
    </nav>
  );
};

interface NavItemProps {
  to: string;
  icon: React.ReactNode;
  label: string;
  isActive: boolean;
}

const NavItem: React.FC<NavItemProps> = ({ to, icon, label, isActive }) => {
  return (
    <Link
      to={to}
      className={cn(
        "flex flex-col items-center justify-center h-full",
        isActive 
          ? "text-primary font-medium" 
          : "text-gray-500 hover:text-gray-800"
      )}
    >
      {icon}
      <span className="text-xs mt-1">{label}</span>
    </Link>
  );
};
