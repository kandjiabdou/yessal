import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Package, Truck, Loader2, AlertCircle, ChevronLeft, ChevronRight, Search } from 'lucide-react';
import { DeliveryDriverAssignmentDialog } from '@/components/dialogs/DeliveryDriverAssignmentDialog';
// import { PendingOrderNotification } from '@/components/notifications/PendingOrderNotification';
import OrderService, { Order } from '@/services/order';
import LivreurService, { Livreur } from '@/services/livreur';
import AuthService from '@/services/auth';

type OrderStatus = 'PrisEnCharge' | 'LavageEnCours' | 'Repassage' | 'Collecte' | 'Livraison' | 'Livre';

const Orders: React.FC = () => {
  const [activeTab, setActiveTab] = useState('all');
  const [orders, setOrders] = useState<Order[]>([]);
  const [livreurs, setLivreurs] = useState<Livreur[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [driverDialogOpen, setDriverDialogOpen] = useState(false);
  const [selectedOrderId, setSelectedOrderId] = useState<number | null>(null);
  
  // États pour la pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [totalOrders, setTotalOrders] = useState(0);
  const limit = 10; // Maximum 10 commandes par page
  
  // États pour la recherche
  const [searchTerm, setSearchTerm] = useState('');
  const [searchTimeout, setSearchTimeout] = useState<NodeJS.Timeout | null>(null);
  
  const navigate = useNavigate();

  // Charger les données initiales
  useEffect(() => {
    loadData();
  }, []);

  // Nettoyer les timeouts lors du démontage
  useEffect(() => {
    return () => {
      if (searchTimeout) {
        clearTimeout(searchTimeout);
      }
    };
  }, [searchTimeout]);

  const loadData = async (page: number = currentPage, status: string = activeTab, search: string = searchTerm) => {
    try {
      setLoading(true);
      setError(null);
      
      // Récupérer l'utilisateur connecté et son site
      const user = AuthService.getUser();
      if (!user || !user.siteLavagePrincipalGerantId) {
        setError('Aucun site assigné au manager');
        return;
      }
      
      const [ordersResponse, livreursData] = await Promise.all([
        OrderService.getOrders(page, limit, status, user.siteLavagePrincipalGerantId, search),
        LivreurService.getAvailableLivreurs()
      ]);
      
      setOrders(ordersResponse.orders);
      setCurrentPage(ordersResponse.page);
      setTotalPages(ordersResponse.totalPages);
      setTotalOrders(ordersResponse.total);
      setLivreurs(livreursData);
    } catch (err) {
      setError('Erreur lors du chargement des données');
      console.error('Erreur:', err);
    } finally {
      setLoading(false);
    }
  };

  // Fonction pour changer de page
  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setCurrentPage(newPage);
      loadData(newPage, activeTab, searchTerm);
    }
  };

  // Fonction pour changer d'onglet
  const handleTabChange = (newTab: string) => {
    setActiveTab(newTab);
    setCurrentPage(1); // Revenir à la page 1 lors du changement d'onglet
    loadData(1, newTab, searchTerm);
  };

  // Fonction pour gérer la recherche avec debounce
  const handleSearchChange = (value: string) => {
    setSearchTerm(value);
    
    // Annuler le timeout précédent
    if (searchTimeout) {
      clearTimeout(searchTimeout);
    }
    
    // Créer un nouveau timeout pour la recherche
    const newTimeout = setTimeout(() => {
      setCurrentPage(1); // Revenir à la page 1 lors de la recherche
      loadData(1, activeTab, value);
    }, 500); // Attendre 500ms après la dernière frappe
    
    setSearchTimeout(newTimeout);
  };

  // Fonction pour effacer la recherche
  const clearSearch = () => {
    setSearchTerm('');
    setCurrentPage(1);
    loadData(1, activeTab, '');
  };

  // Le filtrage se fait maintenant côté API, plus besoin de filtrer côté frontend

  // Fonction helper pour afficher le message d'état vide
  const getEmptyStateMessage = (defaultMessage: string) => {
    if (searchTerm) {
      return (
        <div>
          <p>Aucun résultat trouvé pour "{searchTerm}"</p>
          <Button variant="outline" size="sm" onClick={clearSearch} className="mt-2">
            Effacer la recherche
          </Button>
        </div>
      );
    }
    return defaultMessage;
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
          // Recharger les données de la page actuelle
          loadData(currentPage, activeTab, searchTerm);
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
        <Button onClick={() => loadData()} className="ml-4">
          Réessayer
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Commandes</h1>
          <p className="text-sm text-gray-500">
            {totalOrders > 0 ? (
              <>Affichage {((currentPage - 1) * limit) + 1}-{Math.min(currentPage * limit, totalOrders)} sur {totalOrders} commandes</>
            ) : (
              'Aucune commande'
            )}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* Navigation pagination */}
          {totalPages > 1 && (
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage <= 1}
                className="h-8 w-8 p-0"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-sm px-2">
                Page {currentPage} sur {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage >= totalPages}
                className="h-8 w-8 p-0"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          )}
          <Button onClick={() => loadData(currentPage, activeTab, searchTerm)} variant="outline" size="sm">
            Actualiser
          </Button>
        </div>
      </div>

      {/* Champ de recherche */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            placeholder="Rechercher par nom du client ou n° de commande..."
            value={searchTerm}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="pl-10 pr-10"
          />
          {searchTerm && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearSearch}
              className="absolute right-1 top-1/2 transform -translate-y-1/2 h-8 w-8 p-0 hover:bg-gray-100"
            >
              ×
            </Button>
          )}
        </div>
        {searchTerm && (
          <div className="text-sm text-gray-500 flex items-center">
            {totalOrders > 0 ? (
              `${totalOrders} résultat${totalOrders > 1 ? 's' : ''} trouvé${totalOrders > 1 ? 's' : ''}`
            ) : (
              'Aucun résultat trouvé'
            )}
          </div>
        )}
      </div>

      <Tabs defaultValue="all" value={activeTab} onValueChange={handleTabChange}>
        {/* Version desktop - à partir de lg (1024px) */}
        <TabsList className="hidden lg:grid lg:grid-cols-6 w-full">
          <TabsTrigger value="all">Toutes</TabsTrigger>
          <TabsTrigger value="PrisEnCharge">En attente</TabsTrigger>
          <TabsTrigger value="LavageEnCours">Lavage</TabsTrigger>
          <TabsTrigger value="Repassage">Repassage</TabsTrigger>
          <TabsTrigger value="Livraison">Livraison</TabsTrigger>
          <TabsTrigger value="Livre">Livré</TabsTrigger>
        </TabsList>

        {/* Version tablet - 2 lignes à partir de md (768px) */}
        <div className="hidden md:block lg:hidden">
          <TabsList className="grid grid-cols-3 w-full mb-2">
            <TabsTrigger value="all" className="text-sm">
              Toutes
            </TabsTrigger>
            <TabsTrigger value="PrisEnCharge" className="text-sm">
              En attente
            </TabsTrigger>
            <TabsTrigger value="LavageEnCours" className="text-sm">
              Lavage
            </TabsTrigger>
          </TabsList>
          <TabsList className="grid grid-cols-3 w-full">
            <TabsTrigger value="Repassage" className="text-sm">
              Repassage
            </TabsTrigger>
            <TabsTrigger value="Livraison" className="text-sm">
              Livraison
            </TabsTrigger>
            <TabsTrigger value="Livre" className="text-sm">
              Livré
            </TabsTrigger>
          </TabsList>
        </div>

        {/* Version mobile - scroll horizontal jusqu'à md (767px) */}
        <div className="md:hidden overflow-x-auto">
          <TabsList className="inline-flex w-max min-w-full">
            <TabsTrigger value="all" className="whitespace-nowrap px-3 text-xs">
              Toutes
            </TabsTrigger>
            <TabsTrigger value="PrisEnCharge" className="whitespace-nowrap px-3 text-xs">
              En attente
            </TabsTrigger>
            <TabsTrigger value="LavageEnCours" className="whitespace-nowrap px-3 text-xs">
              Lavage
            </TabsTrigger>
            <TabsTrigger value="Repassage" className="whitespace-nowrap px-3 text-xs">
              Repassage
            </TabsTrigger>
            <TabsTrigger value="Livraison" className="whitespace-nowrap px-3 text-xs">
              Livraison
            </TabsTrigger>
            <TabsTrigger value="Livre" className="whitespace-nowrap px-3 text-xs">
              Livré
            </TabsTrigger>
          </TabsList>
        </div>
        
        {/* Contenu unique - les données sont déjà filtrées côté API */}
        <TabsContent value="all" className="space-y-4 mt-4">
          {orders.map((order) => (
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
          {orders.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              {getEmptyStateMessage(
                activeTab === 'all' ? 'Aucune commande trouvée' : 
                activeTab === 'PrisEnCharge' ? 'Aucune commande en attente' :
                activeTab === 'LavageEnCours' ? 'Aucune commande en cours de lavage' :
                activeTab === 'Repassage' ? 'Aucune commande en repassage' :
                activeTab === 'Livraison' ? 'Aucune commande en livraison' :
                activeTab === 'Livre' ? 'Aucune commande livrée' :
                'Aucune commande trouvée'
              )}
            </div>
          )}
        </TabsContent>
        
        <TabsContent value="PrisEnCharge" className="space-y-4 mt-4">
          {orders.map((order) => (
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
          {orders.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              {searchTerm ? (
                <div>
                  <p>Aucun résultat trouvé pour "{searchTerm}"</p>
                  <Button variant="outline" size="sm" onClick={clearSearch} className="mt-2">
                    Effacer la recherche
                  </Button>
                </div>
              ) : (
                'Aucune commande en attente'
              )}
            </div>
          )}
        </TabsContent>
        
        <TabsContent value="LavageEnCours" className="space-y-4 mt-4">
          {orders.map((order) => (
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
          {orders.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              Aucune commande en cours de lavage
            </div>
          )}
        </TabsContent>
        
        <TabsContent value="Repassage" className="space-y-4 mt-4">
          {orders.map((order) => (
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
          {orders.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              Aucune commande en repassage
            </div>
          )}
        </TabsContent>
        
        <TabsContent value="Livraison" className="space-y-4 mt-4">
          {orders.map((order) => (
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
          {orders.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              Aucune commande en livraison
            </div>
          )}
        </TabsContent>
        
        <TabsContent value="Livre" className="space-y-4 mt-4">
          {orders.map((order) => (
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
          {orders.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              Aucune commande livrée
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Pagination en bas */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-4 pt-4 border-t">
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage <= 1}
              className="flex items-center gap-1"
            >
              <ChevronLeft className="h-4 w-4" />
              Précédent
            </Button>
            
            <div className="flex items-center gap-1">
              {/* Affichage des numéros de page */}
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let pageNum;
                if (totalPages <= 5) {
                  pageNum = i + 1;
                } else if (currentPage <= 3) {
                  pageNum = i + 1;
                } else if (currentPage >= totalPages - 2) {
                  pageNum = totalPages - 4 + i;
                } else {
                  pageNum = currentPage - 2 + i;
                }
                
                return (
                  <Button
                    key={pageNum}
                    variant={currentPage === pageNum ? "default" : "outline"}
                    size="sm"
                    onClick={() => handlePageChange(pageNum)}
                    className="h-8 w-8 p-0"
                  >
                    {pageNum}
                  </Button>
                );
              })}
            </div>
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage >= totalPages}
              className="flex items-center gap-1"
            >
              Suivant
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

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
