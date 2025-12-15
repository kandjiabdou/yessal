import React, { useState, useEffect } from 'react';
import { Search, Package, TrendingDown, Plus, Minus } from 'lucide-react';
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { toast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import ShopService, { Stock, Category } from '@/services/shop';
import AuthService from '@/services/auth';

const ShopProducts: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  const [filterStock, setFilterStock] = useState('all');
  const [selectedStock, setSelectedStock] = useState<Stock | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isStockUpdateOpen, setIsStockUpdateOpen] = useState(false);
  const [stockToAdd, setStockToAdd] = useState(0);
  const [stocks, setStocks] = useState<Stock[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  const siteLavageId = AuthService.getCurrentSiteLavageId();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
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
      const [stocksData, categoriesData] = await Promise.all([
        ShopService.getSiteStock(siteLavageId),
        ShopService.getCategories()
      ]);

      setStocks(stocksData);
      setCategories(categoriesData);
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

  // Filtrer les produits
  const filteredStocks = stocks.filter(stock => {
    const matchesSearch =
      stock.produit.nom.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (stock.produit.codeBarres && stock.produit.codeBarres.includes(searchTerm));

    const matchesCategory = filterCategory === 'all' || stock.produit.categorieId.toString() === filterCategory;

    const matchesStock =
      filterStock === 'all' ||
      (filterStock === 'low' && stock.quantiteDisponible <= stock.seuilAlerte) ||
      (filterStock === 'normal' && stock.quantiteDisponible > stock.seuilAlerte);

    return matchesSearch && matchesCategory && matchesStock;
  });

  // Compter les produits en stock faible
  const lowStockCount = stocks.filter(s => s.quantiteDisponible <= s.seuilAlerte).length;

  const handleViewDetails = (stock: Stock) => {
    setSelectedStock(stock);
    setIsDetailOpen(true);
  };

  const handleUpdateStock = (stock: Stock) => {
    setSelectedStock(stock);
    setStockToAdd(0);
    setIsStockUpdateOpen(true);
  };

  const handleConfirmStockUpdate = async () => {
    if (!selectedStock || !siteLavageId) return;

    if (stockToAdd === 0) {
      toast({
        title: "Erreur",
        description: "Veuillez saisir une quantité",
        variant: "destructive"
      });
      return;
    }

    try {
      await ShopService.adjustStock(
        selectedStock.produitId,
        siteLavageId,
        {
          quantite: stockToAdd,
          motif: stockToAdd > 0 ? 'Réapprovisionnement' : 'Ajustement manuel'
        }
      );

      toast({
        title: "Succès",
        description: `Stock mis à jour : ${stockToAdd > 0 ? '+' : ''}${stockToAdd} ${selectedStock.produit.nom}`,
        variant: "success"
      });
      setIsStockUpdateOpen(false);
      setStockToAdd(0);
      await loadData();
    } catch (error) {
      console.error('Erreur lors de la mise à jour du stock:', error);
      toast({
        title: "Erreur",
        description: "Erreur lors de la mise à jour du stock",
        variant: "destructive"
      });
    }
  };

  const getStockStatus = (stock: Stock) => {
    if (stock.quantiteDisponible === 0) {
      return { label: 'Rupture', color: 'bg-red-500' };
    } else if (stock.quantiteDisponible <= stock.seuilAlerte) {
      return { label: 'Stock faible', color: 'bg-orange-500' };
    } else {
      return { label: 'En stock', color: 'bg-green-500' };
    }
  };

  return (
    <div className="space-y-6 pb-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Produits</h1>
        <p className="text-sm text-gray-500 mt-1">
          Gestion des produits et du stock
        </p>
      </div>

      {/* Statistiques rapides */}
      <div className="grid grid-cols-2 gap-4">
        <Card className="border-none shadow-md">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500 mb-1">Total produits</p>
                <p className="text-2xl font-bold text-gray-900">{stocks.length}</p>
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
                <p className="text-xs text-gray-500 mb-1">Stock faible</p>
                <p className="text-2xl font-bold text-orange-600">{lowStockCount}</p>
              </div>
              <div className="p-3 bg-orange-100 rounded-xl">
                <TrendingDown className="h-6 w-6 text-orange-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filtres */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="relative md:col-span-2">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Rechercher par nom ou code-barres..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={filterCategory} onValueChange={setFilterCategory}>
          <SelectTrigger>
            <SelectValue placeholder="Toutes catégories" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Toutes catégories</SelectItem>
            {categories.map(cat => (
              <SelectItem key={cat.id} value={cat.id.toString()}>{cat.nom}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex gap-3">
        <Select value={filterStock} onValueChange={setFilterStock}>
          <SelectTrigger className="w-[200px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les stocks</SelectItem>
            <SelectItem value="low">Stock faible</SelectItem>
            <SelectItem value="normal">Stock normal</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Liste des produits */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="border-none shadow-md">
              <CardContent className="p-4">
                <div className="h-20 animate-pulse bg-gray-200 rounded" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : filteredStocks.length === 0 ? (
        <Card className="border-none shadow-md">
          <CardContent className="p-8 text-center text-gray-500">
            <Package className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p>Aucun produit trouvé</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredStocks.map((stock) => {
            const status = getStockStatus(stock);
            return (
              <Card key={`${stock.produitId}-${stock.siteLavageId}`} className="border-none shadow-md">
                <CardContent className="p-4">
                  <div className="flex items-center gap-4">
                    {stock.produit.imageUrl ? (
                      <img
                        src={stock.produit.imageUrl}
                        alt={stock.produit.nom}
                        className="w-16 h-16 rounded-xl object-cover flex-shrink-0"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                          const fallback = e.currentTarget.nextElementSibling as HTMLElement;
                          if (fallback) fallback.classList.remove('hidden');
                        }}
                      />
                    ) : null}
                    <div className={`p-3 bg-gray-100 rounded-xl flex-shrink-0 ${stock.produit.imageUrl ? 'hidden' : ''}`}>
                      <Package className="h-6 w-6 text-gray-600" />
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="font-semibold text-gray-900">{stock.produit.nom}</p>
                        <Badge className={`${status.color} text-white text-xs`}>
                          {status.label}
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-500">{stock.produit.categorie.nom}</p>
                      <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                        <span>Prix: {(stock.prixVente || stock.produit.prixVente || 0).toLocaleString()} F</span>
                        {stock.produit.codeBarres && (
                          <span>Code: {stock.produit.codeBarres}</span>
                        )}  
                      </div>
                    </div>
                    
                    <div className="text-right flex-shrink-0">
                      <p className="text-2xl font-bold text-gray-900">{stock.quantiteDisponible}</p>
                      <p className="text-xs text-gray-500 mt-1">
                        Seuil: {stock.seuilAlerte}
                      </p>
                      <div className="flex gap-2 mt-3">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleViewDetails(stock)}
                        >
                          Détails
                        </Button>
                        <Button
                          size="sm"
                          className="bg-[#66d9a1] hover:bg-[#52c48a] text-black"
                          onClick={() => handleUpdateStock(stock)}
                        >
                          <Plus className="h-4 w-4 mr-1" />
                          Stock
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Dialog détails produit */}
      <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Détails du produit</DialogTitle>
            <DialogDescription>
              Informations détaillées sur le produit et son stock
            </DialogDescription>
          </DialogHeader>
          {selectedStock && (
            <div className="space-y-4">
              <div className="flex items-center gap-4 pb-4 border-b">
                {selectedStock.produit.imageUrl ? (
                  <img
                    src={selectedStock.produit.imageUrl}
                    alt={selectedStock.produit.nom}
                    className="w-20 h-20 rounded-xl object-cover"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                      const fallback = e.currentTarget.nextElementSibling as HTMLElement;
                      if (fallback) fallback.classList.remove('hidden');
                    }}
                  />
                ) : null}
                <div className={`p-4 bg-gray-100 rounded-xl ${selectedStock.produit.imageUrl ? 'hidden' : ''}`}>
                  <Package className="h-8 w-8 text-gray-600" />
                </div>
                <div>
                  <h3 className="font-bold text-lg">{selectedStock.produit.nom}</h3>
                  <Badge className={`${getStockStatus(selectedStock).color} text-white`}>
                    {getStockStatus(selectedStock).label}
                  </Badge>
                </div>
              </div>
              <div>
                <Label className="text-sm font-semibold">Catégorie</Label>
                <p className="text-sm">{selectedStock.produit.categorie.nom}</p>
              </div>
              {selectedStock.produit.description && (
                <div>
                  <Label className="text-sm font-semibold">Description</Label>
                  <p className="text-sm">{selectedStock.produit.description}</p>
                </div>
              )}
              <div>
                <Label className="text-sm font-semibold">Prix de vente</Label>
                <p className="text-sm">{(selectedStock.prixVente || selectedStock.produit.prixVente || 0).toLocaleString()} F</p>
              </div>
              {selectedStock.produit.codeBarres && (
                <div>
                  <Label className="text-sm font-semibold">Code-barres</Label>
                  <p className="text-sm">{selectedStock.produit.codeBarres}</p>
                </div>
              )}
              <div className="pt-4 border-t">
                <div className="flex justify-between items-center">
                  <Label className="text-sm font-semibold">Stock disponible</Label>
                  <p className="text-2xl font-bold">{selectedStock.quantiteDisponible}</p>
                </div>
                <div className="flex justify-between items-center mt-2">
                  <Label className="text-sm font-semibold">Seuil d'alerte</Label>
                  <p className="text-sm">{selectedStock.seuilAlerte}</p>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Dialog mise à jour stock */}
      <Dialog open={isStockUpdateOpen} onOpenChange={setIsStockUpdateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Ajuster le stock</DialogTitle>
            <DialogDescription>
              Ajoutez ou retirez des unités du stock de ce produit
            </DialogDescription>
          </DialogHeader>
          {selectedStock && (
            <div className="space-y-4">
              <div>
                <Label>Produit</Label>
                <p className="text-sm font-semibold">{selectedStock.produit.nom}</p>
                <p className="text-xs text-gray-500 mt-1">
                  Stock actuel: {selectedStock.quantiteDisponible}
                </p>
              </div>
              <div>
                <Label>Quantité à ajouter/retirer</Label>
                <div className="flex items-center gap-3 mt-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => setStockToAdd(Math.max(stockToAdd - 10, -selectedStock.quantiteDisponible))}
                  >
                    <Minus className="h-4 w-4" />
                  </Button>
                  <Input
                    type="number"
                    value={stockToAdd}
                    onChange={(e) => setStockToAdd(parseInt(e.target.value) || 0)}
                    className="text-center"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => setStockToAdd(stockToAdd + 10)}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  Nouveau stock: {selectedStock.quantiteDisponible + stockToAdd}
                </p>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsStockUpdateOpen(false)}>
              Annuler
            </Button>
            <Button
              onClick={handleConfirmStockUpdate}
              className="bg-[#66d9a1] hover:bg-[#52c48a] text-black"
            >
              Confirmer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ShopProducts;
