import React, { useState } from 'react';
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
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';

// Données mock des produits
const mockProducts = [
  {
    id: 1,
    name: 'Savon Dove',
    category: 'Hygiène',
    price: 1500,
    stock: 25,
    lowStockAlert: 10,
    barcode: '3574660123456',
    supplier: 'Distributeur A'
  },
  {
    id: 2,
    name: 'Shampoing Pantene',
    category: 'Soins capillaires',
    price: 3500,
    stock: 15,
    lowStockAlert: 10,
    barcode: '3574660234567',
    supplier: 'Distributeur B'
  },
  {
    id: 3,
    name: 'Dentifrice Colgate',
    category: 'Hygiène',
    price: 2000,
    stock: 30,
    lowStockAlert: 15,
    barcode: '3574660345678',
    supplier: 'Distributeur A'
  },
  {
    id: 4,
    name: 'Parfum homme',
    category: 'Parfumerie',
    price: 8000,
    stock: 10,
    lowStockAlert: 5,
    barcode: '3574660456789',
    supplier: 'Distributeur C'
  },
  {
    id: 5,
    name: 'Lotion corps',
    category: 'Soins corps',
    price: 4500,
    stock: 20,
    lowStockAlert: 10,
    barcode: '3574660567890',
    supplier: 'Distributeur B'
  },
  {
    id: 6,
    name: 'Déodorant Axe',
    category: 'Hygiène',
    price: 2500,
    stock: 8,
    lowStockAlert: 10,
    barcode: '3574660678901',
    supplier: 'Distributeur A'
  },
  {
    id: 7,
    name: 'Gel douche Nivea',
    category: 'Hygiène',
    price: 3000,
    stock: 5,
    lowStockAlert: 10,
    barcode: '3574660789012',
    supplier: 'Distributeur B'
  },
  {
    id: 8,
    name: 'Crème visage',
    category: 'Soins visage',
    price: 6000,
    stock: 12,
    lowStockAlert: 8,
    barcode: '3574660890123',
    supplier: 'Distributeur C'
  },
];

interface Product {
  id: number;
  name: string;
  category: string;
  price: number;
  stock: number;
  lowStockAlert: number;
  barcode: string;
  supplier: string;
}

