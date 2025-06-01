
import { Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { Home, History, User, Shirt } from "lucide-react";

const NavBar = () => {
  const location = useLocation();
  
  const navItems = [
    {
      label: "Accueil",
      icon: <Home className="w-6 h-6" />,
      href: "/dashboard",
    },
    {
      label: "Collecte",
      icon: <Shirt className="w-6 h-6" />,
      href: "/pickup",
    },
    {
      label: "Historique",
      icon: <History className="w-6 h-6" />,
      href: "/history",
    },
    {
      label: "Profil",
      icon: <User className="w-6 h-6" />,
      href: "/profile",
    },
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-background border-t flex justify-around items-center py-2 z-50">
      <div className="max-w-md w-full mx-auto flex justify-around">
        {navItems.map((item) => (
          <Link
            key={item.href}
            to={item.href}
            className={cn(
              "flex flex-col items-center justify-center p-2 rounded-lg",
              location.pathname === item.href
                ? "text-primary"
                : "text-muted-foreground hover:text-primary"
            )}
          >
            {item.icon}
            <span className="text-xs mt-1">{item.label}</span>
          </Link>
        ))}
      </div>
    </div>
  );
};

export default NavBar;
