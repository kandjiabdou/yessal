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
import { ArrowLeft, Crown, AlertCircle } from 'lucide-react';
import { ClientInfoCard } from '@/components/order/ClientInfoCard';
import { ClientAddressSection } from '@/components/order/ClientAddressSection';
import { FormulaPricingSection } from '@/components/order/FormulaPricingSection';
import { OptionsSection } from '@/components/order/OptionsSection';
import { OrderSummaryCard } from '@/components/order/OrderSummaryCard';
import { PriceSummaryCard } from '@/components/order/PriceSummaryCard';
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import OrderService, { OrderData } from '@/services/order';
import { Client, ClientInvite } from '@/services/client';
import { SiteLavage } from '@/services/types';
import AuthService from '@/services/auth';
import { useAuth } from '@/hooks/useAuth';
import { PriceService } from '@/services/price';

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
  isNewlyCreatedAccount?: boolean;
  orderData?: OrderData;
  fromOrderRecap?: boolean;
}

const NewOrder: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { selectedClient, guestContact, isNewlyCreatedAccount } = location.state as LocationState || {};
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
        
        // Si on a des données de commande existantes, on les charge
        const state = location.state as LocationState;
        if (state?.orderData) {
          setFormData({
            weight: state.orderData.masseClientIndicativeKg,
            formulaType: state.orderData.formuleCommande,
            options: {
              aOptionRepassage: state.orderData.options.aOptionRepassage,
              aOptionSechage: state.orderData.options.aOptionSechage,
              aOptionLivraison: state.orderData.options.aOptionLivraison,
              aOptionExpress: state.orderData.options.aOptionExpress
            },
            paymentMethod: state.orderData.modePaiement,
            washSite: state.orderData.siteLavageId.toString(),
            newAddress: state.orderData.adresseLivraison?.adresseText || '',
            modifyAddress: !!state.orderData.adresseLivraison
          });
        } else if (user?.siteLavagePrincipalGerantId) {
          // Si pas de données existantes mais un site par défaut, on le sélectionne
          setFormData(prev => ({
            ...prev,
            washSite: user.siteLavagePrincipalGerantId.toString()
          }));
        }
      } catch (error) {
        console.error('Erreur lors du chargement des sites:', error);
        toast.error('Erreur lors du chargement des sites de lavage');
      }
    };

    loadSitesLavage();
  }, [location.state, user?.siteLavagePrincipalGerantId]);

  const handleWeightChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    const weight = parseFloat(value);
    
    // Permettre la saisie même si temporairement < 6
    setFormData({
      ...formData,
      weight: weight || 0
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
        // Si livraison est décochée, décocher aussi modifier adresse
        setFormData({
          ...formData,
          options: newOptions,
          modifyAddress: false,
          newAddress: ''
        });
        return;
      } else {
        // Si livraison est cochée, cocher automatiquement "modifier adresse" si pas d'adresse existante
        const shouldAutoCheckAddress = !selectedClient?.adresseText;
        setFormData({
          ...formData,
          options: newOptions,
          modifyAddress: shouldAutoCheckAddress
        });
        return;
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

    // Calculer les prix côté frontend
    const typeReduction = selectedClient?.estEtudiant ? 'Etudiant' : undefined;
    const typeClient = selectedClient?.typeClient || 'Standard';
    const cumulMensuel = selectedClient?.mensuelleUsage || 0;
    
    const prixCalcule = PriceService.calculerPrixCommande(
      formData.formulaType,
      formData.weight,
      formData.options,
      formData.options.aOptionLivraison,
      typeClient,
      cumulMensuel,
      typeReduction
    );

    // Calculer les détails premium pour l'affichage conditionnel
    const premiumQuotaDetails = selectedClient?.typeClient === 'Premium' ? {
      cumulMensuel: selectedClient.mensuelleUsage || 0,
      quotaRestant: Math.max(0, PriceService.QUOTA_PREMIUM_MENSUEL - (selectedClient.mensuelleUsage || 0)),
      surplus: Math.max(0, formData.weight - Math.max(0, PriceService.QUOTA_PREMIUM_MENSUEL - (selectedClient.mensuelleUsage || 0)))
    } : null;

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
      typeReduction,
      options: formData.options,
      modePaiement: formData.paymentMethod,
      // Prix calculés côté frontend
      prixCalcule: {
        prixBase: prixCalcule.prixBase,
        prixOptions: prixCalcule.prixOptions,
        prixSousTotal: prixCalcule.prixSousTotal,
        prixFinal: prixCalcule.prixFinal,
        formule: formData.formulaType,
        options: prixCalcule.options,
        reduction: prixCalcule.reduction || undefined,
        repartitionMachines: prixCalcule.repartitionMachines || undefined,
        premiumDetails: prixCalcule.premiumDetails || undefined
      }
    };

    // Trouver le site de lavage sélectionné
    const selectedSite = sitesLavage.find(site => site.id === parseInt(formData.washSite));
    
    // Rediriger vers la page de récapitulatif
    navigate('/order-recap', {
      state: {
        orderData,
        client: selectedClient,
        guestContact: !selectedClient ? guestContact : undefined,
        siteLavage: selectedSite
      }
    });
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
            {isNewlyCreatedAccount && <span className="text-green-600 ml-2">✓ Compte créé avec succès</span>}
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
            
            {selectedClient?.typeClient === 'Premium' ? (
              // Logique premium
              (() => {
                const cumulMensuel = selectedClient.mensuelleUsage || 0;
                const quotaRestant = Math.max(0, PriceService.QUOTA_PREMIUM_MENSUEL - cumulMensuel);
                const surplus = Math.max(0, formData.weight - quotaRestant);
                
                if (surplus === 0) {
                  // Pas de surplus : masquer les formules, afficher message
                  return (
                    <div className="bg-amber-50 rounded-lg p-4 border border-amber-200">
                      <div className="flex items-center gap-2 mb-2">
                        <Crown className="h-5 w-5 text-amber-600" />
                        <span className="font-medium text-amber-800">Client Premium</span>
                      </div>
                      <p className="text-sm text-amber-700 mb-3">
                        Ce poids est couvert par votre abonnement mensuel ({PriceService.QUOTA_PREMIUM_MENSUEL} kg/mois).
                        Tous les services sont inclus sauf Express.
                      </p>
                      <div className="text-xs text-amber-600">
                        <div>Quota mensuel : {PriceService.QUOTA_PREMIUM_MENSUEL} kg</div>
                        <div>Déjà utilisé : {cumulMensuel} kg</div>
                        <div>Quota restant : {quotaRestant} kg</div>
                      </div>
                    </div>
                  );
                } else if (surplus < 6) {
                  // Surplus < 6 : formule détaillée obligatoire
                  return (
                    <div className="space-y-3">
                      <div className="bg-amber-50 rounded-lg p-3 border border-amber-200">
                        <div className="text-sm text-amber-700">
                          <div>Poids couvert par abonnement : {formData.weight - surplus} kg</div>
                          <div className="text-red-600 font-medium">Surplus à facturer : {surplus} kg</div>
                        </div>
                      </div>
                      <div className="bg-orange-50 border-l-4 border-orange-400 p-3">
                        <div className="flex items-center">
                          <AlertCircle className="h-4 w-4 text-orange-400 mr-2" />
                          <span className="text-sm text-orange-700">
                            Surplus inférieur à 6 kg : formule détaillée obligatoire
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                } else {
                  // Surplus ≥ 6 : choix entre formules
                  return (
                    <div className="space-y-3">
                      <div className="bg-amber-50 rounded-lg p-3 border border-amber-200">
                        <div className="text-sm text-amber-700">
                          <div>Poids couvert par abonnement : {formData.weight - surplus} kg</div>
                          <div className="text-red-600 font-medium">Surplus à facturer : {surplus} kg</div>
                        </div>
                      </div>
                      <RadioGroup 
                        value={formData.formulaType} 
                        onValueChange={handleFormulaChange} 
                        className="space-y-2"
                      >
                        <div className="flex items-center space-x-2 border rounded-md p-3 hover:bg-gray-50 cursor-pointer">
                          <RadioGroupItem value="BaseMachine" id="formula-base" />
                          <Label htmlFor="formula-base" className="flex-grow cursor-pointer">
                            <div>
                              <span className="font-medium">Formule de base (pour le surplus)</span>
                              <p className="text-xs text-gray-500 mt-0.5">
                                Lavage en machine pour les {surplus} kg de surplus
                              </p>
                            </div>
                          </Label>
                        </div>
                        <div className="flex items-center space-x-2 border rounded-md p-3 hover:bg-gray-50 cursor-pointer">
                          <RadioGroupItem value="Detail" id="formula-detailed" />
                          <Label htmlFor="formula-detailed" className="flex-grow cursor-pointer">
                            <div>
                              <span className="font-medium">Formule détaillée (pour le surplus)</span>
                              <p className="text-xs text-gray-500 mt-0.5">
                                Traitement détaillé pour les {surplus} kg de surplus
                              </p>
                            </div>
                          </Label>
                        </div>
                      </RadioGroup>
                    </div>
                  );
                }
              })()
            ) : (
              // Logique client standard
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
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <h2 className="font-semibold mb-4">Options</h2>
            
            {/* Logique pour clients premium */}
            {selectedClient?.typeClient === 'Premium' ? (
              (() => {
                const cumulMensuel = selectedClient.mensuelleUsage || 0;
                const quotaRestant = Math.max(0, PriceService.QUOTA_PREMIUM_MENSUEL - cumulMensuel);
                const surplus = Math.max(0, formData.weight - quotaRestant);
                
                if (surplus === 0) {
                  // Pas de surplus : seulement Express disponible
                  return (
                    <div className="space-y-3">
                      <div className="bg-green-50 rounded-lg p-3">
                        <p className="text-sm text-green-700 mb-2">
                          <strong>Inclus dans votre abonnement :</strong> collecte, lavage, séchage, repassage et livraison
                        </p>
                      </div>
                      
                      <div className="flex items-center space-x-2 border rounded-md p-3 hover:bg-gray-50">
                        <Checkbox 
                          id="option-express-premium" 
                          checked={formData.options.aOptionExpress} 
                          onCheckedChange={(checked) => handleOptionChange('aOptionExpress', checked === true)} 
                        />
                        <div className="flex-grow">
                          <Label htmlFor="option-express-premium" className="cursor-pointer">Express (6h)</Label>
                          <p className="text-xs text-gray-500">+1 000 FCFA</p>
                        </div>
                      </div>
                    </div>
                  );
                } else {
                  // Surplus : options standard pour le surplus seulement
                  if (formData.formulaType === 'BaseMachine') {
                    return (
                      <div className="space-y-3">
                        <div className="bg-amber-50 rounded-lg p-3">
                          <p className="text-sm text-amber-700">
                            Options pour le surplus de {surplus} kg (le reste est couvert par l'abonnement) :
                          </p>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          <div className="flex items-center space-x-2 border rounded-md p-3 hover:bg-gray-50">
                            <Checkbox 
                              id="option-delivery-premium" 
                              checked={formData.options.aOptionLivraison} 
                              onCheckedChange={(checked) => handleOptionChange('aOptionLivraison', checked === true)} 
                            />
                            <div className="flex-grow">
                              <Label htmlFor="option-delivery-premium" className="cursor-pointer">Livraison surplus</Label>
                              <p className="text-xs text-gray-500">+1 000 FCFA</p>
                            </div>
                          </div>
                          
                          <div className="flex items-center space-x-2 border rounded-md p-3 hover:bg-gray-50">
                            <Checkbox 
                              id="option-drying-premium" 
                              checked={formData.options.aOptionSechage} 
                              disabled={!formData.options.aOptionLivraison}
                              onCheckedChange={(checked) => handleOptionChange('aOptionSechage', checked === true)} 
                            />
                            <div className="flex-grow">
                              <Label htmlFor="option-drying-premium" className="cursor-pointer">Séchage surplus</Label>
                              <p className="text-xs text-gray-500">150 FCFA/kg</p>
                              {!formData.options.aOptionLivraison && (
                                <p className="text-xs text-amber-600">Nécessite la livraison</p>
                              )}
                            </div>
                          </div>
                          
                          <div className="flex items-center space-x-2 border rounded-md p-3 hover:bg-gray-50">
                            <Checkbox 
                              id="option-express-premium-surplus" 
                              checked={formData.options.aOptionExpress} 
                              onCheckedChange={(checked) => handleOptionChange('aOptionExpress', checked === true)} 
                            />
                            <div className="flex-grow">
                              <Label htmlFor="option-express-premium-surplus" className="cursor-pointer">Express (6h)</Label>
                              <p className="text-xs text-gray-500">+1 000 FCFA</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  } else {
                    // Formule détaillée pour surplus
                    return (
                      <div className="space-y-3">
                        <div className="bg-amber-50 rounded-lg p-3">
                          <p className="text-sm text-amber-700">
                            Surplus de {surplus} kg traité en formule détaillée (services inclus sauf Express).
                          </p>
                        </div>
                        
                        <div className="flex items-center space-x-2 border rounded-md p-3 hover:bg-gray-50">
                          <Checkbox 
                            id="option-express-premium-detail" 
                            checked={formData.options.aOptionExpress} 
                            onCheckedChange={(checked) => handleOptionChange('aOptionExpress', checked === true)} 
                          />
                          <div className="flex-grow">
                            <Label htmlFor="option-express-premium-detail" className="cursor-pointer">Express (6h)</Label>
                            <p className="text-xs text-gray-500">+1 000 FCFA</p>
                          </div>
                        </div>
                      </div>
                    );
                  }
                }
              })()
            ) : (
              /* Logique client standard */
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {formData.formulaType === 'BaseMachine' && (
                  <>
                    <div className="flex items-center space-x-2 border rounded-md p-3 hover:bg-gray-50">
                      <Checkbox 
                        id="option-delivery" 
                        checked={formData.options.aOptionLivraison} 
                        onCheckedChange={(checked) => handleOptionChange('aOptionLivraison', checked === true)} 
                      />
                      <div className="flex-grow">
                        <Label htmlFor="option-delivery" className="cursor-pointer">Livraison</Label>
                        <p className="text-xs text-gray-500">+1 000 FCFA</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-2 border rounded-md p-3 hover:bg-gray-50">
                      <Checkbox 
                        id="option-drying" 
                        checked={formData.options.aOptionSechage} 
                        disabled={!formData.options.aOptionLivraison}
                        onCheckedChange={(checked) => handleOptionChange('aOptionSechage', checked === true)} 
                      />
                      <div className="flex-grow">
                        <Label htmlFor="option-drying" className="cursor-pointer">Séchage</Label>
                        <p className="text-xs text-gray-500">150 FCFA/kg</p>
                        {!formData.options.aOptionLivraison && (
                          <p className="text-xs text-amber-600">Nécessite l'option Livraison</p>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-2 border rounded-md p-3 hover:bg-gray-50">
                      <Checkbox 
                        id="option-express" 
                        checked={formData.options.aOptionExpress} 
                        disabled={!formData.options.aOptionLivraison}
                        onCheckedChange={(checked) => handleOptionChange('aOptionExpress', checked === true)} 
                      />
                      <div className="flex-grow">
                        <Label htmlFor="option-express" className="cursor-pointer">Express (6h)</Label>
                        <p className="text-xs text-gray-500">+1 000 FCFA</p>
                        {!formData.options.aOptionLivraison && (
                          <p className="text-xs text-amber-600">Nécessite l'option Livraison</p>
                        )}
                      </div>
                    </div>
                  </>
                )}
                
                {formData.formulaType === 'Detail' && (
                  <div className="flex items-center space-x-2 border rounded-md p-3 hover:bg-gray-50">
                    <Checkbox 
                      id="option-express" 
                      checked={formData.options.aOptionExpress} 
                      onCheckedChange={(checked) => handleOptionChange('aOptionExpress', checked === true)} 
                    />
                    <div className="flex-grow">
                      <Label htmlFor="option-express" className="cursor-pointer">Express (6h)</Label>
                      <p className="text-xs text-gray-500">+1 000 FCFA</p>
                    </div>
                  </div>
                )}
              </div>
            )}
            
            {/* Message pour formule détaillée client standard */}
            {selectedClient?.typeClient !== 'Premium' && formData.formulaType === 'Detail' && (
              <div className="mt-3 p-3 bg-green-50 rounded-lg">
                <p className="text-sm text-green-700">
                  <strong>Inclus dans la formule détaillée :</strong> collecte, lavage, séchage, repassage et livraison
                </p>
              </div>
            )}
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

        {/* Résumé des prix */}
        <PriceSummaryCard
          formule={formData.formulaType}
          poids={formData.weight}
          options={formData.options}
          estLivraison={formData.options.aOptionLivraison}
          estEtudiant={selectedClient?.estEtudiant}
          typeClient={selectedClient?.typeClient || 'Standard'}
          cumulMensuel={selectedClient?.mensuelleUsage || 0}
        />

        <Button type="submit" className="w-full bg-primary hover:bg-primary/90 text-lg py-6">
          Voir le récapitulatif
        </Button>
      </form>
    </div>
  );
};

export default NewOrder;
