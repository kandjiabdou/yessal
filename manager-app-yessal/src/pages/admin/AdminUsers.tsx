import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, Users, UserCheck, UserX, Crown } from 'lucide-react';

const AdminUsers: React.FC = () => {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Gestion des Utilisateurs</h1>
          <p className="text-gray-600">Gérer tous les utilisateurs de la plateforme</p>
        </div>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Nouvel Utilisateur
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Users className="h-5 w-5 mr-2" />
              Clients
            </CardTitle>
            <CardDescription>Clients actifs</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">-</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <UserCheck className="h-5 w-5 mr-2" />
              Managers
            </CardTitle>
            <CardDescription>Managers de sites</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">-</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Crown className="h-5 w-5 mr-2" />
              Admins
            </CardTitle>
            <CardDescription>Administrateurs système</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">-</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <UserX className="h-5 w-5 mr-2" />
              Inactifs
            </CardTitle>
            <CardDescription>Comptes désactivés</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">-</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Liste des Utilisateurs</CardTitle>
          <CardDescription>Tous les utilisateurs enregistrés sur la plateforme</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <p className="text-gray-500">Liste des utilisateurs à implémenter...</p>
            <p className="text-sm text-gray-400 mt-2">
              Fonctionnalités à ajouter : Filtrage par rôle, recherche, modification des rôles, activation/désactivation
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminUsers; 