
import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { ArrowLeft } from 'lucide-react';
import { ClientInfoCard } from '@/components/order/ClientInfoCard';
import { ClientAddressSection } from '@/components/order/ClientAddressSection';
import { FormulaPricingSection } from '@/components/order/FormulaPricingSection';
import { OptionsSection } from '@/components/order/OptionsSection';
import { OrderSummaryCard } from '@/components/order/OrderSummaryCard';

interface OrderFormData {
  weight: number;
  formulaType: 'basic' | 'detailed';
  options: {
    delivery: boolean;
    drying: boolean;
    ironing: boolean;
    express: boolean;
  };
  paymentMethod: string;
  washSite: string;
  newAddress: string;
  modifyAddress: boolean;
}

const NewOrder: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const client = location.state?.client;
  const clientType = location.state?.clientType || (client ? 'registered' : 'non-registered');
  const guestContact = location.state?.guestContact || {};
  
  // Client type state (standard, premium, student)
  const [clientCategory, setClientCategory] = useState<'standard' | 'premium' | 'student-standard' | 'student-premium'>('standard');
  
  // Premium client data
  const [monthlyUsage, setMonthlyUsage] = useState(0); // Current month usage in kg
  const [premiumLimit] = useState(40); // 40kg limit for premium clients
  
  const [formData, setFormData] = useState<OrderFormData>({
    weight: 6, // Minimum 6kg
    formulaType: 'basic',
    options: {
      delivery: true, // Delivery checked by default
      drying: false,
      ironing: false,
      express: false
    },
    paymentMethod: '',
    washSite: '',
    newAddress: '',
    modifyAddress: false
  });

  const [price, setPrice] = useState(0);
  
  useEffect(() => {
    // Set client category based on client data (mock data for demo)
    if (client) {
      // Mock data - in a real app, this would come from the client object
      const mockCategory = client.premium ? 
        (client.student ? 'student-premium' : 'premium') : 
        (client.student ? 'student-standard' : 'standard');
      setClientCategory(mockCategory as any);
      
      // Mock data for premium client usage
      if (mockCategory.includes('premium')) {
        setMonthlyUsage(25); // Example: client has already used 25kg this month
      }
    }
    
    // Calculate initial price
    calculatePrice();
  }, []);

  useEffect(() => {
    calculatePrice();
  }, [formData, clientCategory, monthlyUsage]);

  // Handle form field changes
  const handleWeightChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const weight = parseFloat(e.target.value);
    setFormData({
      ...formData,
      weight: weight < 6 ? 6 : weight // Enforce minimum weight of 6kg
    });
  };
  
  const handleFormulaChange = (value: 'basic' | 'detailed') => {
    setFormData({
      ...formData,
      formulaType: value,
      // Reset some options when changing formula
      options: {
        ...formData.options,
        drying: value === 'detailed' ? false : formData.options.drying,
        ironing: value === 'detailed' ? false : formData.options.ironing
      }
    });
  };
  
  const handleOptionChange = (option: keyof typeof formData.options) => {
    let newOptions = { ...formData.options };

    // Handle special cases and dependencies
    if (option === 'delivery') {
      newOptions.delivery = !newOptions.delivery;
      // If delivery is unchecked, also uncheck drying and ironing
      if (!newOptions.delivery) {
        newOptions.drying = false;
        newOptions.ironing = false;
      }
    } 
    else if (option === 'drying') {
      newOptions.drying = !newOptions.drying;
      // If drying is unchecked, also uncheck ironing
      if (!newOptions.drying) {
        newOptions.ironing = false;
      }
    }
    else if (option === 'ironing') {
      // Ironing can only be checked if drying is checked
      if (newOptions.drying) {
        newOptions.ironing = !newOptions.ironing;
      }
    }
    else {
      // For other options just toggle
      newOptions[option] = !newOptions[option];
    }

    setFormData({
      ...formData,
      options: newOptions
    });
  };
  
  const handlePaymentMethodChange = (value: string) => {
    setFormData({
      ...formData,
      paymentMethod: value
    });
  };
  
  const handleWashSiteChange = (value: string) => {
    setFormData({
      ...formData,
      washSite: value
    });
  };
  
  const handleAddressChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setFormData({
      ...formData,
      newAddress: e.target.value
    });
  };
  
  const handleModifyAddressChange = () => {
    setFormData({
      ...formData,
      modifyAddress: !formData.modifyAddress,
      newAddress: formData.modifyAddress ? '' : formData.newAddress // Clear address if unchecking
    });
  };

  // Calculate price based on form data
  const calculatePrice = () => {
    let total = 0;
    const weight = formData.weight;
    
    // Check if premium client with remaining quota
    const isPremium = clientCategory === 'premium' || clientCategory === 'student-premium';
    const remainingPremiumQuota = isPremium ? Math.max(0, premiumLimit - monthlyUsage) : 0;
    const excessWeight = Math.max(0, weight - remainingPremiumQuota);
    
    // If all weight is covered by premium quota and no express option, total is 0
    if (isPremium && excessWeight === 0 && !formData.options.express) {
      setPrice(0);
      return;
    }
    
    // Calculate price for weight that exceeds premium quota (or all weight for standard clients)
    if (excessWeight > 0 || !isPremium) {
      const weightToCalculate = isPremium ? excessWeight : weight;
      
      if (formData.formulaType === 'basic') {
        // Machine 20 kg = A (4000 FCFA), machine 6 kg = B (2000 FCFA)
        const machineA = 4000; // price for 20kg machine
        const machineB = 2000; // price for 6kg machine
        
        // Calculate price using the formula
        const n = Math.floor(weightToCalculate / 20);
        const r = weightToCalculate % 20;
        
        if ((machineB * (r / 6)) > machineA) {
          total = (n + 1) * machineA;
        } else {
          const fullSmallMachines = Math.floor(r / 6);
          const partialMachine = (r % 6) <= 1 ? 0 : 1.5;
          total = (n * machineA) + ((fullSmallMachines + partialMachine) * machineB);
        }
      } else {
        // Detailed formula has a different pricing structure (simplified for this example)
        total = weightToCalculate * 350; // Example: 350 FCFA per kg for detailed
      }
    }
    
    // Add options prices
    if (formData.options.delivery) total += 1000; // Delivery fee
    if (formData.options.drying) total += formData.weight * 150; // Drying fee per kg
    if (formData.options.ironing) total += formData.weight * 200; // Ironing fee per kg
    if (formData.options.express) total += 1000; // Express fee
    
    // Apply student discount (10%)
    if (clientCategory === 'student-standard' || clientCategory === 'student-premium') {
      if (total > 0) { // Only apply discount if there's something to pay
        total = total * 0.9; // 10% discount
      }
    }
    
    setPrice(Math.round(total)); // Round to whole number
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Validate form data
    if (formData.weight < 6) {
      toast.error("Le poids minimum est de 6 kg");
      return;
    }
    if (!formData.paymentMethod) {
      toast.error("Veuillez sélectionner un mode de paiement");
      return;
    }
    if (!formData.washSite) {
      toast.error("Veuillez sélectionner un site de lavage");
      return;
    }

    // Process the order
    toast.success("Commande enregistrée avec succès");
    navigate('/orders');
  };

  const goBack = () => {
    navigate('/search');
  };

  const hasAddress = client?.address || false;
  const hasGpsCoordinates = client?.coordinates || false;
  
  // Determine if we should show formula selection
  const showFormulaSelection = clientCategory === 'standard' || clientCategory === 'student-standard' || 
    (isPremiumWithExcessWeight());
    
  function isPremiumWithExcessWeight() {
    if (clientCategory !== 'premium' && clientCategory !== 'student-premium') return false;
    return (monthlyUsage + formData.weight) > premiumLimit;
  }

  return (
    <div className="space-y-6 pb-8">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" onClick={goBack} className="h-8 w-8">
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Nouvelle Commande</h1>
          <p className="text-muted-foreground">
            Créer une commande pour le client
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Client information card */}
        <ClientInfoCard client={client} guestContact={guestContact} clientType={clientType} />
        
        {/* Client address section with map or text address */}
        <ClientAddressSection 
          hasAddress={hasAddress} 
          hasGpsCoordinates={hasGpsCoordinates} 
          client={client} 
          formData={formData}
          handleModifyAddressChange={handleModifyAddressChange}
          handleAddressChange={handleAddressChange}
        />

        {/* Weight input */}
        <Card>
          <CardContent className="p-4">
            <h2 className="font-semibold mb-4">Poids indicatif (kg)</h2>
            <div className="flex items-center space-x-2">
              <Input 
                type="number" 
                min="6" 
                step="0.1" 
                value={formData.weight || ''} 
                onChange={handleWeightChange} 
                className="text-lg font-medium" 
              />
              <span className="text-lg">kg</span>
            </div>
            {formData.weight < 6 && (
              <p className="text-destructive text-sm mt-1">Le poids minimum est de 6 kg</p>
            )}
            
            {clientCategory.includes('premium') && (
              <div className="mt-3 border-t pt-2 text-sm">
                <div className="flex justify-between">
                  <span>Utilisation mensuelle:</span>
                  <span className="font-medium">{monthlyUsage} kg / {premiumLimit} kg</span>
                </div>
                <div className="flex justify-between">
                  <span>Restant:</span>
                  <span className="font-medium">{Math.max(0, premiumLimit - monthlyUsage)} kg</span>
                </div>
                {isPremiumWithExcessWeight() && (
                  <div className="mt-2 text-amber-600">
                    <span>Excédent à facturer: {(monthlyUsage + formData.weight) - premiumLimit} kg</span>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Formula pricing section */}
        <FormulaPricingSection
          showFormulaSelection={showFormulaSelection}
          formulaType={formData.formulaType}
          handleFormulaChange={handleFormulaChange}
        />

        {/* Options section */}
        <OptionsSection 
          options={formData.options}
          handleOptionChange={handleOptionChange}
          formulaType={formData.formulaType}
          clientCategory={clientCategory}
          isPremiumWithExcessWeight={isPremiumWithExcessWeight()}
        />

        {/* Two column layout for payment and site */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Payment method */}
          <Card>
            <CardContent className="p-4">
              <h2 className="font-semibold mb-4">Mode de paiement</h2>
              <Select onValueChange={handlePaymentMethodChange}>
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

          {/* Wash site */}
          <Card>
            <CardContent className="p-4">
              <h2 className="font-semibold mb-4">Site de lavage</h2>
              <Select onValueChange={handleWashSiteChange}>
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

        {/* Order summary card */}
        <OrderSummaryCard 
          price={price} 
          weight={formData.weight}
          hasDiscount={clientCategory.includes('student')}
        />

        {/* Submit button */}
        <Button type="submit" className="w-full bg-primary hover:bg-primary/90 text-lg py-6">
          Enregistrer la commande
        </Button>
      </form>
    </div>
  );
};

export default NewOrder;
