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
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Plus, Minus, Trash2, Search, User, X, ShoppingCart, ChevronRight, ChevronLeft } from 'lucide-react';
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
  typeVente: 'Detail' | 'Gros';
  packVenteGrosId?: number | null;
  packNom?: string;
  quantiteUnites?: number;
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
  // État de l'étape courante (1: Client, 2: Produits, 3: Panier)
  const [currentStep, setCurrentStep] = useState(1);
  
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

  // États pour l'ajustement de prix
  const [enableAdjustment, setEnableAdjustment] = useState(false);
  const [adjustmentType, setAdjustmentType] = useState<'Augmentation' | 'Diminution'>('Diminution');
  const [adjustmentMethod, setAdjustmentMethod] = useState<'Pourcentage' | 'Absolu'>('Absolu');
  const [adjustmentValue, setAdjustmentValue] = useState(0);
  const [adjustmentReason, setAdjustmentReason] = useState('');

  const siteLavageId = AuthService.getCurrentSiteLavageId();
  const currentUser = AuthService.getUser();
  const currentUserId = currentUser?.id;

  // Charger les produits au montage
  useEffect(() => {
    if (open && siteLavageId) {
      loadProducts();
    }
  }, [open, siteLavageId]);

  // Charger les produits avec leur stock et packs de vente en gros
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

  // Ajouter un produit au panier (vente au détail)
  const handleAddToCart = (stockItem: Stock) => {
    if (stockItem.quantiteDisponible === 0) {
      toast({
        title: "Stock insuffisant",
        description: "Produit en rupture de stock",
        variant: "destructive"
      });
      return;
    }

    const existingItem = cart.find(item => 
      item.productId === stockItem.produitId && item.typeVente === 'Detail'
    );
    
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
        item.productId === stockItem.produitId && item.typeVente === 'Detail'
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
        typeVente: 'Detail',
        packVenteGrosId: null,
      }]);
    }
  };

  // Ajouter un pack de vente en gros au panier
  const handleAddPackToCart = (stockItem: Stock, pack: any) => {
    if (stockItem.quantiteDisponible < pack.quantiteUnites) {
      toast({
        title: "Stock insuffisant",
        description: `Stock insuffisant pour ce pack (${pack.quantiteUnites} unités requises)`,
        variant: "destructive"
      });
      return;
    }

    const existingItem = cart.find(item => 
      item.productId === stockItem.produitId && 
      item.typeVente === 'Gros' && 
      item.packVenteGrosId === pack.id
    );
    
    if (existingItem) {
      const totalUnitsNeeded = (existingItem.quantity + 1) * pack.quantiteUnites;
      if (totalUnitsNeeded > stockItem.quantiteDisponible) {
        toast({
          title: "Stock insuffisant",
          description: `Stock insuffisant pour ${existingItem.quantity + 1} packs`,
          variant: "destructive"
        });
        return;
      }
      setCart(cart.map(item =>
        item.productId === stockItem.produitId && 
        item.typeVente === 'Gros' && 
        item.packVenteGrosId === pack.id
          ? { ...item, quantity: item.quantity + 1 }
          : item
      ));
    } else {
      setCart([...cart, {
        productId: stockItem.produitId,
        productName: stockItem.produit.nom,
        quantity: 1,
        price: pack.prixPack,
        image: stockItem.produit.image || '📦',
        stock: Math.floor(stockItem.quantiteDisponible / pack.quantiteUnites),
        typeVente: 'Gros',
        packVenteGrosId: pack.id,
        packNom: pack.nom,
        quantiteUnites: pack.quantiteUnites,
      }]);
    }
  };

  // Mettre à jour la quantité
  const handleUpdateQuantity = (productId: number, typeVente: 'Detail' | 'Gros', packId: number | null | undefined, delta: number) => {
    const cartItem = cart.find(item => 
      item.productId === productId && 
      item.typeVente === typeVente && 
      item.packVenteGrosId === packId
    );
    if (!cartItem) return;

    setCart(cart.map(item => {
      if (item.productId === productId && item.typeVente === typeVente && item.packVenteGrosId === packId) {
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
  const handleRemoveFromCart = (productId: number, typeVente: 'Detail' | 'Gros', packId: number | null | undefined) => {
    setCart(cart.filter(item => 
      !(item.productId === productId && item.typeVente === typeVente && item.packVenteGrosId === packId)
    ));
  };

  // Calculer le total de base
  const getTotalAmount = () => {
    return cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  };

  // Calculer le montant final avec ajustement
  const getFinalAmount = () => {
    const baseAmount = getTotalAmount();
    if (!enableAdjustment || adjustmentValue <= 0) {
      return baseAmount;
    }

    let adjustmentAmount = 0;
    if (adjustmentMethod === 'Pourcentage') {
      adjustmentAmount = (baseAmount * adjustmentValue) / 100;
    } else {
      adjustmentAmount = adjustmentValue;
    }

    if (adjustmentType === 'Diminution') {
      return Math.max(0, baseAmount - adjustmentAmount);
    } else {
      return baseAmount + adjustmentAmount;
    }
  };

  // Vérifier si un produit est dans le panier
  const isInCart = (productId: number) => {
    return cart.some(item => item.productId === productId);
  };

  // Obtenir la quantité totale d'un produit dans le panier
  const getCartQuantity = (productId: number) => {
    return cart
      .filter(item => item.productId === productId)
      .reduce((total, item) => total + item.quantity, 0);
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

    if (enableAdjustment && !adjustmentReason.trim()) {
      toast({
        title: "Raison requise",
        description: "Veuillez fournir une raison pour l'ajustement de prix",
        variant: "destructive"
      });
      return;
    }

    if (enableAdjustment && adjustmentValue <= 0) {
      toast({
        title: "Valeur invalide",
        description: "La valeur d'ajustement doit être supérieure à 0",
        variant: "destructive"
      });
      return;
    }

    try {
      setSubmitting(true);

      const lignes = cart.map(item => ({
        produitId: item.productId,
        quantite: item.quantity,
        prixUnitaire: item.price,
        typeVente: item.typeVente,
        packVenteGrosId: item.packVenteGrosId,
      }));

      await ShopService.createSale({
        siteLavageId,
        clientUserId: isAnonymous ? null : selectedClient?.id,
        modePaiement: paymentMethod,
        lignes,
        ...(enableAdjustment && {
          ajustementMethode: adjustmentMethod,
          ajustementRaison: adjustmentReason,
          ajustementType: adjustmentType,
          ajustementValeur: adjustmentValue
        })
      });

      const clientName = isAnonymous ? 'Client anonyme' : `${selectedClient?.prenom} ${selectedClient?.nom}`;
      toast({
        title: "Succès",
        description: `Vente enregistrée pour ${clientName} !`,
        variant: "success"
      });
      
      if (onSaleCreated) {
        onSaleCreated();
      }
      
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
    setEnableAdjustment(false);
    setAdjustmentType('Diminution');
    setAdjustmentMethod('Absolu');
    setAdjustmentValue(0);
    setAdjustmentReason('');
    setCurrentStep(1);
    onOpenChange(false);
  };

  // Navigation entre les étapes
  const handleNextStep = () => {
    if (currentStep === 1) {
      if (!isAnonymous && !selectedClient) {
        toast({
          title: "Client requis",
          description: "Veuillez sélectionner un client ou choisir 'Anonyme'",
          variant: "destructive"
        });
        return;
      }
      setCurrentStep(2);
    } else if (currentStep === 2) {
      if (cart.length === 0) {
        toast({
          title: "Panier vide",
          description: "Veuillez ajouter au moins un produit",
          variant: "destructive"
        });
        return;
      }
      setCurrentStep(3);
    }
  };

  const handlePreviousStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  // Obtenir le titre de l'étape courante
  const getStepTitle = () => {
    switch (currentStep) {
      case 1:
        return "Sélection du client";
      case 2:
        return "Choix des produits";
      case 3:
        return "Validation et paiement";
      default:
        return "Nouvelle vente";
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl h-screen max-h-screen p-0 gap-0 flex flex-col">
        <DialogHeader className="px-6 pt-4 pb-3 border-b flex-shrink-0">
          <DialogTitle className="text-2xl font-bold flex items-center gap-2">
            <ShoppingCart className="h-6 w-6 text-[#66d9a1]" />
            {getStepTitle()}
          </DialogTitle>
          
          {/* Indicateur d'étapes */}
          <div className="flex items-center gap-2 mt-3">
            {[1, 2, 3].map((step) => (
              <div key={step} className="flex items-center flex-1">
                <div className={cn(
                  "flex items-center justify-center w-8 h-8 rounded-full font-bold text-sm",
                  currentStep === step ? "bg-[#66d9a1] text-black" :
                  currentStep > step ? "bg-green-500 text-white" :
                  "bg-gray-200 text-gray-500"
                )}>
                  {step}
                </div>
                {step < 3 && (
                  <div className={cn(
                    "flex-1 h-1 mx-2",
                    currentStep > step ? "bg-green-500" : "bg-gray-200"
                  )} />
                )}
              </div>
            ))}
          </div>
        </DialogHeader>

        {/* Contenu de l'étape courante */}
        <div className="flex-1 overflow-hidden">
          {/* ÉTAPE 1: Sélection du client */}
          {currentStep === 1 && (
            <div className="flex flex-col h-full p-6">
              <div className="flex-1 space-y-4">
                <div className="flex flex-col sm:flex-row gap-3">
                  <Button
                    variant={isAnonymous ? "default" : "outline"}
                    size="lg"
                    onClick={() => {
                      setIsAnonymous(true);
                      setSelectedClient(null);
                      setClientSearch('');
                      setShowClientResults(false);
                    }}
                    className={cn(
                      "flex-1 h-20 sm:h-16 text-lg sm:text-base",
                      isAnonymous && "bg-[#66d9a1] hover:bg-[#52c48a] text-black font-bold"
                    )}
                  >
                    <User className="h-7 w-7 sm:h-6 sm:w-6 mr-2" />
                    Client anonyme
                  </Button>
                  <Button
                    variant={!isAnonymous ? "default" : "outline"}
                    size="lg"
                    onClick={() => setIsAnonymous(false)}
                    className={cn(
                      "flex-1 h-20 sm:h-16 text-lg sm:text-base",
                      !isAnonymous && "bg-[#66d9a1] hover:bg-[#52c48a] text-black font-bold"
                    )}
                  >
                    <Search className="h-7 w-7 sm:h-6 sm:w-6 mr-2" />
                    Rechercher un client
                  </Button>
                </div>

                {!isAnonymous && (
                  <div className="space-y-3">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                      <Input
                        placeholder="Nom, prénom ou téléphone..."
                        value={clientSearch}
                        onChange={(e) => {
                          setClientSearch(e.target.value);
                          setShowClientResults(true);
                        }}
                        onFocus={() => setShowClientResults(true)}
                        className="pl-10 h-12"
                      />
                    </div>

                    {selectedClient && (
                      <div className="p-4 bg-[#66d9a1]/10 border border-[#66d9a1] rounded-lg">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-bold text-lg">
                              {selectedClient.prenom} {selectedClient.nom}
                            </p>
                            {selectedClient.telephone && (
                              <p className="text-sm text-gray-600">{selectedClient.telephone}</p>
                            )}
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              setSelectedClient(null);
                              setClientSearch('');
                            }}
                          >
                            <X className="h-5 w-5" />
                          </Button>
                        </div>
                      </div>
                    )}

                    {showClientResults && !selectedClient && clientSearch && clients.length > 0 && (
                      <div className="border rounded-lg bg-white shadow-lg max-h-64 overflow-y-auto">
                        {clients.map((client) => (
                          <button
                            key={client.id}
                            onClick={() => handleSelectClient(client)}
                            className="w-full p-3 hover:bg-gray-50 border-b last:border-b-0 text-left transition"
                          >
                            <p className="font-semibold">
                              {client.prenom} {client.nom}
                            </p>
                            {client.telephone && (
                              <p className="text-sm text-gray-600">{client.telephone}</p>
                            )}
                          </button>
                        ))}
                      </div>
                    )}

                    {showClientResults && !selectedClient && clientSearch && clients.length === 0 && (
                      <div className="p-4 text-center text-gray-500 border rounded-lg">
                        Aucun client trouvé
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Boutons de navigation */}
              <div className="flex gap-3 mt-6 pt-4 border-t">
                <Button
                  variant="outline"
                  onClick={handleClose}
                  className="flex-1"
                >
                  Annuler
                </Button>
                <Button
                  onClick={handleNextStep}
                  className="flex-1 bg-[#66d9a1] hover:bg-[#52c48a] text-black font-bold"
                >
                  Suivant
                  <ChevronRight className="h-5 w-5 ml-2" />
                </Button>
              </div>
            </div>
          )}

          {/* ÉTAPE 2: Choix des produits */}
          {currentStep === 2 && (
            <div className="flex flex-col h-full">
              {/* Barre de recherche */}
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
                {cart.length > 0 && (
                  <div className="mt-3 p-2 bg-[#66d9a1]/10 border border-[#66d9a1] rounded-lg flex items-center justify-between">
                    <span className="text-sm font-medium">
                      {cart.length} produit{cart.length > 1 ? 's' : ''} dans le panier
                    </span>
                    <Badge className="bg-[#66d9a1] text-black">
                      {cart.reduce((sum, item) => sum + item.quantity, 0)} unités
                    </Badge>
                  </div>
                )}
              </div>

              {/* Grille de produits */}
              <div className="flex-1 overflow-y-auto p-4">
                {loading ? (
                  <div className="flex items-center justify-center h-full text-gray-400">
                    <p>Chargement des produits...</p>
                  </div>
                ) : (
                  <>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {filteredProducts.map((stockItem) => {
                        const inCart = isInCart(stockItem.produitId);
                        const quantity = getCartQuantity(stockItem.produitId);
                        const product = stockItem.produit;
                        const packs = product.packsVenteGros?.filter(p => p.actif) || [];
                        
                        return (
                          <div
                            key={stockItem.produitId}
                            className={cn(
                              "relative p-3 rounded-xl border-2 transition-all",
                              inCart 
                                ? "border-[#66d9a1] bg-[#66d9a1]/5" 
                                : "border-gray-200",
                              stockItem.quantiteDisponible === 0 && "opacity-50"
                            )}
                          >
                            {inCart && (
                              <Badge className="absolute -top-2 -right-2 bg-[#66d9a1] text-black font-bold text-xs h-6 w-6 flex items-center justify-center p-0 z-10">
                                {quantity}
                              </Badge>
                            )}
                            
                            <div className="flex gap-3 mb-3">
                              {product.image && (product.image.startsWith('http') || product.image.startsWith('/')) ? (
                                <div className="w-16 h-16 flex items-center justify-center flex-shrink-0">
                                  <img 
                                    src={product.image} 
                                    alt={product.nom} 
                                    className="max-w-full max-h-full object-contain"
                                    onError={(e) => {
                                      e.currentTarget.style.display = 'none';
                                      e.currentTarget.parentElement!.innerHTML = '📦';
                                      e.currentTarget.parentElement!.className = 'text-4xl flex items-center justify-center w-16 h-16';
                                    }}
                                  />
                                </div>
                              ) : (
                                <div className="text-4xl flex items-center justify-center w-16 h-16">{product.image || '📦'}</div>
                              )}
                              <div className="flex-1">
                                <p className="font-semibold text-sm mb-1 line-clamp-2">{product.nom}</p>
                                {stockItem.quantiteDisponible === 0 ? (
                                  <p className="text-xs text-red-600 font-medium">Rupture de stock</p>
                                ) : (
                                  <p className="text-xs text-gray-500">Stock: {stockItem.quantiteDisponible} unités</p>
                                )}
                              </div>
                            </div>

                            <div className="space-y-2">
                              {/* Vente au détail */}
                              <button
                                onClick={() => handleAddToCart(stockItem)}
                                disabled={stockItem.quantiteDisponible === 0}
                                className={cn(
                                  "w-full p-2 rounded-lg border transition-all text-left flex items-center justify-between",
                                  "hover:bg-[#66d9a1]/10 hover:border-[#66d9a1] active:scale-98",
                                  stockItem.quantiteDisponible === 0 && "cursor-not-allowed"
                                )}
                              >
                                <div>
                                  <p className="text-xs text-gray-600 font-medium">Détail (unité)</p>
                                  <p className="text-lg font-bold text-[#66d9a1]">
                                    {stockItem.prixVente.toLocaleString()} F
                                  </p>
                                </div>
                                <Plus className="h-5 w-5 text-[#66d9a1]" />
                              </button>

                              {/* Packs de vente en gros */}
                              {packs.length > 0 && (
                                <div className="space-y-1.5">
                                  <p className="text-xs text-gray-500 font-medium px-1">Vente en gros :</p>
                                  {packs.map((pack) => {
                                    const canAddPack = stockItem.quantiteDisponible >= pack.quantiteUnites;
                                    return (
                                      <button
                                        key={pack.id}
                                        onClick={() => handleAddPackToCart(stockItem, pack)}
                                        disabled={!canAddPack}
                                        className={cn(
                                          "w-full p-2 rounded-lg border transition-all text-left flex items-center justify-between",
                                          "hover:bg-blue-50 hover:border-blue-400 active:scale-98",
                                          !canAddPack && "opacity-50 cursor-not-allowed"
                                        )}
                                      >
                                        <div>
                                          <p className="text-xs text-gray-600 font-medium">
                                            {pack.nom} ({pack.quantiteUnites} unités)
                                          </p>
                                          <p className="text-base font-bold text-blue-600">
                                            {pack.prixPack.toLocaleString()} F
                                          </p>
                                        </div>
                                        <Plus className="h-4 w-4 text-blue-600" />
                                      </button>
                                    );
                                  })}
                                </div>
                              )}
                            </div>
                          </div>
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

              {/* Boutons de navigation */}
              <div className="flex gap-3 p-4 border-t">
                <Button
                  variant="outline"
                  onClick={handlePreviousStep}
                  className="flex-1"
                >
                  <ChevronLeft className="h-5 w-5 mr-2" />
                  Précédent
                </Button>
                <Button
                  onClick={handleNextStep}
                  disabled={cart.length === 0}
                  className="flex-1 bg-[#66d9a1] hover:bg-[#52c48a] text-black font-bold"
                >
                  Suivant ({cart.length})
                  <ChevronRight className="h-5 w-5 ml-2" />
                </Button>
              </div>
            </div>
          )}

          {/* ÉTAPE 3: Panier et validation */}
          {currentStep === 3 && (
            <div className="flex flex-col h-full">
              {/* Panier et informations */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {/* Résumé client */}
                <div className="p-4 bg-gray-50 rounded-lg border">
                  <p className="text-sm text-gray-600 mb-1">Client</p>
                  <p className="font-bold text-lg">
                    {isAnonymous ? '👤 Client anonyme' : `${selectedClient?.prenom} ${selectedClient?.nom}`}
                  </p>
                  {!isAnonymous && selectedClient?.telephone && (
                    <p className="text-sm text-gray-600">{selectedClient.telephone}</p>
                  )}
                </div>

                {/* Articles du panier */}
                <div className="space-y-2">
                  <Label className="text-sm font-semibold">Articles ({cart.length})</Label>
                  {cart.map((item, index) => (
                    <div key={`${item.productId}-${item.typeVente}-${item.packVenteGrosId || 'detail'}-${index}`} className="bg-white rounded-lg p-3 border">
                      <div className="flex items-start gap-2">
                        {item.image && (item.image.startsWith('http') || item.image.startsWith('/')) ? (
                          <div className="w-12 h-12 flex items-center justify-center flex-shrink-0">
                            <img 
                              src={item.image} 
                              alt={item.productName} 
                              className="max-w-full max-h-full object-contain"
                              onError={(e) => {
                                e.currentTarget.style.display = 'none';
                                e.currentTarget.parentElement!.innerHTML = '📦';
                                e.currentTarget.parentElement!.className = 'text-2xl';
                              }}
                            />
                          </div>
                        ) : (
                          <div className="text-2xl">{item.image}</div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-sm line-clamp-1">{item.productName}</p>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <Badge 
                              variant="outline" 
                              className={cn(
                                "text-xs font-medium",
                                item.typeVente === 'Detail' 
                                  ? "border-[#66d9a1] text-[#66d9a1]" 
                                  : "border-blue-500 text-blue-600"
                              )}
                            >
                              {item.typeVente === 'Detail' ? 'Détail' : 'Gros'}
                            </Badge>
                            {item.typeVente === 'Gros' && item.packNom && (
                              <span className="text-xs text-gray-500">• {item.packNom}</span>
                            )}
                          </div>
                          <p className={cn(
                            "text-sm font-bold mt-0.5",
                            item.typeVente === 'Detail' ? 'text-[#66d9a1]' : 'text-blue-600'
                          )}>
                            {item.price.toLocaleString()} F {item.typeVente === 'Gros' && `/ pack`}
                          </p>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50"
                          onClick={() => handleRemoveFromCart(item.productId, item.typeVente, item.packVenteGrosId)}
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
                            onClick={() => handleUpdateQuantity(item.productId, item.typeVente, item.packVenteGrosId, -1)}
                          >
                            <Minus className="h-3 w-3" />
                          </Button>
                          <span className="w-8 text-center font-bold">{item.quantity}</span>
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => handleUpdateQuantity(item.productId, item.typeVente, item.packVenteGrosId, 1)}
                          >
                            <Plus className="h-3 w-3" />
                          </Button>
                        </div>
                        <p className="font-bold text-gray-900">
                          {(item.price * item.quantity).toLocaleString()} F
                        </p>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Moyen de paiement */}
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

                {/* Ajustement de prix */}
                <div className="space-y-3 p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-semibold">Ajustement de prix</Label>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="enable-adjustment-sale"
                        checked={enableAdjustment}
                        onCheckedChange={(checked) => setEnableAdjustment(checked === true)}
                      />
                      <Label htmlFor="enable-adjustment-sale" className="text-xs cursor-pointer">
                        Activer
                      </Label>
                    </div>
                  </div>

                  {enableAdjustment && (
                    <div className="space-y-3">
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <Label className="text-xs mb-1 block">Type</Label>
                          <Select value={adjustmentType} onValueChange={(value: 'Augmentation' | 'Diminution') => setAdjustmentType(value)}>
                            <SelectTrigger className="h-9">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Augmentation">Augmentation</SelectItem>
                              <SelectItem value="Diminution">Diminution</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label className="text-xs mb-1 block">Méthode</Label>
                          <Select value={adjustmentMethod} onValueChange={(value: 'Pourcentage' | 'Absolu') => setAdjustmentMethod(value)}>
                            <SelectTrigger className="h-9">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Pourcentage">%</SelectItem>
                              <SelectItem value="Absolu">FCFA</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      <div>
                        <Label className="text-xs mb-1 block">
                          Valeur {adjustmentMethod === 'Pourcentage' ? '(%)' : '(FCFA)'}
                        </Label>
                        <Input
                          type="number"
                          min="0"
                          value={adjustmentValue === 0 ? '' : adjustmentValue}
                          onChange={(e) => setAdjustmentValue(parseFloat(e.target.value) || 0)}
                          placeholder={adjustmentMethod === 'Pourcentage' ? '10' : '1000'}
                          className="h-9"
                        />
                      </div>

                      <div>
                        <Label className="text-xs mb-1 block">
                          Raison <span className="text-red-500">*</span>
                        </Label>
                        <Textarea
                          value={adjustmentReason}
                          onChange={(e) => setAdjustmentReason(e.target.value)}
                          placeholder="Raison de l'ajustement..."
                          className="min-h-[60px]"
                        />
                      </div>

                      {adjustmentValue > 0 && (
                        <div className="p-2 bg-blue-50 border border-blue-200 rounded text-sm">
                          <span className="font-medium">Aperçu : </span>
                          <span className={`font-semibold ${adjustmentType === 'Augmentation' ? 'text-green-600' : 'text-red-600'}`}>
                            {adjustmentType === 'Augmentation' ? '+' : '-'}
                            {adjustmentMethod === 'Pourcentage' 
                              ? `${adjustmentValue}%` 
                              : `${adjustmentValue.toLocaleString()} F`
                            }
                          </span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Total et boutons */}
              <div className="p-4 border-t bg-white space-y-3">
                {enableAdjustment && adjustmentValue > 0 && (
                  <>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">Sous-total</span>
                      <span className="font-semibold">
                        {getTotalAmount().toLocaleString()} F
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">
                        Ajustement ({adjustmentType === 'Augmentation' ? '+' : '-'})
                      </span>
                      <span className={`font-semibold ${adjustmentType === 'Augmentation' ? 'text-green-600' : 'text-red-600'}`}>
                        {adjustmentMethod === 'Pourcentage' 
                          ? `${adjustmentValue}%` 
                          : `${adjustmentValue.toLocaleString()} F`
                        }
                      </span>
                    </div>
                    <div className="border-t pt-2"></div>
                  </>
                )}

                <div className="flex items-center justify-between py-2">
                  <span className="text-lg font-semibold text-gray-900">Total à payer</span>
                  <span className="text-3xl font-bold text-[#66d9a1]">
                    {getFinalAmount().toLocaleString()} F
                  </span>
                </div>
                
                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    onClick={handlePreviousStep}
                    className="flex-1"
                  >
                    <ChevronLeft className="h-5 w-5 mr-2" />
                    Précédent
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
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
