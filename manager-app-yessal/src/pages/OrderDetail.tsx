import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeft, Download, ArrowRight, Check, Truck, Loader2, AlertTriangle, MessageCircle } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "react-toastify";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { DeliveryDriverAssignmentDialog } from '@/components/dialogs/DeliveryDriverAssignmentDialog';
import OrderService, { Order } from '@/services/order';
import AuthService from '@/services/auth';
import { InvoiceService } from '@/services/invoiceService';

type OrderStatus = Order['statut'];

const OrderDetail: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(false);
  const [driverDialogOpen, setDriverDialogOpen] = useState(false);
  const [completeOrderDialogOpen, setCompleteOrderDialogOpen] = useState(false);
  
  useEffect(() => {
    if (location.state?.order) {
      const receivedOrder = location.state.order as Order;
      setOrder(receivedOrder);
    } else {
      navigate('/laverie/orders');
    }
  }, [location.state, navigate]);
  
  if (!order) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
        <span className="ml-2">Chargement des détails de la commande...</span>
      </div>
    );
  }
  
  const getStatusColor = (status: OrderStatus) => {
    switch(status) {
      case 'PrisEnCharge': return 'bg-blue-100 text-blue-800';
      case 'LavageEnCours': return 'bg-yellow-100 text-yellow-800';
      case 'Repassage': return 'bg-purple-100 text-purple-800';
      case 'Livraison': return 'bg-indigo-100 text-indigo-800';
      case 'Livre': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusLabel = (status: OrderStatus) => {
    switch(status) {
      case 'PrisEnCharge': return 'Pris en charge';
      case 'LavageEnCours': return 'Lavage en cours';
      case 'Repassage': return 'Repassage';
      case 'Livraison': return 'Livraison';
      case 'Livre': return 'Livré';
      default: return status;
    }
  };

  const getClientName = (order: Order) => {
    if (order.clientUser) {
      return `${order.clientUser.prenom} ${order.clientUser.nom}`;
    }
    if (order.clientInvite) {
      return order.clientInvite.nom || 'Client invité';
    }
    return 'Client inconnu';
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('fr-FR', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };
  
  const handleStatusChange = async (newStatus: string) => {
    // Vérifier si l'utilisateur connecté est le gérant créateur de la commande
    const currentUser = AuthService.getUser();
    if (!currentUser) {
      toast.error('Vous devez être connecté pour modifier le statut');
      return;
    }

    if (order.gerantCreationUserId !== currentUser.id) {
      toast.error('Seul le gérant créateur de cette commande peut modifier son statut');
      return;
    }

    // Vérifier si la commande peut encore être modifiée (24h)
    if (!isStatusModifiable()) {
      const timeInfo = getTimeRemaining();
      toast.error(`Impossible de modifier le statut : ${timeInfo}`);
      return;
    }

    try {
      setLoading(true);
      const result = await OrderService.updateOrder(order.id, {
        statut: newStatus as OrderStatus
      });
      
      if (result.success && result.order) {
        setOrder(result.order);
        toast.success(`Statut mis à jour: ${getStatusLabel(newStatus as OrderStatus)}`);
      } else {
        toast.error('Erreur lors de la mise à jour du statut');
      }
    } catch (error: any) {
      console.error('Erreur:', error);
      // Gestion des erreurs spécifiques du backend
      if (error.response?.status === 403) {
        toast.error(error.response.data?.message || 'Vous n\'avez pas les droits pour modifier cette commande');
      } else if (error.response?.status === 400) {
        toast.error(error.response.data?.message || 'Impossible de modifier le statut de cette commande');
      } else {
        toast.error('Erreur lors de la mise à jour du statut');
      }
    } finally {
      setLoading(false);
    }
  };
  
  const downloadInvoice = async () => {
    try {
      setLoading(true);
      toast.info('Génération de la facture en cours...');
      
      const pdfBlob = await InvoiceService.generateInvoice(order);
      
      // Télécharger le PDF
      const fileName = `Facture_${order.id}_${new Date().toISOString().split('T')[0]}.pdf`;
      InvoiceService.downloadPDF(pdfBlob, fileName);
      
      toast.success(`Facture téléchargée avec succès !`);
    } catch (error) {
      console.error('Erreur lors de la génération de la facture:', error);
      toast.error('Erreur lors de la génération de la facture');
    } finally {
      setLoading(false);
    }
  };

  const sendInvoiceViaWhatsApp = async () => {
    try {
      // Récupérer le numéro de téléphone du client
      let phoneNumber = '';
      if (order.clientUser?.telephone) {
        phoneNumber = order.clientUser.telephone;
      } else if (order.clientInvite?.telephone) {
        phoneNumber = order.clientInvite.telephone;
      }

      if (!phoneNumber) {
        toast.error('Aucun numéro de téléphone disponible pour ce client');
        return;
      }

      // Nettoyer le numéro (enlever espaces, tirets, etc.)
      phoneNumber = phoneNumber.replace(/[\s\-()]/g, '');
      
      // Ajouter l'indicatif du Sénégal si nécessaire
      if (!phoneNumber.startsWith('221') && !phoneNumber.startsWith('+221')) {
        phoneNumber = '221' + phoneNumber;
      }

      // Générer le PDF
      setLoading(true);
      toast.info('Génération de la facture en cours...');
      
      const pdfBlob = await InvoiceService.generateInvoice(order);
      const fileName = `Facture_${order.id}_${new Date().toISOString().split('T')[0]}.pdf`;
      
      // Télécharger le PDF localement
      InvoiceService.downloadPDF(pdfBlob, fileName);
      
      // Préparer le message WhatsApp
      const clientName = getClientName(order);
      const message = `Bonjour ${clientName},\n\nVotre facture pour la commande #${order.id} est prête.\n\nMontant: ${order.prixPaye.toLocaleString()} FCFA\nDate: ${formatDate(order.dateHeureCommande)}\n\nMerci de votre confiance !\n\n- G.I.E Yessal`;
      
      // Ouvrir WhatsApp Web avec le message prérédigé
      const whatsappUrl = `https://wa.me/${phoneNumber}?text=${encodeURIComponent(message)}`;
      window.open(whatsappUrl, '_blank');
      
      toast.success('Facture téléchargée ! WhatsApp ouvert - veuillez attacher le fichier PDF manuellement');
    } catch (error) {
      console.error('Erreur lors de l\'envoi par WhatsApp:', error);
      toast.error('Erreur lors de l\'envoi par WhatsApp');
    } finally {
      setLoading(false);
    }
  };
  
  const goBack = () => {
    navigate('/laverie/orders');
  };

  const assignDriver = async (driverId: string) => {
    // Vérifier les permissions avant l'assignation
    if (!canAssignDriver()) {
      toast.error("Seul le créateur de la commande peut affecter un livreur (dans les 24h)");
      return;
    }

    try {
      setLoading(true);
      const result = await OrderService.updateOrder(order.id, {
        livreurId: parseInt(driverId)
      });
      
      if (result.success && result.order) {
        setOrder(result.order);
        toast.success(`Livreur assigné à la commande #${order.id}`);
        setDriverDialogOpen(false);
      } else {
        toast.error('Erreur lors de l\'assignation du livreur');
      }
    } catch (error) {
      console.error('Erreur:', error);
      toast.error('Erreur lors de l\'assignation du livreur');
    } finally {
      setLoading(false);
    }
  };

  const hasDeliveryOption = Boolean(order.options?.aOptionLivraison);
  
  // Vérifier si l'utilisateur connecté peut modifier le statut de la commande
  const canModifyStatus = () => {
    // Une commande annulée (flag = false) n'est plus modifiable
    if (order.flag === false) return false;
    
    const currentUser = AuthService.getUser();
    if (!currentUser) return false;
    
    // Seul le gérant créateur peut modifier le statut
    if (order.gerantCreationUserId !== currentUser.id) return false;
    
    // Et seulement dans les 24h
    return isStatusModifiable();
  };

  // Vérifier si l'utilisateur connecté peut affecter un livreur à la commande
  const canAssignDriver = () => {
    // Une commande annulée (flag = false) n'est plus modifiable
    if (order.flag === false) return false;
    
    const currentUser = AuthService.getUser();
    if (!currentUser) return false;
    
    // Seul le gérant créateur peut affecter un livreur
    if (order.gerantCreationUserId !== currentUser.id) return false;
    
    // Et seulement dans les 24h
    return isStatusModifiable();
  };

  // Vérifier si 24h sont passées depuis la création de la commande
  const isStatusModifiable = () => {
    const creationDate = new Date(order.dateHeureCommande);
    const currentDate = new Date();
    const timeDifference = currentDate.getTime() - creationDate.getTime();
    const hoursDifference = timeDifference / (1000 * 3600);
    
    return hoursDifference <= 24;
  };

  // Calculer le temps restant pour modification
  const getTimeRemaining = () => {
    const creationDate = new Date(order.dateHeureCommande);
    const currentDate = new Date();
    const timeDifference = currentDate.getTime() - creationDate.getTime();
    const hoursDifference = timeDifference / (1000 * 3600);
    
    if (hoursDifference <= 24) {
      const remainingHours = 24 - hoursDifference;
      if (remainingHours >= 1) {
        return `Plus que ${Math.floor(remainingHours)} heure(s) pour modifier`;
      } else {
        const remainingMinutes = Math.floor(remainingHours * 60);
        return `Plus que ${remainingMinutes} minute(s) pour modifier`;
      }
    } else {
      const daysPassed = Math.floor(hoursDifference / 24);
      if (daysPassed >= 1) {
        return `Délai de modification dépassé depuis ${daysPassed} jour(s)`;
      } else {
        const elapsedHours = Math.floor(hoursDifference - 24);
        return `Délai de modification dépassé depuis ${elapsedHours} heure(s)`;
      }
    }
  };

  return (
    <div className="space-y-6 pb-8">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" onClick={goBack} className="h-8 w-8">
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Commande #{order.id}</h1>
          <p className="text-muted-foreground">
            {formatDate(order.dateHeureCommande)} à {formatTime(order.dateHeureCommande)}
          </p>
        </div>
      </div>

      {/* Affichage du statut annulé si flag = false */}
      {order.flag === false && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center justify-center">
            <span className="text-lg font-semibold text-red-800 bg-red-100 px-4 py-2 rounded-full">
              Commande annulée
            </span>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Client info */}
        <Card>
          <CardContent className="p-4">
            <h2 className="font-semibold mb-3">Informations client</h2>
            <div className="space-y-2">
              <div>
                <p className="text-sm font-medium">Nom</p>
                <p className="text-lg">{getClientName(order)}</p>
              </div>
              
              {order.clientUser && (
                <>
                  {order.clientUser.email && (
                    <div>
                      <p className="text-sm font-medium">Email</p>
                      <p className="text-lg">{order.clientUser.email}</p>
                    </div>
                  )}
                  {order.clientUser.telephone && (
                    <div>
                      <p className="text-sm font-medium">Téléphone</p>
                      <a 
                        href={`tel:${order.clientUser.telephone}`}
                        className="text-lg text-blue-600 hover:text-blue-800 hover:underline cursor-pointer"
                        title="Cliquer pour appeler"
                      >
                        {order.clientUser.telephone}
                      </a>
                    </div>
                  )}
                  <div>
                    <p className="text-sm font-medium">Type de client</p>
                    <Badge variant={order.clientUser.typeClient === 'Premium' ? 'default' : 'secondary'}>
                      {order.clientUser.typeClient}
                    </Badge>
                  </div>
                </>
              )}

              {order.clientInvite && (
                <>
                  {order.clientInvite.email && (
                    <div>
                      <p className="text-sm font-medium">Email</p>
                      <p className="text-lg">{order.clientInvite.email}</p>
                    </div>
                  )}
                  {order.clientInvite.telephone && (
                    <div>
                      <p className="text-sm font-medium">Téléphone</p>
                      <a 
                        href={`tel:${order.clientInvite.telephone}`}
                        className="text-lg text-blue-600 hover:text-blue-800 hover:underline cursor-pointer"
                        title="Cliquer pour appeler"
                      >
                        {order.clientInvite.telephone}
                      </a>
                    </div>
                  )}
                </>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Order status */}
        <Card className={`border-l-4 ${getStatusColor(order.statut).replace('bg-', 'border-l-').replace('text-', '')}`}>
          <CardContent className="p-4">
            <h2 className="font-semibold mb-3">Statut</h2>
            <div className="flex items-center justify-between">
              <Badge className={getStatusColor(order.statut)}>
                {getStatusLabel(order.statut)}
              </Badge>
              <Select 
                value={order.statut} 
                onValueChange={handleStatusChange} 
                disabled={loading || !canModifyStatus() || order.statut === 'Livre'}
              >
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Changer le statut" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="PrisEnCharge">Pris en charge</SelectItem>
                  <SelectItem value="LavageEnCours">Lavage en cours</SelectItem>
                  <SelectItem value="Repassage">Repassage</SelectItem>
                  {hasDeliveryOption && (
                    <SelectItem value="Livraison">Livraison</SelectItem>
                  )}
                  <SelectItem value="Livre">Livré</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {!canModifyStatus() && (
              <div className="mt-2 text-xs text-red-600 bg-red-50 p-2 rounded">
                {(() => {
                  if (order.flag === false) return "Cette commande a été annulée et ne peut plus être modifiée";
                  const currentUser = AuthService.getUser();
                  if (!currentUser) return "Vous devez être connecté pour modifier le statut";
                  if (order.gerantCreationUserId !== currentUser.id) return "Seul le gérant créateur peut modifier le statut";
                  if (!isStatusModifiable()) return `Délai de modification dépassé : ${getTimeRemaining()}`;
                  return "Modification non autorisée";
                })()}
              </div>
            )}
            {canModifyStatus() && (
              <div className="mt-2 text-xs text-blue-600 bg-blue-50 p-2 rounded">
                Vous pouvez modifier ce statut - {getTimeRemaining()}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Site de lavage */}
      {order.siteLavage && (
        <Card>
          <CardContent className="p-4">
            <h2 className="font-semibold mb-3">Site de lavage</h2>
            <div className="space-y-2">
              <div>
                <p className="text-sm font-medium">Nom</p>
                <p className="text-lg">{order.siteLavage.nom}</p>
              </div>
              <div>
                <p className="text-sm font-medium">Adresse</p>
                <p className="text-lg">{order.siteLavage.adresseText}</p>
              </div>
              <div>
                <p className="text-sm font-medium">Ville</p>
                <p className="text-lg">{order.siteLavage.ville}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Delivery driver section */}
      {hasDeliveryOption && (
        <Card>
          <CardContent className="p-4">
            <h2 className="font-semibold mb-3">Information de livraison</h2>
            
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Livreur assigné</p>
                <p className="font-medium">
                  {order.livreur ? `${order.livreur.prenom} ${order.livreur.nom}` : "Aucun livreur assigné"}
                </p>
                {order.livreur?.telephone && (
                  <a 
                    href={`tel:${order.livreur.telephone}`}
                    className="text-sm text-blue-600 hover:text-blue-800 hover:underline cursor-pointer"
                    title="Cliquer pour appeler le livreur"
                  >
                    {order.livreur.telephone}
                  </a>
                )}
              </div>
              
              <Button
                variant="outline"
                size="sm"
                className="flex items-center gap-2"
                onClick={() => {
                  if (!canAssignDriver()) {
                    toast.error("Seul le créateur de la commande peut affecter un livreur (dans les 24h)");
                    return;
                  }
                  setDriverDialogOpen(true);
                }}
                disabled={loading || !canAssignDriver()}
              >
                <Truck className="h-4 w-4" />
                {order.livreur ? "Changer de livreur" : "Affecter un livreur"}
              </Button>
            </div>

            {/* Adresse de livraison */}
            {order.adresseLivraison && order.adresseLivraison.length > 0 && (
              <div className="mt-4 pt-4 border-t">
                <p className="text-sm font-medium mb-2">Adresse de livraison</p>
                <p className="text-lg">{order.adresseLivraison[0].adresseText}</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Order details */}
      <Card>
        <CardContent className="p-4">
          <h2 className="font-semibold mb-3">Détails de la commande</h2>
          
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-y-3">
              <div>
                <p className="text-sm text-gray-500">Formule</p>
                <p className="font-medium">
                  {order.formuleCommande === 'BaseMachine' && "Formule machine"}
                  {order.formuleCommande === 'Detail' && "Formule détaillée"}
                </p>
              </div>
              
              <div>
                <p className="text-sm text-gray-500">Poids indicatif</p>
                <p className="font-medium">{order.masseClientIndicativeKg} kg</p>
              </div>

              {Boolean(order.masseVerifieeKg) && (
                <div>
                  <p className="text-sm text-gray-500">Poids vérifié</p>
                  <p className="font-medium">{order.masseVerifieeKg} kg</p>
                </div>
              )}
              
              <div>
                <p className="text-sm text-gray-500">Prix {order.ajustementType || order.pointsUtilises ? 'final' : 'total'}</p>
                <p className="font-bold text-lg text-primary">
                  {order.prixPaye === 0 && order?.clientUser?.typeClient === 'Premium' ? '0 FCFA (Inclus dans l\'abonnement)' : `${order.prixPaye.toLocaleString()} FCFA`}
                </p>
                
                {/* Affichage détaillé si ajustement ou crédit fidélité */}
                {(Boolean(order.ajustementType && order.ajustementValeur) || Boolean(order.montantReductionPoints)) && (
                  <div className="text-xs mt-2 space-y-1">
                    <div className="text-gray-700">Prix de base: {order.prixTotal?.toLocaleString()} FCFA</div>
                    
                    {/* Ajustement de prix */}
                    {Boolean(order.ajustementType && order.ajustementValeur) && (
                      <div className="text-orange-600">
                        <div>
                          Ajustement ({order.ajustementType}): {
                            order.ajustementMethode === 'Pourcentage' 
                              ? `${order.ajustementValeur}%` 
                              : `${order.ajustementValeur.toLocaleString()} FCFA`
                          }
                        </div>
                        {order.ajustementRaison && (
                          <div>Raison: {order.ajustementRaison}</div>
                        )}
                      </div>
                    )}
                    
                    {/* Crédit fidélité utilisé */}
                    {Boolean(order.montantReductionPoints) && (
                      <div className="text-blue-600">
                        <div>Crédit fidélité utilisé: -{order.montantReductionPoints.toLocaleString()} FCFA</div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {order.typeReduction && (
                <div>
                  <p className="text-sm text-gray-500">Réduction</p>
                  <Badge variant="outline" className="bg-green-50">
                    {order.typeReduction === 'Etudiant' ? 'Réduction étudiant' : 'Réduction ouverture'}
                  </Badge>
                </div>
              )}

              {order.modePaiement && (
                <div>
                  <p className="text-sm text-gray-500">Mode de paiement</p>
                  <p className="font-medium">{order.modePaiement}</p>
                </div>
              )}
            </div>
            
            {order.options && (
              <div>
                <p className="text-sm text-gray-500 mb-2">Options</p>
                <div className="flex flex-wrap gap-2">
                  {order.options.aOptionRepassage && (
                    <Badge variant="outline" className="bg-blue-50">Repassage</Badge>
                  )}
                  {order.options.aOptionSechage && (
                    <Badge variant="outline" className="bg-green-50">Séchage</Badge>
                  )}
                  {order.options.aOptionExpress && (
                    <Badge variant="outline" className="bg-red-50">Express</Badge>
                  )}
                  {order.options.aOptionLivraison && (
                    <Badge variant="outline" className="bg-purple-50">Livraison</Badge>
                  )}
                </div>
              </div>
            )}

            {/* Répartition des machines */}
            {order.repartitionMachines && order.repartitionMachines.length > 0 && (
              <div>
                <p className="text-sm text-gray-500 mb-2">Répartition des machines</p>
                <div className="flex flex-wrap gap-2">
                  {order.repartitionMachines.map((machine, idx) => (
                    <Badge key={idx} variant="outline" className="bg-gray-50">
                      {machine.typeMachine === 'Machine20kg' ? '20Kg' : '6Kg'}: {machine.quantite}x
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Gérants */}
      <Card>
        <CardContent className="p-4">
          <h2 className="font-semibold mb-3">Gestion</h2>
          <div className="grid grid-cols-2 gap-4">
            {order.gerantCreation && (
              <div>
                <p className="text-sm text-gray-500">Créé par</p>
                <p className="font-medium">{order.gerantCreation.prenom} {order.gerantCreation.nom}</p>
              </div>
            )}
            {order.gerantReception && (
              <div>
                <p className="text-sm text-gray-500">Reçu par</p>
                <p className="font-medium">{order.gerantReception.prenom} {order.gerantReception.nom}</p>
              </div>
            )}
          </div>
          
          {/* Information sur les droits de modification */}
          <div className="mt-4 pt-4 border-t">
            <p className="text-sm font-medium mb-2">Droits de modification</p>
            {(() => {
              if (order.flag === false) {
                return false;
              }
              
              const currentUser = AuthService.getUser();
              if (!currentUser) {
                return <p className="text-sm text-red-600">Vous devez être connecté pour voir vos droits</p>;
              }
              
              const isCreator = order.gerantCreationUserId === currentUser.id;
              const canModifyTime = isStatusModifiable();
              
              if (isCreator && canModifyTime) {
                return <p className="text-sm text-green-600">Vous pouvez modifier cette commande ({getTimeRemaining()})</p>;
              } else if (isCreator && !canModifyTime) {
                return <p className="text-sm text-orange-600">⚠ Vous êtes le créateur mais le délai est dépassé ({getTimeRemaining()})</p>;
              } else if (!isCreator) {
                return <p className="text-sm text-gray-600">ℹ Seul le gérant créateur peut modifier cette commande</p>;
              }
              
              return <p className="text-sm text-gray-600">Aucun droit de modification</p>;
            })()}
          </div>
        </CardContent>
      </Card>
      
      {/* Status timeline */}
      <Card>
        <CardContent className="p-4">
          <h2 className="font-semibold mb-3">Suivi du traitement</h2>
          
          <div className="relative">
            <div className="absolute left-3 top-0 bottom-0 w-0.5 bg-gray-200"></div>
            
            <div className="relative pl-10 pb-5">
              <div className="absolute left-0 rounded-full w-6 h-6 flex items-center justify-center bg-blue-100 border-2 border-blue-500">
                <Check className="h-3 w-3 text-blue-600" />
              </div>
              <p className="font-medium">Commande prise en charge</p>
              <p className="text-sm text-gray-500">
                {formatDate(order.dateHeureCommande)} à {formatTime(order.dateHeureCommande)}
              </p>
            </div>
            
            <div className="relative pl-10 pb-5">
              <div className={`absolute left-0 rounded-full w-6 h-6 flex items-center justify-center ${
                ['PrisEnCharge'].includes(order.statut) 
                  ? 'bg-white border-2 border-gray-300' 
                  : 'bg-yellow-100 border-2 border-yellow-500'
              }`}>
                {!['PrisEnCharge'].includes(order.statut) && <Check className="h-3 w-3 text-yellow-600" />}
              </div>
              <p className={`font-medium ${['PrisEnCharge'].includes(order.statut) ? 'text-gray-400' : ''}`}>
                Lavage en cours
              </p>
              {!['PrisEnCharge'].includes(order.statut) && (
                <p className="text-sm text-gray-500">
                  {formatDate(order.dateDernierStatutChange)} à {formatTime(order.dateDernierStatutChange)}
                </p>
              )}
            </div>
            
            {/* Étape Repassage (seulement pour les commandes avec livraison) */}
            {hasDeliveryOption && (
              <div className="relative pl-10 pb-5">
                <div className={`absolute left-0 rounded-full w-6 h-6 flex items-center justify-center ${
                  ['PrisEnCharge', 'LavageEnCours'].includes(order.statut)
                    ? 'bg-white border-2 border-gray-300' 
                    : 'bg-purple-100 border-2 border-purple-500'
                }`}>
                  {!['PrisEnCharge', 'LavageEnCours'].includes(order.statut) && <Check className="h-3 w-3 text-purple-600" />}
                </div>
                <p className={`font-medium ${['PrisEnCharge', 'LavageEnCours'].includes(order.statut) ? 'text-gray-400' : ''}`}>
                  Repassage terminé
                </p>
                {!['PrisEnCharge', 'LavageEnCours'].includes(order.statut) && (
                  <p className="text-sm text-gray-500">
                    {formatDate(order.dateDernierStatutChange)} à {formatTime(order.dateDernierStatutChange)}
                  </p>
                )}
              </div>
            )}
            
            {/* Étape Livraison (seulement pour les commandes avec livraison) */}
            {hasDeliveryOption && (
              <div className="relative pl-10 pb-5">
                <div className={`absolute left-0 rounded-full w-6 h-6 flex items-center justify-center ${
                  ['PrisEnCharge', 'LavageEnCours', 'Repassage'].includes(order.statut)
                    ? 'bg-white border-2 border-gray-300' 
                    : 'bg-indigo-100 border-2 border-indigo-500'
                }`}>
                  {!['PrisEnCharge', 'LavageEnCours', 'Repassage'].includes(order.statut) && order.statut !== 'Livraison' && <Check className="h-3 w-3 text-indigo-600" />}
                  {order.statut === 'Livraison' && <Truck className="h-3 w-3 text-indigo-600" />}
                </div>
                <p className={`font-medium ${['PrisEnCharge', 'LavageEnCours', 'Repassage'].includes(order.statut) ? 'text-gray-400' : ''}`}>
                  {order.statut === 'Livraison' ? 'Livraison en cours' : 'Livraison effectuée'}
                </p>
                {!['PrisEnCharge', 'LavageEnCours', 'Repassage'].includes(order.statut) && (
                  <p className="text-sm text-gray-500">
                    {formatDate(order.dateDernierStatutChange)} à {formatTime(order.dateDernierStatutChange)}
                  </p>
                )}
              </div>
            )}
            
            {/* Étape finale */}
            <div className="relative pl-10">
              <div className={`absolute left-0 rounded-full w-6 h-6 flex items-center justify-center ${
                (order.statut as string) === 'Livre' 
                  ? 'bg-green-100 border-2 border-green-500'
                  : 'bg-white border-2 border-gray-300' 
              }`}>
                {(order.statut as string) === 'Livre' && <Check className="h-3 w-3 text-green-600" />}
              </div>
              <p className={`font-medium ${(order.statut as string) !== 'Livre' ? 'text-gray-400' : ''}`}>
                {hasDeliveryOption ? 'Commande livrée' : 'Commande récupérée'}
              </p>
              {(order.statut as string) === 'Livre' && (
                <p className="text-sm text-gray-500">
                  {formatDate(order.dateDernierStatutChange)} à {formatTime(order.dateDernierStatutChange)}
                </p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
      
      <div className="flex gap-3">
        {order.statut === ("Livre" as any) ? (
          <div className="flex gap-3 w-full">
            <Button 
              onClick={downloadInvoice}
              className="flex-1 flex items-center justify-center gap-2"
              disabled={loading}
            >
              <Download className="h-4 w-4" />
              Télécharger la facture
            </Button>
            <Button 
              onClick={sendInvoiceViaWhatsApp}
              className="flex-1 flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700"
              disabled={loading || (!order.clientUser?.telephone && !order.clientInvite?.telephone)}
              title={(!order.clientUser?.telephone && !order.clientInvite?.telephone) ? "Aucun numéro de téléphone disponible" : ""}
            >
              <MessageCircle className="h-4 w-4" />
              Envoyer par WhatsApp
            </Button>
          </div>
        ) : (
          <>
            <Button 
              variant="outline" 
              onClick={goBack}
              className="flex-1"
            >
              Retour
            </Button>
            
            <Button 
              onClick={() => {
                const statusFlow: Record<string, string> = hasDeliveryOption ? {
                  // Flux avec livraison : Pris en charge → Lavage → Repassage → Livraison → Livré
                  'PrisEnCharge': 'LavageEnCours',
                  'LavageEnCours': 'Repassage',
                  'Repassage': 'Livraison',
                  'Livraison': 'Livre',
                  'Livre': 'Livre'
                } : {
                  // Flux sans livraison : Pris en charge → Lavage → Livré (pas de repassage)
                  'PrisEnCharge': 'LavageEnCours',
                  'LavageEnCours': 'Livre',
                  'Repassage': 'Livre', // Au cas où il y aurait un statut repassage existant
                  'Livraison': 'Livre',
                  'Livre': 'Livre'
                };
                
                const nextStatus = statusFlow[order.statut];
                
                // Si le prochain statut est "Livré", ouvrir le dialogue de confirmation
                if (nextStatus === 'Livre' && nextStatus !== order.statut) {
                  setCompleteOrderDialogOpen(true);
                } else if (nextStatus && nextStatus !== order.statut) {
                  handleStatusChange(nextStatus);
                }
              }}
              className="flex-1 flex items-center justify-center gap-1"
              disabled={
                loading || 
                order.statut === "Livre" as any ||
                !canModifyStatus()
              }
              title={
                !canModifyStatus() && (order.statut as string) !== "Livre" 
                  ? (() => {
                      if (order.flag === false) return "Cette commande a été annulée et ne peut plus être modifiée";
                      const currentUser = AuthService.getUser();
                      if (!currentUser) return "Vous devez être connecté";
                      if (order.gerantCreationUserId !== currentUser.id) return "Seul le gérant créateur peut modifier le statut";
                      if (!isStatusModifiable()) return `Délai de modification dépassé : ${getTimeRemaining()}`;
                      return "";
                    })()
                  : ""
              }
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  {(() => {
                    const statusFlow: Record<string, string> = hasDeliveryOption ? {
                      'PrisEnCharge': 'LavageEnCours',
                      'LavageEnCours': 'Repassage',
                      'Repassage': 'Livraison',
                      'Livraison': 'Livre',
                      'Livre': 'Livre'
                    } : {
                      'PrisEnCharge': 'LavageEnCours',
                      'LavageEnCours': 'Livre',
                      'Repassage': 'Livre',
                      'Livraison': 'Livre',
                      'Livre': 'Livre'
                    };
                    
                    const nextStatus = statusFlow[order.statut];
                    return nextStatus === 'Livre' && order.statut !== 'Livre' ? 'Terminer la commande' : 'Passer à l\'étape suivante';
                  })()}
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </Button>
          </>
        )}
      </div>
      
      {/* Driver Assignment Dialog */}
      <DeliveryDriverAssignmentDialog 
        open={driverDialogOpen} 
        onOpenChange={setDriverDialogOpen}
        orderId={order.id.toString()}
        onAssign={assignDriver}
      />

      {/* Complete Order Confirmation Dialog */}
      <AlertDialog open={completeOrderDialogOpen} onOpenChange={setCompleteOrderDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-orange-500" />
              Terminer la commande ?
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-3">
              <p>
                Vous êtes sur le point de marquer cette commande comme <strong>"Livrée"</strong>.
              </p>
              <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
                <p className="text-orange-700 text-sm mt-1">
                  Une fois la commande terminée, vous ne pourrez plus modifier son statut.
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction 
              onClick={async () => {
                await handleStatusChange('Livre');
                setCompleteOrderDialogOpen(false);
              }}
              className="bg-green-600 hover:bg-green-700"
            >
              Oui, terminer la commande
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default OrderDetail;

