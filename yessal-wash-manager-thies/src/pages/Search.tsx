
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

interface Client {
  id: string;
  name: string;
  phone: string;
  cardNumber: string;
  premium?: boolean;
  student?: boolean;
  address?: string;
  coordinates?: {
    lat: number;
    lng: number;
  };
  monthlyUsage?: number;
}

interface GuestContact {
  openAccount?: boolean;   
  phone?: string;
  email?: string;
  lastName?: string;
  firstName?: string;
  address?: string;
}

interface OrderOptions {
  delivery: boolean;
  drying: boolean;
  ironing: boolean;
  express: boolean;
}

type Formula = 'base' | 'detailed';

// Constants for price calculations
const MACHINE_A_PRICE = 4000; // 20kg machine
const MACHINE_B_PRICE = 2000; // 6kg machine
const DELIVERY_FEE = 1000;
const DRYING_FEE_PER_KG = 150;
const IRONING_FEE_PER_KG = 200;
const EXPRESS_FEE = 1000;
const PREMIUM_QUOTA = 40; // kg per month
const STUDENT_DISCOUNT = 0.9; // 10% discount

const mockClients: Client[] = [
  { 
    id: '1', 
    name: 'Abdou Diop', 
    phone: '77 123 45 67', 
    cardNumber: 'Y10012',
    premium: false,
    student: false,
    address: 'Rue 10 x 15, Dakar'
  },
  { 
    id: '2', 
    name: 'Fatou Ndiaye', 
    phone: '70 876 54 32', 
    cardNumber: 'Y10025',
    premium: true,
    student: false,
    monthlyUsage: 25,
    address: 'Avenue Cheikh Anta Diop, Dakar',
    coordinates: {
      lat: 14.6937,
      lng: -17.4441
    }
  },
  { 
    id: '3', 
    name: 'Moustapha Seck', 
    phone: '76 543 21 98', 
    cardNumber: 'Y10037',
    premium: false,
    student: true,
    address: 'Boulevard du Centenaire, Dakar'
  },
  { 
    id: '4', 
    name: 'Aminata Fall', 
    phone: '78 765 43 21', 
    cardNumber: 'Y10042',
    premium: true,
    student: true,
    monthlyUsage: 10,
    coordinates: {
      lat: 14.7645,
      lng: -17.3660
    }
  },
  { 
    id: '5', 
    name: 'Ousmane Diallo', 
    phone: '77 987 65 43', 
    cardNumber: 'Y10056',
    premium: false,
    student: false
  },
  { 
    id: '6', 
    name: 'Marie Gomis', 
    phone: '70 444 55 66', 
    cardNumber: 'Y10070',
    premium: true,
    student: false,
    monthlyUsage: 38,
    address: 'Mermoz, Dakar'
  },
  { 
    id: '7', 
    name: 'Ibrahim Ndoye', 
    phone: '76 222 33 44', 
    cardNumber: 'Y10085',
    premium: true,
    student: true,
    monthlyUsage: 0,
    address: 'Cité Keur Gorgui, Dakar',
    coordinates: {
      lat: 14.7247,
      lng: -17.4877
    }
  },
];

// Helper function to calculate base price using the A=4000, B=2000 formula
const calculateBasePrice = (weight: number): number => {
  if (weight <= 0) return 0;
  
  const n = Math.floor(weight / 20); // Number of 20kg machines
  const r = weight % 20; // Remaining weight
  
  if (MACHINE_B_PRICE * (r / 6) > MACHINE_A_PRICE) {
    return (n + 1) * MACHINE_A_PRICE;
  } else {
    // Modified algorithm for B machines:
    // If remainder is ≤ 1.5 kg, count 1 machine 6 kg, else 2 machines
    const fullSmallMachines = Math.floor(r / 6);
    const partialRemainder = r % 6;
    const partialMachine = partialRemainder > 0 ? (partialRemainder <= 1.5 ? 1 : 2) : 0;
    
    return (n * MACHINE_A_PRICE) + ((fullSmallMachines + partialMachine) * MACHINE_B_PRICE);
  }
};

