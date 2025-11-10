import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Settings as SettingsIcon,
  User,
  CreditCard,
  Users,
  Save,
  ArrowLeft,
  Euro,
  Building
} from "lucide-react";
import { toast } from "react-toastify";
import AuthService from '@/services/auth';
import parametreService, { Entreprise, UserInfo, Associe } from '@/services/parametre';
import { useAuth } from '@/hooks/useAuth';
import apiClient from '@/lib/axios';

const Parametre: React.FC = () => {
  const navigate = useNavigate();
  const { clearAuth } = useAuth();
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null);
  const [entreprise, setEntreprise] = useState<Entreprise | null>(null);
  const [associes, setAssocies] = useState<Associe[]>([]);
  const [isLoadingPassword, setIsLoadingPassword] = useState(false);
  const [isChangingDevise, setIsChangingDevise] = useState(false);
  const [passwords, setPasswords] = useState({
    current: '',
    new: '',
    confirm: ''
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [user, entrepriseData, associesData] = await Promise.all([
        parametreService.getUserInfo(),
        parametreService.getEntrepriseInfo(),
        parametreService.listAssocies()
      ]);
      setUserInfo(user);
      setEntreprise(entrepriseData);
      setAssocies(associesData);
    } catch (error) {
      console.error('Erreur lors du chargement des données:', error);
      toast.error('Erreur lors du chargement des données');
    }
  };

  const handleDeviseChange = async (devise: 'FCFA' | 'EUR') => {
    if (!userInfo) return;
    
    setIsChangingDevise(true);
    try {
      await parametreService.updateDevisePreference(devise);
      setUserInfo({ ...userInfo, devisePreference: devise });
      toast.success(`Devise changée en ${devise}. Rechargez la page pour voir les changements.`);
      
      setTimeout(() => {
        globalThis.location.reload();
      }, 500);
    } catch (error) {
      console.error('Erreur lors du changement de devise:', error);
      toast.error('Erreur lors du changement de devise');
    } finally {
      setIsChangingDevise(false);
    }
  };

  const handlePasswordChange = async () => {
    if (!passwords.new || !passwords.confirm) {
      toast.error('Veuillez remplir tous les champs');
      return;
    }

    if (passwords.new !== passwords.confirm) {
      toast.error('Les mots de passe ne correspondent pas');
      return;
    }

    if (passwords.new.length < 6) {
      toast.error('Le mot de passe doit contenir au moins 6 caractères');
      return;
    }

    setIsLoadingPassword(true);
    try {
      await apiClient.post('/auth/change-password', {
        currentPassword: passwords.current,
        newPassword: passwords.new
      });

      toast.success('Mot de passe modifié avec succès');
      setPasswords({ current: '', new: '', confirm: '' });
    } catch (error: any) {
      console.error('Erreur lors du changement de mot de passe:', error);
      toast.error(error.response?.data?.message || 'Erreur lors du changement de mot de passe');
    } finally {
      setIsLoadingPassword(false);
    }
  };

  const handleLogout = () => {
    toast.info("Déconnexion en cours...");
    clearAuth();
    AuthService.logout();
    navigate('/login');
  };

  if (!userInfo || !entreprise) {
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
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <SettingsIcon className="h-6 w-6" />
            Paramètres
          </h1>
          <p className="text-muted-foreground text-sm">
            Gérez vos préférences personnelles
          </p>
        </div>
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
              Informations personnelles (lecture seule)
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Badge variant="outline" className="bg-primary-glow/10 text-primary">
              {userInfo.role === 'ADMIN' ? 'Administrateur' : 'Associé'} - {userInfo.pourcentageParts}% des parts
            </Badge>

            <div className="space-y-3">
              <div>
                <Label>Nom</Label>
                <Input value={userInfo.nom} disabled />
              </div>

              <div>
                <Label>Prénom</Label>
                <Input value={userInfo.prenom} disabled />
              </div>

              <div>
                <Label>Email</Label>
                <Input value={userInfo.email || 'Non renseigné'} disabled />
              </div>

              <div>
                <Label>Téléphone</Label>
                <Input value={userInfo.telephone || 'Non renseigné'} disabled />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Changement de mot de passe */}
        <Card>
          <CardHeader>
            <CardTitle>Sécurité</CardTitle>
            <CardDescription>
              Modifier votre mot de passe
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="currentPassword">Mot de passe actuel</Label>
              <Input
                id="currentPassword"
                type="password"
                value={passwords.current}
                onChange={(e) => setPasswords(prev => ({ ...prev, current: e.target.value }))}
              />
            </div>

            <div>
              <Label htmlFor="newPassword">Nouveau mot de passe</Label>
              <Input
                id="newPassword"
                type="password"
                value={passwords.new}
                onChange={(e) => setPasswords(prev => ({ ...prev, new: e.target.value }))}
              />
            </div>

            <div>
              <Label htmlFor="confirmPassword">Confirmer le mot de passe</Label>
              <Input
                id="confirmPassword"
                type="password"
                value={passwords.confirm}
                onChange={(e) => setPasswords(prev => ({ ...prev, confirm: e.target.value }))}
              />
            </div>

            <Button 
              onClick={handlePasswordChange} 
              disabled={isLoadingPassword} 
              className="w-full"
            >
              <Save className="h-4 w-4 mr-2" />
              {isLoadingPassword ? "Modification..." : "Modifier le mot de passe"}
            </Button>
          </CardContent>
        </Card>

        {/* Préférence de devise */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              Ma Préférence de Devise
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <Button
                variant={userInfo.devisePreference === "FCFA" ? "default" : "outline"}
                size="lg"
                onClick={() => handleDeviseChange("FCFA")}
                disabled={isChangingDevise || userInfo.devisePreference === "FCFA"}
                className="flex-1"
              >
                FCFA
              </Button>
              <Button
                variant={userInfo.devisePreference === "EUR" ? "default" : "outline"}
                size="lg"
                onClick={() => handleDeviseChange("EUR")}
                disabled={isChangingDevise || userInfo.devisePreference === "EUR"}
                className="flex-1"
              >
                <Euro className="h-5 w-5 mr-2" />
                EUR
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Taux actuel: 1 EUR = {entreprise.tauxConversion} FCFA
            </p>
            {isChangingDevise && (
              <p className="text-xs text-primary animate-pulse">
                Mise à jour en cours...
              </p>
            )}
          </CardContent>
        </Card>

        {/* Informations entreprise */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building className="h-5 w-5" />
              Informations Entreprise
            </CardTitle>
            <CardDescription>
              Données de l'entreprise (lecture seule)
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <Label>Nom de l'entreprise</Label>
              <Input value={entreprise.nom} disabled />
            </div>

            <div>
              <Label>Adresse</Label>
              <Input value={entreprise.adresse || 'Non renseignée'} disabled />
            </div>

            <div>
              <Label>Ville</Label>
              <Input value={entreprise.ville || 'Non renseignée'} disabled />
            </div>

            <div>
              <Label>Devise</Label>
              <Input value={entreprise.devise} disabled />
            </div>

            <div>
              <Label>Taux de conversion (1 EUR)</Label>
              <Input value={`${entreprise.tauxConversion} FCFA`} disabled />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Actionnaires */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Liste des Associés
          </CardTitle>
          <CardDescription>
            Répartition des parts entre les associés
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {associes.map((associe) => (
              <div key={associe.id} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                    <User className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <div className="font-medium flex items-center gap-2">
                      {associe.prenom} {associe.nom}
                      {associe.id === userInfo.id && (
                        <Badge variant="secondary" className="text-xs">Vous</Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {associe.email || associe.telephone}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-medium">{associe.pourcentageParts}%</div>
                  <div className="w-20 bg-muted rounded-full h-2 mt-1">
                    <div
                      className="bg-primary h-2 rounded-full transition-all duration-300"
                      style={{ width: `${associe.pourcentageParts}%` }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-4 p-4 bg-muted rounded-lg">
            <div className="flex justify-between text-sm">
              <span className="font-medium">Total des parts :</span>
              <span className="font-medium">
                {associes.reduce((sum, a) => sum + a.pourcentageParts, 0)}%
              </span>
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

