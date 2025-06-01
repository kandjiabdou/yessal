
import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { User } from 'lucide-react';

export const TopBar: React.FC = () => {
  return <header className="sticky top-0 z-30 bg-white border-b border-gray-200">
      <div className="flex items-center justify-between p-4">
        <Link to="/dashboard" className="flex items-center">
          <img alt="Yessal Logo" className="h-8 w-auto mr-2" src="/lovable-uploads/85907a18-244b-43c0-9140-f17f12e89acf.png" />
          <span className="font-bold text-xl text-primary">Yessal Manager</span>
        </Link>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" asChild>
            <Link to="/profile">
              <User className="h-5 w-5" />
              <span className="sr-only">Profil</span>
            </Link>
          </Button>
        </div>
      </div>
    </header>;
};
