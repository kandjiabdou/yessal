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

import { toast } from "react-toastify";
import AuthService, { User, WorkSession, SiteLavageWithSession } from '@/services/auth';
import { SiteLavage } from '@/services/types';
import { useAuth } from '@/hooks/useAuth';

const Profile: React.FC = () => {
  const navigate = useNavigate();
  const { clearAuth } = useAuth();
  const [selectedSite, setSelectedSite] = useState<string>('');
  const [user, setUser] = useState<User | null>(null);
  const [sites, setSites] = useState<SiteLavage[]>([]);
  const [sitesWithSession, setSitesWithSession] = useState<SiteLavageWithSession[]>([]);
  const [currentWorkSession, setCurrentWorkSession] = useState<WorkSession | null>(null);
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
        // Charger les sites et les informations de session
        const [sitesData, sitesWithSessionData, workSession] = await Promise.all([
          AuthService.getSitesLavage(),
          AuthService.getSitesWithSessionInfo(),
          AuthService.getWorkSession()
        ]);
        
        setSites(sitesData);
        setSitesWithSession(sitesWithSessionData);
        setCurrentWorkSession(workSession);
        
        // Sélectionner le site de la session de travail actuelle, ou le site principal
        if (workSession && workSession.isActive && workSession.currentSessionSiteId) {
          setSelectedSite(workSession.currentSessionSiteId.toString());
        } else if (currentUser.siteLavagePrincipalGerantId) {
          setSelectedSite(currentUser.siteLavagePrincipalGerantId.toString());
        } else {
          setSelectedSite("close");
        }
      } catch (error) {
        console.error('Erreur lors du chargement des données:', error);
        toast.error("Erreur lors de la récupération des données");
      }
    };

    loadData();
  }, [navigate]);

  const handleSiteChange = async (value: string) => {
    setSelectedSite(value);
    
    if (!value) return;
    
    setIsLoading(true);
    try {
      let success = false;
      
      // Cas spécial pour "Hors site - Fermer"
      if (value === "close") {
        success = await AuthService.setWorkSession(null);
        if (success) {
          setCurrentWorkSession(null);
          toast.success("Session de travail fermée");
          // Rafraîchir les données des sites pour voir les changements de statut
          const updatedSitesWithSession = await AuthService.getSitesWithSessionInfo();
          setSitesWithSession(updatedSitesWithSession);
        } else {
          toast.error("Erreur lors de la fermeture de la session");
        }
      } else {
        // Démarrer ou changer la session de travail
        const siteId = parseInt(value);
        success = await AuthService.setWorkSession(siteId);
        
        if (success) {
          // Récupérer la session mise à jour
          const updatedWorkSession = await AuthService.getWorkSession();
          setCurrentWorkSession(updatedWorkSession);
          
          const siteName = sites.find(site => site.id === siteId)?.nom;
          toast.success(`Session de travail démarrée sur: ${siteName}`);
          
          // Rafraîchir les données des sites pour voir les changements de statut
          const updatedSitesWithSession = await AuthService.getSitesWithSessionInfo();
          setSitesWithSession(updatedSitesWithSession);
        } else {
          toast.error("Erreur lors du démarrage de la session de travail");
        }
      }
    } catch (error) {
      console.error('Erreur lors du changement de site:', error);
      toast.error("Une erreur est survenue");
    } finally {
      setIsLoading(false);
    }
  };

  // Récupérer les informations du site sélectionné avec données de session
  const getSelectedSiteInfo = () => {
    if (!selectedSite || selectedSite === "close") return null;
    
    const siteId = parseInt(selectedSite);
    const siteWithSession = sitesWithSession.find(site => site.id === siteId);
    const basicSite = sites.find(site => site.id === siteId);
    
    return siteWithSession || basicSite;
  };

  const selectedSiteInfo = getSelectedSiteInfo();

  // Fonction pour vérifier si le site devrait être ouvert selon les horaires
  const getSiteScheduleStatus = () => {
    if (!selectedSiteInfo) return null;

    const now = new Date();
    const currentTime = now.toTimeString().slice(0, 5); // Format "HH:mm"
    
    // Comparer les heures (format "HH:mm")
    const isInOperatingHours = currentTime >= selectedSiteInfo.heureOuverture && currentTime <= selectedSiteInfo.heureFermeture;
    
    return {
      heureOuverture: selectedSiteInfo.heureOuverture,
      heureFermeture: selectedSiteInfo.heureFermeture,
      shouldBeOpen: isInOperatingHours,
      currentTime
    };
  };

  const scheduleStatus = getSiteScheduleStatus();

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

  // Vérifier si le manager a une session active sur le site sélectionné
  const isSessionActive = currentWorkSession?.isActive && 
                         currentWorkSession?.currentSessionSiteId === parseInt(selectedSite);

  return (
    <div className="space-y-6 pb-8">
      <div className="flex items-center gap-2">
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={() => navigate('/laverie/dashboard')} 
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
                <SelectItem key="close" value="close">
                  Hors site - Fermer
                </SelectItem>
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
          {selectedSite && selectedSite !== "close" && scheduleStatus && (
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

          {/* Informations de session et statut d'ouverture automatique */}
          {selectedSite && selectedSite !== "close" && selectedSiteInfo && (
            <div className="space-y-3">
              {/* Informations de session */}
              {'sessionInfo' in selectedSiteInfo && (
                <div className="p-3 bg-indigo-50 rounded-md">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-indigo-900">
                      Managers actifs sur ce site
                    </span>
                    <span className="text-sm font-semibold text-indigo-700">
                      {(selectedSiteInfo as SiteLavageWithSession).sessionInfo.activeManagersCount}
                    </span>
                  </div>
                </div>
              )}

              {/* Statut automatique du site */}
              {'sessionInfo' in selectedSiteInfo && (
                <div className="p-3 bg-green-50 rounded-md">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-green-900">
                      Statut automatique du site
                    </span>
                    <span className={`text-sm font-semibold ${
                      selectedSiteInfo.statutOuverture ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {selectedSiteInfo.statutOuverture ? '🟢 Ouvert' : '🔴 Fermé'}
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Message pour "Hors site - Fermer" */}
          {selectedSite === "close" && (
            <div className="p-3 bg-red-50 rounded-md">
              <div className="flex items-center justify-center">
                <span className="text-sm font-medium text-red-800">
                  🚫 Hors site - Aucune session de travail active
                </span>
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
            onClick={handlePasswordChange} 
            disabled={isLoading}
            className="w-full"
          >
            {isLoading ? 'Modification...' : 'Changer le mot de passe'}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <Button 
            onClick={handleLogout} 
            variant="destructive" 
            className="w-full"
          >
            Se déconnecter
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default Profile;

