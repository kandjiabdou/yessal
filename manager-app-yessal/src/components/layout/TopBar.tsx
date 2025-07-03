import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { User, Crown, Settings } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import AuthService from '@/services/auth';

export const TopBar: React.FC = () => {
  const { user } = useAuth();
  const isAdmin = AuthService.isAdmin();
  const homeLink = isAdmin ? '/admin/dashboard' : '/dashboard';

  return (
    <header className="sticky top-0 z-30 bg-white border-b border-gray-200">
      <div className="flex items-center justify-between p-3 sm:p-4">
        <Link to={homeLink} className="flex items-center">
          <img 
            alt="Yessal Logo" 
            className="h-6 w-auto sm:h-8 sm:w-auto mr-2" 
            src="/lovable-uploads/85907a18-244b-43c0-9140-f17f12e89acf.png" 
          />
          <div className="flex flex-col">
            <span className="font-bold text-lg sm:text-xl text-primary hidden xs:inline">
              Yessal {isAdmin ? 'Admin' : 'Manager'}
            </span>
            <span className="font-bold text-lg text-primary xs:hidden">
              Yessal
            </span>
            {user && (
              <span className="text-xs text-gray-500 hidden sm:inline">
                {user.prenom} {user.nom} - {user.role}
              </span>
            )}
          </div>
        </Link>
        <div className="flex items-center gap-2">
          {isAdmin && (
            <div className="flex items-center mr-2">
              <Crown className="h-4 w-4 text-amber-600" />
              <span className="text-xs text-amber-600 ml-1 hidden sm:inline">Admin</span>
            </div>
          )}
          <Button variant="ghost" size="icon" asChild>
            <Link to="/profile">
              <User className="h-4 w-4 sm:h-5 sm:w-5" />
              <span className="sr-only">Profil</span>
            </Link>
          </Button>
        </div>
      </div>
    </header>
  );
};
