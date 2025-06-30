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
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import AuthService, { User } from '@/services/auth';
import { SiteLavage } from '@/services/types';
import { useAuth } from '@/hooks/useAuth';

const Profile: React.FC = () => {
  const navigate = useNavigate();
  const { clearAuth } = useAuth();
  const [selectedSite, setSelectedSite] = useState<string>('');
  const [user, setUser] = useState<User | null>(null);
  const [sites, setSites] = useState<SiteLavage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSwitchLoading, setIsSwitchLoading] = useState(false);
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

  const handleSiteChange = async (value: string) => {
    setSelectedSite(value);
    
    // Changer automatiquement le site dès la sélection
    if (!value) return;
    
    setIsLoading(true);
    try {
      const success = await AuthService.updateManagerSite(parseInt(value));
      if (success) {
        const siteName = sites.find(site => site.id === parseInt(value))?.nom;
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

  // Récupérer le site sélectionné et son statut
  const getSelectedSiteStatus = () => {
    if (!selectedSite) return null;
    const site = sites.find(site => site.id === parseInt(selectedSite));
    return site ? site.statutOuverture : null;
  };

    const selectedSiteStatus = getSelectedSiteStatus();

  // Fonction pour vérifier si le site devrait être ouvert selon les horaires
  const getSiteScheduleStatus = () => {
    if (!selectedSite) return null;
    const site = sites.find(site => site.id === parseInt(selectedSite));
    if (!site) return null;

    const now = new Date();
    const currentTime = now.toTimeString().slice(0, 5); // Format "HH:mm"
    
    // Comparer les heures (format "HH:mm")
    const isInOperatingHours = currentTime >= site.heureOuverture && currentTime <= site.heureFermeture;
    
    return {
      heureOuverture: site.heureOuverture,
      heureFermeture: site.heureFermeture,
      shouldBeOpen: isInOperatingHours,
      currentTime
    };
  };

  const scheduleStatus = getSiteScheduleStatus();
  
  const handleStatusChange = async () => {
    if (!selectedSite) return;
    
    const currentStatus = getSelectedSiteStatus();
    if (currentStatus === null) return;
    
    const currentSite = sites.find(site => site.id === parseInt(selectedSite));
    if (!currentSite) return;
    
    const newStatus = !currentStatus;
    
    setIsSwitchLoading(true);
    try {
      const success = await AuthService.updateSiteStatus(parseInt(selectedSite), newStatus, currentSite);
      if (success) {
        // Mettre à jour l'état local des sites
        setSites(prevSites => 
          prevSites.map(site => 
            site.id === parseInt(selectedSite) 
              ? { ...site, statutOuverture: newStatus }
              : site
          )
        );
        toast.success(`Site ${newStatus ? 'ouvert' : 'fermé'} avec succès`);
      } else {
        toast.error("Erreur lors de la mise à jour du statut");
      }
    } catch (error) {
      toast.error("Une erreur est survenue");
    } finally {
      setIsSwitchLoading(false);
    }
  };
  


  const handleLogout = () => {
    toast.info("Déconnexion en cours...");
    // Nettoyer l'état Zustand ET localStorage
    clearAuth();
    AuthService.logout();
    // Rediriger directement vers login pour éviter le problème de timing
    navigate('/login');
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
          <div className="relative">
            <Select value={selectedSite} onValueChange={handleSiteChange} disabled={isLoading}>
              <SelectTrigger>
                <SelectValue placeholder="Sélectionner un site" />
              </SelectTrigger>
              <SelectContent>
                {sites.map(site => (
                  <SelectItem key={site.id} value={site.id.toString()}>
                    {site.nom} - {site.adresseText}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {isLoading && (
              <div className="absolute right-2 top-1/2 transform -translate-y-1/2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-900"></div>
              </div>
            )}
          </div>
          
          {/* Horaires d'ouverture */}
          {selectedSite && scheduleStatus && (
            <div className="p-3 bg-blue-50 rounded-md">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-blue-900">
                  Horaires d'ouverture
                </span>
                <span className="text-xs text-blue-600">
                  Maintenant: {scheduleStatus.currentTime}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-blue-800">
                  {scheduleStatus.heureOuverture} - {scheduleStatus.heureFermeture}
                </span>
                <span className={`text-xs px-2 py-1 rounded-full ${
                  scheduleStatus.shouldBeOpen 
                    ? 'bg-green-100 text-green-700' 
                    : 'bg-orange-100 text-orange-700'
                }`}>
                  {scheduleStatus.shouldBeOpen ? 'Dans les horaires' : 'Hors horaires'}
                </span>
              </div>
            </div>
          )}

          {/* Statut d'ouverture du site sélectionné */}
          {selectedSite && selectedSiteStatus !== null && (
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-md">
              <div className="flex flex-col">
                <span className="text-sm font-medium">
                  Statut d'ouverture
                </span>
                {scheduleStatus && (
                  <span className={`text-xs ${
                    selectedSiteStatus !== scheduleStatus.shouldBeOpen 
                      ? 'text-amber-600' 
                      : 'text-gray-500'
                  }`}>
                    {selectedSiteStatus !== scheduleStatus.shouldBeOpen 
                      ? `⚠️ ${scheduleStatus.shouldBeOpen ? 'Devrait être ouvert' : 'Devrait être fermé'}`
                      : '✓ Conforme aux horaires'
                    }
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <span className={`text-sm font-medium ${selectedSiteStatus ? 'text-green-600' : 'text-red-600'}`}>
                  {selectedSiteStatus ? 'Ouvert' : 'Fermé'}
                </span>
                <Switch
                  checked={selectedSiteStatus}
                  onCheckedChange={handleStatusChange}
                  disabled={isSwitchLoading}
                  className={`${
                    selectedSiteStatus 
                      ? 'data-[state=checked]:bg-green-500' 
                      : 'data-[state=unchecked]:bg-red-500'
                  } ${isSwitchLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
                />
              </div>
            </div>
          )}
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
