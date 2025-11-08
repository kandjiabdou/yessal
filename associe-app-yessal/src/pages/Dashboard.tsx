import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, TrendingDown, DollarSign, Users, PiggyBank, CreditCard } from "lucide-react";
import AuthService from '@/services/auth';

interface Shareholder {
  id?: string;
  name: string;
  email?: string;
  password?: string;
  shareholdingPercentage: number;
}

// Données fake pour la démonstration
const financialData = {
  totalRevenue: 1250000, // en FCFA
  totalExpenses: 890000,
  totalLoans: 150000,
  netBalance: 360000,
  conversionRate: 655.96
};

const shareholders = [
  { name: "Jean Dupont", percentage: 40 },
  { name: "Marie Martin", percentage: 35 },
  { name: "Paul Durand", percentage: 25 }
];

const Dashboard: React.FC = () => {
  const user = AuthService.getUser();
  const currentUser = user ? { 
    name: `${user.prenom} ${user.nom}`, 
    shareholdingPercentage: 25 // Mock value for prototype
  } : { name: 'Utilisateur', shareholdingPercentage: 0 };

  const convertToEuro = (fcfa: number) => fcfa / financialData.conversionRate;
  
  const formatCurrency = (amount: number, currency: 'FCFA' | 'EUR') => {
    const formatter = new Intl.NumberFormat('fr-FR');
    return currency === 'FCFA' 
      ? `${formatter.format(amount)} FCFA`
      : `${formatter.format(amount)} €`;
  };

  const getIconColor = (color: string) => {
    switch (color) {
      case 'success': return 'text-success';
      case 'destructive': return 'text-destructive';
      case 'warning': return 'text-warning';
      default: return 'text-primary';
    }
  };

  const userShare = (financialData.netBalance * currentUser.shareholdingPercentage) / 100;
  const userShareEuro = convertToEuro(userShare);

  const metrics = [
    {
      title: "Solde Total",
      fcfa: financialData.netBalance,
      euro: convertToEuro(financialData.netBalance),
      icon: DollarSign,
      trend: "up",
      color: "success"
    },
    {
      title: "Total Recettes",
      fcfa: financialData.totalRevenue,
      euro: convertToEuro(financialData.totalRevenue),
      icon: TrendingUp,
      trend: "up",
      color: "success"
    },
    {
      title: "Total Dépenses",
      fcfa: financialData.totalExpenses,
      euro: convertToEuro(financialData.totalExpenses),
      icon: TrendingDown,
      trend: "down",
      color: "destructive"
    },
    {
      title: "Emprunts en cours",
      fcfa: financialData.totalLoans,
      euro: convertToEuro(financialData.totalLoans),
      icon: CreditCard,
      trend: "neutral",
      color: "warning"
    }
  ];

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
                  {formatCurrency(metric.fcfa, 'FCFA')}
                </div>
                <p className="text-xs text-muted-foreground">
                  {formatCurrency(metric.euro, 'EUR')}
                </p>
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
                  {formatCurrency(userShare, 'FCFA')}
                </div>
                <div className="text-sm text-muted-foreground">
                  {formatCurrency(userShareEuro, 'EUR')}
                </div>
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
              {shareholders.map((shareholder, index) => (
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
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Taux de change */}
      <Card>
        <CardHeader>
          <CardTitle>Taux de Change</CardTitle>
          <CardDescription>
            Conversion automatique Euro ↔ FCFA
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
            <span className="font-medium">1 EUR</span>
            <span className="text-muted-foreground">=</span>
            <span className="font-medium">{financialData.conversionRate} FCFA</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Dashboard; 
