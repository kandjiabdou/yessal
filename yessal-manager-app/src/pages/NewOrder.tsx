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
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import OrderService, { OrderData } from '@/services/order';
import { Client, ClientInvite } from '@/services/client';
import { SiteLavage } from '@/services/types';
import AuthService from '@/services/auth';

// Constants for price calculations
const MACHINE_A_PRICE = 4000; // 20kg machine
const MACHINE_B_PRICE = 2000; // 6kg machine

interface OrderFormData {
  weight: number;
  formulaType: 'BaseMachine' | 'Detail';
  options: {
    aOptionRepassage: boolean;
    aOptionSechage: boolean;
    aOptionLivraison: boolean;
    aOptionExpress: boolean;
  };
  paymentMethod: 'Espece' | 'MobileMoney' | 'Autre';
  washSite: string;
  newAddress: string;
  modifyAddress: boolean;
}

interface LocationState {
  selectedClient?: Client;
  guestContact?: ClientInvite;
}

const NewOrder: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { selectedClient, guestContact } = location.state as LocationState || {};
  const [sitesLavage, setSitesLavage] = useState<SiteLavage[]>([]);

  const [clientType, setClientType] = useState<'registered' | 'non-registered'>(
    selectedClient ? 'registered' : 'non-registered'
  );

  const [formData, setFormData] = useState<OrderFormData>({
    weight: 6,
    formulaType: 'BaseMachine',
    options: {
      aOptionRepassage: false,
      aOptionSechage: false,
      aOptionLivraison: true,
      aOptionExpress: false
    },
    paymentMethod: 'Espece',
    washSite: '',
    newAddress: '',
    modifyAddress: false
  });

  useEffect(() => {
    const loadSitesLavage = async () => {
      try {
        const sites = await AuthService.getSitesLavage();
        setSitesLavage(sites);
      } catch (error) {
        console.error('Erreur lors du chargement des sites:', error);
        toast.error('Erreur lors du chargement des sites de lavage');
      }
    };

    loadSitesLavage();
  }, []);

  const handleWeightChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const weight = parseFloat(e.target.value);
    setFormData({
      ...formData,
      weight: weight < 6 ? 6 : weight
    });
  };
  
  const handleFormulaChange = (value: 'BaseMachine' | 'Detail') => {
    setFormData({
      ...formData,
      formulaType: value,
      options: {
        ...formData.options,
        aOptionSechage: value === 'Detail' ? false : formData.options.aOptionSechage,
        aOptionRepassage: value === 'Detail' ? false : formData.options.aOptionRepassage
      }
    });
  };
  
  const handleOptionChange = (option: keyof typeof formData.options, checked: boolean) => {
    let newOptions = { ...formData.options };

    if (option === 'aOptionLivraison') {
      newOptions.aOptionLivraison = checked;
      if (!checked) {
        newOptions.aOptionSechage = false;
        newOptions.aOptionRepassage = false;
      }
    } 
    else if (option === 'aOptionSechage') {
      newOptions.aOptionSechage = checked;
      if (!checked) {
        newOptions.aOptionRepassage = false;
      }
    }
    else {
      newOptions[option] = checked;
    }

    setFormData({
      ...formData,
      options: newOptions
    });
  };
  
  const handlePaymentMethodChange = (value: 'Espece' | 'MobileMoney' | 'Autre') => {
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
      newAddress: formData.modifyAddress ? '' : formData.newAddress
    });
  };

  const submitOrder = async () => {
    if (formData.weight < 6) {
      toast.error("Le poids minimum est de 6 kg");
      return;
    }
    if (!formData.washSite) {
      toast.error("Veuillez sélectionner un site de lavage");
      return;
    }

    const finalAddress = formData.modifyAddress || !selectedClient?.adresseText ? formData.newAddress : selectedClient?.adresseText;
    
    if (!finalAddress && formData.options.aOptionLivraison) {
      toast.error("Veuillez saisir une adresse de livraison");
      return;
    }

    const orderData: OrderData = {
      clientUserId: selectedClient?.id,
      clientInvite: !selectedClient ? guestContact : undefined,
      siteLavageId: parseInt(formData.washSite),
      estEnLivraison: formData.options.aOptionLivraison,
      adresseLivraison: formData.options.aOptionLivraison ? {
        adresseText: finalAddress,
        latitude: selectedClient?.coordonnees?.latitude,
        longitude: selectedClient?.coordonnees?.longitude
      } : undefined,
      masseClientIndicativeKg: formData.weight,
      formuleCommande: formData.formulaType,
      typeReduction: selectedClient?.estEtudiant ? 'Etudiant' : undefined,
      options: formData.options,
      modePaiement: formData.paymentMethod
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

  const goBack = () => {
    navigate('/search');
  };

  return (
    <div className="space-y-6 pb-8">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" onClick={goBack} className="h-8 w-8">
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Nouvelle Commande</h1>
          <p className="text-muted-foreground">
            {selectedClient ? `Client: ${selectedClient.nom} ${selectedClient.prenom}` : 'Commande sans compte client'}
          </p>
        </div>
      </div>

      <form onSubmit={(e) => { e.preventDefault(); submitOrder(); }} className="space-y-6">
        <ClientInfoCard 
          client={selectedClient} 
          guestContact={guestContact} 
          clientType={clientType} 
        />

        <ClientAddressSection 
          hasAddress={!!selectedClient?.adresseText} 
          hasGpsCoordinates={!!selectedClient?.coordonnees}
          client={selectedClient} 
          formData={{
            modifyAddress: formData.modifyAddress,
            newAddress: formData.newAddress
          }}
          handleModifyAddressChange={handleModifyAddressChange}
          handleAddressChange={handleAddressChange}
        />

        <Card>
          <CardContent className="p-4">
            <h2 className="font-semibold mb-4">Poids indicatif (kg)</h2>
            <div className="flex items-center space-x-2">
              <Input 
                type="number" 
                min="6" 
                step="0.1" 
                value={formData.weight === 0 ? '' : formData.weight} 
                onChange={handleWeightChange} 
                className="text-lg font-medium" 
              />
              <span className="text-lg">kg</span>
            </div>
            {formData.weight < 6 && (
              <p className="text-destructive text-sm mt-1">Le poids minimum est de 6 kg</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <h2 className="font-semibold mb-4">Formule</h2>
            <RadioGroup 
              value={formData.formulaType} 
              onValueChange={handleFormulaChange} 
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

        <Card>
          <CardContent className="p-4">
            <h2 className="font-semibold mb-4">Options</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="flex items-center space-x-2 border rounded-md p-3 hover:bg-gray-50">
                <Checkbox 
                  id="option-delivery" 
                  checked={formData.options.aOptionLivraison} 
                  onCheckedChange={(checked) => handleOptionChange('aOptionLivraison', checked === true)} 
                />
                <div className="flex-grow">
                  <Label htmlFor="option-delivery" className="cursor-pointer">Livraison</Label>
                </div>
              </div>
              
              <div className="flex items-center space-x-2 border rounded-md p-3 hover:bg-gray-50">
                <Checkbox 
                  id="option-drying" 
                  checked={formData.options.aOptionSechage} 
                  disabled={!formData.options.aOptionLivraison || formData.formulaType === 'Detail'}
                  onCheckedChange={(checked) => handleOptionChange('aOptionSechage', checked === true)} 
                />
                <div className="flex-grow">
                  <Label htmlFor="option-drying" className="cursor-pointer">Séchage</Label>
                  {!formData.options.aOptionLivraison && (
                    <p className="text-xs text-amber-600">Nécessite l'option Livraison</p>
                  )}
                </div>
              </div>
              
              <div className="flex items-center space-x-2 border rounded-md p-3 hover:bg-gray-50">
                <Checkbox 
                  id="option-ironing" 
                  checked={formData.options.aOptionRepassage} 
                  disabled={!formData.options.aOptionSechage || formData.formulaType === 'Detail'}
                  onCheckedChange={(checked) => handleOptionChange('aOptionRepassage', checked === true)} 
                />
                <div className="flex-grow">
                  <Label htmlFor="option-ironing" className="cursor-pointer">Repassage</Label>
                  {!formData.options.aOptionSechage && (
                    <p className="text-xs text-amber-600">Nécessite l'option Séchage</p>
                  )}
                </div>
              </div>
              
              <div className="flex items-center space-x-2 border rounded-md p-3 hover:bg-gray-50">
                <Checkbox 
                  id="option-express" 
                  checked={formData.options.aOptionExpress} 
                  onCheckedChange={(checked) => handleOptionChange('aOptionExpress', checked === true)} 
                />
                <div className="flex-grow">
                  <Label htmlFor="option-express" className="cursor-pointer">Express (6h)</Label>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardContent className="p-4">
              <h2 className="font-semibold mb-4">Mode de paiement</h2>
              <Select value={formData.paymentMethod} onValueChange={handlePaymentMethodChange}>
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
              <h2 className="font-semibold mb-3">Site de Lavage</h2>
              <Select value={formData.washSite} onValueChange={handleWashSiteChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner un site de lavage" />
                </SelectTrigger>
                <SelectContent>
                  {sitesLavage.map((site) => (
                    <SelectItem 
                      key={site.id} 
                      value={site.id.toString()}
                      disabled={!site.statutOuverture}
                    >
                      {site.nom} - {site.ville} {!site.statutOuverture && '(Fermé)'}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CardContent>
          </Card>
        </div>

        <Button type="submit" className="w-full bg-primary hover:bg-primary/90 text-lg py-6">
          Enregistrer la commande
        </Button>
      </form>
    </div>
  );
};

export default NewOrder;
