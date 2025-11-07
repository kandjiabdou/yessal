import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "react-toastify";
import { ArrowLeft, Crown } from 'lucide-react';
import { Client, ClientInvite } from '@/services/client';
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
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const handleModify = () => {
    navigate('/laverie/new-order', { 
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
    navigate('/laverie/search');
  };

  const handleDelete = () => {
    // Vérifier si la commande peut être supprimée (moins de 24h après création)
    if (orderData.id) {
      const orderDate = new Date(orderData.createdAt || orderData.dateHeureCommande || new Date());
      const now = new Date();
      const timeDiff = now.getTime() - orderDate.getTime();
      const hoursDiff = timeDiff / (1000 * 3600); // Convertir en heures
      
      if (hoursDiff >= 24) {
        toast.error(`Cette commande ne peut plus être supprimée car elle a été créée il y a ${Math.floor(hoursDiff)}h. Les suppressions ne sont autorisées que dans les 24h suivant la création.`);
        return;
      }

      // Ouvrir le dialogue de confirmation
      setShowDeleteDialog(true);
    }
  };

  const confirmDelete = async () => {
    try {
      if (orderData.id) {
        const result = await OrderService.deleteOrder(orderData.id);
        if (result.success) {
          toast.success("Commande supprimée avec succès");
          navigate('/laverie/orders');
        } else {
          toast.error("Erreur lors de la suppression de la commande");
        }
      }
    } catch (error) {
      console.error('Erreur lors de la suppression de la commande:', error);
      toast.error("Une erreur est survenue");
    } finally {
      setShowDeleteDialog(false);
    }
  };

  const handleSubmit = async () => {
    try {
      // Créer la commande directement (la réduction fidélité est déjà appliquée dans prixCalcule)
      const result = await OrderService.createOrder({
        ...orderData,
        siteLavageId: siteLavage?.id || user?.siteLavagePrincipalGerantId || orderData.siteLavageId
      });

      if (result.success && result.order) {
        toast.success("Commande créée avec succès");
        navigate('/laverie/orders');
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

  // Vérifier si la commande peut être modifiée/supprimée (moins de 24h après création)
  const canModifyOrDelete = () => {
    if (!orderData.id || (!orderData.createdAt && !orderData.dateHeureCommande)) return true; // Nouvelle commande, autorisée
    
    // Pour les commandes existantes, vérifier si c'est le gérant créateur
    // Note: dans OrderRecap, nous n'avons pas directement les infos du gérant créateur
    // La vérification sera faite côté backend si nécessaire
    
    const orderDate = new Date(orderData.createdAt || orderData.dateHeureCommande || new Date());
    const now = new Date();
    const timeDiff = now.getTime() - orderDate.getTime();
    const hoursDiff = timeDiff / (1000 * 3600); // Convertir en heures
    
    return hoursDiff < 24;
  };

  const isModifiable = canModifyOrDelete();

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

      {/* Section: Affichage de l'utilisation automatique du crédit fidélité */}
      {prixDetails?.fidelite && prixDetails.fidelite.creditUtilise > 0 && (
        <Card className="border-blue-200 bg-blue-50">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-blue-600 font-semibold">Crédit fidélité appliqué automatiquement</span>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="font-medium">Crédit disponible :</span>
                <span className="text-blue-700 font-semibold">{PriceService.formaterPrix(prixDetails.fidelite.creditDisponible)}</span>
              </div>
              <div className="flex justify-between border-t pt-2">
                <span className="font-medium">Crédit utilisé :</span>
                <span className="text-green-600 font-bold">-{PriceService.formaterPrix(prixDetails.fidelite.creditUtilise)}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Affichage de l'ajustement de prix s'il y en a un */}
      {orderData.ajustementType && orderData.ajustementValeur && (
        <Card className="border-orange-200 bg-orange-50">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-orange-600 font-semibold">⚠️ Prix ajusté manuellement</span>
            </div>
            <div className="space-y-2 text-sm">
              <div>
                <span className="font-medium">Type d'ajustement :</span> {orderData.ajustementType}
              </div>
              <div>
                <span className="font-medium">Méthode :</span> {
                  orderData.ajustementMethode === 'Pourcentage' 
                    ? `${orderData.ajustementValeur}% du prix total`
                    : `${orderData.ajustementValeur.toLocaleString()} FCFA en montant fixe`
                }
              </div>
              {orderData.ajustementRaison && (
                <div>
                  <span className="font-medium">Raison :</span> {orderData.ajustementRaison}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

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
                    <span>• Séchage</span>
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
            
            {/* Affichage de l'ajustement de prix si présent */}
            {prixDetails?.ajustement && prixDetails.ajustement.montant > 0 && (
              <div className={`flex justify-between border-t pt-2 ${prixDetails.ajustement.type === 'Augmentation' ? 'text-red-600' : 'text-green-600'}`}>
                <span>
                  Ajustement ({prixDetails.ajustement.type}) :
                  {prixDetails.ajustement.raison && (
                    <span className="text-xs text-gray-500 block">{prixDetails.ajustement.raison}</span>
                  )}
                </span>
                <span>
                  {prixDetails.ajustement.type === 'Augmentation' ? '+' : '-'}
                  {PriceService.formaterPrix(prixDetails.ajustement.montant)}
                </span>
              </div>
            )}
            
            {/* Affichage du crédit fidélité utilisé */}
            {prixDetails?.fidelite && prixDetails.fidelite.creditUtilise > 0 && (
              <div className="flex justify-between border-t pt-2 text-blue-600">
                <span>Crédit fidélité utilisé :</span>
                <span className="font-semibold">-{PriceService.formaterPrix(prixDetails.fidelite.creditUtilise)}</span>
              </div>
            )}
            
            <div className="flex justify-between font-bold text-lg border-t-2 pt-3 mt-2">
              <span>TOTAL À PAYER :</span>
              <span className="text-primary text-xl">
                {PriceService.formaterPrix(prixDetails?.prixPaye || 0)}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex flex-col sm:flex-row justify-end gap-3 sm:gap-4">
        <Button 
          variant="outline" 
          onClick={handleCancel}
          className="w-full sm:w-auto order-4 sm:order-1"
        >
          Annuler
        </Button>
        
        {/* Bouton Supprimer - Affiché seulement si c'est une commande existante et modifiable */}
        {orderData.id && isModifiable && (
          <Button 
            variant="destructive" 
            onClick={handleDelete}
            className="w-full sm:w-auto order-3 sm:order-2"
          >
            Supprimer
          </Button>
        )}
        
        {/* Bouton Modifier - Affiché seulement si modifiable */}
        {isModifiable && (
          <Button 
            variant="outline" 
            onClick={handleModify}
            className="w-full sm:w-auto order-2 sm:order-3"
          >
            Modifier
          </Button>
        )}
        
        {/* Bouton Confirmer - Affiché seulement si c'est une nouvelle commande */}
        {!orderData.id && (
          <Button 
            onClick={handleSubmit}
            className="w-full sm:w-auto order-1 sm:order-4"
          >
            Confirmer la commande
          </Button>
        )}
        
        {/* Message d'information si non modifiable */}
        {!isModifiable && orderData.id && (
          <div className="text-sm text-gray-500 text-center sm:text-right">
            Cette commande ne peut plus être modifiée ou supprimée (créée il y a plus de 24h)
          </div>
        )}
      </div>

      {/* Dialogue de confirmation de suppression */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmer la suppression</AlertDialogTitle>
            <AlertDialogDescription>
              Êtes-vous sûr de vouloir supprimer cette commande ? Cette action est irréversible.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmDelete}
              className="bg-red-600 hover:bg-red-700"
            >
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default OrderRecap; 
