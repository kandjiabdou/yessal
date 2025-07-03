import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, MapPin, Clock, Phone } from 'lucide-react';

const AdminSites: React.FC = () => {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Gestion des Sites de Lavage</h1>
          <p className="text-gray-600">Gérer tous les sites de lavage de la plateforme</p>
        </div>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Nouveau Site
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <MapPin className="h-5 w-5 mr-2" />
              Sites Actifs
            </CardTitle>
            <CardDescription>Nombre de sites actuellement ouverts</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">-</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Clock className="h-5 w-5 mr-2" />
              Sites Fermés
            </CardTitle>
            <CardDescription>Nombre de sites actuellement fermés</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">-</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Phone className="h-5 w-5 mr-2" />
              Total Sites
            </CardTitle>
            <CardDescription>Nombre total de sites</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">-</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Liste des Sites</CardTitle>
          <CardDescription>Tous les sites de lavage enregistrés</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <p className="text-gray-500">Liste des sites à implémenter...</p>
            <p className="text-sm text-gray-400 mt-2">
              Fonctionnalités à ajouter : Création, modification, suppression, activation/désactivation
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminSites; 