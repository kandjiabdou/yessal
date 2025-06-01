import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Package, CreditCard, Scale, Truck } from 'lucide-react';
const Dashboard: React.FC = () => {
  const todaysStats = {
    orders: 12,
    revenue: "48000 FCFA",
    weight: "36 kg",
    deliveries: 4
  };
  const weeklyStats = {
    orders: 84,
    revenue: "336000 FCFA",
    weight: "252 kg",
    deliveries: 28
  };
  return <div className="space-y-6 pb-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">
          Statistiques et performances du jour
        </p>
      </div>

      <div className="space-y-4">
        <h2 className="text-lg font-semibold">Aujourd'hui</h2>
        <div className="grid grid-cols-2 gap-4">
          <StatsCard title="Commandes" value={todaysStats.orders.toString()} icon={<Package className="h-8 w-8 text-primary" />} />
          <StatsCard title="Revenus" value={todaysStats.revenue} icon={<CreditCard className="h-8 w-8 text-primary" />} />
          <StatsCard title="Poids traité" value={todaysStats.weight} icon={<Scale className="h-8 w-8 text-primary" />} />
          <StatsCard title="Livraisons" value={todaysStats.deliveries.toString()} icon={<Truck className="h-8 w-8 text-primary" />} />
        </div>
      </div>

      <div className="space-y-4">
        <h2 className="text-lg font-semibold">Cette semaine</h2>
        <div className="grid grid-cols-2 gap-4">
          <StatsCard title="Commandes" value={weeklyStats.orders.toString()} icon={<Package className="h-8 w-8 text-primary" />} />
          <StatsCard title="Revenus" value={weeklyStats.revenue} icon={<CreditCard className="h-8 w-8 text-primary" />} />
          <StatsCard title="Poids traité" value={weeklyStats.weight} icon={<Scale className="h-8 w-8 text-primary" />} />
          <StatsCard title="Livraisons" value={weeklyStats.deliveries.toString()} icon={<Truck className="h-8 w-8 text-primary" />} />
        </div>
      </div>

      <div className="space-y-4">
        <h2 className="text-lg font-semibold">Commandes récentes</h2>
        <div className="space-y-2">
          {[1, 2, 3, 4, 5].map(i => <Card key={i} className="card-shadow">
              <CardContent className="p-4">
                <div className="flex justify-between items-center">
                  <div>
                    <div className="font-medium">Commande #{10548 + i}</div>
                    <div className="text-sm text-gray-500">{`Client: Abdou Diop`}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-primary font-semibold">3500 FCFA</div>
                    <div className="text-xs text-gray-500">Il y a 45 minutes</div>
                  </div>
                </div>
                <div className="mt-2 flex justify-between items-center">
                  <span className="text-xs bg-blue-100 text-blue-800 rounded-full px-2 py-1">
                    En attente
                  </span>
                  <span className="text-xs text-gray-500">3 kg</span>
                </div>
              </CardContent>
            </Card>)}
        </div>
      </div>
    </div>;
};
interface StatsCardProps {
  title: string;
  value: string;
  icon: React.ReactNode;
}
const StatsCard: React.FC<StatsCardProps> = ({
  title,
  value,
  icon
}) => {
  return <Card className="card-shadow">
      <CardContent className="p-4 flex justify-between items-center rounded-lg">
        <div>
          <p className="text-sm font-medium text-gray-500">{title}</p>
          <p className="text-2xl font-bold">{value}</p>
        </div>
        <div className="p-2 rounded-full bg-primary/10">
          {icon}
        </div>
      </CardContent>
    </Card>;
};
export default Dashboard;