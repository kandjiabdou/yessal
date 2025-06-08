import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Search as SearchIcon, ScanQrCode, User, X } from 'lucide-react';
import { toast } from "sonner";
import { startQrScanner, parseQrCodeData } from '@/utils/qrCodeScanner';
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import ClientService, { Client, ClientInvite } from '@/services/client';
import OrderService, { OrderData, OrderOptions } from '@/services/order';

// Constants for price calculations
const MACHINE_A_PRICE = 4000; // 20kg machine
const MACHINE_B_PRICE = 2000; // 6kg machine
const DELIVERY_FEE = 1000;
const DRYING_FEE_PER_KG = 150;
const IRONING_FEE_PER_KG = 200;
const EXPRESS_FEE = 1000;
const PREMIUM_QUOTA = 40; // kg per month
const STUDENT_DISCOUNT = 0.9; // 10% discount

// En haut du fichier, après les imports
type ModePaiement = 'Espece' | 'MobileMoney' | 'Autre';

const Search: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Client[]>([]);
  const [isScanning, setIsScanning] = useState(false);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [showSearchResults, setShowSearchResults] = useState(true);
  const [guestContact, setGuestContact] = useState<ClientInvite>({
    nom: '',
    prenom: '',
    telephone: '',
    email: '',
    adresseText: '',
    creerCompte: false
  });
  const [showGuestForm, setShowGuestForm] = useState(false);
  
  // Order states
  const [weight, setWeight] = useState<number>(6);
  const [formula, setFormula] = useState<'BaseMachine' | 'Detail'>('BaseMachine');
  const [options, setOptions] = useState<OrderOptions>({
    aOptionRepassage: false,
    aOptionSechage: false,
    aOptionLivraison: true,
    aOptionExpress: false
  });
  const [modifyAddress, setModifyAddress] = useState(false);
  const [newAddress, setNewAddress] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<ModePaiement>('Espece');
  const [washSite, setWashSite] = useState('');
  
  const navigate = useNavigate();

  // Effect for dynamic search
  useEffect(() => {
    const searchClients = async () => {
      if (searchQuery.trim()) {
        const results = await ClientService.searchClients(searchQuery);
        setSearchResults(results);
        setShowSearchResults(true);
      } else {
        setSearchResults([]);
        setShowSearchResults(false);
      }
    };

    const timeoutId = setTimeout(searchClients, 300);
    return () => clearTimeout(timeoutId);
  }, [searchQuery]);

  const resetSearch = () => {
    setSearchQuery('');
    setSearchResults([]);
    setSelectedClient(null);
    setShowSearchResults(true);
    setShowGuestForm(false);
    setGuestContact({
      nom: '',
      prenom: '',
      telephone: '',
      email: '',
      adresseText: '',
      creerCompte: false
    });
    resetOrderForm();
  };
  
  const resetOrderForm = () => {
    setWeight(6);
    setFormula('BaseMachine');
    setOptions({
      aOptionRepassage: false,
      aOptionSechage: false,
      aOptionLivraison: true,
      aOptionExpress: false
    });
    setModifyAddress(false);
    setNewAddress('');
    setPaymentMethod('Espece');
    setWashSite('');
  };

  const startScanning = async () => {
    setIsScanning(true);
    
    try {
      const qrData = await startQrScanner();
      const parsedData = parseQrCodeData(qrData);
      
      if (parsedData && parsedData.clientId) {
        const client = await ClientService.getClientDetails(parseInt(parsedData.clientId));
        
        if (client) {
          setSelectedClient(client);
          setSearchResults([client]);
          toast.success(`Client trouvé: ${client.prenom} ${client.nom}`);
        } else {
          toast.error("Aucun client trouvé avec ce code");
        }
      } else {
        toast.error("QR code invalide");
      }
    } catch (error) {
      toast.error("Erreur lors du scan");
    } finally {
      setIsScanning(false);
    }
  };

  const selectClient = (client: Client) => {
    setSelectedClient(client);
    navigate('/new-order', { state: { selectedClient: client } });
  };

  const handleModifyAddressChange = () => {
    setModifyAddress(!modifyAddress);
    if (!modifyAddress) {
      setNewAddress('');
    } else {
      setNewAddress(selectedClient?.adresseText || '');
    }
  };

  const handleFormulaChange = (value: 'BaseMachine' | 'Detail') => {
    setFormula(value);
    
    // Reset incompatible options when changing formula
    if (value === 'Detail') {
      setOptions({
        ...options,
        aOptionSechage: false,
        aOptionRepassage: false
      });
    }
  };
  
  const handleOptionChange = (option: keyof OrderOptions, checked: boolean) => {
    let updatedOptions = { ...options };
    
    if (option === 'aOptionLivraison') {
      updatedOptions.aOptionLivraison = checked;
      // If delivery is unchecked, also uncheck drying and ironing
      if (!checked) {
        updatedOptions.aOptionSechage = false;
        updatedOptions.aOptionRepassage = false;
      }
    } 
    else if (option === 'aOptionSechage') {
      updatedOptions.aOptionSechage = checked;
      // If drying is unchecked, also uncheck ironing
      if (!checked) {
        updatedOptions.aOptionRepassage = false;
      }
    }
    else {
      updatedOptions[option] = checked;
    }
    
    setOptions(updatedOptions);
  };

  const showGuestContactForm = () => {
    setShowGuestForm(true);
  };

  const handleGuestContactSubmit = async () => {
    // Validate required fields
    if (!guestContact.nom || !guestContact.prenom || !guestContact.telephone) {
      toast.error("Veuillez remplir tous les champs obligatoires");
      return;
    }

    navigate('/new-order', { state: { guestContact } });
  };

  const skipGuestContact = () => {
    navigate('/new-order', { state: {} });
  };
  
  const handleWeightChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (value === '') {
      setWeight(0);
    } else {
      setWeight(parseFloat(value) || 0);
    }
  };
  
  const submitOrder = async () => {
    // Validate form
    if (weight < 6) {
      toast.error("Le poids minimum est de 6 kg");
      return;
    }
    
    if (!paymentMethod) {
      toast.error("Veuillez sélectionner un mode de paiement");
      return;
    }
    
    // if (!washSite) {
    //   toast.error("Veuillez sélectionner un site de lavage");
    //   return;
    // }
    
    const finalAddress = modifyAddress || !selectedClient?.adresseText ? newAddress : selectedClient?.adresseText;
    
    // if (!finalAddress && options.aOptionLivraison) {
    //   toast.error("Veuillez saisir une adresse de livraison");
    //   return;
    // }
    
    // Create order data
    const orderData: OrderData = {
      clientUserId: selectedClient?.id,
      clientInvite: !selectedClient ? guestContact : undefined,
      siteLavageId: parseInt(washSite),
      estEnLivraison: options.aOptionLivraison,
      adresseLivraison: options.aOptionLivraison ? {
        adresseText: finalAddress,
        latitude: selectedClient?.coordonnees?.latitude,
        longitude: selectedClient?.coordonnees?.longitude
      } : undefined,
      masseClientIndicativeKg: weight,
      formuleCommande: formula,
      typeReduction: selectedClient?.typeClient === 'Premium' ? 'Etudiant' : undefined,
      options,
      modePaiement: paymentMethod
    };
    
    try {
      const result = await OrderService.createOrder(orderData);
      if (result.success && result.order) {
        toast.success("Commande créée avec succès");
        navigate('/orders');
      } else {
        toast.error("Erreur lors de la création de la commande");
      }
    } catch (error) {
      toast.error("Une erreur est survenue");
    }
  };

  return (
    <div className="space-y-6 pb-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Commande Client</h1>
        <p className="text-muted-foreground">
          Rechercher un client ou scanner sa carte
        </p>
      </div>

      {showGuestForm ? (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold">Coordonnées du client (facultatif)</h2>
          <p className="text-sm text-gray-500">
            Ces informations seront utilisées pour l'envoi de la facture. Le client peut choisir de ne pas les fournir.
          </p>
          <div>
            <label htmlFor="guestLastName" className="text-sm font-medium">
              Nom
            </label>
            <Input
              id="guestLastName"
              placeholder="Ex : Ndiaye"
              value={guestContact.nom || ''}
              onChange={(e) =>
                setGuestContact({ ...guestContact, nom: e.target.value })
              }
            />
          </div>
          
          <div>
            <label htmlFor="guestFirstName" className="text-sm font-medium">
              Prénom
            </label>
            <Input
              id="guestFirstName"
              placeholder="Ex : Fatou"
              value={guestContact.prenom || ''}
              onChange={(e) =>
                setGuestContact({ ...guestContact, prenom: e.target.value })
              }
            />
          </div>
          <div>
            <label htmlFor="guestPhone" className="text-sm font-medium">
              Numéro de téléphone
            </label>
            <Input 
              id="guestPhone" 
              type="tel" 
              placeholder="Ex: 77 123 45 67" 
              value={guestContact.telephone || ''}
              onChange={(e) => setGuestContact({...guestContact, telephone: e.target.value})}
            />
          </div>
          
          <div>
            <label htmlFor="guestAddress" className="text-sm font-medium">
              Adresse
            </label>
            <Input
              id="guestAddress"
              placeholder="Ex : 24 rue des Manguiers, Dakar"
              value={guestContact.adresseText || ''}
              onChange={(e) =>
                setGuestContact({ ...guestContact, adresseText: e.target.value })
              }
            />
          </div>
          <div className="space-y-4">
            
            <div>
              <label htmlFor="guestEmail" className="text-sm font-medium">
                Email
              </label>
              <Input 
                id="guestEmail" 
                type="email" 
                placeholder="Ex: client@example.com" 
                value={guestContact.email || ''}
                onChange={(e) => setGuestContact({...guestContact, email: e.target.value})}
              />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <input
              id="openAccount"
              type="checkbox"
              checked={guestContact.creerCompte || false}
              onChange={(e) =>
                setGuestContact({ ...guestContact, creerCompte: e.target.checked })
              }
              className="h-4 w-4 accent-primary"
            />
            <label htmlFor="openAccount" className="text-sm">
              Souhaite ouvrir un compte
            </label>
          </div>
          <div className="flex gap-2">
            <Button 
              className="flex-1"
              variant="default" 
              onClick={handleGuestContactSubmit}
            >
              Continuer
            </Button>
            <Button 
              className="flex-1"
              variant="outline" 
              onClick={skipGuestContact}
            >
              Passer cette étape
            </Button>
          </div>
          
          <Button 
            variant="ghost" 
            className="w-full"
            onClick={resetSearch}
          >
            Annuler et revenir à la recherche
          </Button>
        </div>
      ) : selectedClient ? (
        /* Client Selected - Show Order Form */
        <div className="space-y-6">
          {/* 1. Client Information Card */}
          <Card className="overflow-hidden border-l-4 border-l-primary">
            <CardContent className="p-4">
              <h2 className="font-semibold mb-2">Client</h2>
              <p className="text-sm text-gray-500">
                <strong>{selectedClient.nom} {selectedClient.prenom}</strong>
              </p>
              <p className="text-sm text-gray-500">Tél: {selectedClient.telephone}</p>
              {selectedClient.carteNumero && (
                <p className="text-sm text-gray-500">
                  <strong>Carte de fidélité:</strong> <span className="font-mono bg-blue-50 text-blue-700 px-2 py-1 rounded">{selectedClient.carteNumero}</span>
                </p>
              )}
              <div className="mt-1 flex gap-1 flex-wrap">
                {selectedClient.typeClient === 'Premium' && (
                  <div className="inline-block bg-primary/20 text-primary text-xs px-2 py-0.5 rounded-full">
                    Client Premium
                  </div>
                )}
                {selectedClient.estEtudiant && (
                  <div className="inline-block bg-blue-100 text-blue-700 text-xs px-2 py-0.5 rounded-full">
                    Étudiant
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
          
          {/* 2. Address Section */}
          <Card>
            <CardContent className="p-4">
              <h2 className="font-semibold mb-3">Adresse de livraison</h2>
              
              {selectedClient.coordonnees ? (
                <div className="bg-gray-100 rounded-lg aspect-video mb-3 flex items-center justify-center">
                  <div className="text-center text-gray-500">
                    <p>Carte de localisation</p>
                    <p className="text-xs">Coordonnées: {selectedClient.coordonnees.latitude}, {selectedClient.coordonnees.longitude}</p>
                  </div>
                </div>
              ) : selectedClient.adresseText ? (
                <div className="border rounded-md p-3 mb-3 bg-gray-50">
                  <p className="text-sm">{selectedClient.adresseText}</p>
                </div>
              ) : (
                <div className="mb-3">
                  <p className="text-sm text-amber-600 mb-2">Aucune adresse disponible pour ce client.</p>
                </div>
              )}
              
              <div className="flex items-center space-x-2 mb-3">
                <Checkbox 
                  id="modify-address" 
                  checked={modifyAddress} 
                  onCheckedChange={handleModifyAddressChange} 
                />
                <Label htmlFor="modify-address">
                  {selectedClient.adresseText ? 'Modifier l\'adresse' : 'Ajouter une adresse'}
                </Label>
              </div>
              
              {(modifyAddress || !selectedClient.adresseText) && (
                <Textarea 
                  placeholder="Adresse complète du client"
                  value={newAddress}
                  onChange={(e) => setNewAddress(e.target.value)}
                  className="min-h-[80px]"
                />
              )}
            </CardContent>
          </Card>
          
          {/* 3. Weight Input */}
          <Card>
            <CardContent className="p-4">
              <h2 className="font-semibold mb-4">Poids indicatif (kg)</h2>
              <div className="flex items-center space-x-2">
                <Input 
                  type="number" 
                  min="6" 
                  step="0.1" 
                  value={weight === 0 ? '' : weight} 
                  onChange={handleWeightChange}
                  className="text-lg font-medium" 
                />
                <span className="text-lg">kg</span>
              </div>
              {weight < 6 && (
                <p className="text-destructive text-sm mt-1">Le poids minimum est de 6 kg</p>
              )}
              
              {selectedClient.typeClient === 'Premium' && (
                <div className="mt-3 border-t pt-2 text-sm">
                  <div className="flex justify-between">
                    <span>Utilisation mensuelle:</span>
                    <span className="font-medium">{selectedClient.mensuelleUsage || 0} kg / {PREMIUM_QUOTA} kg</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Restant:</span>
                    <span className="font-medium">{Math.max(0, PREMIUM_QUOTA - (selectedClient.mensuelleUsage || 0))} kg</span>
                  </div>
                  {selectedClient.typeClient === 'Premium' && selectedClient.mensuelleUsage && selectedClient.mensuelleUsage > PREMIUM_QUOTA && (
                    <div className="mt-2 text-amber-600">
                      <span>Excédent à facturer: {selectedClient.mensuelleUsage - PREMIUM_QUOTA} kg</span>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* 4. Formula Selection - Hide if premium with no excess */}
          {(selectedClient.typeClient !== 'Premium' || selectedClient.mensuelleUsage && selectedClient.mensuelleUsage > PREMIUM_QUOTA) ? (
            <Card>
              <CardContent className="p-4">
                <h2 className="font-semibold mb-4">Formule</h2>
                <RadioGroup 
                  value={formula} 
                  onValueChange={value => handleFormulaChange(value as 'BaseMachine' | 'Detail')} 
                  className="space-y-2"
                >
                  <div className="flex items-center space-x-2 border rounded-md p-3 hover:bg-gray-50 cursor-pointer">
                    <RadioGroupItem value="BaseMachine" id="formula-base" />
                    <Label htmlFor="formula-base" className="flex-grow cursor-pointer">
                      <div>
                        <span className="font-medium">Formule de base</span>
                        <p className="text-xs text-gray-500 mt-0.5">
                          Lavage standard en machine (plusieurs vêtements ensemble)
                        </p>
                      </div>
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2 border rounded-md p-3 hover:bg-gray-50 cursor-pointer">
                    <RadioGroupItem value="Detail" id="formula-detailed" />
                    <Label htmlFor="formula-detailed" className="flex-grow cursor-pointer">
                      <div>
                        <span className="font-medium">Formule détaillée</span>
                        <p className="text-xs text-gray-500 mt-0.5">
                          Traitement spécifique pour chaque type de vêtement
                        </p>
                      </div>
                    </Label>
                  </div>
                </RadioGroup>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="p-4">
                <h2 className="font-semibold mb-4">Formule</h2>
                <div className="bg-primary/10 rounded-lg p-3 text-sm">
                  <p>Client premium - volume couvert par l'abonnement</p>
                  <p className="text-xs mt-1 text-gray-600">
                    Abonnement de {PREMIUM_QUOTA} kg/mois (hors service express)
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* 5. Options Section */}
          <Card>
            <CardContent className="p-4">
              <h2 className="font-semibold mb-4">Options</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {formula === 'BaseMachine' && (
                  <>
                    <div className="flex items-center space-x-2 border rounded-md p-3 hover:bg-gray-50">
                      <Checkbox 
                        id="option-delivery" 
                        checked={options.aOptionLivraison} 
                        onCheckedChange={(checked) => handleOptionChange('aOptionLivraison', checked === true)} 
                      />
                      <div className="flex-grow">
                        <Label htmlFor="option-delivery" className="cursor-pointer">Livraison</Label>
                        <p className="text-xs text-gray-500">+{DELIVERY_FEE} FCFA</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-2 border rounded-md p-3 hover:bg-gray-50">
                      <Checkbox 
                        id="option-drying" 
                        checked={options.aOptionSechage} 
                        disabled={!options.aOptionLivraison}
                        onCheckedChange={(checked) => handleOptionChange('aOptionSechage', checked === true)} 
                      />
                      <div className="flex-grow">
                        <Label htmlFor="option-drying" className="cursor-pointer">Séchage</Label>
                        <p className="text-xs text-gray-500">+{DRYING_FEE_PER_KG} FCFA/kg</p>
                        {!options.aOptionLivraison && (
                          <p className="text-xs text-amber-600">Nécessite l'option Livraison</p>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-2 border rounded-md p-3 hover:bg-gray-50">
                      <Checkbox 
                        id="option-ironing" 
                        checked={options.aOptionRepassage} 
                        disabled={!options.aOptionSechage}
                        onCheckedChange={(checked) => handleOptionChange('aOptionRepassage', checked === true)} 
                      />
                      <div className="flex-grow">
                        <Label htmlFor="option-ironing" className="cursor-pointer">Repassage</Label>
                        <p className="text-xs text-gray-500">+{IRONING_FEE_PER_KG} FCFA/kg</p>
                        {!options.aOptionSechage && (
                          <p className="text-xs text-amber-600">Nécessite l'option Séchage</p>
                        )}
                      </div>
                    </div>
                  </>
                )}
                
                <div className="flex items-center space-x-2 border rounded-md p-3 hover:bg-gray-50">
                  <Checkbox 
                    id="option-express" 
                    checked={options.aOptionExpress} 
                    onCheckedChange={(checked) => handleOptionChange('aOptionExpress', checked === true)} 
                  />
                  <div className="flex-grow">
                    <Label htmlFor="option-express" className="cursor-pointer">Express (6h)</Label>
                    <p className="text-xs text-gray-500">+{EXPRESS_FEE} FCFA</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 6. Payment Method & Wash Site Selection */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardContent className="p-4">
                <h2 className="font-semibold mb-4">Mode de paiement</h2>
                <Select
                  value={paymentMethod}
                  onValueChange={(value: 'Espece' | 'MobileMoney' | 'Autre') => setPaymentMethod(value)}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Sélectionner" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Espece">Espèces</SelectItem>
                    <SelectItem value="MobileMoney">Orange Money</SelectItem>
                    <SelectItem value="Autre">Autre</SelectItem>
                  </SelectContent>
                </Select>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <h2 className="font-semibold mb-4">Site de lavage</h2>
                <Select value={washSite} onValueChange={setWashSite}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Sélectionner" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="thies_nord">Thiès Nord</SelectItem>
                    <SelectItem value="thies_sud">Thiès Sud</SelectItem>
                    <SelectItem value="thies_est">Thiès Est</SelectItem>
                  </SelectContent>
                </Select>
              </CardContent>
            </Card>
          </div>

          {/* 7. Order Summary */}
          <Card className="bg-primary/5">
            <CardContent className="p-4">
              <h2 className="font-semibold text-lg mb-3">Résumé</h2>
              <div className="space-y-2">
                <div className="flex justify-between border-b pb-2">
                  <span>Poids total</span>
                  <span className="font-medium">{weight} kg</span>
                </div>
                
                {selectedClient.typeClient === 'Premium' && (
                  <div className="flex justify-between text-sm">
                    <span>Couvert par abonnement</span>
                    <span className="text-primary">{Math.min(weight, PREMIUM_QUOTA - (selectedClient.mensuelleUsage || 0))} kg</span>
                  </div>
                )}
                
                {selectedClient.estEtudiant && selectedClient.typeClient === 'Premium' && selectedClient.mensuelleUsage && selectedClient.mensuelleUsage > PREMIUM_QUOTA && (
                  <div className="flex justify-between text-sm">
                    <span>Excédent à facturer</span>
                    <span className="text-primary">{selectedClient.mensuelleUsage - PREMIUM_QUOTA} kg</span>
                  </div>
                )}
                
                <div className="flex justify-between pt-1">
                  <span className="text-lg">Prix total</span>
                  <span className="font-bold text-xl text-primary">
                    {selectedClient.typeClient === 'Premium' ? (selectedClient.mensuelleUsage && selectedClient.mensuelleUsage > PREMIUM_QUOTA ? (
                      `${(PREMIUM_QUOTA * MACHINE_A_PRICE + (selectedClient.mensuelleUsage - PREMIUM_QUOTA) * MACHINE_B_PRICE).toLocaleString()} FCFA`
                    ) : 'Inclus dans l\'abonnement') : (
                      `${(weight * MACHINE_A_PRICE + (weight > PREMIUM_QUOTA ? (weight - PREMIUM_QUOTA) * MACHINE_B_PRICE : 0)).toLocaleString()} FCFA`
                    )}
                  </span>
                </div>
                
                <div className="flex justify-between text-xs text-gray-500 mt-2">
                  <span>Date de commande</span>
                  <span>{new Date().toLocaleDateString()}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Submit Button */}
          <Button 
            type="button" 
            className="w-full" 
            disabled={weight < 6}
            onClick={submitOrder}
          >
            Enregistrer la commande
          </Button>
          
          <Button 
            variant="ghost" 
            className="w-full"
            onClick={resetSearch}
          >
            Annuler et revenir à la recherche
          </Button>
        </div>
      ) : (
        /* No Client Selected - Show Search/Scan Tabs */
        <Tabs defaultValue="search">
          <TabsList className="grid grid-cols-2">
            <TabsTrigger value="search">Recherche</TabsTrigger>
            <TabsTrigger value="scan">Scanner</TabsTrigger>
          </TabsList>
          
          <TabsContent value="search" className="space-y-4">
            <div className="flex gap-2 relative">
              <Input 
                placeholder="Nom, téléphone ou numéro de carte" 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pr-10"
              />
              {searchQuery && (
                <Button 
                  size="sm" 
                  variant="ghost" 
                  className="absolute right-2 top-1/2 transform -translate-y-1/2 h-8 w-8 p-0" 
                  onClick={resetSearch}
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
              <Button type="button" onClick={() => setSearchQuery(searchQuery)}>
                <SearchIcon className="h-4 w-4 mr-2" />
                Rechercher
              </Button>
            </div>
            
            {showSearchResults && searchResults.length > 0 ? (
              <div className="space-y-2">
                {searchResults.map((client) => (
                  <Card 
                    key={client.id} 
                    className="cursor-pointer hover:bg-gray-50" 
                    onClick={() => selectClient(client)}
                  >
                    <CardContent className="p-4">
                      <div className="flex justify-between items-center">
                        <div>
                          <div className="font-medium">{client.nom} {client.prenom}</div>
                          <div className="text-sm text-gray-500">Tél: {client.telephone}</div>
                          {client.carteNumero && (
                            <div className="text-sm text-gray-500">
                              <strong>Carte:</strong> <span className="font-mono bg-gray-100 px-1 rounded">{client.carteNumero}</span>
                            </div>
                          )}
                        </div>
                        <div className="text-right flex flex-col items-end gap-1">
                          {(client.typeClient === 'Premium' || client.estEtudiant) && (
                            <div className="flex gap-1">
                              {client.typeClient === 'Premium' && (
                                <div className="inline-block bg-primary/20 text-primary text-xs px-2 py-0.5 rounded-full">
                                  Premium
                                </div>
                              )}
                              {client.estEtudiant && (
                                <div className="inline-block bg-blue-100 text-blue-700 text-xs px-2 py-0.5 rounded-full">
                                  Étudiant
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : searchQuery ? (
              <div className="text-center py-8">
                <p className="text-gray-500">Aucun client trouvé</p>
                <Button className="mt-4" onClick={resetSearch}>
                  Nouvelle recherche
                </Button>
              </div>
            ) : null}
          </TabsContent>
          
          <TabsContent value="scan" className="space-y-4">
            <div className="bg-gray-100 rounded-lg aspect-square flex items-center justify-center">
              {isScanning ? (
                <div className="text-center">
                  <div className="animate-pulse">
                    <ScanQrCode className="h-12 w-12 text-primary mx-auto" />
                  </div>
                  <p className="mt-4">Scan en cours...</p>
                </div>
              ) : (
                <div className="text-center">
                  <ScanQrCode className="h-12 w-12 text-gray-400 mx-auto" />
                  <p className="mt-4">Prêt à scanner</p>
                  <Button className="mt-4" onClick={startScanning}>
                    Démarrer le scan
                  </Button>
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      )}

      {!selectedClient && !showGuestForm && (
        <div className="border-t border-gray-200 pt-4">
          <Button 
            variant="outline" 
            className="w-full flex items-center justify-center gap-2"
            onClick={showGuestContactForm}
          >
            <User className="h-4 w-4" />
            Commande sans compte client
          </Button>
        </div>
      )}
    </div>
  );
};

export default Search;
