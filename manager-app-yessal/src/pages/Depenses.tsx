import React, { useState, useEffect } from 'react';
import { Plus, Loader2, AlertCircle, TrendingDown, TrendingUp, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import AddFluxDialog from '@/components/finance/AddFluxDialog';
import FluxFinancierService, { FluxFinancier } from '@/services/fluxFinancier';
import AuthService from '@/services/auth';

const Depenses: React.FC = () => {
  const [fluxList, setFluxList] = useState<FluxFinancier[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  
  // Pagination & filtres
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const limit = 20;

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
      if (!user || !user.siteLavagePrincipalGerantId) {
        setError('Site de lavage non défini');
        return;
      }

      // Charger les flux avec pagination
      const response = await FluxFinancierService.getFluxFinanciers(
        user.siteLavagePrincipalGerantId,
        {
          page: currentPage,
          limit,
          month: selectedMonth
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
        { month: selectedMonth }
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
  }, [currentPage, selectedMonth]);

  const handleSuccess = () => {
    setCurrentPage(1); // Retour à la première page
    loadFluxFinanciers();
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

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'validated':
        return 'bg-green-100 text-green-800';
      case 'rejected':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-yellow-100 text-yellow-800';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'validated':
        return 'Validée';
      case 'rejected':
        return 'Rejetée';
      default:
        return 'En attente';
    }
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

      {/* Dashboard Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="card-shadow">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 mb-1">Total Dépenses</p>
                <p className="text-xl sm:text-2xl font-bold text-red-600">
                  {formatCurrency(stats.depenses.total)}
                </p>
                <p className="text-xs text-gray-500 mt-1">{stats.depenses.count} transaction(s)</p>
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
                <p className="text-sm text-gray-500 mb-1">Total Recettes</p>
                <p className="text-xl sm:text-2xl font-bold text-green-600">
                  {formatCurrency(stats.recettes.total)}
                </p>
                <p className="text-xs text-gray-500 mt-1">{stats.recettes.count} transaction(s)</p>
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
                <p className="text-sm text-gray-500 mb-1">Solde</p>
                <p className={`text-xl sm:text-2xl font-bold ${stats.solde >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {formatCurrency(stats.solde)}
                </p>
                <p className="text-xs text-gray-500 mt-1">{total} transaction(s) total</p>
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
          {fluxList.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-500">Aucune transaction enregistrée</p>
              <Button
                onClick={() => setIsDialogOpen(true)}
                variant="outline"
                className="mt-4"
              >
                <Plus className="h-4 w-4 mr-2" />
                Ajouter votre première transaction
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-3 text-sm font-medium text-gray-500">Date</th>
                    <th className="text-left p-3 text-sm font-medium text-gray-500">Type</th>
                    <th className="text-left p-3 text-sm font-medium text-gray-500">Motif</th>
                    <th className="text-left p-3 text-sm font-medium text-gray-500">Bénéficiaire</th>
                    <th className="text-right p-3 text-sm font-medium text-gray-500">Montant</th>
                    <th className="text-center p-3 text-sm font-medium text-gray-500">Statut</th>
                    <th className="text-center p-3 text-sm font-medium text-gray-500">Preuves</th>
                  </tr>
                </thead>
                <tbody>
                  {fluxList.map((flux) => (
                    <tr key={flux.id} className="border-b hover:bg-gray-50">
                      <td className="p-3 text-sm">{formatDate(flux.dateFluxFinancier)}</td>
                      <td className="p-3">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium ${
                            flux.type === 'depense'
                              ? 'bg-red-100 text-red-800'
                              : 'bg-green-100 text-green-800'
                          }`}
                        >
                          {flux.type === 'depense' ? (
                            <TrendingDown className="h-3 w-3" />
                          ) : (
                            <TrendingUp className="h-3 w-3" />
                          )}
                          {flux.type === 'depense' ? 'Dépense' : 'Recette'}
                        </span>
                      </td>
                      <td className="p-3 text-sm">{flux.motif || '-'}</td>
                      <td className="p-3 text-sm">{flux.beneficiaire || '-'}</td>
                      <td
                        className={`p-3 text-sm text-right font-medium ${
                          flux.type === 'depense' ? 'text-red-600' : 'text-green-600'
                        }`}
                      >
                        {flux.type === 'depense' ? '-' : '+'}{formatCurrency(flux.montant)}
                      </td>
                      <td className="p-3 text-center">
                        <span
                          className={`inline-block px-2 py-1 rounded text-xs font-medium ${getStatusBadgeClass(
                            flux.validationStatus
                          )}`}
                        >
                          {getStatusLabel(flux.validationStatus)}
                        </span>
                      </td>
                      <td className="p-3 text-center text-sm">
                        {flux.preuves && flux.preuves.length > 0 ? (
                          <span className="text-blue-600 font-medium">
                            {flux.preuves.length} fichier(s)
                          </span>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
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

      {/* Dialog */}
      <AddFluxDialog
        isOpen={isDialogOpen}
        onClose={() => setIsDialogOpen(false)}
        onSuccess={handleSuccess}
      />
    </div>
  );
};

export default Depenses;
