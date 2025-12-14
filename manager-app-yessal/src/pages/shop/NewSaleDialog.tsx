import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Plus, Minus, Trash2, Search, User, X, ShoppingCart } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

// Données mock des produits avec images
const mockProducts = [
  { id: 1, name: 'Savon Dove', price: 1500, stock: 25, image: '🧼', category: 'Hygiène' },
  { id: 2, name: 'Shampoing Pantene', price: 3500, stock: 15, image: '🧴', category: 'Soins' },
  { id: 3, name: 'Dentifrice Colgate', price: 2000, stock: 30, image: '🦷', category: 'Hygiène' },
  { id: 4, name: 'Parfum homme', price: 8000, stock: 10, image: '🌟', category: 'Parfums' },
  { id: 5, name: 'Lotion corps', price: 4500, stock: 20, image: '🧴', category: 'Soins' },
  { id: 6, name: 'Déodorant', price: 2500, stock: 18, image: '💨', category: 'Hygiène' },
  { id: 7, name: 'Gel douche', price: 3000, stock: 22, image: '🚿', category: 'Hygiène' },
  { id: 8, name: 'Crème visage', price: 6000, stock: 12, image: '✨', category: 'Soins' },
];

// Données mock des clients
const mockClients = [
  { id: 1, name: 'Marie Diop', phone: '77 123 45 67' },
  { id: 2, name: 'Ousmane Ndiaye', phone: '78 234 56 78' },
  { id: 3, name: 'Awa Sarr', phone: '76 345 67 89' },
  { id: 4, name: 'Moussa Fall', phone: '70 456 78 90' },
  { id: 5, name: 'Fatou Sall', phone: '77 987 65 43' },
  { id: 6, name: 'Amadou Ba', phone: '78 876 54 32' },
];

interface SaleItem {
  productId: number;
  productName: string;
  quantity: number;
  price: number;
  image: string;
}

interface Client {
  id: number;
  name: string;
  phone: string;
}

