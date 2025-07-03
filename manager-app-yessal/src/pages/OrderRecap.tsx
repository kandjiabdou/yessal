import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import { ArrowLeft, Crown } from 'lucide-react';
import { Client, ClientInvite } from '@/services/client';
import ClientService from '@/services/client';
import OrderService, { OrderData } from '@/services/order';
import { SiteLavage } from '@/services/types';
import { useAuth } from '@/hooks/useAuth';
import { PriceService } from '@/services/price';

interface OrderRecapProps {
  orderData: OrderData;
  client?: Client;
  siteLavage?: SiteLavage;
  guestContact?: ClientInvite;
}

const OrderRecap: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { orderData, client, siteLavage, guestContact } = location.state as OrderRecapProps;

  const handleModify = () => {
    navigate('/new-order', { 
      state: { 
        selectedClient: client,
        guestContact,
        orderData: {
          ...orderData,
          siteLavageId: siteLavage?.id || user?.siteLavagePrincipalGerantId || orderData.siteLavageId
        },
        fromOrderRecap: true
      } 
    });
  };

  const handleCancel = () => {
    navigate('/search');
  };

  const handleSubmit = async () => {
    try {
      // Créer la commande directement (la création de compte est gérée avant)
      const result = await OrderService.createOrder({
        ...orderData,
        siteLavageId: siteLavage?.id || user?.siteLavagePrincipalGerantId || orderData.siteLavageId
      });

      if (result.success && result.order) {
        toast.success("Commande créée avec succès");
        navigate('/orders');
      } else {
        toast.error("Erreur lors de la création de la commande");
      }
    } catch (error) {
      console.error('Erreur lors de la création de la commande:', error);
      toast.error("Une erreur est survenue");
    }
  };

  // Extraire les détails du prix calculé
  const prixDetails = orderData.prixCalcule;
  const isPremium = client?.typeClient === 'Premium';

  return (
    <div className="space-y-6 pb-8">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" onClick={handleModify} className="h-8 w-8">
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h1 className="text-2xl font-semibold">Récapitulatif de la commande</h1>
      </div>

      <Card>
        <CardContent className="p-4 space-y-4">
          <div>
            <h2 className="font-semibold mb-2">Client</h2>
            {client ? (
              <div>
                <div className="flex items-center gap-2">
                  <span>{client.nom} {client.prenom}</span>
                  {isPremium && <Crown className="h-4 w-4 text-amber-500" />}
                  {client.estEtudiant && (
                    <span className="bg-blue-100 text-blue-700 text-xs px-2 py-0.5 rounded-full">
                      Étudiant
                    </span>
                  )}
                </div>
                {client.carteNumero && (
                  <p className="text-sm text-muted-foreground">
                    Carte de fidélité: <span className="font-mono bg-blue-50 text-blue-700 px-1 rounded">{client.carteNumero}</span>
                  </p>
                )}
                {isPremium && (
                  <p className="text-sm text-amber-600">
                    Quota mensuel: {prixDetails?.premiumDetails?.cumulMensuel || 0}/{PriceService.QUOTA_PREMIUM_MENSUEL} kg
                  </p>
                )}
              </div>
            ) : guestContact ? (
              <div>
                <p>Non inscrit - {guestContact.nom} {guestContact.prenom}</p>
                {guestContact.telephone && <p className="text-sm text-muted-foreground">Tél: {guestContact.telephone}</p>}
                {guestContact.email && <p className="text-sm text-muted-foreground">Email: {guestContact.email}</p>}
              </div>
            ) : (
              <p>Non inscrit - Commande anonyme</p>
            )}
          </div>

          <div>
            <h2 className="font-semibold mb-2">Site de lavage</h2>
            <p>{siteLavage?.nom || 'Site principal'} - {siteLavage?.ville}</p>
          </div>

          <div>
            <h2 className="font-semibold mb-2">Détails de la commande</h2>
            <ul className="space-y-2">
              <li>Poids indicatif : {orderData.masseClientIndicativeKg} kg</li>
              <li>Formule : {orderData.formuleCommande === 'BaseMachine' ? 'Formule de base' : 'Formule détaillée'}</li>
              <li>Mode de paiement : {
                orderData.modePaiement === 'Espece' ? 'Espèces' :
                orderData.modePaiement === 'MobileMoney' ? 'Orange Money' : 'Autre'
              }</li>
            </ul>
          </div>

          <div>
            <h2 className="font-semibold mb-2">Options sélectionnées</h2>
            <ul className="space-y-1">
              {orderData.options.aOptionLivraison && (
                <li>✓ Livraison {orderData.adresseLivraison?.adresseText && `(${orderData.adresseLivraison.adresseText})`}</li>
              )}
              {orderData.options.aOptionSechage && <li>✓ Séchage</li>}
              {orderData.options.aOptionRepassage && <li>✓ Repassage</li>}
              {orderData.options.aOptionExpress && <li>✓ Express (6h)</li>}
            </ul>
          </div>
        </CardContent>
      </Card>

      {/* Détails de la tarification */}
      <Card>
        <CardContent className="p-4 space-y-4">
          <h2 className="font-semibold mb-3">Détails de la tarification</h2>
          
          {/* Affichage spécial pour clients Premium */}
          {isPremium && prixDetails?.premiumDetails ? (
            <div className="space-y-3">
              <div className="bg-amber-50 rounded-lg p-3 border border-amber-200">
                <div className="flex items-center gap-2 mb-2">
                  <Crown className="h-4 w-4 text-amber-600" />
                  <span className="font-medium text-amber-800">Client Premium</span>
                </div>
                <div className="text-sm text-amber-700 space-y-1">
                  <div>Quota mensuel : {prixDetails.premiumDetails.quotaMensuel} kg</div>
                  <div>Déjà utilisé : {prixDetails.premiumDetails.cumulMensuel} kg</div>
                  <div>Quota restant : {prixDetails.premiumDetails.quotaRestant} kg</div>
                  <div>Poids couvert : {prixDetails.premiumDetails.poidsCouvert} kg</div>
                  {prixDetails.premiumDetails.surplus > 0 && (
                    <div className="text-red-600 font-medium">Surplus à facturer : {prixDetails.premiumDetails.surplus} kg</div>
                  )}
                </div>
              </div>
              
              {prixDetails.premiumDetails.estCouvertParAbonnement && (
                <div className="bg-green-50 rounded-lg p-3">
                  <p className="text-sm text-green-700">
                    <strong>Services inclus dans l'abonnement :</strong> collecte, lavage, séchage, repassage, livraison
                  </p>
                </div>
              )}
              
              {/* Répartition des machines - Toujours affichée même pour Premium */}
              <div className="bg-blue-50 rounded-lg p-3">
                <h3 className="font-medium text-blue-800 mb-2">
                  Répartition des machines
                  {prixDetails.premiumDetails.surplus > 0 && (
                    <span className="text-xs text-orange-600 ml-2">(pour le surplus facturé)</span>
                  )}
                </h3>
                <div className="text-sm text-blue-700 space-y-1">
                  {(() => {
                    // Utiliser la répartition existante ou calculer une nouvelle
                    let repartition;
                    
                    if (prixDetails?.repartitionMachines) {
                      repartition = prixDetails.repartitionMachines;
                    } else {
                      // Calculer la répartition pour le poids total
                      const calcul = PriceService.calculerRepartitionMachines(orderData.masseClientIndicativeKg);
                      repartition = {
                        machine20kg: calcul.nombreMachine20kg,
                        machine6kg: calcul.nombreMachine6kg
                      };
                    }
                    
                    return (
                      <>
                        {repartition.machine20kg > 0 && (
                          <div>Machine 20kg : {repartition.machine20kg} fois × {PriceService.PRIX_MACHINE_20KG} FCFA = {repartition.machine20kg * PriceService.PRIX_MACHINE_20KG} FCFA</div>
                        )}
                        {repartition.machine6kg > 0 && (
                          <div>Machine 6kg : {repartition.machine6kg} fois × {PriceService.PRIX_MACHINE_6KG} FCFA = {repartition.machine6kg * PriceService.PRIX_MACHINE_6KG} FCFA</div>
                        )}
                      </>
                    );
                  })()}
                </div>
              </div>
            </div>
          ) : (
            /* Affichage pour clients standard */
            <div className="space-y-3">
              <div>
                <span className="font-medium">Formule : </span>
                {orderData.formuleCommande === 'BaseMachine' ? 'Formule de base (machines)' : 'Formule détaillée (au kilo)'}
              </div>
              
              {/* Répartition des machines - Toujours affichée */}
              <div className="bg-blue-50 rounded-lg p-3">
                <h3 className="font-medium text-blue-800 mb-2">Répartition des machines</h3>
                <div className="text-sm text-blue-700 space-y-1">
                  {(() => {
                    // Utiliser la répartition existante ou calculer une nouvelle
                    let repartition;
                    
                    if (prixDetails?.repartitionMachines) {
                      repartition = prixDetails.repartitionMachines;
                    } else {
                      // Calculer la répartition pour le poids total
                      const calcul = PriceService.calculerRepartitionMachines(orderData.masseClientIndicativeKg);
                      repartition = {
                        machine20kg: calcul.nombreMachine20kg,
                        machine6kg: calcul.nombreMachine6kg
                      };
                    }
                    
                    return (
                      <>
                        {repartition.machine20kg > 0 && (
                          <div>Machine 20kg : {repartition.machine20kg} fois × {PriceService.PRIX_MACHINE_20KG} FCFA = {repartition.machine20kg * PriceService.PRIX_MACHINE_20KG} FCFA</div>
                        )}
                        {repartition.machine6kg > 0 && (
                          <div>Machine 6kg : {repartition.machine6kg} fois × {PriceService.PRIX_MACHINE_6KG} FCFA = {repartition.machine6kg * PriceService.PRIX_MACHINE_6KG} FCFA</div>
                        )}
                      </>
                    );
                  })()}
                </div>
              </div>
              
              {/* Services inclus pour formule détaillée */}
              {orderData.formuleCommande === 'Detail' && (
                <div className="bg-green-50 rounded-lg p-3">
                  <p className="text-sm text-green-700">
                    <strong>Services inclus :</strong> collecte, lavage, séchage, repassage, livraison
                  </p>
                  <p className="text-sm text-green-600 mt-1">
                    Tarif : {orderData.masseClientIndicativeKg} kg × {PriceService.PRIX_AU_KILO} FCFA/kg = {orderData.masseClientIndicativeKg * PriceService.PRIX_AU_KILO} FCFA
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Détail des prix */}
          <div className="border-t pt-3 space-y-2">
            <div className="flex justify-between">
              <span>Prix de base :</span>
              <span>{PriceService.formaterPrix(prixDetails?.prixBase || 0)}</span>
            </div>
            
            {prixDetails?.options && Object.keys(prixDetails.options).length > 0 && (
              <>
                <div className="text-sm font-medium">Options :</div>
                {prixDetails.options.livraison && (
                  <div className="flex justify-between text-sm pl-4">
                    <span>• Livraison</span>
                    <span>{PriceService.formaterPrix(prixDetails.options.livraison)}</span>
                  </div>
                )}
                {prixDetails.options.sechage && (
                  <div className="flex justify-between text-sm pl-4">
                    <span>• Séchage ({prixDetails.options.sechage.poids} kg)</span>
                    <span>{PriceService.formaterPrix(prixDetails.options.sechage.prix)}</span>
                  </div>
                )}
                {prixDetails.options.express && (
                  <div className="flex justify-between text-sm pl-4">
                    <span>• Express (6h)</span>
                    <span>{PriceService.formaterPrix(prixDetails.options.express)}</span>
                  </div>
                )}
              </>
            )}
            
            <div className="flex justify-between border-t pt-2">
              <span>Sous-total :</span>
              <span>{PriceService.formaterPrix(prixDetails?.prixSousTotal || 0)}</span>
            </div>
            
            {prixDetails?.reduction && prixDetails.reduction.montantReduction > 0 && (
              <div className="flex justify-between text-green-600">
                <span>Réduction ({prixDetails.reduction.raisonReduction}) :</span>
                <span>-{PriceService.formaterPrix(prixDetails.reduction.montantReduction)}</span>
              </div>
            )}
            
            <div className="flex justify-between font-bold text-lg border-t pt-2">
              <span>Total :</span>
              <span className="text-primary">{PriceService.formaterPrix(prixDetails?.prixFinal || 0)}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end gap-4">
        <Button variant="outline" onClick={handleCancel}>
          Annuler
        </Button>
        <Button variant="outline" onClick={handleModify}>
          Modifier
        </Button>
        <Button onClick={handleSubmit}>
          Confirmer la commande
        </Button>
      </div>
    </div>
  );
};

export default OrderRecap; 