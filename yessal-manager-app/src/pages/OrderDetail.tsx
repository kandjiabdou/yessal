import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeft, Download, ArrowRight, Check, Truck, Loader2 } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { DeliveryDriverAssignmentDialog } from '@/components/dialogs/DeliveryDriverAssignmentDialog';
import OrderService, { Order } from '@/services/order';

type OrderStatus = Order['statut'];

const OrderDetail: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(false);
  const [driverDialogOpen, setDriverDialogOpen] = useState(false);
  
  useEffect(() => {
    if (location.state?.order) {
      const receivedOrder = location.state.order as Order;
      setOrder(receivedOrder);
    } else {
      navigate('/orders');
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
      case 'Collecte': return 'bg-orange-100 text-orange-800';
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
      case 'Collecte': return 'Collecte';
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
    } catch (error) {
      console.error('Erreur:', error);
      toast.error('Erreur lors de la mise à jour du statut');
    } finally {
      setLoading(false);
    }
  };
  
  const downloadInvoice = () => {
    toast.success(`Téléchargement de la facture pour la commande #${order.id}`);
  };
  
  const goBack = () => {
    navigate('/orders');
  };

  const assignDriver = async (driverId: string) => {
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

  const isGuestOrder = !order.clientUserId;
  const hasDeliveryOption = order.options?.aOptionLivraison;

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
                      <p className="text-lg">{order.clientUser.telephone}</p>
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
                      <p className="text-lg">{order.clientInvite.telephone}</p>
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
              <Select value={order.statut} onValueChange={handleStatusChange} disabled={loading}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Changer le statut" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="PrisEnCharge">Pris en charge</SelectItem>
                  <SelectItem value="LavageEnCours">Lavage en cours</SelectItem>
                  <SelectItem value="Repassage">Repassage</SelectItem>
                  <SelectItem value="Collecte">Collecte</SelectItem>
                  <SelectItem value="Livraison">Livraison</SelectItem>
                  <SelectItem value="Livre">Livré</SelectItem>
                </SelectContent>
              </Select>
            </div>
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
                  <p className="text-sm text-gray-500">{order.livreur.telephone}</p>
                )}
              </div>
              
              <Button
                variant="outline"
                size="sm"
                className="flex items-center gap-2"
                onClick={() => setDriverDialogOpen(true)}
                disabled={loading}
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

              {order.masseVerifieeKg && (
                <div>
                  <p className="text-sm text-gray-500">Poids vérifié</p>
                  <p className="font-medium">{order.masseVerifieeKg} kg</p>
                </div>
              )}
              
              <div>
                <p className="text-sm text-gray-500">Prix total</p>
                <p className="font-bold text-lg text-primary">
                  {order.prixTotal ? `${order.prixTotal.toLocaleString()} FCFA` : 'Prix à calculer'}
                </p>
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
            
            <div className="relative pl-10">
              <div className={`absolute left-0 rounded-full w-6 h-6 flex items-center justify-center ${
                order.statut !== 'Livre' 
                  ? 'bg-white border-2 border-gray-300' 
                  : 'bg-green-100 border-2 border-green-500'
              }`}>
                {order.statut === 'Livre' && <Check className="h-3 w-3 text-green-600" />}
              </div>
              <p className={`font-medium ${order.statut !== 'Livre' ? 'text-gray-400' : ''}`}>
                {hasDeliveryOption ? 'Livraison effectuée' : 'Collecte effectuée'}
              </p>
              {order.statut === 'Livre' && (
                <p className="text-sm text-gray-500">
                  {formatDate(order.dateDernierStatutChange)} à {formatTime(order.dateDernierStatutChange)}
                </p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
      
      <div className="flex gap-3">
        {order.statut === 'Livre' ? (
          <Button 
            onClick={downloadInvoice}
            className="w-full flex items-center justify-center gap-2"
          >
            <Download className="h-4 w-4" />
            Télécharger la facture
          </Button>
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
                const statusFlow: Record<OrderStatus, OrderStatus> = {
                  'PrisEnCharge': 'LavageEnCours',
                  'LavageEnCours': 'Repassage',
                  'Repassage': 'Collecte',
                  'Collecte': hasDeliveryOption ? 'Livraison' : 'Livre',
                  'Livraison': 'Livre',
                  'Livre': 'Livre'
                };
                
                const nextStatus = statusFlow[order.statut];
                if (nextStatus !== order.statut) {
                  handleStatusChange(nextStatus);
                }
              }}
              className="flex-1 flex items-center justify-center gap-1"
              disabled={
                loading || 
                order.statut === 'Livre' ||
                (hasDeliveryOption && order.statut === 'Collecte' && !order.livreurId)
              }
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  Passer à l'étape suivante
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
    </div>
  );
};

export default OrderDetail;
