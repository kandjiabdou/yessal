import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingDown, TrendingUp, Calendar, FileText } from 'lucide-react';
import { FluxFinancier } from '@/services/fluxFinancier';

interface FluxStatsProps {
  fluxList: FluxFinancier[];
}

const FluxStats: React.FC<FluxStatsProps> = ({ fluxList }) => {
  // Calculs
  const depenses = fluxList.filter(f => f.type === 'depense');
  const recettes = fluxList.filter(f => f.type === 'recette');
  
  const totalDepenses = depenses.reduce((sum, f) => sum + f.montant, 0);
  const totalRecettes = recettes.reduce((sum, f) => sum + f.montant, 0);
  const solde = totalRecettes - totalDepenses;
  
  const validated = fluxList.filter(f => f.validationStatus === 'validated');
  const pending = fluxList.filter(f => f.validationStatus === 'pending');
  const rejected = fluxList.filter(f => f.validationStatus === 'rejected');
  
  const totalWithProofs = fluxList.filter(f => f.preuves && f.preuves.length > 0);
  const totalProofs = fluxList.reduce((sum, f) => sum + (f.preuves?.length || 0), 0);

  const formatCurrency = (amount: number) => {
    return `${amount.toLocaleString('fr-FR')} FCFA`;
  };

  return (
    <div className="space-y-4">
      {/* Statistiques financières */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          title="Total Dépenses"
          value={formatCurrency(totalDepenses)}
          subtitle={`${depenses.length} transaction(s)`}
          icon={<TrendingDown className="h-6 w-6 text-red-600" />}
          color="red"
        />
        <StatCard
          title="Total Recettes"
          value={formatCurrency(totalRecettes)}
          subtitle={`${recettes.length} transaction(s)`}
          icon={<TrendingUp className="h-6 w-6 text-green-600" />}
          color="green"
        />
        <StatCard
          title="Solde"
          value={formatCurrency(solde)}
          subtitle={`${fluxList.length} transaction(s) total`}
          icon={solde >= 0 ? <TrendingUp className="h-6 w-6 text-green-600" /> : <TrendingDown className="h-6 w-6 text-red-600" />}
          color={solde >= 0 ? 'green' : 'red'}
        />
      </div>

      {/* Statistiques de validation */}
      <Card className="card-shadow">
        <CardHeader>
          <CardTitle className="text-base sm:text-lg">Statut de validation</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center">
              <div className="flex items-center justify-center mb-2">
                <div className="w-12 h-12 rounded-full bg-yellow-100 flex items-center justify-center">
                  <Calendar className="h-6 w-6 text-yellow-600" />
                </div>
              </div>
              <p className="text-2xl font-bold text-yellow-600">{pending.length}</p>
              <p className="text-sm text-gray-500">En attente</p>
            </div>
            <div className="text-center">
              <div className="flex items-center justify-center mb-2">
                <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center">
                  <TrendingUp className="h-6 w-6 text-green-600" />
                </div>
              </div>
              <p className="text-2xl font-bold text-green-600">{validated.length}</p>
              <p className="text-sm text-gray-500">Validées</p>
            </div>
            <div className="text-center">
              <div className="flex items-center justify-center mb-2">
                <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
                  <TrendingDown className="h-6 w-6 text-red-600" />
                </div>
              </div>
              <p className="text-2xl font-bold text-red-600">{rejected.length}</p>
              <p className="text-sm text-gray-500">Rejetées</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Statistiques de preuves */}
      <Card className="card-shadow">
        <CardHeader>
          <CardTitle className="text-base sm:text-lg">Pièces jointes</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-blue-100 rounded-full">
                <FileText className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{totalProofs}</p>
                <p className="text-sm text-gray-500">Fichiers total</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="p-3 bg-purple-100 rounded-full">
                <FileText className="h-6 w-6 text-purple-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{totalWithProofs.length}</p>
                <p className="text-sm text-gray-500">Avec preuves</p>
              </div>
            </div>
          </div>
          <div className="mt-4 pt-4 border-t">
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Taux de documentation</span>
              <span className="font-semibold">
                {fluxList.length > 0
                  ? ((totalWithProofs.length / fluxList.length) * 100).toFixed(1)
                  : 0}%
              </span>
            </div>
            <div className="mt-2 w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{
                  width: `${
                    fluxList.length > 0
                      ? (totalWithProofs.length / fluxList.length) * 100
                      : 0
                  }%`,
                }}
              />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

interface StatCardProps {
  title: string;
  value: string;
  subtitle: string;
  icon: React.ReactNode;
  color: 'red' | 'green' | 'blue';
}

const StatCard: React.FC<StatCardProps> = ({ title, value, subtitle, icon, color }) => {
  const colorClasses = {
    red: 'bg-red-100',
    green: 'bg-green-100',
    blue: 'bg-blue-100',
  };

  const textColorClasses = {
    red: 'text-red-600',
    green: 'text-green-600',
    blue: 'text-blue-600',
  };

  return (
    <Card className="card-shadow">
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-500 mb-1">{title}</p>
            <p className={`text-xl sm:text-2xl font-bold ${textColorClasses[color]}`}>
              {value}
            </p>
            <p className="text-xs text-gray-500 mt-1">{subtitle}</p>
          </div>
          <div className={`p-3 ${colorClasses[color]} rounded-full`}>
            {icon}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default FluxStats;
