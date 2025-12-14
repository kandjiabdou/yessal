import React, { useState } from 'react';
import { Plus, TrendingUp, Package, ShoppingCart, DollarSign } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { NewSaleDialog } from './NewSaleDialog';

// Données mock
const mockStats = {
  ventesToday: 15,
  revenuToday: 45000,
  lowStockProducts: 5,
  totalProducts: 48
};

const mockRecentSales = [
  {
    id: 1,
    invoiceNumber: 'V-2025-001',
    items: 3,
    total: 15000,
    client: 'Marie Diop',
    date: '2025-01-14 14:30',
    seller: 'Fatou Sall'
  },
  {
    id: 2,
    invoiceNumber: 'V-2025-002',
    items: 1,
    total: 8000,
    client: 'Client anonyme',
    date: '2025-01-14 13:15',
    seller: 'Aminata Ba'
  },
  {
    id: 3,
    invoiceNumber: 'V-2025-003',
    items: 5,
    total: 22000,
    client: 'Ousmane Ndiaye',
    date: '2025-01-14 11:45',
    seller: 'Fatou Sall'
  },
  {
    id: 4,
    invoiceNumber: 'V-2025-004',
    items: 2,
    total: 12500,
    client: 'Client anonyme',
    date: '2025-01-14 10:20',
    seller: 'Aminata Ba'
  }
];

const ShopDashboard: React.FC = () => {
  const [isNewSaleOpen, setIsNewSaleOpen] = useState(false);

  return (
    <div className="space-y-6 pb-6">
      {/* Header avec bouton nouvelle vente */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Boutique</h1>
          <p className="text-sm text-gray-500 mt-1">
            Tableau de bord des ventes
          </p>
        </div>
        <Button
          onClick={() => setIsNewSaleOpen(true)}
          className="bg-[#66d9a1] hover:bg-[#52c48a] text-black font-semibold shadow-md"
        >
          <Plus className="h-4 w-4 mr-2" />
          Nouvelle vente
        </Button>
      </div>

      {/* Statistiques */}
      <div className="grid grid-cols-2 gap-4">
        <Card className="border-none shadow-md">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 font-medium">Ventes aujourd'hui</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">
                  {mockStats.ventesToday}
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
                  {mockStats.revenuToday.toLocaleString()} F
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
                  {mockStats.lowStockProducts}
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
                  {mockStats.totalProducts}
                </p>
              </div>
              <div className="p-3 bg-purple-100 rounded-xl">
                <Package className="h-6 w-6 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Dernières ventes */}
      <Card className="border-none shadow-md">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg font-bold text-gray-900">
            Dernières ventes
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {mockRecentSales.map((sale) => (
            <div
              key={sale.id}
              className="p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors"
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1">
                  <p className="font-semibold text-gray-900">{sale.invoiceNumber}</p>
                  <p className="text-sm text-gray-600 mt-0.5">{sale.client}</p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-[#66d9a1]">
                    {sale.total.toLocaleString()} F
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {sale.items} article{sale.items > 1 ? 's' : ''}
                  </p>
                </div>
              </div>
              <div className="flex items-center justify-between text-xs text-gray-500">
                <span>{sale.seller}</span>
                <span>{sale.date}</span>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Dialog pour nouvelle vente */}
      <NewSaleDialog
        open={isNewSaleOpen}
        onOpenChange={setIsNewSaleOpen}
      />
    </div>
  );
};

export default ShopDashboard;
