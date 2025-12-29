import React, { useState, useEffect } from 'react';
import { Search, Calendar, User, Package, DollarSign, XCircle, Plus } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { NewSaleDialog } from './NewSaleDialog';
import ShopService, { Sale } from '@/services/shop';
import AuthService from '@/services/auth';
import { toast } from '@/hooks/use-toast';
import { format, formatDistanceToNow, differenceInHours } from 'date-fns';
import { fr } from 'date-fns/locale';

const ShopSales: React.FC = () => {
  const [isNewSaleOpen, setIsNewSaleOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterPeriod, setFilterPeriod] = useState('all');
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);
  const [sales, setSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);
  const [saleToCancel, setSaleToCancel] = useState<Sale | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalSales, setTotalSales] = useState(0);
  const limit = 10;

  const siteLavageId = AuthService.getCurrentSiteLavageId();
  const currentUser = AuthService.getUser();
  const currentUserId = currentUser?.id;

  useEffect(() => {
    setCurrentPage(1); // Réinitialiser à la page 1 quand le filtre change
    loadSales(1);
  }, [filterPeriod]);

  useEffect(() => {
    loadSales(currentPage);
  }, [currentPage]);

  const loadSales = async (page: number = currentPage) => {
    if (!siteLavageId) {
      toast({
        title: "Erreur",
        description: "Site de lavage non trouvé",
        variant: "destructive"
      });
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const filters: { startDate?: string; endDate?: string; page: number; limit: number } = {
        page,
        limit
      };

      // Appliquer les filtres de période
      const now = new Date();
      if (filterPeriod === 'today') {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        filters.startDate = today.toISOString();
      } else if (filterPeriod === 'week') {
        const weekAgo = new Date(now);
        weekAgo.setDate(weekAgo.getDate() - 7);
        filters.startDate = weekAgo.toISOString();
      } else if (filterPeriod === 'month') {
        const monthAgo = new Date(now);
        monthAgo.setMonth(monthAgo.getMonth() - 1);
        filters.startDate = monthAgo.toISOString();
      }

      const response = await ShopService.getSales(siteLavageId, filters);
      setSales(response.ventes);
      setTotalPages(response.totalPages);
      setTotalSales(response.total);
    } catch (error) {
      console.error('Erreur lors du chargement des ventes:', error);
      toast({
        title: "Erreur",
        description: "Erreur lors du chargement des ventes",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const filteredSales = sales.filter(sale => {
    const matchesSearch = 
      sale.numeroFacture.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (sale.clientUser ? `${sale.clientUser.nom} ${sale.clientUser.prenom}`.toLowerCase() : 'client anonyme').includes(searchTerm.toLowerCase()) ||
      `${sale.manager.nom} ${sale.manager.prenom}`.toLowerCase().includes(searchTerm.toLowerCase());
    
    return matchesSearch;
  });

  const totalRevenue = filteredSales.reduce((sum, sale) => sum + sale.montantTotal, 0);
  const displayedSalesCount = filteredSales.length;

  // Vérifier si une vente peut être annulée
  const canCancelSale = (sale: Sale): boolean => {
    const saleDate = new Date(sale.dateVente);
    const hoursDiff = differenceInHours(new Date(), saleDate);
    
    // La vente doit avoir moins de 12h et être du manager connecté
    return hoursDiff < 12 && sale.managerUserId === currentUserId;
  };

  // Annuler une vente
  const handleCancelSale = async (sale: Sale, e: React.MouseEvent) => {
    e.stopPropagation(); // Empêcher l'ouverture des détails

    if (!canCancelSale(sale)) {
      toast({
        title: "Annulation impossible",
        description: "Vous ne pouvez pas annuler cette vente",
        variant: "destructive"
      });
      return;
    }

    setSaleToCancel(sale);
  };

  const confirmCancelSale = async () => {
    if (!saleToCancel) return;

    try {
      await ShopService.cancelSale(saleToCancel.id);
      toast({
        title: "Succès",
        description: "Vente annulée avec succès",
        variant: "success"
      });
      setSaleToCancel(null);
      loadSales(); // Recharger la liste
    } catch (error: any) {
      console.error('Erreur lors de l\'annulation:', error);
      toast({
        title: "Erreur",
        description: error.response?.data?.message || "Erreur lors de l'annulation de la vente",
        variant: "destructive"
      });
    }
  };

  const handleSaleCreated = () => {
    setIsNewSaleOpen(false);
    loadSales(); // Recharger la liste
  };

  return (
    <div className="space-y-6 pb-24">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Ventes</h1>
          <p className="text-sm text-gray-500 mt-1">
            Historique des ventes de la boutique
          </p>
        </div>
        <Button
          onClick={() => setIsNewSaleOpen(true)}
          className="bg-[#66d9a1] hover:bg-[#52c48a] text-black font-semibold shadow-md"
        >
          <Plus className="h-4 w-4 mr-2" />
          Nouvelle vente
        </Button>
      </div>

      {/* Filtres */}
      <div className="flex gap-3">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Rechercher par facture, client, vendeur..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={filterPeriod} onValueChange={setFilterPeriod}>
          <SelectTrigger className="w-[140px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Toutes</SelectItem>
            <SelectItem value="today">Aujourd'hui</SelectItem>
            <SelectItem value="week">Cette semaine</SelectItem>
            <SelectItem value="month">Ce mois</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Liste des ventes */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <Card key={i} className="border-none shadow-md">
              <CardContent className="p-4">
                <div className="h-24 animate-pulse bg-gray-200 rounded" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : filteredSales.length === 0 ? (
        <Card className="border-none shadow-md">
          <CardContent className="p-12 text-center">
            <Package className="h-12 w-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">Aucune vente trouvée</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredSales.map((sale) => (
            <Card
              key={sale.id}
              className={`border-none shadow-md hover:shadow-lg transition-shadow cursor-pointer ${!sale.flag ? 'opacity-50 bg-gray-100' : ''}`}
              onClick={() => setSelectedSale(selectedSale?.id === sale.id ? null : sale)}
            >
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-bold text-gray-900">{sale.numeroFacture}</p>
                      <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded-full font-medium">
                        {sale.modePaiement}
                      </span>
                      {!sale.flag && (
                        <span className="px-2 py-0.5 bg-red-100 text-red-700 text-xs rounded-full font-medium">
                          Annulée
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-600">
                      {sale.clientUser ? `${sale.clientUser.nom} ${sale.clientUser.prenom}` : 'Client anonyme'}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-lg text-[#66d9a1]">
                      {sale.montantTotal.toLocaleString()} F
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {sale.nombreArticles} article{sale.nombreArticles > 1 ? 's' : ''}
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-4 text-xs text-gray-500">
                    <div className="flex items-center gap-1">
                      <User className="h-3 w-3" />
                      <span>{sale.manager.nom} {sale.manager.prenom}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      <span>{format(new Date(sale.dateVente), 'dd/MM/yyyy HH:mm', { locale: fr })}</span>
                    </div>
                  </div>

                  {/* Bouton annuler */}
                  {sale.flag && (
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={(e) => handleCancelSale(sale, e)}
                      disabled={!canCancelSale(sale)}
                      className={canCancelSale(sale) 
                        ? "bg-red-600 hover:bg-red-700 text-white h-7 px-2" 
                        : "opacity-50 cursor-not-allowed h-7 px-2"}
                    >
                      <XCircle className="h-3.5 w-3.5 mr-1 text-white" />
                      <span className="text-xs text-white">Annuler</span>
                    </Button>
                  )}
                </div>

                {/* Détails des articles (visible si sélectionné) */}
                {selectedSale?.id === sale.id && (
                  <div className="pt-3 border-t space-y-2">
                    <p className="text-sm font-semibold text-gray-900 mb-2">Détails de la vente</p>
                    {sale.lignesVente.map((ligne) => (
                      <div key={ligne.id} className="flex items-center justify-between text-sm bg-gray-50 rounded-lg p-2">
                        <div>
                          <p className="font-medium text-gray-900">{ligne.produit.nom}</p>
                          <p className="text-xs text-gray-500">
                            {ligne.prixUnitaire.toLocaleString()} F × {ligne.quantite}
                          </p>
                        </div>
                        <p className="font-semibold text-gray-900">
                          {(ligne.prixUnitaire * ligne.quantite).toLocaleString()} F
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Pagination */}
      {!loading && totalPages > 1 && (
        <Card className="border-none shadow-md">
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <p className="text-sm font-medium text-gray-700">
                Page <span className="font-bold text-[#66d9a1]">{currentPage}</span> sur {totalPages}
                <span className="text-gray-500 ml-2">
                  ({totalSales} vente{totalSales > 1 ? 's' : ''} au total)
                </span>
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                  className="h-9 px-4 font-medium"
                >
                  ← Précédent
                </Button>
                
                {/* Afficher quelques numéros de page */}
                <div className="flex gap-1">
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
                        onClick={() => setCurrentPage(pageNum)}
                        className={`h-9 w-9 ${currentPage === pageNum ? 'bg-[#66d9a1] hover:bg-[#58c791] text-white' : ''}`}
                      >
                        {pageNum}
                      </Button>
                    );
                  })}
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                  className="h-9 px-4 font-medium"
                >
                  Suivant →
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Dialogue de confirmation d'annulation */}
      <AlertDialog open={!!saleToCancel} onOpenChange={() => setSaleToCancel(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Annuler la vente</AlertDialogTitle>
            <AlertDialogDescription>
              Êtes-vous sûr de vouloir annuler la vente <strong>{saleToCancel?.numeroFacture}</strong> ?
              <br />
              <br />
              Cette action va restaurer le stock des produits vendus.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmCancelSale}
              className="bg-red-600 hover:bg-red-700"
            >
              Confirmer l'annulation
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Dialog pour nouvelle vente */}
      <NewSaleDialog
        open={isNewSaleOpen}
        onOpenChange={setIsNewSaleOpen}
        onSaleCreated={handleSaleCreated}
      />
    </div>
  );
};

export default ShopSales;
