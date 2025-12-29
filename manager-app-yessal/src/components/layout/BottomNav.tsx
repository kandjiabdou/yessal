import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { Home, ShoppingCart, List, Users, MapPin, Truck, Package, Menu } from 'lucide-react';
import AuthService, { WorkSession } from '@/services/auth';
import { Sidebar } from './Sidebar';
import { useModule } from '@/contexts/ModuleContext';

export const BottomNav: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const { activeModule } = useModule();
  const [currentSession, setCurrentSession] = useState<WorkSession | null>(null);
  
  useEffect(() => {
    const loadSession = async () => {
      const session = await AuthService.getWorkSession();
      setCurrentSession(session);
    };
    loadSession();

    // Écouter les changements de WorkSession
    const handleSessionChange = (event: CustomEvent) => {
      setCurrentSession(event.detail);
    };

    window.addEventListener('workSessionChanged', handleSessionChange as EventListener);

    return () => {
      window.removeEventListener('workSessionChanged', handleSessionChange as EventListener);
    };
  }, []);
  
  const isActive = (path: string) => {
    return location.pathname === path;
  };

  const isAdmin = AuthService.isAdmin();

  // Navigation pour les Managers - Laverie
  const laverieNavItems = [
    {
      to: "/laverie/dashboard",
      icon: <Home className="h-5 w-5" />,
      label: "Accueil",
      isActive: isActive('/laverie/dashboard')
    },
    {
      to: "/laverie/orders",
      icon: <List className="h-5 w-5" />,
      label: "Commandes",
      isActive: isActive('/laverie/orders') || isActive('/laverie/order-details')
    },
    {
      to: "/clients",
      icon: <Users className="h-5 w-5" />,
      label: "Clients",
      isActive: isActive('/clients')
    }
  ];

  // Navigation pour les Managers - Boutique
  const boutiqueNavItems = [
    {
      to: "/shop/dashboard",
      icon: <Home className="h-5 w-5" />,
      label: "Accueil",
      isActive: isActive('/shop/dashboard')
    },
    {
      to: "/shop/search",
      icon: <ShoppingCart className="h-5 w-5" />,
      label: "Ventes",
      isActive: isActive('/shop/search') || isActive('/shop/new-sale')
    },
    {
      to: "/shop/products",
      icon: <Package className="h-5 w-5" />,
      label: "Produits",
      isActive: isActive('/shop/products')
    },
    {
      to: "/clients",
      icon: <Users className="h-5 w-5" />,
      label: "Clients",
      isActive: isActive('/clients')
    }
  ];

  // Navigation pour Dépenses et Bilan (pas d'items, juste le menu burger)
  const emptyNavItems: typeof laverieNavItems = [];

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

  // Sélection des items de navigation en fonction du chemin actuel et du type de site
  let navItems = emptyNavItems;
  
  if (isAdmin) {
    navItems = adminNavItems;
  } else if (currentSession?.site) {
    const { estLaverie, estBoutique, estVirtuel } = currentSession.site;
    
    // Déterminer les items selon le chemin actuel
    const isOnLaverie = location.pathname.startsWith('/laverie');
    const isOnBoutique = location.pathname.startsWith('/shop');
    const isOnDepenses = location.pathname.startsWith('/depenses');
    const isOnBilan = location.pathname.startsWith('/bilan');
    
    // Pages spéciales sans items de navigation (juste le burger)
    if (isOnDepenses || isOnBilan) {
      navItems = emptyNavItems;
    }
    // Sur /laverie : afficher items laverie si le site est une laverie
    else if (isOnLaverie && estLaverie && !estVirtuel) {
      navItems = laverieNavItems;
    }
    // Sur /shop : afficher items boutique si le site est une boutique
    else if (isOnBoutique && estBoutique) {
      navItems = boutiqueNavItems;
    }
    // Sur les autres pages (profile, clients...) : afficher les items du module principal
    else {
      // Priorité : laverie physique > boutique
      if (estLaverie && !estVirtuel) {
        navItems = laverieNavItems;
      } else if (estBoutique) {
        navItems = boutiqueNavItems;
      }
    }
  }

  return (
    <>
      <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
      
      <nav className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-lg border-t border-gray-200/30 h-20 z-50 shadow-lg">
        <div className="px-4 pb-2 pt-1">
          <div className={cn(
            "grid h-full gap-2",
            isAdmin ? "grid-cols-5" : 
            navItems.length === 0 ? "grid-cols-1" :
            navItems.length === 1 ? "grid-cols-2" :
            navItems.length === 2 ? "grid-cols-3" :
            navItems.length === 3 ? "grid-cols-4" :
            navItems.length === 4 ? "grid-cols-5" : "grid-cols-6"
          )}>
            {navItems.map((item) => (
              <NavItem 
                key={item.to}
                to={item.to} 
                icon={item.icon} 
                label={item.label} 
                isActive={item.isActive} 
              />
            ))}
            
            {/* Menu Burger Button - Only for managers */}
            {!isAdmin && (
              <button
                onClick={() => setIsSidebarOpen(true)}
                className={cn(
                  "relative flex flex-col items-center justify-center h-full rounded-xl transition-all duration-200 ease-in-out group",
                  "transform active:scale-95 hover:bg-gray-100",
                  "text-gray-500 hover:text-gray-900"
                )}
              >
                <div className="relative z-10 flex flex-col items-center justify-center">
                  <div className="p-1.5 rounded-lg">
                    <Menu className="h-5 w-5" />
                  </div>
                  <span className="text-xs mt-1 font-medium text-gray-600">
                    Menu
                  </span>
                </div>
              </button>
            )}
          </div>
        </div>
      </nav>
    </>
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
