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
import OrderService, { OrderData, Order } from '@/services/order';
import { Client, ClientInvite } from '@/services/client';
import { SiteLavage } from '@/services/types';
import AuthService from '@/services/auth';
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
  // Ajustement de prix
  enableAdjustment: boolean;
  adjustmentType: 'Augmentation' | 'Diminution';
  adjustmentMethod: 'Pourcentage' | 'Absolu';
  adjustmentValue: number;
  adjustmentReason: string;
}

interface LocationState {
  selectedClient?: Client;
  guestContact?: ClientInvite;
  isNewlyCreatedAccount?: boolean;
  orderData?: OrderData;
  fromOrderRecap?: boolean;
  isEditMode?: boolean;
  editingOrderId?: number;
  orderToEdit?: Order;
}

const NewOrder: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { selectedClient, guestContact, isNewlyCreatedAccount, orderData, fromOrderRecap, isEditMode, editingOrderId, orderToEdit } = location.state as LocationState || {};
  const [sites, setSites] = useState<SiteLavage[]>([]);
  const [selectedSite, setSelectedSite] = useState<string>('');

  const [clientType, setClientType] = useState<'registered' | 'non-registered'>(
    selectedClient ? 'registered' : 'non-registered'
  );
  
  // Initialiser le formulaire avec les données existantes
  const [formData, setFormData] = useState<OrderFormData>(() => {
    // Mode édition : récupérer les données de la commande à modifier
    if (isEditMode && orderToEdit) {
      return {
        weight: orderToEdit.masseClientIndicativeKg,
        formulaType: orderToEdit.formuleCommande,
        options: orderToEdit.options,
        paymentMethod: orderToEdit.modePaiement || 'Espece',
        washSite: orderToEdit.siteLavageId?.toString() || '',
        newAddress: orderToEdit.adresseLivraison?.[0]?.adresseText || '',
        modifyAddress: !!orderToEdit.adresseLivraison?.[0]?.adresseText && orderToEdit.adresseLivraison[0].adresseText !== selectedClient?.adresseText,
        enableAdjustment: !!(orderToEdit.ajustementType && orderToEdit.ajustementValeur),
        adjustmentType: orderToEdit.ajustementType || 'Augmentation',
        adjustmentMethod: orderToEdit.ajustementMethode || 'Pourcentage',
        adjustmentValue: orderToEdit.ajustementValeur || 0,
        adjustmentReason: orderToEdit.ajustementRaison || ''
      };
    }
    
    // Mode récapitulatif : récupérer les données du récapitulatif
    if (orderData && fromOrderRecap) {
      return {
        weight: orderData.masseClientIndicativeKg,
        formulaType: orderData.formuleCommande,
        options: orderData.options,
        paymentMethod: orderData.modePaiement,
        washSite: orderData.siteLavageId?.toString() || '',
        newAddress: orderData.adresseLivraison?.adresseText || '',
        modifyAddress: !!orderData.adresseLivraison?.adresseText && orderData.adresseLivraison.adresseText !== selectedClient?.adresseText,
        enableAdjustment: !!(orderData.ajustementType && orderData.ajustementValeur),
        adjustmentType: orderData.ajustementType || 'Augmentation',
        adjustmentMethod: orderData.ajustementMethode || 'Pourcentage',
        adjustmentValue: orderData.ajustementValeur || 0,
        adjustmentReason: orderData.ajustementRaison || ''
      };
    }
    
    // Mode création : valeurs par défaut
    return {
      weight: 6,
      formulaType: 'BaseMachine',
      options: {
        aOptionRepassage: false,
        aOptionSechage: false,
        aOptionLivraison: false,
        aOptionExpress: false
      },
      paymentMethod: 'Espece',
      washSite: '',
      newAddress: '',
      modifyAddress: false,
      enableAdjustment: false,
      adjustmentType: 'Augmentation',
      adjustmentMethod: 'Pourcentage',
      adjustmentValue: 0,
      adjustmentReason: ''
    };
  });
  
  useEffect(() => {
    const loadData = async () => {
      const currentUser = AuthService.getUser();
      if (!currentUser) {
        navigate('/');
        return;
      }
      
      try {
        const sitesData = await AuthService.getSitesLavage();
        setSites(sitesData);
        
        // Prioriser le site de la commande à éditer
        if (isEditMode && orderToEdit && orderToEdit.siteLavageId) {
          setSelectedSite(orderToEdit.siteLavageId.toString());
        }
        // Sinon, prioriser le site des données de commande si on vient du récapitulatif
        else if (orderData && fromOrderRecap && orderData.siteLavageId) {
          setSelectedSite(orderData.siteLavageId.toString());
        }
        // Sinon, sélectionner le site principal du manager s'il en a un
        else if (currentUser.siteLavagePrincipalGerantId) {
          setSelectedSite(currentUser.siteLavagePrincipalGerantId.toString());
        }
      } catch (error) {
        toast.error("Erreur lors de la récupération des sites");
      }
    };

    loadData();
  }, [navigate, orderData, fromOrderRecap, isEditMode, orderToEdit]);

  // Effet pour gérer les options automatiques des clients premium sans surplus
  useEffect(() => {
    if (selectedClient?.typeClient === 'Premium') {
      // Récupérer les informations d'abonnement premium correctes
      let cumulMensuel = 0;
      if (selectedClient?.abonnementPremium?.kgUtilises !== undefined) {
        cumulMensuel = selectedClient.abonnementPremium.kgUtilises;
      } else if (isEditMode && orderToEdit?.clientUser?.abonnementPremium) {
        cumulMensuel = orderToEdit.clientUser.abonnementPremium.kgUtilises;
      }
      
      const quotaRestant = Math.max(0, PriceService.QUOTA_PREMIUM_MENSUEL - cumulMensuel);
      const surplus = Math.max(0, formData.weight - quotaRestant);
      
      // Si pas de surplus, activer automatiquement les options incluses
      if (surplus === 0) {
        setFormData(prev => ({
          ...prev,
          options: {
            ...prev.options,
            aOptionRepassage: true,
            aOptionSechage: true,
            aOptionLivraison: true,
            // aOptionExpress reste manuel
          }
        }));
      }
    }
  }, [selectedClient, formData.weight, isEditMode, orderToEdit]);

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
        newOptions.aOptionRepassage = false;
        newOptions.aOptionExpress = false; // Express dépend de la livraison
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
  
  const handleSiteChange = (value: string) => {
    setSelectedSite(value);
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

  const handleAdjustmentToggle = () => {
    setFormData({
      ...formData,
      enableAdjustment: !formData.enableAdjustment,
      // Réinitialiser tous les champs d'ajustement quand on désactive
      adjustmentType: formData.enableAdjustment ? 'Augmentation' : formData.adjustmentType,
      adjustmentMethod: formData.enableAdjustment ? 'Pourcentage' : formData.adjustmentMethod,
      adjustmentValue: formData.enableAdjustment ? 0 : formData.adjustmentValue,
      adjustmentReason: formData.enableAdjustment ? '' : formData.adjustmentReason
    });
  };

  const handleAdjustmentTypeChange = (value: 'Augmentation' | 'Diminution') => {
    setFormData({
      ...formData,
      adjustmentType: value
    });
  };

  const handleAdjustmentMethodChange = (value: 'Pourcentage' | 'Absolu') => {
    setFormData({
      ...formData,
      adjustmentMethod: value
    });
  };

  const handleAdjustmentValueChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseFloat(e.target.value) || 0;
    setFormData({
      ...formData,
      adjustmentValue: value
    });
  };

  const handleAdjustmentReasonChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setFormData({
      ...formData,
      adjustmentReason: e.target.value
    });
  };

  const submitOrder = async () => {
    if (formData.weight < 6) {
      toast.error("Le poids minimum est de 6 kg");
      return;
    }
    if (!selectedSite) {
      toast.error("Veuillez sélectionner un site de lavage");
      return;
    }
    
    if (formData.enableAdjustment) {
      if (formData.adjustmentValue <= 0) {
        toast.error("La valeur d'ajustement doit être supérieure à 0");
        return;
      }
      if (!formData.adjustmentReason.trim()) {
        toast.error("La raison de l'ajustement est obligatoire");
        return;
      }
    }

    const finalAddress = formData.modifyAddress || !selectedClient?.adresseText ? formData.newAddress : selectedClient?.adresseText;
    
    if (!finalAddress && formData.options.aOptionLivraison) {
      toast.error("Veuillez saisir une adresse de livraison");
      return;
    }

    // Calculer les prix côté frontend
    // Déterminer le type de réduction en fonction du client
    let typeReduction: 'Etudiant' | 'Ouverture' | undefined = undefined;
    if (selectedClient?.estEtudiant) {
      typeReduction = 'Etudiant';
    }
    
    const typeClient = selectedClient?.typeClient || 'Standard';
    
    // Récupérer les informations d'abonnement premium
    let cumulMensuel = 0;
    if (typeClient === 'Premium') {
      // Essayer d'abord depuis selectedClient (mode création)
      if (selectedClient?.abonnementPremium?.kgUtilises !== undefined) {
        cumulMensuel = selectedClient.abonnementPremium.kgUtilises;
      } 
      // Puis depuis orderToEdit (mode modification) 
      else if (isEditMode && orderToEdit?.clientUser?.abonnementPremium) {
        cumulMensuel = orderToEdit.clientUser.abonnementPremium.kgUtilises;
      }
    }
    
    const prixCalcule = PriceService.calculerPrixCommande(
      formData.formulaType,
      formData.weight,
      formData.options,
      formData.options.aOptionLivraison,
      typeClient,
      cumulMensuel,
      typeReduction
    );

    const orderData: OrderData = {
      clientUserId: selectedClient?.id,
      clientInvite: !selectedClient ? guestContact : undefined,
      siteLavageId: parseInt(selectedSite),
      estEnLivraison: formData.options.aOptionLivraison,
      adresseLivraison: formData.options.aOptionLivraison ? {
        adresseText: finalAddress,
        latitude: selectedClient?.coordonnees?.latitude,
        longitude: selectedClient?.coordonnees?.longitude
      } : undefined,
      masseClientIndicativeKg: formData.weight,
      formuleCommande: formData.formulaType,
      typeReduction, // Inclure le type de réduction
      options: formData.options,
      modePaiement: formData.paymentMethod,
      // Ajustement de prix
      ajustementType: formData.enableAdjustment ? formData.adjustmentType : undefined,
      ajustementMethode: formData.enableAdjustment ? formData.adjustmentMethod : undefined,
      ajustementValeur: formData.enableAdjustment ? formData.adjustmentValue : undefined,
      ajustementRaison: formData.enableAdjustment ? formData.adjustmentReason : undefined,
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

    // Mode édition : mettre à jour la commande existante
    if (isEditMode && editingOrderId) {
      try {
        const result = await OrderService.updateOrderFields(editingOrderId, orderData);
        
        if (result.success) {
          toast.success("Commande mise à jour avec succès");
          navigate('/orders');
        } else {
          toast.error("Erreur lors de la mise à jour de la commande");
        }
      } catch (error) {
        console.error('Erreur lors de la mise à jour:', error);
        toast.error("Erreur lors de la mise à jour de la commande");
      }
      return;
    }

    // Mode création ou récapitulatif : rediriger vers la page de récapitulatif
    const selectedSiteData = sites.find(site => site.id === parseInt(selectedSite));
    
    navigate('/order-recap', {
      state: {
        orderData,
        client: selectedClient,
        guestContact: !selectedClient ? guestContact : undefined,
        siteLavage: selectedSiteData
      }
    });
  };

  const goBack = () => {
    navigate('/search');
  };

  return (
    <div className="space-y-6 pb-8">
      <div className="flex items-center gap-3 sm:gap-4 mb-4 sm:mb-6">
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={goBack}
          className="shrink-0"
        >
          <ArrowLeft className="h-4 w-4 sm:h-5 sm:w-5" />
        </Button>
        <div className="min-w-0">
          <h1 className="text-lg sm:text-2xl font-bold tracking-tight">
            {fromOrderRecap ? 'Modifier la Commande' : isEditMode ? `Modifier la Commande #${editingOrderId}` : 'Nouvelle Commande'}
          </h1>
          <p className="text-sm sm:text-base text-muted-foreground truncate">
            {selectedClient ? `Client: ${selectedClient.nom} ${selectedClient.prenom}` : 'Commande sans compte client'}
            {isNewlyCreatedAccount && <span className="text-green-600 ml-2">✓ Compte créé avec succès</span>}
            {fromOrderRecap && <span className="text-blue-600 ml-2">✏️ Mode modification</span>}
            {isEditMode && <span className="text-blue-600 ml-2">✏️ Mode édition</span>}
          </p>
        </div>
      </div>



      <form onSubmit={(e) => { e.preventDefault(); submitOrder(); }} className="space-y-4 sm:space-y-6">
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
          <CardContent className="p-3 sm:p-4">
            <h2 className="font-semibold mb-3 sm:mb-4 text-sm sm:text-base">Poids indicatif (kg)</h2>
            <div className="flex items-center space-x-2">
              <Input 
                type="number" 
                min="6" 
                step="0.1" 
                value={formData.weight === 0 ? '' : formData.weight} 
                onChange={handleWeightChange} 
                className="text-base sm:text-lg font-medium"
              />
              <span className="text-base sm:text-lg">kg</span>
            </div>
            {formData.weight < 6 && (
              <p className="text-destructive text-xs sm:text-sm mt-1">Le poids minimum est de 6 kg</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-3 sm:p-4">
            <h2 className="font-semibold mb-3 sm:mb-4 text-sm sm:text-base">Formule</h2>
            
            {selectedClient?.typeClient === 'Premium' ? (
              // Logique premium
              (() => {
                // Récupérer les informations d'abonnement premium correctes
                let cumulMensuel = 0;
                if (selectedClient?.abonnementPremium?.kgUtilises !== undefined) {
                  cumulMensuel = selectedClient.abonnementPremium.kgUtilises;
                } else if (isEditMode && orderToEdit?.clientUser?.abonnementPremium) {
                  cumulMensuel = orderToEdit.clientUser.abonnementPremium.kgUtilises;
                }
                
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
                // Récupérer les informations d'abonnement premium correctes
                let cumulMensuel = 0;
                if (selectedClient?.abonnementPremium?.kgUtilises !== undefined) {
                  cumulMensuel = selectedClient.abonnementPremium.kgUtilises;
                } else if (isEditMode && orderToEdit?.clientUser?.abonnementPremium) {
                  cumulMensuel = orderToEdit.clientUser.abonnementPremium.kgUtilises;
                }
                
                const quotaRestant = Math.max(0, PriceService.QUOTA_PREMIUM_MENSUEL - cumulMensuel);
                const surplus = Math.max(0, formData.weight - quotaRestant);
                
                if (surplus === 0) {
                  // Pas de surplus : options incluses automatiquement + Express disponible
                  return (
                    <div className="space-y-3">
                      <div className="bg-green-50 rounded-lg p-3">
                        <p className="text-sm text-green-700 mb-2">
                          <strong>Inclus dans votre abonnement :</strong> collecte, lavage, séchage, repassage et livraison
                        </p>
                      </div>
                      
                      {/* Options incluses (désactivées mais cochées) */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <div className="flex items-center space-x-2 border rounded-md p-3 bg-green-50 border-green-200">
                          <Checkbox 
                            id="option-delivery-premium-included" 
                            checked={true}
                            disabled={true}
                          />
                          <div className="flex-grow">
                            <Label htmlFor="option-delivery-premium-included" className="text-green-700">Livraison ✓</Label>
                            <p className="text-xs text-green-600">Inclus</p>
                          </div>
                        </div>
                        
                        <div className="flex items-center space-x-2 border rounded-md p-3 bg-green-50 border-green-200">
                          <Checkbox 
                            id="option-drying-premium-included" 
                            checked={true}
                            disabled={true}
                          />
                          <div className="flex-grow">
                            <Label htmlFor="option-drying-premium-included" className="text-green-700">Séchage ✓</Label>
                            <p className="text-xs text-green-600">Inclus</p>
                          </div>
                        </div>
                        
                        <div className="flex items-center space-x-2 border rounded-md p-3 bg-green-50 border-green-200">
                          <Checkbox 
                            id="option-ironing-premium-included" 
                            checked={true}
                            disabled={true}
                          />
                          <div className="flex-grow">
                            <Label htmlFor="option-ironing-premium-included" className="text-green-700">Repassage ✓</Label>
                            <p className="text-xs text-green-600">Inclus</p>
                          </div>
                        </div>
                      </div>
                      
                      {/* Option Express (manuelle) */}
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
                              onCheckedChange={(checked) => handleOptionChange('aOptionSechage', checked === true)} 
                            />
                            <div className="flex-grow">
                              <Label htmlFor="option-drying-premium" className="cursor-pointer">Séchage surplus</Label>
                              <p className="text-xs text-gray-500">150 FCFA/kg</p>
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
                        onCheckedChange={(checked) => handleOptionChange('aOptionSechage', checked === true)} 
                      />
                      <div className="flex-grow">
                        <Label htmlFor="option-drying" className="cursor-pointer">Séchage</Label>
                        <p className="text-xs text-gray-500">150 FCFA/kg</p>
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
                  <SelectItem value="MobileMoney">Wave - Orange Money - autre</SelectItem>
                  <SelectItem value="Autre">Autre</SelectItem>
                </SelectContent>
              </Select>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <h2 className="font-semibold mb-3">Site de Lavage</h2>
              {sites.length > 0 && (
                <Select value={selectedSite} onValueChange={handleSiteChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner un site de lavage" />
                  </SelectTrigger>
                  <SelectContent>
                    {sites.map((site) => (
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
              )}
              {sites.length === 0 && <p>Chargement des sites...</p>}
            </CardContent>
          </Card>
        </div>

        {/* Section d'ajustement de prix */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-base">Ajustement de prix</h2>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="enable-adjustment"
                  checked={formData.enableAdjustment}
                  onCheckedChange={handleAdjustmentToggle}
                />
                <Label htmlFor="enable-adjustment" className="text-sm cursor-pointer">
                  Activer l'ajustement
                </Label>
              </div>
            </div>

            {formData.enableAdjustment && (
              <div className="space-y-4 p-4 bg-gray-50 rounded-lg">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Type d'ajustement */}
                  <div>
                    <Label className="text-sm font-medium mb-2 block">Type d'ajustement</Label>
                    <Select value={formData.adjustmentType} onValueChange={handleAdjustmentTypeChange}>
                      <SelectTrigger>
                        <SelectValue placeholder="Sélectionner le type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Augmentation">Augmentation</SelectItem>
                        <SelectItem value="Diminution">Diminution</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Méthode d'ajustement */}
                  <div>
                    <Label className="text-sm font-medium mb-2 block">Méthode de calcul</Label>
                    <Select value={formData.adjustmentMethod} onValueChange={handleAdjustmentMethodChange}>
                      <SelectTrigger>
                        <SelectValue placeholder="Sélectionner la méthode" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Pourcentage">Pourcentage (%)</SelectItem>
                        <SelectItem value="Absolu">Montant absolu (FCFA)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Valeur d'ajustement */}
                <div>
                  <Label className="text-sm font-medium mb-2 block">
                    Valeur {formData.adjustmentMethod === 'Pourcentage' ? 'en pourcentage' : 'en FCFA'}
                  </Label>
                  <div className="flex items-center space-x-2">
                    <Input
                      type="number"
                      min="0"
                      value={formData.adjustmentValue === 0 ? '' : formData.adjustmentValue}
                      onChange={handleAdjustmentValueChange}
                      placeholder={formData.adjustmentMethod === 'Pourcentage' ? '10' : '1000'}
                      className="flex-1"
                    />
                    <span className="text-sm text-gray-500">
                      {formData.adjustmentMethod === 'Pourcentage' ? '%' : 'FCFA'}
                    </span>
                  </div>
                </div>

                {/* Raison de l'ajustement */}
                <div>
                  <Label className="text-sm font-medium mb-2 block">
                    Raison de l'ajustement <span className="text-red-500">*</span>
                  </Label>
                  <Textarea
                    value={formData.adjustmentReason}
                    onChange={handleAdjustmentReasonChange}
                    placeholder="Expliquez pourquoi le prix est ajusté (ex: service supplémentaire, réduction négociée, etc.)"
                    className="min-h-[80px]"
                  />
                </div>

                {/* Aperçu de l'ajustement */}
                {formData.adjustmentValue > 0 && (
                  <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <div className="text-sm">
                      <span className="font-medium">Aperçu de l'ajustement : </span>
                      <span className={`font-semibold ${formData.adjustmentType === 'Augmentation' ? 'text-green-600' : 'text-red-600'}`}>
                        {formData.adjustmentType === 'Augmentation' ? '+' : '-'}
                        {formData.adjustmentMethod === 'Pourcentage' 
                          ? `${formData.adjustmentValue}%` 
                          : `${formData.adjustmentValue.toLocaleString()} FCFA`
                        }
                      </span>
                    </div>
                  </div>
                )}
              </div>
            )}

            {!formData.enableAdjustment && (
              <div className="text-sm text-gray-500 italic p-4 bg-gray-50 rounded-lg">
                Activez l'ajustement pour modifier le prix de la commande manuellement.
              </div>
            )}
          </CardContent>
        </Card>

        {/* Résumé des prix */}
        <PriceSummaryCard
          formule={formData.formulaType}
          poids={formData.weight}
          options={formData.options}
          estLivraison={formData.options.aOptionLivraison}
          estEtudiant={selectedClient?.estEtudiant}
          typeClient={selectedClient?.typeClient || 'Standard'}
          cumulMensuel={(() => {
            // Utiliser la même logique que pour le calcul principal
            if ((selectedClient?.typeClient || 'Standard') === 'Premium') {
              if (selectedClient?.abonnementPremium?.kgUtilises !== undefined) {
                return selectedClient.abonnementPremium.kgUtilises;
              } else if (isEditMode && orderToEdit?.clientUser?.abonnementPremium) {
                return orderToEdit.clientUser.abonnementPremium.kgUtilises;
              }
            }
            return 0;
          })()}
          hasAdjustment={formData.enableAdjustment}
          adjustmentType={formData.adjustmentType}
          adjustmentMethod={formData.adjustmentMethod}
          adjustmentValue={formData.adjustmentValue}
          adjustmentReason={formData.adjustmentReason}
        />

        <Button type="submit" className="w-full bg-primary hover:bg-primary/90 text-lg py-6">
          {fromOrderRecap ? 'Mettre à jour le récapitulatif' : isEditMode ? 'Mettre à jour la commande' : 'Voir le récapitulatif'}
        </Button>
      </form>
    </div>
  );
};

export default NewOrder;