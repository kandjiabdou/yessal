import React, { useState, useEffect } from 'react';
import { Plus, Loader2, AlertCircle, TrendingDown, TrendingUp, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AddFluxDialog, FluxItemList, EditFluxDialog } from '@/components/finance';
import FluxFinancierService, { FluxFinancier } from '@/services/fluxFinancier';
import AuthService from '@/services/auth';
import { toast } from 'react-toastify';

const Depenses: React.FC = () => {
  const [fluxList, setFluxList] = useState<FluxFinancier[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  
  // États pour la modale d'édition/détails
  const [selectedFlux, setSelectedFlux] = useState<FluxFinancier | null>(null);
  const [dialogMode, setDialogMode] = useState<'view' | 'edit'>('view');
  
  // État pour la confirmation de suppression
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [fluxToDelete, setFluxToDelete] = useState<FluxFinancier | null>(null);
  
  // Pagination & filtres
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const limit = 20;
  
  // Filtre de statut
  const [selectedStatus, setSelectedStatus] = useState<'all' | 'pending' | 'validated'>('all');

  // Sélection du mois (format YYYY-MM)
  const getCurrentMonth = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    return `${year}-${month}`;
  };

  const [selectedMonth, setSelectedMonth] = useState(getCurrentMonth());

  // Statistiques
  const [stats, setStats] = useState({
    depenses: { total: 0, count: 0 },
    recettes: { total: 0, count: 0 },
    solde: 0
  });

  const loadFluxFinanciers = async () => {
    try {
      setLoading(true);
      setError(null);

      const user = AuthService.getUser();
      if (!user?.siteLavagePrincipalGerantId) {
        setError('Site de lavage non défini');
        return;
      }

      // Charger les flux avec pagination
      const response = await FluxFinancierService.getFluxFinanciers(
        user.siteLavagePrincipalGerantId,
        {
          page: currentPage,
          limit,
          month: selectedMonth,
          ...(selectedStatus !== 'all' && { status: selectedStatus })
        }
      );

      if (response.success && response.data) {
        setFluxList(response.data);
        if (response.pagination) {
          setTotalPages(response.pagination.totalPages);
          setTotal(response.pagination.total);
        }
      } else {
        setFluxList([]);
        setTotalPages(1);
        setTotal(0);
      }

      // Charger les statistiques du mois
      const statsResponse = await FluxFinancierService.getStatistics(
        user.siteLavagePrincipalGerantId,
        { 
          month: selectedMonth,
          ...(selectedStatus !== 'all' && { status: selectedStatus })
        }
      );

      if (statsResponse.success && statsResponse.data) {
        setStats(statsResponse.data);
      }
    } catch (err) {
      console.error('Erreur:', err);
      setError('Erreur lors du chargement des données');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFluxFinanciers();
  }, [currentPage, selectedMonth, selectedStatus]);

  const handleSuccess = () => {
    setCurrentPage(1); // Retour à la première page
    loadFluxFinanciers();
  };

  const handleViewDetails = (flux: FluxFinancier) => {
    setSelectedFlux(flux);
    setDialogMode('view');
  };

  const handleEdit = (flux: FluxFinancier) => {
    setSelectedFlux(flux);
    setDialogMode('edit');
  };

  const handleDelete = async (flux: FluxFinancier) => {
    setFluxToDelete(flux);
    setShowDeleteDialog(true);
  };

  const confirmDelete = async () => {
    if (!fluxToDelete) return;

    try {
      setLoading(true);
      const result = await FluxFinancierService.deleteFlux(fluxToDelete.id);
      
      if (result.success) {
        toast.success('Flux financier supprimé avec succès');
        // Recharger la liste
        await loadFluxFinanciers();
      } else {
        const errorMsg = result.message || 'Erreur lors de la suppression';
        setError(errorMsg);
        toast.error(errorMsg);
      }
    } catch (err) {
      console.error('Erreur lors de la suppression:', err);
      const errorMsg = 'Erreur lors de la suppression du flux';
      setError(errorMsg);
      toast.error(errorMsg);
    } finally {
      setLoading(false);
      setShowDeleteDialog(false);
      setFluxToDelete(null);
    }
  };

  const handleEditSuccess = () => {
    setSelectedFlux(null);
    loadFluxFinanciers(); // Recharger la liste
  };

  const handleMonthChange = (direction: 'prev' | 'next') => {
    const [year, month] = selectedMonth.split('-').map(Number);
    const date = new Date(year, month - 1, 1);
    
    if (direction === 'prev') {
      date.setMonth(date.getMonth() - 1);
    } else {
      date.setMonth(date.getMonth() + 1);
    }
    
    const newYear = date.getFullYear();
    const newMonth = String(date.getMonth() + 1).padStart(2, '0');
    setSelectedMonth(`${newYear}-${newMonth}`);
    setCurrentPage(1); // Reset à la page 1 quand on change de mois
  };

  const formatMonthDisplay = (monthStr: string) => {
    const [year, month] = monthStr.split('-');
    const date = new Date(Number(year), Number(month) - 1, 1);
    return date.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
  };

  // Vérifier si on peut aller au mois suivant (pas de mois futur)
  const canGoToNextMonth = () => {
    const currentMonth = getCurrentMonth();
    return selectedMonth < currentMonth;
  };

  const formatCurrency = (amount: number) => {
    return `${amount.toLocaleString('fr-FR')} FCFA`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
        <span className="ml-2">Chargement...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <p className="text-lg font-medium text-gray-900 mb-2">Erreur</p>
          <p className="text-gray-600 mb-4">{error}</p>
          <Button onClick={loadFluxFinanciers}>Réessayer</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6 pb-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight">Dépenses</h1>
          <p className="text-sm sm:text-base text-muted-foreground">
            Gestion des flux financiers
          </p>
        </div>
        <Button onClick={() => setIsDialogOpen(true)} className="w-full sm:w-auto">
          <Plus className="h-5 w-5 mr-2" />
          Ajouter une dépense
        </Button>
      </div>

      {/* Sélecteur de mois */}
      <Card className="card-shadow">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleMonthChange('prev')}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <div className="text-center">
              <p className="text-lg font-semibold capitalize">{formatMonthDisplay(selectedMonth)}</p>
              <p className="text-xs text-gray-500">{total} transaction(s)</p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleMonthChange('next')}
              disabled={!canGoToNextMonth()}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Filtre de statut */}
      <Card className="card-shadow">
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium">Filtrer par statut :</span>
            <Select value={selectedStatus} onValueChange={(value: 'all' | 'pending' | 'validated') => {
              setSelectedStatus(value);
              setCurrentPage(1);
            }}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Sélectionner" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous</SelectItem>
                <SelectItem value="pending">En attente</SelectItem>
                <SelectItem value="validated">Validé</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Dashboard Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="card-shadow">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 mb-1">Total Dépenses : {stats.depenses.count} transaction(s)</p>
                <p className="text-xl sm:text-2xl font-bold text-red-600">
                  {formatCurrency(stats.depenses.total)}
                </p>
              </div>
              <div className="p-3 bg-red-100 rounded-full">
                <TrendingDown className="h-6 w-6 text-red-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="card-shadow">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 mb-1">Total Recettes : {stats.recettes.count} transaction(s)</p>
                <p className="text-xl sm:text-2xl font-bold text-green-600">
                  {formatCurrency(stats.recettes.total)}
                </p>
              </div>
              <div className="p-3 bg-green-100 rounded-full">
                <TrendingUp className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="card-shadow">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 mb-1">Solde : {total} transaction(s) total</p>
                <p className={`text-xl sm:text-2xl font-bold ${stats.solde >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {formatCurrency(stats.solde)}
                </p>
              </div>
              <div className={`p-3 rounded-full ${stats.solde >= 0 ? 'bg-green-100' : 'bg-red-100'}`}>
                {stats.solde >= 0 ? (
                  <TrendingUp className="h-6 w-6 text-green-600" />
                ) : (
                  <TrendingDown className="h-6 w-6 text-red-600" />
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Liste des transactions */}
      <Card className="card-shadow">
        <CardHeader>
          <CardTitle className="text-lg">Liste des transactions</CardTitle>
        </CardHeader>
        <CardContent>
          <FluxItemList
            fluxList={fluxList}
            loading={false}
            error={null}
            emptyMessage="Aucune transaction enregistrée pour ce mois"
            onViewDetails={handleViewDetails}
            onEdit={handleEdit}
            onDelete={handleDelete}
            onRetry={loadFluxFinanciers}
          />

          {/* Pagination */}
          {totalPages > 1 && fluxList.length > 0 && (
            <div className="flex items-center justify-between mt-4 pt-4 border-t">
              <div className="text-sm text-gray-600">
                Page {currentPage} sur {totalPages}
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                  Précédent
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                >
                  Suivant
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialogs */}
      <AddFluxDialog
        isOpen={isDialogOpen}
        onClose={() => setIsDialogOpen(false)}
        onSuccess={handleSuccess}
      />

      {selectedFlux && (
        <EditFluxDialog
          isOpen={!!selectedFlux}
          onClose={() => setSelectedFlux(null)}
          flux={selectedFlux}
          onSuccess={handleEditSuccess}
          mode={dialogMode}
        />
      )}

      {/* Dialogue de confirmation de suppression */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmer la suppression</AlertDialogTitle>
            <AlertDialogDescription asChild>
              {fluxToDelete ? (
                <div className="space-y-3">
                  <p>Êtes-vous sûr de vouloir supprimer ce flux financier ?</p>
                  <div className="p-3 bg-gray-50 rounded-md space-y-1">
                    <p className="font-medium">{fluxToDelete.motif || 'Sans motif'}</p>
                    <p className="text-sm">
                      Montant: <span className={`font-semibold ${fluxToDelete.type === 'depense' ? 'text-red-600' : 'text-green-600'}`}>
                        {formatCurrency(fluxToDelete.montant)}
                      </span>
                    </p>
                  </div>
                  <p className="text-red-600">Cette action est irréversible.</p>
                </div>
              ) : (
                <div />
              )}
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

export default Depenses;
