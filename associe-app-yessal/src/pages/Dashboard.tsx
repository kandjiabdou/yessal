import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, TrendingDown, DollarSign, Users, PiggyBank, CreditCard } from "lucide-react";
import AuthService from '@/services/auth';
import { useCurrency } from '@/hooks/useCurrency';

// interface Shareholder {
//   id?: string;
//   name: string;
//   email?: string;
//   password?: string;
//   shareholdingPercentage: number;
// }

// Données fake pour la démonstration
const financialData = {
  totalRevenue: 'à venir',
  totalExpenses: 'à venir',
  totalLoans: 'à venir',
  netBalance: 'à venir',
  conversionRate: 655.96
};

// const shareholders = [
//   { name: "Jean Dupont", percentage: 40 },
//   { name: "Marie Martin", percentage: 35 },
//   { name: "Paul Durand", percentage: 25 }
// ];

const Dashboard: React.FC = () => {
  const user = AuthService.getUser();
  const { formatCurrency, convertAmount, userDevise, tauxConversion, loading } = useCurrency();
  
  const currentUser = user ? { 
    name: `${user.prenom} ${user.nom}`, 
    shareholdingPercentage: 25 // Mock value for prototype
  } : { name: 'Utilisateur', shareholdingPercentage: 0 };

  const userShare = (financialData.netBalance * currentUser.shareholdingPercentage) / 100;

  const getIconColor = (color: string) => {
    switch (color) {
      case 'success': return 'text-success';
      case 'destructive': return 'text-destructive';
      case 'warning': return 'text-warning';
      default: return 'text-primary';
    }
  };

  const metrics = [
    {
      title: "Solde Total",
      amount: financialData.netBalance,
      icon: DollarSign,
      trend: "up",
      color: "success"
    },
    {
      title: "Total Recettes",
      amount: financialData.totalRevenue,
      icon: TrendingUp,
      trend: "up",
      color: "success"
    },
    {
      title: "Total Dépenses",
      amount: financialData.totalExpenses,
      icon: TrendingDown,
      trend: "down",
      color: "destructive"
    },
    {
      title: "Emprunts en cours",
      amount: financialData.totalLoans,
      icon: CreditCard,
      trend: "neutral",
      color: "warning"
    }
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Chargement des préférences...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* En-tête utilisateur */}
      <div className="bg-gradient-to-r from-primary to-primary-glow text-primary-foreground p-6 rounded-lg">
        <h1 className="text-2xl font-bold mb-2">
          Bienvenue, {currentUser.name}
        </h1>
        <p className="opacity-90">
          Part dans l'entreprise : {currentUser.shareholdingPercentage}%
        </p>
      </div>

      {/* Métriques principales */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {metrics.map((metric, index) => {
          const IconComponent = metric.icon;
          return (
            <Card key={metric.title} className="hover:shadow-md transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  {metric.title}
                </CardTitle>
                <IconComponent className={`h-4 w-4 ${getIconColor(metric.color)}`} />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold mb-1">
                  {formatCurrency(metric.amount)}
                </div>
                {userDevise === 'FCFA' && (
                  <p className="text-xs text-muted-foreground">
                    ≈ {convertAmount(metric.amount).toLocaleString('fr-FR', { 
                      minimumFractionDigits: 2, 
                      maximumFractionDigits: 2 
                    })} €
                  </p>
                )}
                {userDevise === 'EUR' && (
                  <p className="text-xs text-muted-foreground">
                    ≈ {(metric.amount).toLocaleString('fr-FR')} FCFA
                  </p>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Votre part des bénéfices */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PiggyBank className="h-5 w-5 text-success" />
              Vos Bénéfices
            </CardTitle>
            <CardDescription>
              Calcul basé sur votre participation de {currentUser.shareholdingPercentage}%
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="p-4 bg-success-light rounded-lg">
                <div className="text-lg font-semibold text-success">
                  {formatCurrency(userShare)}
                </div>
                {userDevise === 'FCFA' && (
                  <div className="text-sm text-muted-foreground">
                    ≈ {convertAmount(userShare).toLocaleString('fr-FR', { 
                      minimumFractionDigits: 2, 
                      maximumFractionDigits: 2 
                    })} €
                  </div>
                )}
                {userDevise === 'EUR' && (
                  <div className="text-sm text-muted-foreground">
                    ≈ {userShare.toLocaleString('fr-FR')} FCFA
                  </div>
                )}
              </div>
              <div className="text-sm text-muted-foreground">
                Basé sur le solde net actuel de l'entreprise
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Répartition des actionnaires */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              Répartition des Parts
            </CardTitle>
            <CardDescription>
              Structure actionnariale de l'entreprise
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {/* {shareholders.map((shareholder, index) => (
                <div key={shareholder.name} className="flex items-center justify-between">
                  <span className={`text-sm ${
                    shareholder.name === currentUser.name ? 'font-medium text-primary' : ''
                  }`}>
                    {shareholder.name}
                    {shareholder.name === currentUser.name && ' (Vous)'}
                  </span>
                  <div className="flex items-center gap-2">
                    <div className="w-20 bg-muted rounded-full h-2">
                      <div 
                        className="bg-primary h-2 rounded-full transition-all duration-300"
                        style={{ width: `${shareholder.percentage}%` }}
                      />
                    </div>
                    <span className="text-sm font-medium">{shareholder.percentage}%</span>
                  </div>
                </div>
              ))} */}

              A venir ...
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Taux de change */}
      <Card>
        <CardHeader>
          <CardTitle>Affichage et Taux de Change</CardTitle>
          <CardDescription>
            Devise affichée : <span className="font-semibold">{userDevise}</span>
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
            <span className="font-medium">1 EUR</span>
            <span className="text-muted-foreground">=</span>
            <span className="font-medium">{tauxConversion} FCFA</span>
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            Vous pouvez modifier votre préférence de devise dans les Paramètres
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default Dashboard; 
