import React, { useState, useEffect } from 'react';
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
import { toast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import ShopService, { Stock } from '@/services/shop';
import ClientService from '@/services/client';
import AuthService from '@/services/auth';

interface SaleItem {
  productId: number;
  productName: string;
  quantity: number;
  price: number;
  image: string;
  stock: number;
}

interface Client {
  id: number;
  nom: string;
  prenom: string;
  telephone: string | null;
}

interface NewSaleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaleCreated?: () => void;
}

export const NewSaleDialog: React.FC<NewSaleDialogProps> = ({
  open,
  onOpenChange,
  onSaleCreated,
}) => {
  const [isAnonymous, setIsAnonymous] = useState(true);
  const [clientSearch, setClientSearch] = useState('');
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [showClientResults, setShowClientResults] = useState(false);
  const [cart, setCart] = useState<SaleItem[]>([]);
  const [productSearch, setProductSearch] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'Espece' | 'MobileMoney' | 'Autre'>('Espece');
  const [products, setProducts] = useState<Stock[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const siteLavageId = AuthService.getCurrentSiteLavageId();
  const currentUser = AuthService.getUser();
  const currentUserId = currentUser?.id;

  // Charger les produits au montage
  useEffect(() => {
    if (open && siteLavageId) {
      loadProducts();
    }
  }, [open, siteLavageId]);

  // Charger les produits avec leur stock
  const loadProducts = async () => {
    if (!siteLavageId) return;
    
    try {
      setLoading(true);
      const stock = await ShopService.getSiteStock(siteLavageId);
      setProducts(stock);
    } catch (error) {
      console.error('Erreur lors du chargement des produits:', error);
      toast({
        title: "Erreur",
        description: "Erreur lors du chargement des produits",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  // Rechercher les clients
  const searchClients = async (query: string) => {
    if (!query || query.length < 2) {
      setClients([]);
      return;
    }

    try {
      const results = await ClientService.searchClients(query);
      setClients(results);
    } catch (error) {
      console.error('Erreur lors de la recherche de clients:', error);
      setClients([]);
    }
  };

  // Recherche de clients avec debounce
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (!isAnonymous && clientSearch) {
        searchClients(clientSearch);
      }
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [clientSearch, isAnonymous]);

  // Recherche de produits
  const filteredProducts = products.filter(stock =>
    stock.produit.nom.toLowerCase().includes(productSearch.toLowerCase()) ||
    stock.produit.categorie?.nom.toLowerCase().includes(productSearch.toLowerCase())
  );

  // Ajouter un produit au panier
  const handleAddToCart = (stockItem: Stock) => {
    if (stockItem.quantiteDisponible === 0) {
      toast({
        title: "Stock insuffisant",
        description: "Produit en rupture de stock",
        variant: "destructive"
      });
      return;
    }

    const existingItem = cart.find(item => item.productId === stockItem.produitId);
    
    if (existingItem) {
      if (existingItem.quantity >= stockItem.quantiteDisponible) {
        toast({
          title: "Stock insuffisant",
          description: "Impossible d'ajouter plus d'unités",
          variant: "destructive"
        });
        return;
      }
      setCart(cart.map(item =>
        item.productId === stockItem.produitId
          ? { ...item, quantity: item.quantity + 1 }
          : item
      ));
    } else {
      setCart([...cart, {
        productId: stockItem.produitId,
        productName: stockItem.produit.nom,
        quantity: 1,
        price: stockItem.prixVente,
        image: stockItem.produit.image || '📦',
        stock: stockItem.quantiteDisponible,
      }]);
    }
  };

  // Mettre à jour la quantité
  const handleUpdateQuantity = (productId: number, delta: number) => {
    const cartItem = cart.find(item => item.productId === productId);
    if (!cartItem) return;

    setCart(cart.map(item => {
      if (item.productId === productId) {
        const newQuantity = item.quantity + delta;
        if (newQuantity < 1) return item;
        if (newQuantity > item.stock) {
          toast({
            title: "Stock insuffisant",
            description: "Quantité demandée non disponible",
            variant: "destructive"
          });
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
  const handleSubmit = async () => {
    if (cart.length === 0) {
      toast({
        title: "Panier vide",
        description: "Ajoutez au moins un produit",
        variant: "destructive"
      });
      return;
    }

    if (!isAnonymous && !selectedClient) {
      toast({
        title: "Client requis",
        description: "Veuillez sélectionner un client",
        variant: "destructive"
      });
      return;
    }

    if (!siteLavageId || !currentUserId) {
      toast({
        title: "Erreur",
        description: "Informations manquantes",
        variant: "destructive"
      });
      return;
    }

    try {
      setSubmitting(true);

      // Préparer les lignes de vente
      const lignes = cart.map(item => ({
        produitId: item.productId,
        quantite: item.quantity,
        prixUnitaire: item.price,
      }));

      // Créer la vente
      await ShopService.createSale({
        siteLavageId,
        clientUserId: isAnonymous ? null : selectedClient?.id,
        modePaiement: paymentMethod,
        lignes,
      });

      const clientName = isAnonymous ? 'Client anonyme' : `${selectedClient?.prenom} ${selectedClient?.nom}`;
      toast({
        title: "Succès",
        description: `Vente enregistrée pour ${clientName} !`,
        variant: "success"
      });
      
      // Rafraîchir les données
      if (onSaleCreated) {
        onSaleCreated();
      }
      
      // Réinitialisation
      handleClose();
    } catch (error: any) {
      console.error('Erreur lors de l\'enregistrement de la vente:', error);
      toast({
        title: "Erreur",
        description: error.response?.data?.message || "Erreur lors de l'enregistrement de la vente",
        variant: "destructive"
      });
    } finally {
      setSubmitting(false);
    }
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
      <DialogContent className="max-w-4xl h-screen max-h-screen p-0 gap-0 flex flex-col">
        <DialogHeader className="px-6 pt-4 pb-3 border-b flex-shrink-0">
          <DialogTitle className="text-2xl font-bold flex items-center gap-2">
            <ShoppingCart className="h-6 w-6 text-[#66d9a1]" />
            Nouvelle vente
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-col md:flex-row flex-1 overflow-hidden">
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
            <div className="flex-1 overflow-y-auto p-2 md:p-4">
              {loading ? (
                <div className="flex items-center justify-center h-full text-gray-400">
                  <p>Chargement des produits...</p>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-3 gap-2 md:gap-3">
                    {filteredProducts.map((stockItem) => {
                      const inCart = isInCart(stockItem.produitId);
                      const quantity = getCartQuantity(stockItem.produitId);
                      const product = stockItem.produit;
                      
                      return (
                        <button
                          key={stockItem.produitId}
                          onClick={() => handleAddToCart(stockItem)}
                          disabled={stockItem.quantiteDisponible === 0}
                          className={cn(
                            "relative p-2 md:p-3 rounded-lg md:rounded-xl border-2 transition-all text-left",
                            "hover:shadow-md active:scale-98",
                            inCart 
                              ? "border-[#66d9a1] bg-[#66d9a1]/10" 
                              : "border-gray-200 hover:border-[#66d9a1]/50",
                            stockItem.quantiteDisponible === 0 && "opacity-50 cursor-not-allowed"
                          )}
                        >
                          {inCart && (
                            <Badge className="absolute -top-1 -right-1 md:-top-2 md:-right-2 bg-[#66d9a1] text-black font-bold text-xs h-5 w-5 md:h-6 md:w-6 flex items-center justify-center p-0">
                              {quantity}
                            </Badge>
                          )}
                          
                          {product.image && product.image.startsWith('http') ? (
                            <div className="w-full h-12 md:h-16 flex items-center justify-center mb-1 md:mb-2">
                              <img 
                                src={product.image} 
                                alt={product.nom} 
                                className="max-w-full max-h-full object-contain"
                                onError={(e) => {
                                  e.currentTarget.style.display = 'none';
                                  e.currentTarget.parentElement!.innerHTML = '📦';
                                  e.currentTarget.parentElement!.className = 'text-3xl md:text-4xl mb-1 md:mb-2';
                                }}
                              />
                            </div>
                          ) : (
                            <div className="text-3xl md:text-4xl mb-1 md:mb-2">{product.image || '📦'}</div>
                          )}
                          <p className="font-semibold text-sm md:text-sm mb-0.5 md:mb-1 line-clamp-2">{product.nom}</p>
                          <div className="flex items-center justify-between">
                            <p className="text-base md:text-lg font-bold text-[#66d9a1]">
                              {stockItem.prixVente.toLocaleString()} F
                            </p>
                            {stockItem.quantiteDisponible === 0 ? (
                              <p className="text-xs md:text-xs text-red-600 font-medium">Rupture</p>
                            ) : (
                              <p className="text-xs md:text-xs text-gray-500">Stock: {stockItem.quantiteDisponible}</p>
                            )}
                          </div>
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
                </>
              )}
            </div>
          </div>

          {/* Section droite - Panier */}
          <div className="w-full md:w-96 flex flex-col bg-gray-50 h-1/2 md:h-full border-t md:border-t-0">
            {/* Panier avec client et mode de paiement */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {/* Client */}
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
                            <p className="font-semibold text-sm">{selectedClient.prenom} {selectedClient.nom}</p>
                            <p className="text-xs text-gray-600">{selectedClient.telephone}</p>
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
                            {clients.length > 0 ? (
                              clients.map((client) => (
                                <button
                                  key={client.id}
                                  onClick={() => handleSelectClient(client)}
                                  className="w-full p-3 hover:bg-gray-50 text-left border-b last:border-b-0 transition-colors"
                                >
                                  <p className="font-medium text-sm">{client.prenom} {client.nom}</p>
                                  <p className="text-xs text-gray-500">{client.telephone}</p>
                                </button>
                              ))
                            ) : (
                              <div className="p-4 text-center text-sm text-gray-500">
                                {clientSearch.length < 2 ? 'Tapez au moins 2 caractères' : 'Aucun client trouvé'}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Articles du panier */}
              <div className="space-y-2">
              {cart.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-gray-400">
                  <ShoppingCart className="h-12 w-12 mb-2" />
                  <p className="text-sm">Panier vide</p>
                </div>
              ) : (
                cart.map((item) => (
                  <div key={item.productId} className="bg-white rounded-lg p-2 border">
                    <div className="flex items-start gap-2">
                      {item.image && item.image.startsWith('http') ? (
                        <div className="w-10 h-10 flex items-center justify-center flex-shrink-0">
                          <img 
                            src={item.image} 
                            alt={item.productName} 
                            className="max-w-full max-h-full object-contain"
                            onError={(e) => {
                              e.currentTarget.style.display = 'none';
                              e.currentTarget.parentElement!.innerHTML = '📦';
                              e.currentTarget.parentElement!.className = 'text-xl';
                            }}
                          />
                        </div>
                      ) : (
                        <div className="text-xl">{item.image}</div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-xs line-clamp-1">{item.productName}</p>
                        <p className="text-xs text-[#66d9a1] font-bold">
                          {item.price.toLocaleString()} F
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-red-600 hover:text-red-700 hover:bg-red-50"
                        onClick={() => handleRemoveFromCart(item.productId)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                    
                    <div className="flex items-center justify-between mt-2">
                      <div className="flex items-center gap-1.5">
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => handleUpdateQuantity(item.productId, -1)}
                        >
                          <Minus className="h-3 w-3" />
                        </Button>
                        <span className="w-7 text-center font-bold text-sm">{item.quantity}</span>
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => handleUpdateQuantity(item.productId, 1)}
                        >
                          <Plus className="h-3 w-3" />
                        </Button>
                      </div>
                      <p className="font-bold text-gray-900 text-sm">
                        {(item.price * item.quantity).toLocaleString()} F
                      </p>
                    </div>
                  </div>
                ))
              )}
              </div>

              {/* Moyen de paiement */}
              {cart.length > 0 && (
                <div className="space-y-2">
                  <Label className="text-sm font-semibold">Moyen de paiement</Label>
                  <Select value={paymentMethod} onValueChange={(value: 'Espece' | 'MobileMoney' | 'Autre') => setPaymentMethod(value)}>
                    <SelectTrigger className="w-full bg-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Espece">💵 Espèce</SelectItem>
                      <SelectItem value="MobileMoney">📱 Mobile Money</SelectItem>
                      <SelectItem value="Autre">💳 Autre</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>

            {/* Total et validation */}
            <div className="p-4 border-t bg-white space-y-3">

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
                  disabled={cart.length === 0 || submitting}
                  className="flex-1 bg-[#66d9a1] hover:bg-[#52c48a] text-black font-bold"
                >
                  {submitting ? 'Enregistrement...' : 'Valider la vente'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
