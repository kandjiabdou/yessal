import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { Home, Plus, Wallet, TrendingUp, Settings } from 'lucide-react';

export const BottomNav: React.FC = () => {
  const location = useLocation();

  const isActive = (path: string) => {
    return location.pathname === path;
  };


  // Navigation pour les Associes
  const navItems = [
    {
      to: "/dashboard",
      icon: <Home className="h-5 w-5" />,
      label: "Accueil",
      isActive: isActive('/dashboard')
    },
    {
      to: "/nouveau",
      icon: <Plus className="h-5 w-5" />,
      label: "Nouvelle",
      isActive: isActive('/nouveau')
    },
    {
      to: "/depenses",
      icon: <Wallet className="h-5 w-5" />,
      label: "Dépenses",
      isActive: isActive('/depenses')
    },
    {
      to: "/bilan",
      icon: <TrendingUp className="h-5 w-5" />,
      label: "Bilan",
      isActive: isActive('/bilan')
    },
    {
      to: "/parametres",
      icon: <Settings className="h-5 w-5" />,
      label: "Paramètres",
      isActive: isActive('/parametres')
    }
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-lg border-t border-gray-200/30 h-20 z-50 shadow-lg">
      <div className="px-4 pb-2 pt-1">
        <div className="grid grid-cols-5 h-full gap-2">
          {navItems.map((item) => (
            <NavItem
              key={item.to}
              to={item.to}
              icon={item.icon}
              label={item.label}
              isActive={item.isActive}
            />
          ))}
        </div>
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
        "relative flex flex-col items-center justify-center h-full rounded-xl transition-all duration-200 ease-in-out group",
        "transform active:scale-95",
        isActive
          ? "text-black"
          : "text-gray-500"
      )}
    >
      {/* Background active indicator (simple, uni-color) */}
      <div className={cn(
        "absolute inset-0 rounded-xl transition-all duration-200 ease-out",
        isActive
          ? "bg-[#66d9a1] shadow-sm scale-100"
          : "bg-transparent scale-100"
      )} />

      {/* Icon container */}
      <div className={cn(
        "relative z-10 flex flex-col items-center justify-center transition-all duration-200",
        isActive ? "transform -translate-y-0.5" : ""
      )}>
        <div className={cn(
          "p-1.5 rounded-lg transition-all duration-200",
          isActive
            ? "bg-white/20 backdrop-blur-sm"
            : ""
        )}>
          {React.cloneElement(icon as React.ReactElement, {
            className: cn(
              "h-5 w-5 transition-all duration-200",
              isActive ? "text-black drop-shadow-sm" : "text-gray-500"
            )
          })}
        </div>

        {/* Label */}
        <span className={cn(
          "text-xs mt-1 font-medium transition-all duration-200",
          isActive
            ? "text-black font-semibold scale-105"
            : "text-gray-600"
        )}>
          {label}
        </span>
      </div>

      {/* Active indicator dot (subtle) */}
      {isActive && (
        <div className="absolute -top-1 left-1/2 transform -translate-x-1/2">
          <div className="w-1 h-1 bg-white rounded-full shadow-sm" />
        </div>
      )}
    </Link>
  );
};
