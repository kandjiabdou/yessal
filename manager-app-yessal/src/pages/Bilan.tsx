import React, { useState, useEffect } from 'react';
import { Loader2, AlertCircle, ChevronLeft, ChevronRight, TrendingUp, TrendingDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import BilanService, { BilanData } from '@/services/bilan';
import AuthService from '@/services/auth';
import { toast } from 'react-toastify';

const Bilan: React.FC = () => {
  const [bilanData, setBilanData] = useState<BilanData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Sélection du mois (format YYYY-MM)
  const getCurrentMonth = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    return `${year}-${month}`;
  };

  const [selectedMonth, setSelectedMonth] = useState(getCurrentMonth());

  const loadBilan = async () => {
    try {
      setLoading(true);
      setError(null);

      const user = AuthService.getUser();
      if (!user?.siteLavagePrincipalGerantId) {
        setError('Site de lavage non défini');
        return;
      }

      const response = await BilanService.getBilan(
        user.siteLavagePrincipalGerantId,
        selectedMonth
      );

      if (response.success && response.data) {
        setBilanData(response.data);
      } else {
        const errorMsg = response.message || 'Erreur lors du chargement du bilan';
        setError(errorMsg);
        toast.error(errorMsg);
      }
    } catch (err) {
      console.error('Erreur:', err);
      const errorMsg = 'Erreur lors du chargement du bilan';
      setError(errorMsg);
      toast.error(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBilan();
  }, [selectedMonth]);

  const handleMonthChange = (direction: 'prev' | 'next') => {
    const [year, month] = selectedMonth.split('-').map(Number);
    const date = new Date(year, month - 1, 1);
    
    if (direction === 'prev') {
      date.setMonth(date.getMonth() - 1);
    } else {
      date.setMonth(date.getMonth() + 1);
    }
    
    const newYear = date.getFullYear();
    const newMonth = String(date.getMonth() + 1).padStart(2, '0');
    setSelectedMonth(`${newYear}-${newMonth}`);
  };

  const formatMonthDisplay = (monthStr: string) => {
    const [year, month] = monthStr.split('-');
    const date = new Date(Number(year), Number(month) - 1, 1);
    return date.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
  };

  const canGoToNextMonth = () => {
    const currentMonth = getCurrentMonth();
    return selectedMonth < currentMonth;
  };

  const formatCurrency = (amount: number) => {
    return `${amount.toLocaleString('fr-FR')} FCFA`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
        <span className="ml-2">Chargement...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <p className="text-lg font-medium text-gray-900 mb-2">Erreur</p>
          <p className="text-gray-600 mb-4">{error}</p>
          <Button onClick={loadBilan}>Réessayer</Button>
        </div>
      </div>
    );
  }

  if (!bilanData) {
    return null;
  }

  const { recettes, depenses, resultat } = bilanData;

  return (
    <div className="space-y-4 sm:space-y-6 pb-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight">Bilan</h1>
          <p className="text-sm sm:text-base text-muted-foreground">
            Résultat d'exercice du site de lavage
          </p>
        </div>
      </div>

      {/* Sélecteur de mois */}
      <Card className="card-shadow">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleMonthChange('prev')}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <div className="text-center">
              <p className="text-lg font-semibold capitalize">{formatMonthDisplay(selectedMonth)}</p>
              <p className="text-xs text-gray-500">Période du {bilanData.periode.debut} au {bilanData.periode.fin}</p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleMonthChange('next')}
              disabled={!canGoToNextMonth()}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Résultat principal */}
      <Card className={`card-shadow ${resultat.type === 'benefice' ? 'border-green-200' : 'border-red-200'}`}>
        <CardContent className="p-6">
          <div className="text-center">
            <p className="text-sm text-gray-500 mb-2">
              {resultat.type === 'benefice' ? 'Bénéfice' : 'Perte'}
            </p>
            <p className={`text-3xl sm:text-4xl font-bold mb-2 ${
              resultat.type === 'benefice' ? 'text-green-600' : 'text-red-600'
            }`}>
              {formatCurrency(Math.abs(resultat.montant))}
            </p>
            <p className="text-sm text-gray-600">
              Marge: {resultat.pourcentage}%
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Section Recettes */}
      <Card className="card-shadow">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <div className="p-2 bg-green-100 rounded-lg">
              <TrendingUp className="h-5 w-5 text-green-600" />
            </div>
            Recettes
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Laverie */}
          <div className="space-y-3">
            <div className="flex items-center justify-between pb-2 border-b">
              <span className="font-semibold text-gray-700">Laverie</span>
              <span className="font-bold text-green-600">{formatCurrency(recettes.laverie.total)}</span>
            </div>
            
            <div className="pl-4 space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">
                  Commandes ({recettes.laverie.commandes.nombre})
                </span>
                <span className="font-medium">{formatCurrency(recettes.laverie.commandes.montant)}</span>
              </div>
              
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">
                  Abonnements ({recettes.laverie.abonnements.nombre})
                </span>
                <span className="font-medium">{formatCurrency(recettes.laverie.abonnements.montant)}</span>
              </div>
            </div>
          </div>

          {/* Flux Financiers (Recettes) */}
          <div className="flex items-center justify-between pb-2 border-b">
            <span className="font-semibold text-gray-700">
              Autres recettes ({recettes.fluxFinanciers.nombre})
            </span>
            <span className="font-bold text-green-600">{formatCurrency(recettes.fluxFinanciers.montant)}</span>
          </div>

          {/* Boutique */}
          {/* <div className="flex items-center justify-between pb-2 border-b">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-gray-700">Boutique</span>
              {recettes.boutique.aVenir && (
                <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">À venir</span>
              )}
            </div>
            <span className="font-bold text-gray-400">{formatCurrency(recettes.boutique.montant)}</span>
          </div> */}

          {/* Total Recettes */}
          <div className="flex items-center justify-between pt-3 border-t-2">
            <span className="font-bold text-gray-900">Total Recettes</span>
            <span className="font-bold text-xl text-green-600">{formatCurrency(recettes.total)}</span>
          </div>
        </CardContent>
      </Card>

      {/* Section Dépenses */}
      <Card className="card-shadow">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <div className="p-2 bg-red-100 rounded-lg">
              <TrendingDown className="h-5 w-5 text-red-600" />
            </div>
            Dépenses
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Flux Financiers (Dépenses) */}
          <div className="flex items-center justify-between pb-2 border-b">
            <span className="font-semibold text-gray-700">
              Dépenses enregistrées ({depenses.fluxFinanciers.nombre})
            </span>
            <span className="font-bold text-red-600">{formatCurrency(depenses.fluxFinanciers.montant)}</span>
          </div>

          {/* Total Dépenses */}
          <div className="flex items-center justify-between pt-3 border-t-2">
            <span className="font-bold text-gray-900">Total Dépenses</span>
            <span className="font-bold text-xl text-red-600">{formatCurrency(depenses.total)}</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Bilan;
