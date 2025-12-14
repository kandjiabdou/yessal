import React, { useState } from 'react';
import { Search, Calendar, User, Package, DollarSign } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

// Données mock des ventes
const mockSales = [
  {
    id: 1,
    invoiceNumber: 'V-2025-001',
    items: [
      { name: 'Savon Dove', quantity: 2, price: 1500 },
      { name: 'Shampoing Pantene', quantity: 1, price: 3500 },
    ],
    totalItems: 3,
    total: 6500,
    client: 'Marie Diop',
    date: '2025-01-14 14:30',
    seller: 'Fatou Sall',
    paymentMethod: 'Espèces'
  },
  {
    id: 2,
    invoiceNumber: 'V-2025-002',
    items: [
      { name: 'Parfum homme', quantity: 1, price: 8000 },
    ],
    totalItems: 1,
    total: 8000,
    client: 'Client anonyme',
    date: '2025-01-14 13:15',
    seller: 'Aminata Ba',
    paymentMethod: 'Wave'
  },
  {
    id: 3,
    invoiceNumber: 'V-2025-003',
    items: [
      { name: 'Dentifrice Colgate', quantity: 3, price: 2000 },
      { name: 'Lotion corps', quantity: 2, price: 4500 },
    ],
    totalItems: 5,
    total: 15000,
    client: 'Ousmane Ndiaye',
    date: '2025-01-14 11:45',
    seller: 'Fatou Sall',
    paymentMethod: 'Orange Money'
  },
  {
    id: 4,
    invoiceNumber: 'V-2025-004',
    items: [
      { name: 'Savon Dove', quantity: 5, price: 1500 },
      { name: 'Shampoing Pantene', quantity: 1, price: 3500 },
    ],
    totalItems: 6,
    total: 11000,
    client: 'Client anonyme',
    date: '2025-01-14 10:20',
    seller: 'Aminata Ba',
    paymentMethod: 'Espèces'
  },
  {
    id: 5,
    invoiceNumber: 'V-2025-005',
    items: [
      { name: 'Parfum homme', quantity: 2, price: 8000 },
      { name: 'Lotion corps', quantity: 1, price: 4500 },
    ],
    totalItems: 3,
    total: 20500,
    client: 'Awa Sarr',
    date: '2025-01-13 16:45',
    seller: 'Fatou Sall',
    paymentMethod: 'Carte bancaire'
  },
  {
    id: 6,
    invoiceNumber: 'V-2025-006',
    items: [
      { name: 'Dentifrice Colgate', quantity: 2, price: 2000 },
    ],
    totalItems: 2,
    total: 4000,
    client: 'Moussa Fall',
    date: '2025-01-13 15:30',
    seller: 'Aminata Ba',
    paymentMethod: 'Espèces'
  },
];

const ShopSales: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterPeriod, setFilterPeriod] = useState('all');
  const [selectedSale, setSelectedSale] = useState<typeof mockSales[0] | null>(null);

  const filteredSales = mockSales.filter(sale => {
    const matchesSearch = 
      sale.invoiceNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      sale.client.toLowerCase().includes(searchTerm.toLowerCase()) ||
      sale.seller.toLowerCase().includes(searchTerm.toLowerCase());
    
    return matchesSearch;
  });

  const totalRevenue = filteredSales.reduce((sum, sale) => sum + sale.total, 0);
  const totalSales = filteredSales.length;

  return (
    <div className="space-y-6 pb-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Ventes</h1>
        <p className="text-sm text-gray-500 mt-1">
          Historique des ventes de la boutique
        </p>
      </div>

      {/* Statistiques rapides */}
      <div className="grid grid-cols-2 gap-4">
        <Card className="border-none shadow-md">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 font-medium">Total ventes</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{totalSales}</p>
              </div>
              <div className="p-3 bg-blue-100 rounded-xl">
                <Package className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-md">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 font-medium">Revenu total</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">
                  {totalRevenue.toLocaleString()} F
                </p>
              </div>
              <div className="p-3 bg-green-100 rounded-xl">
                <DollarSign className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filtres */}
      <div className="flex gap-3">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Rechercher par facture, client, vendeur..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={filterPeriod} onValueChange={setFilterPeriod}>
          <SelectTrigger className="w-[140px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Toutes</SelectItem>
            <SelectItem value="today">Aujourd'hui</SelectItem>
            <SelectItem value="week">Cette semaine</SelectItem>
            <SelectItem value="month">Ce mois</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Liste des ventes */}
      <div className="space-y-3">
        {filteredSales.map((sale) => (
          <Card
            key={sale.id}
            className="border-none shadow-md hover:shadow-lg transition-shadow cursor-pointer"
            onClick={() => setSelectedSale(selectedSale?.id === sale.id ? null : sale)}
          >
            <CardContent className="p-4">
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="font-bold text-gray-900">{sale.invoiceNumber}</p>
                    <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded-full font-medium">
                      {sale.paymentMethod}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600">{sale.client}</p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-lg text-[#66d9a1]">
                    {sale.total.toLocaleString()} F
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {sale.totalItems} article{sale.totalItems > 1 ? 's' : ''}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-4 text-xs text-gray-500 mb-3">
                <div className="flex items-center gap-1">
                  <User className="h-3 w-3" />
                  <span>{sale.seller}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  <span>{sale.date}</span>
                </div>
              </div>

              {/* Détails des articles (visible si sélectionné) */}
              {selectedSale?.id === sale.id && (
                <div className="pt-3 border-t space-y-2">
                  <p className="text-sm font-semibold text-gray-900 mb-2">Détails de la vente</p>
                  {sale.items.map((item, index) => (
                    <div key={index} className="flex items-center justify-between text-sm bg-gray-50 rounded-lg p-2">
                      <div>
                        <p className="font-medium text-gray-900">{item.name}</p>
                        <p className="text-xs text-gray-500">
                          {item.price.toLocaleString()} F × {item.quantity}
                        </p>
                      </div>
                      <p className="font-semibold text-gray-900">
                        {(item.price * item.quantity).toLocaleString()} F
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredSales.length === 0 && (
        <Card className="border-none shadow-md">
          <CardContent className="p-12 text-center">
            <Package className="h-12 w-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">Aucune vente trouvée</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default ShopSales;
