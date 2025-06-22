import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from '@/components/ui/button';
import { Package, Truck, Loader2, AlertCircle } from 'lucide-react';
import { DeliveryDriverAssignmentDialog } from '@/components/dialogs/DeliveryDriverAssignmentDialog';
// import { PendingOrderNotification } from '@/components/notifications/PendingOrderNotification';
import OrderService, { Order } from '@/services/order';
import LivreurService, { Livreur } from '@/services/livreur';

type OrderStatus = 'PrisEnCharge' | 'LavageEnCours' | 'Repassage' | 'Collecte' | 'Livraison' | 'Livre';

const Orders: React.FC = () => {
  const [activeTab, setActiveTab] = useState('all');
  const [orders, setOrders] = useState<Order[]>([]);
  const [livreurs, setLivreurs] = useState<Livreur[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [driverDialogOpen, setDriverDialogOpen] = useState(false);
  const [selectedOrderId, setSelectedOrderId] = useState<number | null>(null);
  const navigate = useNavigate();

  // Charger les données initiales
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const [ordersData, livreursData] = await Promise.all([
        OrderService.getOrders(),
        LivreurService.getAvailableLivreurs()
      ]);
      
      setOrders(ordersData);
      setLivreurs(livreursData);
    } catch (err) {
      setError('Erreur lors du chargement des données');
      console.error('Erreur:', err);
    } finally {
      setLoading(false);
    }
  };

  const filterOrders = (status: string) => {
    if (status === 'all') return orders;
    return orders.filter(order => order.statut === status);
  };

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

  const viewOrderDetail = (order: Order) => {
    navigate('/order-details', { state: { order } });
  };

  const openDriverAssignment = (orderId: number, event: React.MouseEvent) => {
    event.stopPropagation();
    setSelectedOrderId(orderId);
    setDriverDialogOpen(true);
  };

  const assignDriver = async (driverId: string) => {
    if (selectedOrderId) {
      try {
        const result = await OrderService.updateOrder(selectedOrderId, {
          livreurId: parseInt(driverId)
        });
        
        if (result.success && result.order) {
          // Mettre à jour la liste des commandes
      setOrders(prev => prev.map(order => 
            order.id === selectedOrderId ? result.order! : order
      ));
        }
        
      setSelectedOrderId(null);
      } catch (error) {
        console.error('Erreur lors de l\'assignation du livreur:', error);
      }
    }
  };

  const handleAcceptOrder = (orderId: number) => {
    // Logique pour accepter une commande (si nécessaire)
    console.log('Accepter commande:', orderId);
  };

  const handleRejectOrder = (orderId: number) => {
    // Logique pour rejeter une commande (si nécessaire)
    console.log('Rejeter commande:', orderId);
  };

  // Obtenir les commandes en attente avec livraison
  const pendingDeliveryOrders = orders.filter(
    order => order.statut === 'PrisEnCharge' && 
    order.options?.aOptionLivraison && 
    !order.livreurId
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
        <span className="ml-2">Chargement des commandes...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <AlertCircle className="h-8 w-8 text-red-500" />
        <span className="ml-2 text-red-500">{error}</span>
        <Button onClick={loadData} className="ml-4">
          Réessayer
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-8">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold tracking-tight">Commandes</h1>
        <Button onClick={loadData} variant="outline" size="sm">
          Actualiser
        </Button>
      </div>

      <Tabs defaultValue="all" value={activeTab} onValueChange={setActiveTab}>
        {/* Version desktop - à partir de lg (1024px) */}
        <TabsList className="hidden lg:grid lg:grid-cols-6 w-full">
          <TabsTrigger value="all">Tout ({orders.length})</TabsTrigger>
          <TabsTrigger value="PrisEnCharge">En attente ({filterOrders('PrisEnCharge').length})</TabsTrigger>
          <TabsTrigger value="LavageEnCours">Lavage ({filterOrders('LavageEnCours').length})</TabsTrigger>
          <TabsTrigger value="Repassage">Repassage ({filterOrders('Repassage').length})</TabsTrigger>
          <TabsTrigger value="Livraison">Livraison ({filterOrders('Livraison').length})</TabsTrigger>
          <TabsTrigger value="Livre">Livré ({filterOrders('Livre').length})</TabsTrigger>
        </TabsList>

        {/* Version tablet - 2 lignes à partir de md (768px) */}
        <div className="hidden md:block lg:hidden">
          <TabsList className="grid grid-cols-3 w-full mb-2">
            <TabsTrigger value="all" className="text-sm">
              Tout ({orders.length})
            </TabsTrigger>
            <TabsTrigger value="PrisEnCharge" className="text-sm">
              Attente ({filterOrders('PrisEnCharge').length})
            </TabsTrigger>
            <TabsTrigger value="LavageEnCours" className="text-sm">
              Lavage ({filterOrders('LavageEnCours').length})
            </TabsTrigger>
          </TabsList>
          <TabsList className="grid grid-cols-3 w-full">
            <TabsTrigger value="Repassage" className="text-sm">
              Repassage ({filterOrders('Repassage').length})
            </TabsTrigger>
            <TabsTrigger value="Livraison" className="text-sm">
              Livraison ({filterOrders('Livraison').length})
            </TabsTrigger>
            <TabsTrigger value="Livre" className="text-sm">
              Livré ({filterOrders('Livre').length})
            </TabsTrigger>
          </TabsList>
        </div>

        {/* Version mobile - scroll horizontal jusqu'à md (767px) */}
        <div className="md:hidden overflow-x-auto">
          <TabsList className="inline-flex w-max min-w-full">
            <TabsTrigger value="all" className="whitespace-nowrap px-3 text-xs">
              Tout ({orders.length})
            </TabsTrigger>
            <TabsTrigger value="PrisEnCharge" className="whitespace-nowrap px-3 text-xs">
              Attente ({filterOrders('PrisEnCharge').length})
            </TabsTrigger>
            <TabsTrigger value="LavageEnCours" className="whitespace-nowrap px-3 text-xs">
              Lavage ({filterOrders('LavageEnCours').length})
            </TabsTrigger>
            <TabsTrigger value="Repassage" className="whitespace-nowrap px-3 text-xs">
              Repassage ({filterOrders('Repassage').length})
            </TabsTrigger>
            <TabsTrigger value="Livraison" className="whitespace-nowrap px-3 text-xs">
              Livraison ({filterOrders('Livraison').length})
            </TabsTrigger>
            <TabsTrigger value="Livre" className="whitespace-nowrap px-3 text-xs">
              Livré ({filterOrders('Livre').length})
            </TabsTrigger>
          </TabsList>
        </div>
        
        <TabsContent value="all" className="space-y-4 mt-4">
          {filterOrders('all').map((order) => (
            <OrderCard 
              key={order.id}
              order={order}
              getStatusColor={getStatusColor}
              getStatusLabel={getStatusLabel}
              getClientName={getClientName}
              formatDate={formatDate}
              formatTime={formatTime}
              onClick={() => viewOrderDetail(order)}
              onAssignDriver={(e) => order.options?.aOptionLivraison && !order.livreurId && openDriverAssignment(order.id, e)}
            />
          ))}
          {filterOrders('all').length === 0 && (
            <div className="text-center py-8 text-gray-500">
              Aucune commande trouvée
            </div>
          )}
        </TabsContent>
        
        <TabsContent value="PrisEnCharge" className="space-y-4 mt-4">
          {filterOrders('PrisEnCharge').map((order) => (
            <OrderCard 
              key={order.id}
              order={order}
              getStatusColor={getStatusColor}
              getStatusLabel={getStatusLabel}
              getClientName={getClientName}
              formatDate={formatDate}
              formatTime={formatTime}
              onClick={() => viewOrderDetail(order)}
              onAssignDriver={(e) => order.options?.aOptionLivraison && !order.livreurId && openDriverAssignment(order.id, e)}
            />
          ))}
          {filterOrders('PrisEnCharge').length === 0 && (
            <div className="text-center py-8 text-gray-500">
              Aucune commande en attente
            </div>
          )}
        </TabsContent>
        
        <TabsContent value="LavageEnCours" className="space-y-4 mt-4">
          {filterOrders('LavageEnCours').map((order) => (
            <OrderCard 
              key={order.id}
              order={order}
              getStatusColor={getStatusColor}
              getStatusLabel={getStatusLabel}
              getClientName={getClientName}
              formatDate={formatDate}
              formatTime={formatTime}
              onClick={() => viewOrderDetail(order)}
              onAssignDriver={(e) => order.options?.aOptionLivraison && !order.livreurId && openDriverAssignment(order.id, e)}
            />
          ))}
          {filterOrders('LavageEnCours').length === 0 && (
            <div className="text-center py-8 text-gray-500">
              Aucune commande en cours de lavage
            </div>
          )}
        </TabsContent>
        
        <TabsContent value="Repassage" className="space-y-4 mt-4">
          {filterOrders('Repassage').map((order) => (
            <OrderCard 
              key={order.id}
              order={order}
              getStatusColor={getStatusColor}
              getStatusLabel={getStatusLabel}
              getClientName={getClientName}
              formatDate={formatDate}
              formatTime={formatTime}
              onClick={() => viewOrderDetail(order)}
              onAssignDriver={(e) => order.options?.aOptionLivraison && !order.livreurId && openDriverAssignment(order.id, e)}
            />
          ))}
          {filterOrders('Repassage').length === 0 && (
            <div className="text-center py-8 text-gray-500">
              Aucune commande en repassage
            </div>
          )}
        </TabsContent>
        
        <TabsContent value="Livraison" className="space-y-4 mt-4">
          {filterOrders('Livraison').map((order) => (
            <OrderCard 
              key={order.id}
              order={order}
              getStatusColor={getStatusColor}
              getStatusLabel={getStatusLabel}
              getClientName={getClientName}
              formatDate={formatDate}
              formatTime={formatTime}
              onClick={() => viewOrderDetail(order)}
              onAssignDriver={(e) => order.options?.aOptionLivraison && !order.livreurId && openDriverAssignment(order.id, e)}
            />
          ))}
          {filterOrders('Livraison').length === 0 && (
            <div className="text-center py-8 text-gray-500">
              Aucune commande en livraison
            </div>
          )}
        </TabsContent>
        
        <TabsContent value="Livre" className="space-y-4 mt-4">
          {filterOrders('Livre').map((order) => (
            <OrderCard 
              key={order.id}
              order={order}
              getStatusColor={getStatusColor}
              getStatusLabel={getStatusLabel}
              getClientName={getClientName}
              formatDate={formatDate}
              formatTime={formatTime}
              onClick={() => viewOrderDetail(order)}
              onAssignDriver={(e) => order.options?.aOptionLivraison && !order.livreurId && openDriverAssignment(order.id, e)}
            />
          ))}
          {filterOrders('Livre').length === 0 && (
            <div className="text-center py-8 text-gray-500">
              Aucune commande livrée
            </div>
          )}
        </TabsContent>
      </Tabs>

      <div className="flex justify-center">
        <Button 
          variant="outline"
          className="w-full flex items-center justify-center gap-2"
          onClick={() => navigate('/search')}
        >
          <Package className="h-4 w-4" />
          Nouvelle commande
        </Button>
      </div>

      {/* Driver Assignment Dialog */}
      <DeliveryDriverAssignmentDialog 
        open={driverDialogOpen} 
        onOpenChange={setDriverDialogOpen}
        orderId={selectedOrderId?.toString() || ''}
        onAssign={assignDriver}
      />

      {/* Pending Order Notification */}
      {/* <PendingOrderNotification 
        pendingOrders={pendingDeliveryOrders.map(order => ({
          id: order.id.toString(),
          clientName: getClientName(order),
          price: order.prixTotal || 0,
          weight: order.masseClientIndicativeKg,
          status: 'pending' as const,
          date: formatDate(order.dateHeureCommande),
          time: formatTime(order.dateHeureCommande),
          options: {
            ironing: order.options?.aOptionRepassage || false,
            stainRemoval: false, // Pas dans le modèle actuel
            urgent: order.options?.aOptionExpress || false,
            delivery: order.options?.aOptionLivraison || false
          }
        }))}
        onAccept={handleAcceptOrder}
        onReject={handleRejectOrder}
      /> */}
    </div>
  );
};

