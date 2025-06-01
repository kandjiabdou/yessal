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
import AuthService, { User, SiteLavage } from '@/services/auth';

const Profile: React.FC = () => {
  const navigate = useNavigate();
  const [selectedSite, setSelectedSite] = useState<string>('');
  const [user, setUser] = useState<User | null>(null);
  const [sites, setSites] = useState<SiteLavage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [passwords, setPasswords] = useState({
    current: '',
    new: '',
    confirm: ''
  });
  const [passwordErrors, setPasswordErrors] = useState({
    current: '',
    new: '',
    confirm: ''
  });
  
  useEffect(() => {
    const loadData = async () => {
      const currentUser = AuthService.getUser();
      if (!currentUser) {
        navigate('/');
        return;
      }
      setUser(currentUser);
      
      try {
        const sitesData = await AuthService.getSitesLavage();
        setSites(sitesData);
        
        // Sélectionner le site principal du manager s'il en a un
        if (currentUser.siteLavagePrincipalGerantId) {
          setSelectedSite(currentUser.siteLavagePrincipalGerantId.toString());
        }
      } catch (error) {
        toast.error("Erreur lors de la récupération des sites");
      }
    };

    loadData();
  }, [navigate]);

  const handleSiteChange = (value: string) => {
    setSelectedSite(value);
  };

  const saveSelectedSite = async () => {
    if (!selectedSite) {
      toast.error("Veuillez sélectionner un site");
      return;
    }

    setIsLoading(true);
    try {
      const success = await AuthService.updateManagerSite(parseInt(selectedSite));
      if (success) {
        const siteName = sites.find(site => site.id === parseInt(selectedSite))?.nom;
        toast.success(`Site de travail actuel modifié: ${siteName}`);
      } else {
        toast.error("Erreur lors de la mise à jour du site");
      }
    } catch (error) {
      toast.error("Une erreur est survenue");
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = () => {
    toast.info("Déconnexion en cours...");
    AuthService.logout();
    navigate('/');
  };

  const validatePassword = (password: string): string => {
    if (password.length < 8) {
      return 'Le mot de passe doit contenir au moins 8 caractères';
    }
    if (!/[A-Z]/.test(password)) {
      return 'Le mot de passe doit contenir au moins une majuscule';
    }
    if (!/[a-z]/.test(password)) {
      return 'Le mot de passe doit contenir au moins une minuscule';
    }
    if (!/[0-9]/.test(password)) {
      return 'Le mot de passe doit contenir au moins un chiffre';
    }
    return '';
  };

  const handlePasswordChange = async () => {
    // Réinitialiser les erreurs
    setPasswordErrors({
      current: '',
      new: '',
      confirm: ''
    });

    // Valider le nouveau mot de passe
    const newPasswordError = validatePassword(passwords.new);
    if (newPasswordError) {
      setPasswordErrors(prev => ({ ...prev, new: newPasswordError }));
      return;
    }

    // Vérifier la confirmation
    if (passwords.new !== passwords.confirm) {
      setPasswordErrors(prev => ({ ...prev, confirm: 'Les mots de passe ne correspondent pas' }));
      return;
    }

    setIsLoading(true);
    try {
      const success = await AuthService.changePassword(passwords.current, passwords.new);
      if (success) {
        toast.success('Mot de passe modifié avec succès');
        // Réinitialiser les champs
        setPasswords({
          current: '',
          new: '',
          confirm: ''
        });
      } else {
        toast.error('Erreur lors du changement de mot de passe');
      }
    } catch (error) {
      toast.error('Une erreur est survenue');
    } finally {
      setIsLoading(false);
    }
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
                <SelectItem key={site.id} value={site.id.toString()}>
                  {site.nom} - {site.adresse}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button 
            className="w-full" 
            onClick={saveSelectedSite}
            disabled={isLoading}
          >
            {isLoading ? "Mise à jour..." : "Valider"}
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

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Changer le mot de passe</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm font-medium">Mot de passe actuel</label>
            <Input
              type="password"
              value={passwords.current}
              onChange={(e) => setPasswords(prev => ({ ...prev, current: e.target.value }))}
              className={passwordErrors.current ? 'border-red-500' : ''}
            />
            {passwordErrors.current && (
              <p className="text-sm text-red-500 mt-1">{passwordErrors.current}</p>
            )}
          </div>
          <div>
            <label className="text-sm font-medium">Nouveau mot de passe</label>
            <Input
              type="password"
              value={passwords.new}
              onChange={(e) => setPasswords(prev => ({ ...prev, new: e.target.value }))}
              className={passwordErrors.new ? 'border-red-500' : ''}
            />
            {passwordErrors.new && (
              <p className="text-sm text-red-500 mt-1">{passwordErrors.new}</p>
            )}
          </div>
          <div>
            <label className="text-sm font-medium">Confirmer le nouveau mot de passe</label>
            <Input
              type="password"
              value={passwords.confirm}
              onChange={(e) => setPasswords(prev => ({ ...prev, confirm: e.target.value }))}
              className={passwordErrors.confirm ? 'border-red-500' : ''}
            />
            {passwordErrors.confirm && (
              <p className="text-sm text-red-500 mt-1">{passwordErrors.confirm}</p>
            )}
          </div>
          <Button 
            className="w-full" 
            onClick={handlePasswordChange}
            disabled={isLoading || !passwords.current || !passwords.new || !passwords.confirm}
          >
            {isLoading ? "Modification en cours..." : "Changer le mot de passe"}
          </Button>
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
