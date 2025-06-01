import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeft, Download, ArrowRight, Check, Truck } from 'lucide-react';
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

interface Order {
  id: string;
  clientName: string;
  price: number;
  weight: number;
  status: 'pending' | 'collected' | 'ironed' | 'delivered';
  date: string;
  time: string;
  options?: {
    ironing: boolean;
    stainRemoval: boolean;
    urgent: boolean;
    delivery: boolean;
  };
  driverId?: string;
  driverName?: string;
  formulaType?: string;
  washSite?: string;
  clientDetails?: {
    firstName?: string;
    lastName?: string;
    address?: string;
    phone?: string;
    email?: string;
  };
}

const OrderDetail: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [order, setOrder] = useState<Order | null>(null);
  const [status, setStatus] = useState<Order['status']>('pending');
  const [clientDetails, setClientDetails] = useState({
    firstName: '',
    lastName: '',
    address: '',
    phone: '',
    email: ''
  });
  const [driverDialogOpen, setDriverDialogOpen] = useState(false);
  
  useEffect(() => {
    if (location.state?.order) {
      const receivedOrder = location.state.order as Order;
      setOrder(receivedOrder);
      setStatus(receivedOrder.status);
      
      if (receivedOrder.clientDetails) {
        setClientDetails({
          firstName: receivedOrder.clientDetails.firstName || '',
          lastName: receivedOrder.clientDetails.lastName || '',
          address: receivedOrder.clientDetails.address || '',
          phone: receivedOrder.clientDetails.phone || '',
          email: receivedOrder.clientDetails.email || ''
        });
      }
    } else {
      navigate('/orders');
    }
  }, [location.state, navigate]);
  
  if (!order) {
    return null;
  }
  
  const getStatusColor = (status: Order['status']) => {
    switch(status) {
      case 'pending': return 'bg-blue-100 text-blue-800';
      case 'collected': return 'bg-yellow-100 text-yellow-800';
      case 'ironed': return 'bg-purple-100 text-purple-800';
      case 'delivered': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusLabel = (status: Order['status']) => {
    switch(status) {
      case 'pending': return 'En attente';
      case 'collected': return 'Collecté';
      case 'ironed': return 'Repassé';
      case 'delivered': return 'Livré';
      default: return status;
    }
  };
  
  const handleStatusChange = (newStatus: string) => {
    setStatus(newStatus as Order['status']);
    setOrder(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        status: newStatus as Order['status']
      };
    });
    toast.success(`Statut mis à jour: ${getStatusLabel(newStatus as Order['status'])}`);
  };
  
  const downloadInvoice = () => {
    toast.success(`Téléchargement de la facture pour la commande #${order.id}`);
  };
  
  const goBack = () => {
    navigate('/orders');
  };

  const handleClientDetailsChange = (field: string, value: string) => {
    setClientDetails(prev => ({ ...prev, [field]: value }));
    setOrder(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        clientDetails: {
          ...prev.clientDetails,
          [field]: value
        }
      };
    });
  };

  const assignDriver = (driverId: string) => {
    const driverMap: Record<string, string> = {
      'drv1': 'Mamadou Diop',
      'drv2': 'Fatou Ndiaye',
      'drv3': 'Ousmane Seck',
      'drv4': 'Aissatou Fall'
    };
    
    setOrder(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        driverId: driverId,
        driverName: driverMap[driverId] || 'Livreur assigné'
      };
    });
    
    toast.success(`Livreur assigné à la commande #${order.id}`);
    setDriverDialogOpen(false);
  };

  const isNoAccountOrder = order.clientName === 'Non inscrit' || order.clientName === 'Sans compte';
  const hasDeliveryOption = order.options?.delivery;

  return (
    <div className="space-y-6 pb-8">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" onClick={goBack} className="h-8 w-8">
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Commande #{order.id}</h1>
          <p className="text-muted-foreground">
            {order.date} à {order.time}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Client info */}
        <Card>
          <CardContent className="p-4">
            <h2 className="font-semibold mb-3">Informations client</h2>
            {isNoAccountOrder ? (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-sm font-medium">Nom</label>
                    <Input 
                      value={clientDetails.lastName}
                      onChange={(e) => handleClientDetailsChange('lastName', e.target.value)}
                      placeholder="Nom"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Prénom</label>
                    <Input 
                      value={clientDetails.firstName}
                      onChange={(e) => handleClientDetailsChange('firstName', e.target.value)}
                      placeholder="Prénom"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium">Adresse</label>
                  <Input 
                    value={clientDetails.address}
                    onChange={(e) => handleClientDetailsChange('address', e.target.value)}
                    placeholder="Adresse"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Téléphone</label>
                  <Input 
                    value={clientDetails.phone}
                    onChange={(e) => handleClientDetailsChange('phone', e.target.value)}
                    placeholder="Téléphone"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Email</label>
                  <Input 
                    value={clientDetails.email}
                    onChange={(e) => handleClientDetailsChange('email', e.target.value)}
                    placeholder="Email"
                    type="email"
                  />
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <div>
                  <p className="text-sm font-medium">Nom</p>
                  <p className="text-lg">{order.clientName}</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Order status */}
        <Card className={`border-l-4 ${getStatusColor(status).replace('bg-', 'border-l-').replace('text-', '')}`}>
          <CardContent className="p-4">
            <h2 className="font-semibold mb-3">Statut</h2>
            <div className="flex items-center justify-between">
              <Badge className={getStatusColor(status)}>
                {getStatusLabel(status)}
              </Badge>
              <Select value={status} onValueChange={handleStatusChange}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Changer le statut" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">En attente</SelectItem>
                  <SelectItem value="collected">Collecté</SelectItem>
                  <SelectItem value="ironed">Repassé</SelectItem>
                  <SelectItem value="delivered">Livré</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Delivery driver section */}
      {hasDeliveryOption && (
        <Card>
          <CardContent className="p-4">
            <h2 className="font-semibold mb-3">Information de livraison</h2>
            
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Livreur assigné</p>
                <p className="font-medium">{order.driverName || "Aucun livreur assigné"}</p>
              </div>
              
              <Button
                variant="outline"
                size="sm"
                className="flex items-center gap-2"
                onClick={() => setDriverDialogOpen(true)}
              >
                <Truck className="h-4 w-4" />
                {order.driverName ? "Changer de livreur" : "Affecter un livreur"}
              </Button>
            </div>
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
                  {order.formulaType === 'basic' && "Formule de base"}
                  {order.formulaType === 'subscription' && "Formule abonnement"}
                  {order.formulaType === 'weight' && "Formule au kilo"}
                  {!order.formulaType && "Non spécifiée"}
                </p>
              </div>
              
              <div>
                <p className="text-sm text-gray-500">Poids</p>
                <p className="font-medium">{order.weight} kg</p>
              </div>
              
              <div>
                <p className="text-sm text-gray-500">Site de lavage</p>
                <p className="font-medium">{order.washSite || "Non spécifié"}</p>
              </div>
              
              <div>
                <p className="text-sm text-gray-500">Prix total</p>
                <p className="font-bold text-lg text-primary">{order.price.toLocaleString()} FCFA</p>
              </div>
            </div>
            
            {order.options && (
              <div>
                <p className="text-sm text-gray-500 mb-2">Options</p>
                <div className="flex flex-wrap gap-2">
                  {order.options.ironing && (
                    <Badge variant="outline" className="bg-gray-50">Repassage</Badge>
                  )}
                  {order.options.stainRemoval && (
                    <Badge variant="outline" className="bg-gray-50">Détachage</Badge>
                  )}
                  {order.options.urgent && (
                    <Badge variant="outline" className="bg-gray-50">Urgence</Badge>
                  )}
                  {order.options.delivery && (
                    <Badge variant="outline" className="bg-gray-50">Livraison</Badge>
                  )}
                </div>
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
              <p className="font-medium">Commande reçue</p>
              <p className="text-sm text-gray-500">{order.date} à {order.time}</p>
            </div>
            
            <div className="relative pl-10 pb-5">
              <div className={`absolute left-0 rounded-full w-6 h-6 flex items-center justify-center ${status === 'pending' ? 'bg-white border-2 border-gray-300' : 'bg-yellow-100 border-2 border-yellow-500'}`}>
                {status !== 'pending' && <Check className="h-3 w-3 text-yellow-600" />}
              </div>
              <p className={`font-medium ${status === 'pending' ? 'text-gray-400' : ''}`}>Linge collecté</p>
              {status !== 'pending' && (
                <p className="text-sm text-gray-500">05/05/2025 à 11:30</p>
              )}
            </div>
            
            <div className="relative pl-10 pb-5">
              <div className={`absolute left-0 rounded-full w-6 h-6 flex items-center justify-center ${status === 'pending' || status === 'collected' ? 'bg-white border-2 border-gray-300' : 'bg-purple-100 border-2 border-purple-500'}`}>
                {status !== 'pending' && status !== 'collected' && <Check className="h-3 w-3 text-purple-600" />}
              </div>
              <p className={`font-medium ${status === 'pending' || status === 'collected' ? 'text-gray-400' : ''}`}>Repassage terminé</p>
              {status !== 'pending' && status !== 'collected' && (
                <p className="text-sm text-gray-500">05/05/2025 à 14:15</p>
              )}
            </div>
            
            <div className="relative pl-10">
              <div className={`absolute left-0 rounded-full w-6 h-6 flex items-center justify-center ${status !== 'delivered' ? 'bg-white border-2 border-gray-300' : 'bg-green-100 border-2 border-green-500'}`}>
                {status === 'delivered' && <Check className="h-3 w-3 text-green-600" />}
              </div>
              <p className={`font-medium ${status !== 'delivered' ? 'text-gray-400' : ''}`}>Livraison effectuée</p>
              {status === 'delivered' && (
                <p className="text-sm text-gray-500">05/05/2025 à 16:45</p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
      
      <div className="flex gap-3">
        {status === 'delivered' ? (
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
                const nextStatus = status === 'pending' ? 'collected' : 
                                status === 'collected' ? 'ironed' : 'delivered';
                handleStatusChange(nextStatus);
              }}
              className="flex-1 flex items-center justify-center gap-1"
              disabled={hasDeliveryOption && status === 'pending' && !order.driverId}
            >
              Passer à l'étape suivante
              <ArrowRight className="h-4 w-4" />
            </Button>
          </>
        )}
      </div>
      
      {/* Driver Assignment Dialog */}
      <DeliveryDriverAssignmentDialog 
        open={driverDialogOpen} 
        onOpenChange={setDriverDialogOpen}
        orderId={order.id}
        onAssign={assignDriver}
      />
    </div>
  );
};

export default OrderDetail;