interface OrderCardProps {
  order: Order;
  getStatusColor: (status: OrderStatus) => string;
  getStatusLabel: (status: OrderStatus) => string;
  getClientName: (order: Order) => string;
  formatDate: (dateString: string) => string;
  formatTime: (dateString: string) => string;
  onClick: () => void;
  onAssignDriver?: (event: React.MouseEvent) => void;
}

const OrderCard: React.FC<OrderCardProps> = ({
  order,
  getStatusColor,
  getStatusLabel,
  getClientName,
  formatDate,
  formatTime,
  onClick,
  onAssignDriver
}) => {
  return (
    <Card className="card-shadow cursor-pointer hover:bg-gray-50">
      <CardContent className="p-3 sm:p-4" onClick={onClick}>
        {/* En-tête - responsive layout */}
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-2">
          <div className="flex-1">
            <div className="font-medium text-sm sm:text-base">Commande #{order.id}</div>
            <div className="text-xs sm:text-sm text-gray-500">Client: {getClientName(order)}</div>
            {order.siteLavage && (
              <div className="text-xs text-gray-400">Site: {order.siteLavage.nom}</div>
            )}
          </div>
          <div className="text-left sm:text-right">
            <div className="text-primary font-semibold text-sm sm:text-base">
              {order.prixTotal ? `${order.prixTotal.toLocaleString()} FCFA` : 'Prix à calculer'}
            </div>
            <div className="text-xs text-gray-500">
              {formatDate(order.dateHeureCommande)} {formatTime(order.dateHeureCommande)}
            </div>
          </div>
        </div>
        
        {/* Status et infos - responsive */}
        <div className="mt-3 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2">
          <span className={`text-xs rounded-full px-2 py-1 inline-block w-fit ${getStatusColor(order.statut)}`}>
            {getStatusLabel(order.statut)}
          </span>
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <span>{order.masseClientIndicativeKg} kg</span>
            {order.formuleCommande && (
              <span className="bg-gray-100 px-2 py-1 rounded">
                {order.formuleCommande === 'BaseMachine' ? 'Machine' : 'Détail'}
              </span>
            )}
          </div>
        </div>
        
        {/* Options - responsive wrap */}
        {order.options && (
          <div className="mt-2 flex flex-wrap gap-1">
            {order.options.aOptionRepassage && (
              <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded whitespace-nowrap">Repassage</span>
            )}
            {order.options.aOptionSechage && (
              <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded whitespace-nowrap">Séchage</span>
            )}
            {order.options.aOptionLivraison && (
              <span className="text-xs bg-purple-100 text-purple-800 px-2 py-1 rounded whitespace-nowrap">Livraison</span>
            )}
            {order.options.aOptionExpress && (
              <span className="text-xs bg-red-100 text-red-800 px-2 py-1 rounded whitespace-nowrap">Express</span>
            )}
          </div>
        )}

        {/* Livreur assigné */}
        {order.livreur && (
          <div className="mt-2 text-xs text-gray-600">
            Livreur: {order.livreur.prenom} {order.livreur.nom}
          </div>
        )}
        
        {/* Bouton d'assignation de livreur */}
        {order.options?.aOptionLivraison && !order.livreurId && order.statut === 'PrisEnCharge' && (
          <div className="mt-3">
            <Button
              size="sm"
              variant="outline"
              className="w-full flex items-center justify-center gap-1 text-xs sm:text-sm"
              onClick={(e) => onAssignDriver && onAssignDriver(e)}
            >
              <Truck className="h-3 w-3 sm:h-4 sm:w-4" />
              Affecter un livreur
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default Orders;
