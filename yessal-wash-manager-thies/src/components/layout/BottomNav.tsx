
import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { Home, ShoppingCart, List } from 'lucide-react';

export const BottomNav: React.FC = () => {
  const location = useLocation();
  
  const isActive = (path: string) => {
    return location.pathname === path;
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 h-16 z-30">
      <div className="grid grid-cols-3 h-full">
        <NavItem 
          to="/dashboard" 
          icon={<Home className="h-5 w-5" />} 
          label="Accueil" 
          isActive={isActive('/dashboard')} 
        />
        <NavItem 
          to="/search" 
          icon={<ShoppingCart className="h-5 w-5" />} 
          label="Nouvelle" 
          isActive={isActive('/search') || isActive('/new-order')} 
        />
        <NavItem 
          to="/orders" 
          icon={<List className="h-5 w-5" />} 
          label="Commandes" 
          isActive={isActive('/orders') || isActive('/order-details')} 
        />
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
