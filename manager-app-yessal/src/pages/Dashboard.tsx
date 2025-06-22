import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Package, CreditCard, Scale, Truck, Loader2, AlertCircle } from 'lucide-react';
import AuthService from '@/services/auth';
import DashboardService, { DashboardData } from '@/services/dashboard';

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadDashboardData = async () => {
      try {
        setLoading(true);
        setError(null);

        const user = AuthService.getUser();
        if (!user || user.role !== 'Manager') {
          navigate('/login');
          return;
        }

        if (!user.siteLavagePrincipalGerantId) {
          setError('Aucun site de lavage assigné. Veuillez configurer votre profil.');
          return;
        }

        const data = await DashboardService.getDashboardData(user.siteLavagePrincipalGerantId);
        if (data) {
          setDashboardData(data);
        } else {
          setError('Erreur lors du chargement des données');
        }
      } catch (err) {
        console.error('Erreur:', err);
        setError('Une erreur est survenue lors du chargement');
      } finally {
        setLoading(false);
      }
    };

    loadDashboardData();
  }, [navigate]);

  const getStatusColor = (status: string) => {
    switch(status) {
      case 'PrisEnCharge': return 'bg-blue-100 text-blue-800';
      case 'LavageEnCours': return 'bg-yellow-100 text-yellow-800';
      case 'Repassage': return 'bg-purple-100 text-purple-800';
      case 'Collecte': return 'bg-orange-100 text-orange-800';
      case 'Livraison': return 'bg-indigo-100 text-indigo-800';
      case 'Livre': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusLabel = (status: string) => {
    switch(status) {
      case 'PrisEnCharge': return 'Pris en charge';
      case 'LavageEnCours': return 'Lavage en cours';
      case 'Repassage': return 'Repassage';
      case 'Collecte': return 'Collecte';
      case 'Livraison': return 'Livraison';
      case 'Livre': return 'Livré';
      default: return status;
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 60) {
      return `Il y a ${diffInMinutes} minute${diffInMinutes > 1 ? 's' : ''}`;
    } else if (diffInMinutes < 1440) {
      const hours = Math.floor(diffInMinutes / 60);
      return `Il y a ${hours} heure${hours > 1 ? 's' : ''}`;
    } else {
      return date.toLocaleDateString('fr-FR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      });
    }
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
      <div>
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-sm sm:text-base text-muted-foreground">
          Statistiques et performances - {dashboardData.siteName}
        </p>
      </div>

      <div className="space-y-3 sm:space-y-4">
        <h2 className="text-base sm:text-lg font-semibold">Aujourd'hui</h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <StatsCard 
            title="Commandes" 
            value={dashboardData.todayStats.totalCommandes.toString()} 
            icon={<Package className="h-6 w-6 sm:h-8 sm:w-8 text-primary" />} 
          />
          <StatsCard 
            title="Revenus" 
            value={`${dashboardData.todayStats.totalRevenue.toLocaleString()} FCFA`} 
            icon={<CreditCard className="h-6 w-6 sm:h-8 sm:w-8 text-primary" />} 
          />
          <StatsCard 
            title="Poids traité" 
            value={`${dashboardData.todayStats.totalPoidsKg.toFixed(1)} kg`} 
            icon={<Scale className="h-6 w-6 sm:h-8 sm:w-8 text-primary" />} 
          />
          <StatsCard 
            title="Livraisons" 
            value={dashboardData.todayStats.totalLivraisons.toString()} 
            icon={<Truck className="h-6 w-6 sm:h-8 sm:w-8 text-primary" />} 
          />
        </div>
      </div>

      <div className="space-y-3 sm:space-y-4">
        <h2 className="text-base sm:text-lg font-semibold">Cette semaine</h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <StatsCard 
            title="Commandes" 
            value={dashboardData.weekStats.totalCommandes.toString()} 
            icon={<Package className="h-6 w-6 sm:h-8 sm:w-8 text-primary" />} 
          />
          <StatsCard 
            title="Revenus" 
            value={`${dashboardData.weekStats.totalRevenue.toLocaleString()} FCFA`} 
            icon={<CreditCard className="h-6 w-6 sm:h-8 sm:w-8 text-primary" />} 
          />
          <StatsCard 
            title="Poids traité" 
            value={`${dashboardData.weekStats.totalPoidsKg.toFixed(1)} kg`} 
            icon={<Scale className="h-6 w-6 sm:h-8 sm:w-8 text-primary" />} 
          />
          <StatsCard 
            title="Livraisons" 
            value={dashboardData.weekStats.totalLivraisons.toString()} 
            icon={<Truck className="h-6 w-6 sm:h-8 sm:w-8 text-primary" />} 
          />
        </div>
      </div>

      <div className="space-y-3 sm:space-y-4">
        <h2 className="text-base sm:text-lg font-semibold">Commandes récentes</h2>
        <div className="space-y-2">
          {dashboardData.recentOrders.length === 0 ? (
            <Card className="card-shadow">
              <CardContent className="p-6 sm:p-8 text-center">
                <Package className="h-10 w-10 sm:h-12 sm:w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-sm sm:text-base text-gray-500">Aucune commande récente</p>
              </CardContent>
            </Card>
          ) : (
            dashboardData.recentOrders.map((order) => (
              <Card 
                key={order.id} 
                className="card-shadow cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => navigate('/orders', { state: { selectedOrderId: order.id } })}
              >
                <CardContent className="p-3 sm:p-4">
                  <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2">
                    <div className="flex-1">
                      <div className="font-medium text-sm sm:text-base">Commande #{order.id}</div>
                      <div className="text-xs sm:text-sm text-gray-500">Client: {order.clientName}</div>
                    </div>
                    <div className="text-left sm:text-right">
                      <div className="text-primary font-semibold text-sm sm:text-base">
                        {order.prixTotal > 0 ? `${order.prixTotal.toLocaleString()} FCFA` : 'Prix à calculer'}
                      </div>
                      <div className="text-xs text-gray-500">{formatDate(order.dateHeureCommande)}</div>
                    </div>
                  </div>
                  <div className="mt-2 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2">
                    <Badge className={`${getStatusColor(order.statut)} text-xs w-fit`}>
                      {getStatusLabel(order.statut)}
                    </Badge>
                    <span className="text-xs text-gray-500">{order.masseClientIndicativeKg} kg</span>
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
      <CardContent className="p-3 sm:p-4 flex flex-col sm:flex-row sm:justify-between sm:items-center rounded-lg gap-2 sm:gap-0">
        <div className="flex-1">
          <p className="text-xs sm:text-sm font-medium text-gray-500">{title}</p>
          <p className="text-lg sm:text-2xl font-bold break-words">{value}</p>
        </div>
        <div className="p-2 rounded-full bg-primary/10 self-start sm:self-center">
          {icon}
        </div>
      </CardContent>
    </Card>
  );
};

export default Dashboard; 