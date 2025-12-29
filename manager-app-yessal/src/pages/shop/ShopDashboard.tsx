import React, { useState, useEffect } from 'react';
import { TrendingUp, Package, ShoppingCart, DollarSign, ChevronLeft, ChevronRight, Loader2, AlertCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import ShopService, { Sale, ShopTodayData, ShopPeriodData } from '@/services/shop';
import AuthService from '@/services/auth';
import { toast } from '@/hooks/use-toast';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';

const ShopDashboard: React.FC = () => {
  const [dashboardData, setDashboardData] = useState<ShopTodayData | null>(null);
  const [periodData, setPeriodData] = useState<ShopPeriodData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [offset, setOffset] = useState(0);
  const [period, setPeriod] = useState<'day' | 'week' | 'month'>('week');

  const siteLavageId = AuthService.getCurrentSiteLavageId();

  const loadDashboardData = async (offsetParam: number = 0) => {
    if (!siteLavageId) {
      toast({
        title: "Erreur",
        description: "Site de lavage non trouvé",
        variant: "destructive"
      });
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Charger les données du jour
      const todayResp = await ShopService.getTodayShopData(siteLavageId);
      setDashboardData(todayResp);

      // Charger les données de la période
      const periodResp = await ShopService.getPeriodShopData(siteLavageId, offsetParam, period);
      setPeriodData(periodResp);
    } catch (error) {
      console.error('Erreur lors du chargement des données:', error);
      setError('Une erreur est survenue lors du chargement');
      toast({
        title: "Erreur",
        description: "Erreur lors du chargement des données",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData(offset);
  }, [offset, period]);

  const handleNavigation = (direction: 'prev' | 'next') => {
    const newOffset = direction === 'prev' ? offset - 1 : offset + 1;
    setOffset(newOffset);
  };

  const formatWeekRange = (startDate: string, endDate: string) => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    end.setDate(end.getDate() - 1);
    
    const startStr = start.toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit'
    });
    const endStr = end.toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
    
    return `${startStr} - ${endStr}`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
        <span className="ml-2">Chargement du dashboard...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <p className="text-lg font-medium text-gray-900 mb-2">Erreur de chargement</p>
          <p className="text-gray-600 mb-4">{error}</p>
          <button 
            onClick={() => window.location.reload()} 
            className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary/90"
          >
            Réessayer
          </button>
        </div>
      </div>
    );
  }

  if (!dashboardData) {
    return (
      <div className="flex items-center justify-center h-64">
        <p>Aucune donnée disponible</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6 pb-8">
      {/* Header */}
      <div>
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight">Boutique</h1>
        <p className="text-sm sm:text-base text-muted-foreground">
          Statistiques et performances - {dashboardData.siteName}
        </p>
      </div>

      {/* Statistiques du jour */}
      <div className="space-y-3 sm:space-y-4">
        <h2 className="text-base sm:text-lg font-semibold">Aujourd'hui</h2>
        <div className="grid grid-cols-2 gap-3 sm:gap-4">
          <StatsCard 
            title="Ventes" 
            value={dashboardData.todayStats.ventesCount.toString()} 
            icon={<ShoppingCart className="h-6 w-6 sm:h-8 sm:w-8 text-primary" />} 
          />
          <StatsCard 
            title="Revenus" 
            value={`${dashboardData.todayStats.totalRevenue.toLocaleString()} FCFA`} 
            icon={<DollarSign className="h-6 w-6 sm:h-8 sm:w-8 text-primary" />} 
          />
        </div>
      </div>

      {/* Statistiques de période */}
      <div className="space-y-3 sm:space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="w-full flex items-center justify-between gap-3">
            <h2 className="text-base sm:text-lg font-semibold text-left">
              {period === 'week' ? 'Semaine' : period === 'month' ? 'Mois' : 'Jour'} {periodData?.periodInfo?.isCurrentPeriod ? '(Actuelle)' : ''}
            </h2>
            {/* Period selector */}
            <div className="flex items-center bg-muted rounded-md p-1">
              <Button
                variant={period === 'day' ? 'secondary' : 'ghost'}
                type="button"
                size="sm"
                onClick={(e) => {
                  e.preventDefault();
                  setPeriod('day');
                  setOffset(0);
                }}
                className={`px-2 ${period === 'day' ? 'font-semibold' : ''}`}
              >
                Jour
              </Button>
              <Button
                variant={period === 'week' ? 'secondary' : 'ghost'}
                type="button"
                size="sm"
                onClick={(e) => {
                  e.preventDefault();
                  setPeriod('week');
                  setOffset(0);
                }}
                className={`px-2 ${period === 'week' ? 'font-semibold' : ''}`}
              >
                Semaine
              </Button>
              <Button
                variant={period === 'month' ? 'secondary' : 'ghost'}
                type="button"
                size="sm"
                onClick={(e) => {
                  e.preventDefault();
                  setPeriod('month');
                  setOffset(0);
                }}
                className={`px-2 ${period === 'month' ? 'font-semibold' : ''}`}
              >
                Mois
              </Button>
            </div>
          </div>
          <div className="flex items-center gap-2 w-full">
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleNavigation('prev')}
                className="px-2"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
            </div>

            <div className="flex-1 text-center min-w-0">
              <p className="text-xs sm:text-sm font-medium truncate">
                {periodData && period === 'week' && formatWeekRange(periodData.periodInfo.startDate, periodData.periodInfo.endDate)}
                {periodData && period === 'month' && new Date(periodData.periodInfo.startDate).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}
                {periodData && period === 'day' && new Date(periodData.periodInfo.startDate).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })}
              </p>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleNavigation('next')}
                disabled={offset >= 0}
                className="px-2"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
              {offset !== 0 && (
                <Button
                  variant="default"
                  size="sm"
                  onClick={() => setOffset(0)}
                  className="px-3 hidden sm:block"
                >
                  Actuel
                </Button>
              )}
            </div>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:gap-4">
          <StatsCard 
            title="Ventes" 
            value={periodData?.periodStats.ventesCount.toString() || '0'} 
            icon={<ShoppingCart className="h-6 w-6 sm:h-8 sm:w-8 text-primary" />} 
          />
          <StatsCard 
            title="Revenus" 
            value={`${(periodData?.periodStats.totalRevenue || 0).toLocaleString()} FCFA`} 
            icon={<DollarSign className="h-6 w-6 sm:h-8 sm:w-8 text-primary" />} 
          />
        </div>
      </div>

      {/* Dernières ventes */}
      <div className="space-y-3 sm:space-y-4">
        <h2 className="text-base sm:text-lg font-semibold">Dernières ventes</h2>
        <div className="space-y-2">
          {dashboardData.recentSales.length === 0 ? (
            <Card className="card-shadow">
              <CardContent className="p-6 text-center text-gray-500">
                <ShoppingCart className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p className="text-sm">Aucune vente récente</p>
              </CardContent>
            </Card>
          ) : (
            dashboardData.recentSales.map((sale) => (
              <Card 
                key={sale.id} 
                className="card-shadow cursor-pointer hover:shadow-md transition-shadow"
              >
                <CardContent className="p-3 sm:p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <p className="font-semibold text-gray-900 text-sm sm:text-base">{sale.numeroFacture}</p>
                      <p className="text-xs sm:text-sm text-gray-600 mt-0.5">
                        {sale.clientUser ? `${sale.clientUser.nom} ${sale.clientUser.prenom}` : 'Client anonyme'}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-[#66d9a1] text-sm sm:text-base">
                        {sale.montantPaye?.toLocaleString() || sale.montantTotal.toLocaleString()} FCFA
                      </p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {sale.nombreArticles} article{sale.nombreArticles > 1 ? 's' : ''}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between text-xs text-gray-500">
                    <span>{sale.manager.nom}</span>
                    <span>{formatDistanceToNow(new Date(sale.dateVente), { addSuffix: true, locale: fr })}</span>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

interface StatsCardProps {
  title: string;
  value: string;
  icon: React.ReactNode;
}

const StatsCard: React.FC<StatsCardProps> = ({ title, value, icon }) => {
  return (
    <Card className="card-shadow">
      <CardContent className="p-2 sm:p-4 flex items-center justify-between rounded-lg gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="p-1 sm:p-2 rounded-full bg-primary/10 flex items-center justify-center">
            {React.isValidElement(icon)
              ? React.cloneElement(icon as React.ReactElement, { className: 'h-5 w-5 sm:h-6 sm:w-6 text-primary' })
              : icon}
          </div>

          <div className="min-w-0">
            <p className="text-xs font-medium text-gray-500 truncate">{title}</p>
            <p className="text-base sm:text-2xl font-bold truncate">{value}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default ShopDashboard;
