import React, { useState, useEffect } from 'react';
import { Loader2, AlertCircle, ChevronLeft, ChevronRight, List, LayoutGrid, Plus } from 'lucide-react';
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
import { Checkbox } from "@/components/ui/checkbox";
import { FluxItemList, EditFluxDialog } from '@/components/finance';
import FluxFinancierService, { FluxFinancier, FluxFinancierGroupedByLaverie } from '@/services/fluxFinancier';
import LaverieReferenceService, { LaverieReferenceSimple } from '@/services/laverieReference';
import AuthService from '@/services/auth';
import { toast } from 'react-toastify';
import { useNavigate } from 'react-router-dom';

type ViewMode = 'simple' | 'grouped';

const Depenses: React.FC = () => {
  const navigate = useNavigate();
  const [viewMode, setViewMode] = useState<ViewMode>('simple');
  const [fluxList, setFluxList] = useState<FluxFinancier[]>([]);
  const [groupedData, setGroupedData] = useState<FluxFinancierGroupedByLaverie[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
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

  // Laveries disponibles et sélectionnées
  const [availableLaveries, setAvailableLaveries] = useState<LaverieReferenceSimple[]>([]);
  const [selectedLaverieIds, setSelectedLaverieIds] = useState<number[]>([]);
  const [showLaverieFilter, setShowLaverieFilter] = useState(false);

  // Sélection du mois (format YYYY-MM)
  const getCurrentMonth = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    return `${year}-${month}`;
  };

  const [selectedMonth, setSelectedMonth] = useState(getCurrentMonth());

  // Charger les laveries disponibles au montage
  useEffect(() => {
    loadAvailableLaveries();
  }, []);

  const loadAvailableLaveries = async () => {
    try {
      const response = await LaverieReferenceService.getAllLaveries();
      if (response.success && response.data) {
        setAvailableLaveries(response.data);
      }
    } catch (err) {
      console.error('Erreur lors du chargement des laveries:', err);
    }
  };

  const loadFluxFinanciers = async () => {
    try {
      setLoading(true);
      setError(null);

      const options = {
        month: selectedMonth,
        laverieIds: selectedLaverieIds.length > 0 ? selectedLaverieIds : undefined,
        groupByLaverie: viewMode === 'grouped',
        ...(viewMode === 'simple' && { page: currentPage, limit })
      };

      const response = await FluxFinancierService.getFluxFinanciers(options);

      if (response.success) {
        if (viewMode === 'simple' && 'pagination' in response) {
          setFluxList(response.data || []);
          if (response.pagination) {
            setTotal(response.pagination.total);
            setTotalPages(response.pagination.totalPages);
          }
        } else if (viewMode === 'grouped' && 'total' in response) {
          setGroupedData((response.data as FluxFinancierGroupedByLaverie[]) || []);
          setTotal(response.total || 0);
        }
      } else {
        if (viewMode === 'simple') {
          setFluxList([]);
        } else {
          setGroupedData([]);
        }
        setTotal(0);
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
  }, [currentPage, selectedMonth, viewMode, selectedLaverieIds]);

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

  const toggleLaverieSelection = (laverieId: number) => {
    setSelectedLaverieIds(prev => 
      prev.includes(laverieId)
        ? prev.filter(id => id !== laverieId)
        : [...prev, laverieId]
    );
    setCurrentPage(1);
  };

  if (loading && (fluxList.length === 0 && groupedData.length === 0)) {
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
    <div className="space-y-4 sm:space-y-6 pb-24">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight">Flux Financiers</h1>
          <p className="text-sm text-muted-foreground">
            Gestion des dépenses, recettes, emprunts et prêts
          </p>
        </div>
        <Button onClick={() => navigate('/add-flux')} size="lg">
          <Plus className="h-5 w-5 mr-2" />
          Ajouter un flux
        </Button>
      </div>

      {/* Filtres */}
      <Card className="card-shadow">
        <CardContent className="p-4">
          <div className="flex flex-col lg:flex-row gap-4">
            {/* Sélecteur de mois */}
            <div className="flex items-center gap-2 flex-1">
              <Button
                variant="outline"
                size="icon"
                onClick={() => handleMonthChange('prev')}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <div className="flex-1 text-center">
                <p className="font-semibold text-lg capitalize">
                  {formatMonthDisplay(selectedMonth)}
                </p>
                <p className="text-xs text-gray-500">{total} transaction(s)</p>
              </div>
              <Button
                variant="outline"
                size="icon"
                onClick={() => handleMonthChange('next')}
                disabled={!canGoToNextMonth()}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>

            {/* Mode de vue */}
            <div className="flex items-center gap-2">
              <Button
                variant={viewMode === 'simple' ? 'default' : 'outline'}
                size="sm"
                onClick={() => {
                  setViewMode('simple');
                  setCurrentPage(1);
                }}
              >
                <List className="h-4 w-4 mr-2" />
                Liste
              </Button>
              <Button
                variant={viewMode === 'grouped' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('grouped')}
              >
                <LayoutGrid className="h-4 w-4 mr-2" />
                Par Laverie
              </Button>
            </div>

            {/* Bouton filtre laveries */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowLaverieFilter(!showLaverieFilter)}
            >
              Filtrer laveries ({selectedLaverieIds.length})
            </Button>
          </div>

          {/* Panneau de filtrage des laveries */}
          {showLaverieFilter && (
            <div className="mt-4 p-4 border rounded-lg bg-gray-50">
              <div className="flex justify-between items-center mb-3">
                <h3 className="font-semibold">Sélectionner les laveries</h3>
                {selectedLaverieIds.length > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setSelectedLaverieIds([]);
                      setCurrentPage(1);
                    }}
                  >
                    Tout désélectionner
                  </Button>
                )}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 max-h-60 overflow-y-auto">
                {availableLaveries.map(laverie => (
                  <div key={laverie.sourceLaverieId} className="flex items-center space-x-2">
                    <Checkbox
                      id={`laverie-${laverie.sourceLaverieId}`}
                      checked={selectedLaverieIds.includes(laverie.sourceLaverieId)}
                      onCheckedChange={() => toggleLaverieSelection(laverie.sourceLaverieId)}
                    />
                    <label
                      htmlFor={`laverie-${laverie.sourceLaverieId}`}
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer flex-1"
                    >
                      {laverie.nom}
                      {laverie.ville && <span className="text-gray-500 ml-1">({laverie.ville})</span>}
                    </label>
                  </div>
                ))}
              </div>
              {selectedLaverieIds.length > 0 && (
                <p className="text-sm text-gray-600 mt-3">
                  {selectedLaverieIds.length} laverie(s) sélectionnée(s)
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Mode Simple: Liste des transactions */}
      {viewMode === 'simple' && (
        <Card className="card-shadow">
          <CardHeader>
            <CardTitle className="text-lg">Liste des transactions ({total})</CardTitle>
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
      )}

      {/* Mode Groupé: Par laverie */}
      {viewMode === 'grouped' && (
        <div className="space-y-4">
          {groupedData.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <p className="text-gray-500">Aucune transaction pour ce mois</p>
              </CardContent>
            </Card>
          ) : (
            groupedData.map((group) => (
              <Card key={group.laverieRefId || 'entreprise'} className="card-shadow">
                <CardHeader className="pb-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-lg">
                        {group.laverieRef ? group.laverieRef.nom : '🏢 Entreprise (Associés)'}
                      </CardTitle>
                      {group.laverieRef?.adresse && (
                        <p className="text-sm text-gray-500 mt-1">{group.laverieRef.adresse}</p>
                      )}
                    </div>
                    <div className="text-right text-sm">
                      <p className="text-gray-500">{group.flux.length} transaction(s)</p>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {/* Stats de la laverie */}
                  <div className={`grid ${!group.laverieRefId ? 'grid-cols-2 md:grid-cols-4' : 'grid-cols-2'} gap-3 mb-4 p-3 bg-gray-50 rounded-lg`}>
                    <div>
                      <p className="text-xs text-gray-500">Dépenses</p>
                      <p className="text-sm font-semibold text-red-600">
                        {formatCurrency(group.stats.depenses.total)}
                      </p>
                      <p className="text-xs text-gray-500">{group.stats.depenses.count} flux</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Recettes</p>
                      <p className="text-sm font-semibold text-green-600">
                        {formatCurrency(group.stats.recettes.total)}
                      </p>
                      <p className="text-xs text-gray-500">{group.stats.recettes.count} flux</p>
                    </div>
                    {/* Emprunts et Prêts seulement pour l'entreprise (null) */}
                    {!group.laverieRefId && (
                      <>
                        <div>
                          <p className="text-xs text-gray-500">Emprunts</p>
                          <p className="text-sm font-semibold text-orange-600">
                            {formatCurrency(group.stats.emprunts.total)}
                          </p>
                          <p className="text-xs text-gray-500">{group.stats.emprunts.count} flux</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500">Prêts</p>
                          <p className="text-sm font-semibold text-blue-600">
                            {formatCurrency(group.stats.prets.total)}
                          </p>
                          <p className="text-xs text-gray-500">{group.stats.prets.count} flux</p>
                        </div>
                      </>
                    )}
                  </div>

                  {/* Liste des flux de cette laverie */}
                  <FluxItemList
                    fluxList={group.flux}
                    loading={false}
                    error={null}
                    emptyMessage="Aucune transaction"
                    onViewDetails={handleViewDetails}
                    onEdit={handleEdit}
                    onDelete={handleDelete}
                    onRetry={loadFluxFinanciers}
                  />
                </CardContent>
              </Card>
            ))
          )}
        </div>
      )}

      {/* Dialogs */}
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
