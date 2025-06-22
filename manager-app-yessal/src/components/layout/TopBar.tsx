import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { User } from 'lucide-react';

export const TopBar: React.FC = () => {
  return <header className="sticky top-0 z-30 bg-white border-b border-gray-200">
      <div className="flex items-center justify-between p-3 sm:p-4">
        <Link to="/dashboard" className="flex items-center">
          <img 
            alt="Yessal Logo" 
            className="h-6 w-auto sm:h-8 sm:w-auto mr-2" 
            src="/lovable-uploads/85907a18-244b-43c0-9140-f17f12e89acf.png" 
          />
          <span className="font-bold text-lg sm:text-xl text-primary hidden xs:inline">
            Yessal Manager
          </span>
          <span className="font-bold text-lg text-primary xs:hidden">
            Yessal
          </span>
        </Link>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" asChild>
            <Link to="/profile">
              <User className="h-4 w-4 sm:h-5 sm:w-5" />
              <span className="sr-only">Profil</span>
            </Link>
          </Button>
        </div>
      </div>
    </header>;
};
