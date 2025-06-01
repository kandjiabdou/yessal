
import React, { useState } from 'react';
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

const Profile: React.FC = () => {
  const navigate = useNavigate();
  const [selectedSite, setSelectedSite] = useState('thies-nord');
  
  // Mock data for manager profile
  const managerProfile = {
    firstName: 'Abdou',
    lastName: 'Diop',
    email: 'abdou.diop@yessal.sn',
    phone: '77 123 45 67',
    address: 'Thiès Nord, Sénégal',
    role: 'Manager',
  };

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
    setTimeout(() => {
      navigate('/');
    }, 1000);
  };

  return (
    <div className="space-y-6 pb-8">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" onClick={() => navigate('/dashboard')} className="h-8 w-8">
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
              <Input value={managerProfile.firstName} readOnly className="bg-gray-50" />
            </div>
            <div>
              <label className="text-sm font-medium">Nom</label>
              <Input value={managerProfile.lastName} readOnly className="bg-gray-50" />
            </div>
          </div>
          <div>
            <label className="text-sm font-medium">Email</label>
            <Input value={managerProfile.email} readOnly className="bg-gray-50" />
          </div>
          <div>
            <label className="text-sm font-medium">Téléphone</label>
            <Input value={managerProfile.phone} readOnly className="bg-gray-50" />
          </div>
          <div>
            <label className="text-sm font-medium">Adresse</label>
            <Input value={managerProfile.address} readOnly className="bg-gray-50" />
          </div>
          <div>
            <label className="text-sm font-medium">Rôle</label>
            <Input value={managerProfile.role} readOnly className="bg-gray-50" />
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