interface NewSaleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const NewSaleDialog: React.FC<NewSaleDialogProps> = ({
  open,
  onOpenChange,
}) => {
  const [isAnonymous, setIsAnonymous] = useState(true);
  const [clientSearch, setClientSearch] = useState('');
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [showClientResults, setShowClientResults] = useState(false);
  const [cart, setCart] = useState<SaleItem[]>([]);
  const [productSearch, setProductSearch] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'Espece' | 'MobileMoney' | 'Autre'>('Espece');

  // Recherche de clients
  const filteredClients = mockClients.filter(client => 
    client.name.toLowerCase().includes(clientSearch.toLowerCase()) ||
    client.phone.includes(clientSearch)
  );

  // Recherche de produits
  const filteredProducts = mockProducts.filter(product =>
    product.name.toLowerCase().includes(productSearch.toLowerCase()) ||
    product.category.toLowerCase().includes(productSearch.toLowerCase())
  );

  // Ajouter un produit au panier
  const handleAddToCart = (product: typeof mockProducts[0]) => {
    if (product.stock === 0) {
      toast.error('Produit en rupture de stock');
      return;
    }

    const existingItem = cart.find(item => item.productId === product.id);
    
    if (existingItem) {
      if (existingItem.quantity >= product.stock) {
        toast.error('Stock insuffisant');
        return;
      }
      setCart(cart.map(item =>
        item.productId === product.id
          ? { ...item, quantity: item.quantity + 1 }
          : item
      ));
    } else {
      setCart([...cart, {
        productId: product.id,
        productName: product.name,
        quantity: 1,
        price: product.price,
        image: product.image,
      }]);
    }
  };

  // Mettre à jour la quantité
  const handleUpdateQuantity = (productId: number, delta: number) => {
    const product = mockProducts.find(p => p.id === productId);
    if (!product) return;

    setCart(cart.map(item => {
      if (item.productId === productId) {
        const newQuantity = item.quantity + delta;
        if (newQuantity < 1) return item;
        if (newQuantity > product.stock) {
          toast.error('Stock insuffisant');
          return item;
        }
        return { ...item, quantity: newQuantity };
      }
      return item;
    }));
  };

  // Retirer un produit du panier
  const handleRemoveFromCart = (productId: number) => {
    setCart(cart.filter(item => item.productId !== productId));
  };

  // Calculer le total
  const getTotalAmount = () => {
    return cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  };

  // Vérifier si un produit est dans le panier
  const isInCart = (productId: number) => {
    return cart.some(item => item.productId === productId);
  };

  // Obtenir la quantité d'un produit dans le panier
  const getCartQuantity = (productId: number) => {
    const item = cart.find(item => item.productId === productId);
    return item ? item.quantity : 0;
  };

  // Sélectionner un client
  const handleSelectClient = (client: Client) => {
    setSelectedClient(client);
    setShowClientResults(false);
    setClientSearch('');
  };

  // Enregistrer la vente
  const handleSubmit = () => {
    if (cart.length === 0) {
      toast.error('Ajoutez au moins un produit');
      return;
    }

    if (!isAnonymous && !selectedClient) {
      toast.error('Veuillez sélectionner un client');
      return;
    }

    // Simulation d'enregistrement
    const clientName = isAnonymous ? 'Client anonyme' : selectedClient?.name;
    toast.success(`Vente enregistrée pour ${clientName} !`);
    
    // Réinitialisation
    handleClose();
  };

  // Fermer et réinitialiser
  const handleClose = () => {
    setCart([]);
    setIsAnonymous(true);
    setSelectedClient(null);
    setClientSearch('');
    setProductSearch('');
    setShowClientResults(false);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[95vh] p-0 gap-0">
        <DialogHeader className="px-6 pt-6 pb-4 border-b">
          <DialogTitle className="text-2xl font-bold flex items-center gap-2">
            <ShoppingCart className="h-6 w-6 text-[#66d9a1]" />
            Nouvelle vente
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-col md:flex-row h-[calc(95vh-8rem)] max-h-[calc(95vh-8rem)] overflow-hidden">
          {/* Section gauche - Produits */}
          <div className="flex-1 flex flex-col overflow-hidden md:border-r h-1/2 md:h-full">
            {/* Barre de recherche produits */}
            <div className="p-4 border-b bg-gray-50">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Rechercher un produit..."
                  value={productSearch}
                  onChange={(e) => setProductSearch(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            {/* Grille de produits */}
            <div className="flex-1 overflow-y-auto p-4">
              <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
                {filteredProducts.map((product) => {
                  const inCart = isInCart(product.id);
                  const quantity = getCartQuantity(product.id);
                  
                  return (
                    <button
                      key={product.id}
                      onClick={() => handleAddToCart(product)}
                      disabled={product.stock === 0}
                      className={cn(
                        "relative p-3 rounded-xl border-2 transition-all text-left",
                        "hover:shadow-md active:scale-98",
                        inCart 
                          ? "border-[#66d9a1] bg-[#66d9a1]/10" 
                          : "border-gray-200 hover:border-[#66d9a1]/50",
                        product.stock === 0 && "opacity-50 cursor-not-allowed"
                      )}
                    >
                      {inCart && (
                        <Badge className="absolute -top-2 -right-2 bg-[#66d9a1] text-black font-bold">
                          {quantity}
                        </Badge>
                      )}
                      
                      <div className="text-4xl mb-2">{product.image}</div>
                      <p className="font-semibold text-sm mb-1 line-clamp-2">{product.name}</p>
                      <p className="text-lg font-bold text-[#66d9a1]">
                        {product.price.toLocaleString()} F
                      </p>
                      {product.stock === 0 ? (
                        <p className="text-xs text-red-600 font-medium mt-1">Rupture</p>
                      ) : (
                        <p className="text-xs text-gray-500 mt-1">Stock: {product.stock}</p>
                      )}
                    </button>
                  );
                })}
              </div>
              
              {filteredProducts.length === 0 && (
                <div className="flex flex-col items-center justify-center h-full text-gray-400">
                  <Search className="h-12 w-12 mb-2" />
                  <p>Aucun produit trouvé</p>
                </div>
              )}
            </div>
          </div>

          {/* Section droite - Panier */}
          <div className="w-full md:w-96 flex flex-col bg-gray-50 h-1/2 md:h-full border-t md:border-t-0">
            {/* Client */}
            <div className="p-4 border-b bg-white">
              <div className="space-y-3">
                <div className="flex gap-2">
                  <Button
                    variant={isAnonymous ? "default" : "outline"}
                    size="sm"
                    onClick={() => {
                      setIsAnonymous(true);
                      setSelectedClient(null);
                      setClientSearch('');
                      setShowClientResults(false);
                    }}
                    className={cn(
                      "flex-1",
                      isAnonymous && "bg-[#66d9a1] hover:bg-[#52c48a] text-black"
                    )}
                  >
                    Anonyme
                  </Button>
                  <Button
                    variant={!isAnonymous ? "default" : "outline"}
                    size="sm"
                    onClick={() => setIsAnonymous(false)}
                    className={cn(
                      "flex-1",
                      !isAnonymous && "bg-[#66d9a1] hover:bg-[#52c48a] text-black"
                    )}
                  >
                    Client enregistré
                  </Button>
                </div>

                {!isAnonymous && (
                  <div className="space-y-2">
                    {selectedClient ? (
                      <div className="flex items-center justify-between p-3 bg-[#66d9a1]/10 rounded-lg border-2 border-[#66d9a1]">
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-[#66d9a1]" />
                          <div>
                            <p className="font-semibold text-sm">{selectedClient.name}</p>
                            <p className="text-xs text-gray-600">{selectedClient.phone}</p>
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => setSelectedClient(null)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ) : (
                      <div className="relative">
                        <div className="relative">
                          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                          <Input
                            placeholder="Nom ou téléphone..."
                            value={clientSearch}
                            onChange={(e) => {
                              setClientSearch(e.target.value);
                              setShowClientResults(true);
                            }}
                            onFocus={() => setShowClientResults(true)}
                            className="pl-10"
                          />
                        </div>
                        
                        {showClientResults && clientSearch && (
                          <div className="absolute z-10 w-full mt-1 bg-white border rounded-lg shadow-lg max-h-48 overflow-y-auto">
                            {filteredClients.length > 0 ? (
                              filteredClients.map((client) => (
                                <button
                                  key={client.id}
                                  onClick={() => handleSelectClient(client)}
                                  className="w-full p-3 hover:bg-gray-50 text-left border-b last:border-b-0 transition-colors"
                                >
                                  <p className="font-medium text-sm">{client.name}</p>
                                  <p className="text-xs text-gray-500">{client.phone}</p>
                                </button>
                              ))
                            ) : (
                              <div className="p-4 text-center text-sm text-gray-500">
                                Aucun client trouvé
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Panier */}
            <div className="flex-1 overflow-y-auto p-4 space-y-2">
              {cart.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-gray-400">
                  <ShoppingCart className="h-12 w-12 mb-2" />
                  <p className="text-sm">Panier vide</p>
                </div>
              ) : (
                cart.map((item) => (
                  <div key={item.productId} className="bg-white rounded-lg p-3 border">
                    <div className="flex items-start gap-3">
                      <div className="text-2xl">{item.image}</div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm line-clamp-1">{item.productName}</p>
                        <p className="text-sm text-[#66d9a1] font-bold">
                          {item.price.toLocaleString()} F
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50"
                        onClick={() => handleRemoveFromCart(item.productId)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                    
                    <div className="flex items-center justify-between mt-3">
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => handleUpdateQuantity(item.productId, -1)}
                        >
                          <Minus className="h-3 w-3" />
                        </Button>
                        <span className="w-8 text-center font-bold">{item.quantity}</span>
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => handleUpdateQuantity(item.productId, 1)}
                        >
                          <Plus className="h-3 w-3" />
                        </Button>
                      </div>
                      <p className="font-bold text-gray-900">
                        {(item.price * item.quantity).toLocaleString()} F
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Total et validation */}
            <div className="p-4 border-t bg-white space-y-3">
              {/* Moyen de paiement */}
              <div className="space-y-2">
                <Label className="text-sm font-semibold">Moyen de paiement</Label>
                <Select value={paymentMethod} onValueChange={(value: 'Espece' | 'MobileMoney' | 'Autre') => setPaymentMethod(value)}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Espece">💵 Espèce</SelectItem>
                    <SelectItem value="MobileMoney">📱 Mobile Money</SelectItem>
                    <SelectItem value="Autre">💳 Autre</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center justify-between py-3">
                <span className="text-lg font-semibold text-gray-900">Total</span>
                <span className="text-3xl font-bold text-[#66d9a1]">
                  {getTotalAmount().toLocaleString()} F
                </span>
              </div>
              
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={handleClose}
                  className="flex-1"
                >
                  Annuler
                </Button>
                <Button
                  onClick={handleSubmit}
                  disabled={cart.length === 0}
                  className="flex-1 bg-[#66d9a1] hover:bg-[#52c48a] text-black font-bold"
                >
                  Valider la vente
                </Button>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
