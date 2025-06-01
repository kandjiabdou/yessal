import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ArrowLeft } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import AuthService, { User } from '@/services/auth';

const Profile: React.FC = () => {
  const navigate = useNavigate();
  const [selectedSite, setSelectedSite] = useState('');
  const [user, setUser] = useState<User | null>(null);
  
  useEffect(() => {
    const currentUser = AuthService.getUser();
    if (!currentUser) {
      navigate('/');
      return;
    }
    setUser(currentUser);
    if (currentUser.siteLavagePrincipalGerantId) {
      setSelectedSite(currentUser.siteLavagePrincipalGerantId.toString());
    }
  }, [navigate]);

  // Mock data for available sites
  const sites = [
    { id: 'thies-nord', name: 'Thiès Nord' },
    { id: 'thies-sud', name: 'Thiès Sud' },
    { id: 'mbour', name: 'Mbour' },
    { id: 'dakar', name: 'Dakar' },
  ];

  const handleSiteChange = (value: string) => {
    setSelectedSite(value);
  };

  const saveSelectedSite = () => {
    const siteName = sites.find(site => site.id === selectedSite)?.name;
    toast.success(`Site de travail actuel modifié: ${siteName}`);
  };

  const handleLogout = () => {
    toast.info("Déconnexion en cours...");
    AuthService.logout();
    navigate('/');
  };

  if (!user) {
    return null;
  }

  return (
    <div className="space-y-6 pb-8">
      <div className="flex items-center gap-2">
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={() => navigate('/dashboard')} 
          className="h-8 w-8"
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h1 className="text-2xl font-bold tracking-tight">Mon Profil</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Site de travail actuel</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Select value={selectedSite} onValueChange={handleSiteChange}>
            <SelectTrigger>
              <SelectValue placeholder="Sélectionner un site" />
            </SelectTrigger>
            <SelectContent>
              {sites.map(site => (
                <SelectItem key={site.id} value={site.id}>
                  {site.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button className="w-full" onClick={saveSelectedSite}>
            Valider
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Informations personnelles</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium">Prénom</label>
              <Input value={user.prenom} readOnly className="bg-gray-50" />
            </div>
            <div>
              <label className="text-sm font-medium">Nom</label>
              <Input value={user.nom} readOnly className="bg-gray-50" />
            </div>
          </div>
          <div>
            <label className="text-sm font-medium">Email</label>
            <Input value={user.email || ''} readOnly className="bg-gray-50" />
          </div>
          <div>
            <label className="text-sm font-medium">Téléphone</label>
            <Input value={user.telephone || ''} readOnly className="bg-gray-50" />
          </div>
          <div>
            <label className="text-sm font-medium">Adresse</label>
            <Input value={user.adresseText || ''} readOnly className="bg-gray-50" />
          </div>
          <div>
            <label className="text-sm font-medium">Rôle</label>
            <Input value={user.role} readOnly className="bg-gray-50" />
          </div>
        </CardContent>
      </Card>

      <Button 
        variant="destructive" 
        className="w-full"
        onClick={handleLogout}
      >
        Déconnexion
      </Button>
    </div>
  );
};

export default Profile;
