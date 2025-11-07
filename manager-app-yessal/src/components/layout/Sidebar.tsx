import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { 
  Home, 
  Wallet, 
  ShoppingBag, 
  TrendingUp, 
  Menu
} from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose }) => {
  const location = useLocation();
  const navigate = useNavigate();

  const handleNavigation = (path: string) => {
    navigate(path);
    onClose();
  };

  const menuItems = [
    {
      id: 'laverie',
      label: 'Laverie',
      icon: <Home className="h-5 w-5" />,
      path: '/laverie/dashboard',
      action: true,
    },
    {
      id: 'depenses',
      label: 'Dépenses',
      icon: <Wallet className="h-5 w-5" />,
      path: '/depenses',
      action: true,
    },
    {
      id: 'bilan',
      label: 'Bilan',
      icon: <TrendingUp className="h-5 w-5" />,
      path: '/bilan',
      action: true,
    },
    {
      id: 'boutique',
      label: 'Boutique',
      icon: <ShoppingBag className="h-5 w-5" />,
      path: null,
      action: false,
      comingSoon: true,
    },
  ];

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent 
        side="right" 
        className="w-[280px] sm:w-[320px] p-0 bg-gradient-to-b from-white to-gray-50"
      >
        {/* Header */}
        <SheetHeader className="px-6 py-6 border-b border-gray-200/50 bg-white/80 backdrop-blur-sm">
          <SheetTitle className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <div className="p-2 bg-[#66d9a1]/10 rounded-lg">
              <Menu className="h-5 w-5 text-[#66d9a1]" />
            </div>
            Menu
          </SheetTitle>
          <SheetDescription className="sr-only">
            Navigation menu pour accéder aux différents modules de l'application
          </SheetDescription>
        </SheetHeader>

        {/* Menu Items */}
        <div className="px-4 py-6 space-y-2">
          {menuItems.map((item) => (
            <MenuItem
              key={item.id}
              item={item}
              isActive={location.pathname === item.path}
              onClick={() => item.action && item.path && handleNavigation(item.path)}
            />
          ))}
        </div>

        {/* Footer */}
        <div className="absolute bottom-0 left-0 right-0 p-6 border-t border-gray-200/50 bg-white/80 backdrop-blur-sm">
          <div className="text-center">
            <p className="text-xs text-gray-500">Yessal Manager</p>
            <p className="text-xs text-gray-400 mt-1">Version 1.0</p>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
};

interface MenuItemProps {
  item: {
    id: string;
    label: string;
    icon: React.ReactNode;
    path: string | null;
    action: boolean;
    comingSoon?: boolean;
  };
  isActive: boolean;
  onClick: () => void;
}

const MenuItem: React.FC<MenuItemProps> = ({ item, isActive, onClick }) => {
  const buttonContent = (
    <>
      <div className={cn(
        "flex items-center gap-3 flex-1",
        !item.action && "opacity-60"
      )}>
        <div className={cn(
          "p-2.5 rounded-xl transition-all duration-200",
          isActive 
            ? "bg-[#66d9a1] text-white shadow-md" 
            : "bg-gray-100 text-gray-600"
        )}>
          {React.cloneElement(item.icon as React.ReactElement, {
            className: "h-5 w-5"
          })}
        </div>
        
        <div className="flex-1">
          <span className={cn(
            "font-medium text-sm",
            isActive ? "text-gray-900" : "text-gray-700"
          )}>
            {item.label}
          </span>
          {item.comingSoon && (
            <span className="block text-xs text-gray-400 mt-0.5">
              À venir
            </span>
          )}
        </div>
      </div>

      {isActive && (
        <div className="w-1 h-8 bg-[#66d9a1] rounded-full" />
      )}
    </>
  );

  if (!item.action) {
    return (
      <div
        className={cn(
          "flex items-center justify-between w-full px-4 py-3 rounded-xl transition-all duration-200",
          "bg-gray-50 cursor-not-allowed"
        )}
      >
        {buttonContent}
      </div>
    );
  }

  return (
    <button
      onClick={onClick}
      className={cn(
        "flex items-center justify-between w-full px-4 py-3 rounded-xl transition-all duration-200",
        "hover:bg-gray-100 active:scale-98",
        isActive && "bg-[#66d9a1]/10 hover:bg-[#66d9a1]/15"
      )}
    >
      {buttonContent}
    </button>
  );
};
