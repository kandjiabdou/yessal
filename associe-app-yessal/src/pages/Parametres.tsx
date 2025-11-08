import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import {
  Settings as SettingsIcon,
  User,
  CreditCard,
  Users,
  Bell,
  Save,
  Edit,
  Euro,
  DollarSign,
  ArrowLeft
} from "lucide-react";
import { toast } from "react-toastify";
import AuthService, { User as AuthUser } from '@/services/auth';
import { useAuth } from '@/hooks/useAuth';

interface Shareholder {
  id: string;
  name: string;
  email: string;
  password: string;
  shareholdingPercentage: number;
}

// Données fake des actionnaires
const allShareholders = [
  { id: "1", name: "Jean Dupont", email: "jean@entreprise.com", shareholdingPercentage: 40 },
  { id: "2", name: "Marie Martin", email: "marie@entreprise.com", shareholdingPercentage: 35 },
  { id: "3", name: "Paul Durand", email: "paul@entreprise.com", shareholdingPercentage: 25 }
];

const Parametre: React.FC = () => {
  const navigate = useNavigate();
  const { clearAuth } = useAuth();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [profileData, setProfileData] = useState({
    name: '',
    email: '',
    newPassword: "",
    confirmPassword: ""
  });
  const [companySettings, setCompanySettings] = useState({
    companyName: "Mon Entreprise SARL",
    defaultCurrency: "FCFA",
    conversionRate: 655.96,
    notifications: true
  });
  const [isLoading, setIsLoading] = useState(false);

  // Mock currentUser for the prototype
  const currentUser: Shareholder = user ? {
    id: user.id.toString(),
    name: `${user.prenom} ${user.nom}`,
    email: user.email || '',
    password: '',
    shareholdingPercentage: 25 // Mock value for prototype
  } : {
    id: '',
    name: 'Utilisateur',
    email: '',
    password: '',
    shareholdingPercentage: 0
  };

  useEffect(() => {
    const currentUser = AuthService.getUser();
    if (!currentUser) {
      navigate('/');
      return;
    }
    setUser(currentUser);
    setProfileData({
      name: `${currentUser.prenom} ${currentUser.nom}`,
      email: currentUser.email || '',
      newPassword: '',
      confirmPassword: ''
    });
  }, [navigate]);

  const handleSaveProfile = async () => {
    if (profileData.newPassword && profileData.newPassword !== profileData.confirmPassword) {
      toast.error("Les mots de passe ne correspondent pas");
      return;
    }

    setIsLoading(true);
    try {
      // Use real password change API if password is being changed
      if (profileData.newPassword) {
        const success = await AuthService.changePassword('', profileData.newPassword); // Note: current password not used in mock
        if (!success) {
          toast.error("Erreur lors du changement de mot de passe");
          return;
        }
      }

      // Simulation de sauvegarde pour les autres données (profil)
      await new Promise(resolve => setTimeout(resolve, 1000));

      toast.success("Profil mis à jour avec succès");

      setIsEditingProfile(false);
      setProfileData(prev => ({ ...prev, newPassword: "", confirmPassword: "" }));
    } catch (error) {
      console.error('Erreur lors de la sauvegarde du profil:', error);
      toast.error("Une erreur est survenue");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveCompanySettings = async () => {
    // Simulation de sauvegarde (mock)
    setIsLoading(true);
    await new Promise(resolve => setTimeout(resolve, 1000));
    setIsLoading(false);

    toast.success("Paramètres sauvegardés");
  };

  const handleLogout = () => {
    toast.info("Déconnexion en cours...");
    // Nettoyer l'état Zustand ET localStorage
    clearAuth();
    AuthService.logout();
    // Rediriger directement vers login pour éviter le problème de timing
    navigate('/login');
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
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <SettingsIcon className="h-6 w-6" />
          Paramètres
        </h1>
        <p className="text-muted-foreground">
          Gérez vos informations personnelles et les paramètres de l'entreprise
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Profil utilisateur */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Mon Profil
            </CardTitle>
            <CardDescription>
              Informations personnelles et paramètres de compte
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <Badge variant="outline" className="bg-primary-glow/10 text-primary">
                Actionnaire - {currentUser.shareholdingPercentage}%
              </Badge>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsEditingProfile(!isEditingProfile)}
              >
                <Edit className="h-4 w-4 mr-1" />
                {isEditingProfile ? "Annuler" : "Modifier"}
              </Button>
            </div>

            <div className="space-y-3">
              <div>
                <Label htmlFor="name">Nom complet</Label>
                <Input
                  id="name"
                  value={profileData.name}
                  onChange={(e) => setProfileData(prev => ({ ...prev, name: e.target.value }))}
                  disabled={!isEditingProfile}
                />
              </div>

              <div>
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={profileData.email}
                  onChange={(e) => setProfileData(prev => ({ ...prev, email: e.target.value }))}
                  disabled={!isEditingProfile}
                />
              </div>

              {isEditingProfile && (
                <>
                  <Separator />
                  <div>
                    <Label htmlFor="newPassword">Nouveau mot de passe</Label>
                    <Input
                      id="newPassword"
                      type="password"
                      placeholder="Laisser vide pour ne pas changer"
                      value={profileData.newPassword}
                      onChange={(e) => setProfileData(prev => ({ ...prev, newPassword: e.target.value }))}
                    />
                  </div>

                  <div>
                    <Label htmlFor="confirmPassword">Confirmer le mot de passe</Label>
                    <Input
                      id="confirmPassword"
                      type="password"
                      placeholder="Confirmer le nouveau mot de passe"
                      value={profileData.confirmPassword}
                      onChange={(e) => setProfileData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                    />
                  </div>
                </>
              )}
            </div>

            {isEditingProfile && (
              <Button onClick={handleSaveProfile} disabled={isLoading} className="w-full">
                <Save className="h-4 w-4 mr-2" />
                {isLoading ? "Sauvegarde..." : "Sauvegarder les modifications"}
              </Button>
            )}
          </CardContent>
        </Card>

        {/* Paramètres entreprise */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              Paramètres Entreprise
            </CardTitle>
            <CardDescription>
              Configuration générale et préférences
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="companyName">Nom de l'entreprise</Label>
              <Input
                id="companyName"
                value={companySettings.companyName}
                onChange={(e) => setCompanySettings(prev => ({ ...prev, companyName: e.target.value }))}
              />
            </div>

            <div>
              <Label htmlFor="defaultCurrency">Devise par défaut</Label>
              <div className="flex gap-2 mt-2">
                <Button
                  variant={companySettings.defaultCurrency === "FCFA" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setCompanySettings(prev => ({ ...prev, defaultCurrency: "FCFA" }))}
                >
                  <DollarSign className="h-4 w-4 mr-1" />
                  FCFA
                </Button>
                <Button
                  variant={companySettings.defaultCurrency === "EUR" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setCompanySettings(prev => ({ ...prev, defaultCurrency: "EUR" }))}
                >
                  <Euro className="h-4 w-4 mr-1" />
                  EUR
                </Button>
              </div>
            </div>

            <div>
              <Label htmlFor="conversionRate">Taux de conversion (1 EUR = ? FCFA)</Label>
              <Input
                id="conversionRate"
                type="number"
                step="0.01"
                value={companySettings.conversionRate}
                onChange={(e) => setCompanySettings(prev => ({
                  ...prev,
                  conversionRate: Number.parseFloat(e.target.value) || 655.96
                }))}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Taux fixe utilisé pour toutes les conversions automatiques
              </p>
            </div>

            <Button onClick={handleSaveCompanySettings} disabled={isLoading} className="w-full">
              <Save className="h-4 w-4 mr-2" />
              {isLoading ? "Sauvegarde..." : "Sauvegarder les paramètres"}
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Actionnaires */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Actionnaires
          </CardTitle>
          <CardDescription>
            Liste des actionnaires et leur répartition des parts
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {allShareholders.map((shareholder) => (
              <div key={shareholder.id} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                    <User className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium flex items-center gap-2">
                      {shareholder.name}
                      {shareholder.email === currentUser.email && (
                        <Badge variant="secondary" className="text-xs">Vous</Badge>
                      )}
                    </p>
                    <p className="text-sm text-muted-foreground">{shareholder.email}</p>
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-medium">{shareholder.shareholdingPercentage}%</div>
                  <div className="w-20 bg-muted rounded-full h-2 mt-1">
                    <div
                      className="bg-primary h-2 rounded-full transition-all duration-300"
                      style={{ width: `${shareholder.shareholdingPercentage}%` }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-4 p-4 bg-muted rounded-lg">
            <div className="flex justify-between text-sm">
              <span className="font-medium">Total des parts :</span>
              <span className="font-medium">100%</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Notifications */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Notifications
          </CardTitle>
          <CardDescription>
            Préférences de notification pour les activités financières
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Notifications par email</p>
                <p className="text-sm text-muted-foreground">
                  Recevoir des notifications pour les nouvelles transactions
                </p>
              </div>
              <Button
                variant={companySettings.notifications ? "default" : "outline"}
                size="sm"
                onClick={() => setCompanySettings(prev => ({
                  ...prev,
                  notifications: !prev.notifications
                }))}
              >
                {companySettings.notifications ? "Activé" : "Désactivé"}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
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

export default Parametre;