const ShopProducts: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  const [filterStock, setFilterStock] = useState('all');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isStockUpdateOpen, setIsStockUpdateOpen] = useState(false);
  const [stockToAdd, setStockToAdd] = useState(0);
  const [products, setProducts] = useState(mockProducts);

  // Filtrer les produits
  const filteredProducts = products.filter(product => {
    const matchesSearch = 
      product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.barcode.includes(searchTerm) ||
      product.category.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesCategory = filterCategory === 'all' || product.category === filterCategory;
    
    const matchesStock = 
      filterStock === 'all' ||
      (filterStock === 'low' && product.stock <= product.lowStockAlert) ||
      (filterStock === 'normal' && product.stock > product.lowStockAlert);
    
    return matchesSearch && matchesCategory && matchesStock;
  });

  // Obtenir les catégories uniques
  const categories = Array.from(new Set(products.map(p => p.category)));

  // Compter les produits en stock faible
  const lowStockCount = products.filter(p => p.stock <= p.lowStockAlert).length;

  const handleViewDetails = (product: Product) => {
    setSelectedProduct(product);
    setIsDetailOpen(true);
  };

  const handleUpdateStock = (product: Product) => {
    setSelectedProduct(product);
    setStockToAdd(0);
    setIsStockUpdateOpen(true);
  };

  const handleConfirmStockUpdate = () => {
    if (!selectedProduct) return;
    
    if (stockToAdd === 0) {
      toast.error('Veuillez entrer une quantité');
      return;
    }

    setProducts(products.map(p => 
      p.id === selectedProduct.id 
        ? { ...p, stock: p.stock + stockToAdd }
        : p
    ));

    toast.success(`Stock mis à jour : +${stockToAdd} ${selectedProduct.name}`);
    setIsStockUpdateOpen(false);
    setStockToAdd(0);
  };

  const getStockStatus = (product: Product) => {
    if (product.stock === 0) {
      return { label: 'Rupture', color: 'bg-red-100 text-red-700' };
    } else if (product.stock <= product.lowStockAlert) {
      return { label: 'Stock faible', color: 'bg-orange-100 text-orange-700' };
    } else {
      return { label: 'En stock', color: 'bg-green-100 text-green-700' };
    }
  };

  return (
    <div className="space-y-6 pb-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Produits</h1>
        <p className="text-sm text-gray-500 mt-1">
          Gestion du stock de la boutique
        </p>
      </div>

      {/* Alertes stock faible */}
      {lowStockCount > 0 && (
        <Card className="border-l-4 border-l-orange-500 shadow-md bg-orange-50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-orange-100 rounded-lg">
                <TrendingDown className="h-5 w-5 text-orange-600" />
              </div>
              <div>
                <p className="font-semibold text-orange-900">
                  {lowStockCount} produit{lowStockCount > 1 ? 's' : ''} en stock faible
                </p>
                <p className="text-sm text-orange-700">
                  Pensez à réapprovisionner ces produits
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filtres */}
      <div className="space-y-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Rechercher par nom, catégorie, code-barres..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>

        <div className="flex gap-3">
          <Select value={filterCategory} onValueChange={setFilterCategory}>
            <SelectTrigger className="flex-1">
              <SelectValue placeholder="Catégorie" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Toutes catégories</SelectItem>
              {categories.map((cat) => (
                <SelectItem key={cat} value={cat}>{cat}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={filterStock} onValueChange={setFilterStock}>
            <SelectTrigger className="flex-1">
              <SelectValue placeholder="Stock" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous</SelectItem>
              <SelectItem value="low">Stock faible</SelectItem>
              <SelectItem value="normal">Stock normal</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Liste des produits */}
      <div className="space-y-3">
        {filteredProducts.map((product) => {
          const status = getStockStatus(product);
          return (
            <Card
              key={product.id}
              className="border-none shadow-md hover:shadow-lg transition-shadow"
            >
              <CardContent className="p-4">
                <div className="flex items-start gap-4">
                  <div className="p-3 bg-gray-100 rounded-xl">
                    <Package className="h-6 w-6 text-gray-600" />
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <h3 className="font-bold text-gray-900">{product.name}</h3>
                        <p className="text-sm text-gray-600">{product.category}</p>
                      </div>
                      <Badge className={status.color}>
                        {status.label}
                      </Badge>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-sm mb-3">
                      <div>
                        <p className="text-gray-500">Prix</p>
                        <p className="font-semibold text-[#66d9a1]">
                          {product.price.toLocaleString()} F
                        </p>
                      </div>
                      <div>
                        <p className="text-gray-500">Stock</p>
                        <p className="font-semibold text-gray-900">
                          {product.stock} unités
                        </p>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1"
                        onClick={() => handleViewDetails(product)}
                      >
                        Détails
                      </Button>
                      <Button
                        size="sm"
                        className="flex-1 bg-[#66d9a1] hover:bg-[#52c48a] text-black"
                        onClick={() => handleUpdateStock(product)}
                      >
                        <Plus className="h-4 w-4 mr-1" />
                        Ajouter stock
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {filteredProducts.length === 0 && (
        <Card className="border-none shadow-md">
          <CardContent className="p-12 text-center">
            <Package className="h-12 w-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">Aucun produit trouvé</p>
          </CardContent>
        </Card>
      )}

      {/* Dialog Détails du produit */}
      <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Détails du produit</DialogTitle>
          </DialogHeader>
          {selectedProduct && (
            <div className="space-y-4 py-4">
              <div className="flex items-center gap-4">
                <div className="p-4 bg-gray-100 rounded-xl">
                  <Package className="h-8 w-8 text-gray-600" />
                </div>
                <div>
                  <h3 className="font-bold text-lg">{selectedProduct.name}</h3>
                  <Badge className={getStockStatus(selectedProduct).color}>
                    {getStockStatus(selectedProduct).label}
                  </Badge>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <p className="text-sm text-gray-500">Catégorie</p>
                  <p className="font-medium">{selectedProduct.category}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-gray-500">Prix</p>
                  <p className="font-medium text-[#66d9a1]">
                    {selectedProduct.price.toLocaleString()} F
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-gray-500">Stock actuel</p>
                  <p className="font-medium">{selectedProduct.stock} unités</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-gray-500">Alerte stock</p>
                  <p className="font-medium">{selectedProduct.lowStockAlert} unités</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-gray-500">Code-barres</p>
                  <p className="font-medium font-mono text-sm">{selectedProduct.barcode}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-gray-500">Fournisseur</p>
                  <p className="font-medium">{selectedProduct.supplier}</p>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDetailOpen(false)}>
              Fermer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog Mise à jour du stock */}
      <Dialog open={isStockUpdateOpen} onOpenChange={setIsStockUpdateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Ajouter au stock</DialogTitle>
          </DialogHeader>
          {selectedProduct && (
            <div className="space-y-4 py-4">
              <div>
                <p className="font-medium text-gray-900">{selectedProduct.name}</p>
                <p className="text-sm text-gray-500">
                  Stock actuel : {selectedProduct.stock} unités
                </p>
              </div>

              <div className="space-y-2">
                <Label>Quantité à ajouter</Label>
                <div className="flex items-center gap-3">
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setStockToAdd(Math.max(0, stockToAdd - 1))}
                  >
                    <Minus className="h-4 w-4" />
                  </Button>
                  <Input
                    type="number"
                    value={stockToAdd}
                    onChange={(e) => setStockToAdd(Math.max(0, parseInt(e.target.value) || 0))}
                    className="text-center text-lg font-semibold"
                  />
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setStockToAdd(stockToAdd + 1)}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {stockToAdd > 0 && (
                <div className="p-3 bg-green-50 rounded-lg">
                  <p className="text-sm text-gray-600">Nouveau stock</p>
                  <p className="text-xl font-bold text-green-700">
                    {selectedProduct.stock + stockToAdd} unités
                  </p>
                </div>
              )}
            </div>
          )}
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setIsStockUpdateOpen(false)}
            >
              Annuler
            </Button>
            <Button
              onClick={handleConfirmStockUpdate}
              className="bg-[#66d9a1] hover:bg-[#52c48a] text-black font-semibold"
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