// Helper function to apply fidelity bonus
const applyFidelityBonus = (weight: number, price: number, totalOrders: number): number => {
  // 10th machine 6kg free (simplified implementation)
  const freeKg = Math.floor(weight / 70) * 6; // 6kg free per 70kg
  
  if (freeKg === 0) return price;
  
  // Recalculate price with reduced weight
  const effectiveWeight = Math.max(0, weight - freeKg);
  return calculateBasePrice(effectiveWeight);
};

const Search: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Client[]>([]);
  const [isScanning, setIsScanning] = useState(false);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [showSearchResults, setShowSearchResults] = useState(true);
  const [guestContact, setGuestContact] = useState<GuestContact>({});
  const [showGuestForm, setShowGuestForm] = useState(false);
  
  // New states for order details
  const [weight, setWeight] = useState<number>(6);
  const [formula, setFormula] = useState<Formula>('base');
  const [options, setOptions] = useState<OrderOptions>({
    delivery: true,
    drying: false,
    ironing: false,
    express: false
  });
  const [modifyAddress, setModifyAddress] = useState(false);
  const [newAddress, setNewAddress] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('');
  const [washSite, setWashSite] = useState('');
  
  const navigate = useNavigate();

  // Calculate if client is premium with excess weight
  const isPremiumWithExcessWeight = (): boolean => {
    if (!selectedClient?.premium) return false;
    const totalUsage = (selectedClient.monthlyUsage || 0) + weight;
    return totalUsage > PREMIUM_QUOTA;
  };
  
  // Get excess weight for premium clients
  const getExcessWeight = (): number => {
    if (!selectedClient?.premium) return weight;
    const totalUsage = (selectedClient.monthlyUsage || 0) + weight;
    return totalUsage > PREMIUM_QUOTA ? totalUsage - PREMIUM_QUOTA : 0;
  };
  
  // Calculate fidelity points
  const calculateFidelityPoints = (): number => {
    // Simplified implementation - in real app would use actual order history
    const totalLavagesAvant = 0; // Would come from client history
    return (totalLavagesAvant + Math.ceil(weight/6)) % 10;
  };
  
  // Dynamically calculate price based on all factors
  const calculatePrice = (): number => {
    // If weight is below minimum, return 0
    if (weight < 6) return 0;
    
    const isPremium = selectedClient?.premium || false;
    const isStudent = selectedClient?.student || false;
    let effectiveWeight = isPremium ? getExcessWeight() : weight;
    
    // If premium client with no excess weight and no express option
    if (isPremium && effectiveWeight === 0 && !options.express) {
      return 0;
    }
    
    let total = 0;
    
    // Calculate base price according to formula
    if (effectiveWeight > 0) {
      if (formula === 'base') {
        // Apply base pricing algorithm
        total = calculateBasePrice(effectiveWeight);
        
        // Apply fidelity bonus (simplified - would use actual order history in real app)
        total = applyFidelityBonus(effectiveWeight, total, 0);
      } else {
        // Detailed formula pricing (simplified for now)
        total = effectiveWeight * 350; // Example: 350 FCFA per kg
      }
    }
    
    // Add option costs - Updated according to requirements
    if (options.delivery && effectiveWeight > 0) total += DELIVERY_FEE;
    if (options.delivery && options.drying && effectiveWeight > 0) total += DRYING_FEE_PER_KG * effectiveWeight;
    if (options.delivery && options.drying && options.ironing && effectiveWeight > 0) total += IRONING_FEE_PER_KG * effectiveWeight;
    if (options.express) total += EXPRESS_FEE; // Express applies even for premium clients
    
    // Apply student discount
    if (isStudent && total > 0) {
      total *= STUDENT_DISCOUNT;
    }
    
    return Math.round(total);
  };
  
  // Calculated price using all factors
  const price = calculatePrice();
  const fidelityPoints = calculateFidelityPoints();
  
  // Effect for dynamic search
  useEffect(() => {
    if (searchQuery.trim()) {
      // Filter clients based on search
      const results = mockClients.filter(client => 
        client.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        client.phone.replace(/\s/g, '').includes(searchQuery.replace(/\s/g, '')) ||
        client.cardNumber.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setSearchResults(results);
      setShowSearchResults(true);
    } else {
      setSearchResults([]);
      setShowSearchResults(false); // Hide results when query is empty
    }
  }, [searchQuery]);

  const resetSearch = () => {
    setSearchQuery('');
    setSearchResults([]);
    setSelectedClient(null);
    setShowSearchResults(true);
    setShowGuestForm(false);
    setGuestContact({});
    resetOrderForm();
  };
  
  const resetOrderForm = () => {
    setWeight(6);
    setFormula('base');
    setOptions({
      delivery: true,
      drying: false,
      ironing: false,
      express: false
    });
    setModifyAddress(false);
    setNewAddress('');
    setPaymentMethod('');
    setWashSite('');
  };

  const startScanning = async () => {
    setIsScanning(true);
    
    try {
      // Call the actual scanner utility
      const qrData = await startQrScanner();
      const parsedData = parseQrCodeData(qrData);
      
      if (parsedData && parsedData.clientId) {
        const foundClient = mockClients.find(client => client.id === parsedData.clientId);
        
        if (foundClient) {
          setSelectedClient(foundClient);
          setSearchResults([foundClient]);
          toast.success(`Client trouvé: ${foundClient.name}`);
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
    setNewAddress(client.address || '');
  };

  const handleModifyAddressChange = () => {
    setModifyAddress(!modifyAddress);
    if (!modifyAddress) {
      // When checking the box, clear the address
      setNewAddress('');
    } else {
      // When unchecking, restore the original address
      setNewAddress(selectedClient?.address || '');
    }
  };

  const handleFormulaChange = (value: Formula) => {
    setFormula(value);
    
    // Reset incompatible options when changing formula
    if (value === 'detailed') {
      setOptions({
        ...options,
        drying: false,
        ironing: false
      });
    }
  };
  
  const handleOptionChange = (option: keyof OrderOptions, checked: boolean) => {
    let updatedOptions = { ...options };
    
    if (option === 'delivery') {
      updatedOptions.delivery = checked;
      // If delivery is unchecked, also uncheck drying and ironing
      if (!checked) {
        updatedOptions.drying = false;
        updatedOptions.ironing = false;
      }
    } 
    else if (option === 'drying') {
      updatedOptions.drying = checked;
      // If drying is unchecked, also uncheck ironing
      if (!checked) {
        updatedOptions.ironing = false;
      }
    }
    else if (option === 'ironing') {
      updatedOptions.ironing = checked;
    }
    else {
      updatedOptions[option] = checked;
    }
    
    setOptions(updatedOptions);
  };

  const showGuestContactForm = () => {
    setShowGuestForm(true);
  };

  const handleGuestContactSubmit = () => {
    // Store contact info and proceed with order
    submitOrder();
  };

  const skipGuestContact = () => {
    // Proceed without contact info
    submitOrder();
  };
  
  const handleWeightChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Allow empty input, store 0 if not numeric
    const value = e.target.value;
    if (value === '') {
      setWeight(0);
    } else {
      setWeight(parseFloat(value) || 0);
    }
  };
  
  const submitOrder = () => {
    // Validate form
    if (weight < 6) {
      toast.error("Le poids minimum est de 6 kg");
      return;
    }
    
    if (!paymentMethod) {
      toast.error("Veuillez sélectionner un mode de paiement");
      return;
    }
    
    if (!washSite) {
      toast.error("Veuillez sélectionner un site de lavage");
      return;
    }
    
    const finalAddress = modifyAddress || !selectedClient?.address ? newAddress : selectedClient?.address;
    
    if (!finalAddress && options.delivery) {
      toast.error("Veuillez saisir une adresse de livraison");
      return;
    }
    
    // Create order payload
    const orderData = {
      client: selectedClient,
      guestContact: selectedClient ? undefined : guestContact,
      weight,
      formula,
      options,
      price,
      address: finalAddress,
      coordinates: modifyAddress ? undefined : selectedClient?.coordinates,
      paymentMethod,
      washSite,
      date: new Date().toISOString()
    };
    
    // Navigate to order confirmation with order data
    navigate('/new-order', { state: orderData });
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
              value={guestContact.lastName || ''}
              onChange={(e) =>
                setGuestContact({ ...guestContact, lastName: e.target.value })
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
              value={guestContact.firstName || ''}
              onChange={(e) =>
                setGuestContact({ ...guestContact, firstName: e.target.value })
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
              value={guestContact.phone || ''}
              onChange={(e) => setGuestContact({...guestContact, phone: e.target.value})}
            />
          </div>
          
          <div>
            <label htmlFor="guestAddress" className="text-sm font-medium">
              Adresse
            </label>
            <Input
              id="guestAddress"
              placeholder="Ex : 24 rue des Manguiers, Dakar"
              value={guestContact.address || ''}
              onChange={(e) =>
                setGuestContact({ ...guestContact, address: e.target.value })
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
              checked={guestContact.openAccount || false}
              onChange={(e) =>
                setGuestContact({ ...guestContact, openAccount: e.target.checked })
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
                <strong>{selectedClient.name}</strong>
              </p>
              <p className="text-sm text-gray-500">Tél: {selectedClient.phone}</p>
              {selectedClient.cardNumber && <p className="text-sm text-gray-500">Carte: {selectedClient.cardNumber}</p>}
              <div className="mt-1 flex gap-1 flex-wrap">
                {selectedClient.premium && (
                  <div className="inline-block bg-primary/20 text-primary text-xs px-2 py-0.5 rounded-full">
                    Client Premium
                  </div>
                )}
                {selectedClient.student && (
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
              
              {selectedClient.coordinates ? (
                <div className="bg-gray-100 rounded-lg aspect-video mb-3 flex items-center justify-center">
                  <div className="text-center text-gray-500">
                    <p>Carte de localisation</p>
                    <p className="text-xs">Coordonnées: {selectedClient.coordinates.lat}, {selectedClient.coordinates.lng}</p>
                  </div>
                </div>
              ) : selectedClient.address ? (
                <div className="border rounded-md p-3 mb-3 bg-gray-50">
                  <p className="text-sm">{selectedClient.address}</p>
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
                  {selectedClient.address ? 'Modifier l\'adresse' : 'Ajouter une adresse'}
                </Label>
              </div>
              
              {(modifyAddress || !selectedClient.address) && (
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
              
              {selectedClient.premium && (
                <div className="mt-3 border-t pt-2 text-sm">
                  <div className="flex justify-between">
                    <span>Utilisation mensuelle:</span>
                    <span className="font-medium">{selectedClient.monthlyUsage || 0} kg / {PREMIUM_QUOTA} kg</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Restant:</span>
                    <span className="font-medium">{Math.max(0, PREMIUM_QUOTA - (selectedClient.monthlyUsage || 0))} kg</span>
                  </div>
                  {isPremiumWithExcessWeight() && (
                    <div className="mt-2 text-amber-600">
                      <span>Excédent à facturer: {getExcessWeight()} kg</span>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* 4. Formula Selection - Hide if premium with no excess */}
          {(!selectedClient.premium || isPremiumWithExcessWeight()) ? (
            <Card>
              <CardContent className="p-4">
                <h2 className="font-semibold mb-4">Formule</h2>
                <RadioGroup 
                  value={formula} 
                  onValueChange={value => handleFormulaChange(value as Formula)} 
                  className="space-y-2"
                >
                  <div className="flex items-center space-x-2 border rounded-md p-3 hover:bg-gray-50 cursor-pointer">
                    <RadioGroupItem value="base" id="formula-base" />
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
                    <RadioGroupItem value="detailed" id="formula-detailed" />
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
                {formula === 'base' && (
                  <>
                    <div className="flex items-center space-x-2 border rounded-md p-3 hover:bg-gray-50">
                      <Checkbox 
                        id="option-delivery" 
                        checked={options.delivery} 
                        onCheckedChange={(checked) => handleOptionChange('delivery', checked === true)} 
                      />
                      <div className="flex-grow">
                        <Label htmlFor="option-delivery" className="cursor-pointer">Livraison</Label>
                        <p className="text-xs text-gray-500">+{DELIVERY_FEE} FCFA</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-2 border rounded-md p-3 hover:bg-gray-50">
                      <Checkbox 
                        id="option-drying" 
                        checked={options.drying} 
                        disabled={!options.delivery}
                        onCheckedChange={(checked) => handleOptionChange('drying', checked === true)} 
                      />
                      <div className="flex-grow">
                        <Label htmlFor="option-drying" className="cursor-pointer">Séchage</Label>
                        <p className="text-xs text-gray-500">+{DRYING_FEE_PER_KG} FCFA/kg</p>
                        {!options.delivery && (
                          <p className="text-xs text-amber-600">Nécessite l'option Livraison</p>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-2 border rounded-md p-3 hover:bg-gray-50">
                      <Checkbox 
                        id="option-ironing" 
                        checked={options.ironing} 
                        disabled={!options.drying}
                        onCheckedChange={(checked) => handleOptionChange('ironing', checked === true)} 
                      />
                      <div className="flex-grow">
                        <Label htmlFor="option-ironing" className="cursor-pointer">Repassage</Label>
                        <p className="text-xs text-gray-500">+{IRONING_FEE_PER_KG} FCFA/kg</p>
                        {!options.drying && (
                          <p className="text-xs text-amber-600">Nécessite l'option Séchage</p>
                        )}
                      </div>
                    </div>
                  </>
                )}
                
                <div className="flex items-center space-x-2 border rounded-md p-3 hover:bg-gray-50">
                  <Checkbox 
                    id="option-express" 
                    checked={options.express} 
                    onCheckedChange={(checked) => handleOptionChange('express', checked === true)} 
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
                <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Sélectionner" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cash">Espèces</SelectItem>
                    <SelectItem value="orange_money">Orange Money</SelectItem>
                    <SelectItem value="wave">Wave</SelectItem>
                    <SelectItem value="free_money">Free Money</SelectItem>
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
                
                {selectedClient.premium && (
                  <div className="flex justify-between text-sm">
                    <span>Couvert par abonnement</span>
                    <span className="text-primary">{Math.min(weight, PREMIUM_QUOTA - (selectedClient.monthlyUsage || 0))} kg</span>
                  </div>
                )}
                
                {selectedClient.student && price > 0 && (
                  <div className="flex justify-between text-sm">
                    <span>Réduction étudiant</span>
                    <span className="text-green-600">-10%</span>
                  </div>
                )}
                
                <div className="flex justify-between pt-1">
                  <span className="text-lg">Prix total</span>
                  <span className="font-bold text-xl text-primary">
                    {price === 0 ? 'Inclus dans l\'abonnement' : `${price.toLocaleString()} FCFA`}
                  </span>
                </div>
                
                <div className="flex justify-between text-xs text-gray-500 mt-2">
                  <span>Date de commande</span>
                  <span>{new Date().toLocaleDateString()}</span>
                </div>
                
                {/* Added fidelity points display */}
                <div className="flex justify-between text-xs text-gray-500">
                  <span>Points fidélité</span>
                  <span>{fidelityPoints} / 10</span>
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
                          <div className="font-medium">{client.name}</div>
                          <div className="text-sm text-gray-500">Tél: {client.phone}</div>
                        </div>
                        <div className="text-right">
                          <div className="text-primary font-semibold">{client.cardNumber}</div>
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
