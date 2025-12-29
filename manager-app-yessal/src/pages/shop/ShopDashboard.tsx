import React, { useState, useEffect } from 'react';
import { TrendingUp, Package, ShoppingCart, DollarSign } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import ShopService, { Sale, SalesStats } from '@/services/shop';
import AuthService from '@/services/auth';
import { toast } from '@/hooks/use-toast';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';

const ShopDashboard: React.FC = () => {
  const [stats, setStats] = useState<SalesStats | null>(null);
  const [recentSales, setRecentSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);

  const siteLavageId = AuthService.getCurrentSiteLavageId();

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
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
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // Charger les stats du jour
      const statsData = await ShopService.getSalesStats(siteLavageId, {
        startDate: today.toISOString()
      });

      // Charger les ventes récentes
      const salesData = await ShopService.getSales(siteLavageId, {
        startDate: today.toISOString()
      });

      setStats(statsData);
      setRecentSales(salesData.ventes.slice(0, 4)); // Prendre les 4 dernières
    } catch (error) {
      console.error('Erreur lors du chargement des données:', error);
      toast({
        title: "Erreur",
        description: "Erreur lors du chargement des données",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 pb-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Boutique</h1>
        <p className="text-sm text-gray-500 mt-1">
          Tableau de bord des ventes
        </p>
      </div>

      {/* Statistiques */}
      {loading ? (
        <div className="grid grid-cols-2 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="border-none shadow-md">
              <CardContent className="p-4">
                <div className="h-20 animate-pulse bg-gray-200 rounded" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4">
          <Card className="border-none shadow-md">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500 font-medium">Ventes aujourd'hui</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">
                    {stats?.ventesCount || 0}
                  </p>
                </div>
                <div className="p-3 bg-blue-100 rounded-xl">
                  <ShoppingCart className="h-6 w-6 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-none shadow-md">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500 font-medium">Revenu du jour</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">
                    {(stats?.totalRevenue || 0).toLocaleString()} F
                  </p>
                </div>
                <div className="p-3 bg-green-100 rounded-xl">
                  <DollarSign className="h-6 w-6 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-none shadow-md">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500 font-medium">Stock faible</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">
                    {stats?.lowStockCount || 0}
                  </p>
                </div>
                <div className="p-3 bg-orange-100 rounded-xl">
                  <TrendingUp className="h-6 w-6 text-orange-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-none shadow-md">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500 font-medium">Total produits</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">
                    {stats?.totalProducts || 0}
                  </p>
                </div>
                <div className="p-3 bg-purple-100 rounded-xl">
                  <Package className="h-6 w-6 text-purple-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Dernières ventes */}
      <Card className="border-none shadow-md">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg font-bold text-gray-900">
            Dernières ventes
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-20 animate-pulse bg-gray-200 rounded-xl" />
              ))}
            </div>
          ) : recentSales.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <ShoppingCart className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p className="text-sm">Aucune vente aujourd'hui</p>
            </div>
          ) : (
            recentSales.map((sale) => (
              <div
                key={sale.id}
                className="p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors"
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <p className="font-semibold text-gray-900">{sale.numeroFacture}</p>
                    <p className="text-sm text-gray-600 mt-0.5">
                      {sale.clientUser ? `${sale.clientUser.nom} ${sale.clientUser.prenom}` : 'Client anonyme'}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-[#66d9a1]">
                      {sale.montantTotal.toLocaleString()} F
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
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ShopDashboard;
