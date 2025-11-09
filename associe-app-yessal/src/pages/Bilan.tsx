import React, { useState, useEffect } from 'react';
import { Loader2, AlertCircle, ChevronLeft, ChevronRight, TrendingUp, TrendingDown, Filter, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import BilanService, { BilanGroupedItem } from '@/services/bilan';
import LaverieReferenceService, { LaverieReferenceSimple } from '@/services/laverieReference';
import { toast } from 'react-toastify';

const Bilan: React.FC = () => {
  const [bilans, setBilans] = useState<BilanGroupedItem[]>([]);
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

  // Filtre par laverie
  const [availableLaveries, setAvailableLaveries] = useState<LaverieReferenceSimple[]>([]);
  const [selectedLaverieIds, setSelectedLaverieIds] = useState<number[]>([]);
  const [showLaverieFilter, setShowLaverieFilter] = useState(false);

  // Charger les laveries disponibles
  useEffect(() => {
    const loadLaveries = async () => {
      const response = await LaverieReferenceService.getAllLaveries();
      if (response.success && response.data) {
        setAvailableLaveries(response.data);
      }
    };
    loadLaveries();
  }, []);

  const loadBilans = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await BilanService.getBilansGrouped(
        selectedMonth,
        selectedLaverieIds.length > 0 ? selectedLaverieIds : undefined
      );

      if (response.success && response.data) {
        setBilans(response.data);
      } else {
        const errorMsg = response.message || 'Erreur lors du chargement des bilans';
        setError(errorMsg);
        toast.error(errorMsg);
      }
    } catch (err) {
      console.error('Erreur:', err);
      const errorMsg = 'Erreur lors du chargement des bilans';
      setError(errorMsg);
      toast.error(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBilans();
  }, [selectedMonth, selectedLaverieIds]);

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

  const toggleLaverieSelection = (laverieId: number) => {
    setSelectedLaverieIds(prev =>
      prev.includes(laverieId)
        ? prev.filter(id => id !== laverieId)
        : [...prev, laverieId]
    );
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
          <Button onClick={loadBilans}>Réessayer</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6 pb-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight">Bilan</h1>
          <p className="text-sm sm:text-base text-muted-foreground">
            Résultats d'exercice par laverie
          </p>
        </div>
      </div>

      {/* Filtres */}
      <Card className="card-shadow">
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
            {/* Sélecteur de mois */}
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleMonthChange('prev')}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <div className="text-center min-w-[180px]">
                <p className="text-lg font-semibold capitalize">{formatMonthDisplay(selectedMonth)}</p>
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

            {/* Filtre par laverie */}
            <div className="relative">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowLaverieFilter(!showLaverieFilter)}
                className="gap-2"
              >
                <Filter className="h-4 w-4" />
                Laveries
                {selectedLaverieIds.length > 0 && (
                  <span className="ml-1 bg-primary text-primary-foreground rounded-full px-2 py-0.5 text-xs">
                    {selectedLaverieIds.length}
                  </span>
                )}
              </Button>

              {showLaverieFilter && (
                <div className="absolute right-0 top-full mt-2 w-64 bg-white border rounded-lg shadow-lg p-4 z-10">
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {availableLaveries.map((laverie) => (
                      <div key={laverie.id} className="flex items-center space-x-2">
                        <Checkbox
                          id={`laverie-${laverie.id}`}
                          checked={selectedLaverieIds.includes(laverie.sourceLaverieId)}
                          onCheckedChange={() => toggleLaverieSelection(laverie.sourceLaverieId)}
                        />
                        <label
                          htmlFor={`laverie-${laverie.id}`}
                          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                        >
                          {laverie.nom}
                        </label>
                      </div>
                    ))}
                  </div>
                  <div className="mt-3 pt-3 border-t flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1"
                      onClick={() => setSelectedLaverieIds([])}
                    >
                      Tout effacer
                    </Button>
                    <Button
                      size="sm"
                      className="flex-1"
                      onClick={() => setShowLaverieFilter(false)}
                    >
                      <Check className="h-4 w-4 mr-1" />
                      OK
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Bilans groupés par laverie */}
      <div className="space-y-6">
        {bilans.map((bilan) => (
          <BilanCard key={bilan.laverieRefId || 'entreprise'} bilan={bilan} formatCurrency={formatCurrency} />
        ))}

        {bilans.length === 0 && (
          <Card className="card-shadow">
            <CardContent className="p-8 text-center">
              <p className="text-gray-500">Aucun bilan disponible pour cette période</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

// Composant pour afficher un bilan individuel
const BilanCard: React.FC<{ bilan: BilanGroupedItem; formatCurrency: (amount: number) => string }> = ({ bilan, formatCurrency }) => {
  const { recettes, depenses, resultat, laverie } = bilan;

  return (
    <div className="space-y-4">
      {/* En-tête de la laverie */}
      <div className="flex items-center gap-2">
        <div className="h-1 w-8 bg-primary rounded" />
        <h2 className="text-lg font-bold">
          {laverie ? laverie.nom : 'Entreprise (Flux globaux)'}
        </h2>
      </div>

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

      <div className="grid md:grid-cols-2 gap-4">
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
            {/* Laverie (uniquement si c'est une vraie laverie) */}
            {laverie && (
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
            )}

            {/* Flux Financiers (Recettes) */}
            <div className="flex items-center justify-between pb-2 border-b">
              <span className="font-semibold text-gray-700">
                Autres recettes ({recettes.fluxFinanciers.nombre})
              </span>
              <span className="font-bold text-green-600">{formatCurrency(recettes.fluxFinanciers.montant)}</span>
            </div>

            {/* Prêts */}
            <div className="flex items-center justify-between pb-2 border-b">
              <span className="font-semibold text-gray-700">
                Prêts accordés ({recettes.prets.nombre})
              </span>
              <span className="font-bold text-blue-600">{formatCurrency(recettes.prets.montant)}</span>
            </div>

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
                Dépenses ({depenses.fluxFinanciers.nombre})
              </span>
              <span className="font-bold text-red-600">{formatCurrency(depenses.fluxFinanciers.montant)}</span>
            </div>

            {/* Emprunts */}
            <div className="flex items-center justify-between pb-2 border-b">
              <span className="font-semibold text-gray-700">
                Emprunts ({depenses.emprunts.nombre})
              </span>
              <span className="font-bold text-orange-600">{formatCurrency(depenses.emprunts.montant)}</span>
            </div>

            {/* Total Dépenses */}
            <div className="flex items-center justify-between pt-3 border-t-2">
              <span className="font-bold text-gray-900">Total Dépenses</span>
              <span className="font-bold text-xl text-red-600">{formatCurrency(depenses.total)}</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Bilan;
