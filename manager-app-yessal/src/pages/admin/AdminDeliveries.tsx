import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, Truck, CheckCircle, XCircle, Clock } from 'lucide-react';

const AdminDeliveries: React.FC = () => {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Gestion des Livreurs</h1>
          <p className="text-gray-600">Gérer tous les livreurs de la plateforme</p>
        </div>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Nouveau Livreur
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <CheckCircle className="h-5 w-5 mr-2 text-green-600" />
              Disponibles
            </CardTitle>
            <CardDescription>Livreurs disponibles</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">-</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Clock className="h-5 w-5 mr-2 text-orange-600" />
              En Mission
            </CardTitle>
            <CardDescription>Livreurs en cours de livraison</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">-</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <XCircle className="h-5 w-5 mr-2 text-red-600" />
              Indisponibles
            </CardTitle>
            <CardDescription>Livreurs indisponibles</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">-</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Truck className="h-5 w-5 mr-2" />
              Total
            </CardTitle>
            <CardDescription>Total des livreurs</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">-</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Liste des Livreurs</CardTitle>
          <CardDescription>Tous les livreurs enregistrés sur la plateforme</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <p className="text-gray-500">Liste des livreurs à implémenter...</p>
            <p className="text-sm text-gray-400 mt-2">
              Fonctionnalités à ajouter : Ajout, modification, gestion de disponibilité, historique des livraisons
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminDeliveries; 