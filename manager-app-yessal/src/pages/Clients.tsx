import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import {
  Users,
  UserPlus,
  Search,
  Edit,
  Trash2,
  Eye,
  Phone,
  Mail,
  MapPin,
  Loader2,
  AlertCircle,
  Clock,
  CheckCircle,
  GraduationCap,
  Briefcase,
  CreditCard,
  ChevronLeft,
  ChevronRight,
  Filter,
  X
} from 'lucide-react';
import { toast } from 'react-toastify';
import AuthService from '@/services/auth';
import ClientService, { User, ClientInvite, UserFilters } from '@/services/client';

// Fonctions utilitaires pour la gestion des délais d'édition
const canEditUser = (user: User) => {
  const creationDate = new Date(user.createdAt);
  const currentDate = new Date();
  const timeDifference = currentDate.getTime() - creationDate.getTime();
  const hoursDifference = timeDifference / (1000 * 3600);

  return hoursDifference <= 12;
};

const Clients: React.FC = () => {
  const [activeTab, setActiveTab] = useState('users');

  // États pour les utilisateurs clients
  const [users, setUsers] = useState<User[]>([]);
  const [usersLoading, setUsersLoading] = useState(true);
  const [usersError, setUsersError] = useState<string | null>(null);

  // États pour les clients invités
  const [clientsInvites, setClientsInvites] = useState<ClientInvite[]>([]);
  const [invitesLoading, setInvitesLoading] = useState(false);

  // États pour la pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [totalUsers, setTotalUsers] = useState(0);
  const limit = 10;

  // États pour les filtres
  const [searchTerm, setSearchTerm] = useState('');
  const [typeClientFilter, setTypeClientFilter] = useState<'all' | 'Standard' | 'Premium'>('all');
  const [etudiantFilter, setEtudiantFilter] = useState<'all' | 'true' | 'false'>('all');
  const [fidelityCreditFilter, setFidelityCreditFilter] = useState<boolean>(false);

  // États pour les modales
  const [createUserOpen, setCreateUserOpen] = useState(false);
  const [editUserOpen, setEditUserOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [userDetailsOpen, setUserDetailsOpen] = useState(false);

  // États pour les sites (pour les filtres)
  const [sites, setSites] = useState<Array<{ id: number; nom: string; ville: string }>>([]);
  const [currentUserSiteId, setCurrentUserSiteId] = useState<number | null>(null);

  // États pour les timeouts de recherche
  const [searchTimeout, setSearchTimeout] = useState<NodeJS.Timeout | null>(null);

  // État pour afficher/masquer les filtres
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    initializeData();
  }, []);

  const initializeData = async () => {
    // Ensure we load the current user's site first (it's required for every request)
    await loadCurrentUserSite();
    // Then load sites and initial users
    await loadSites();
    // Pass explicit page 1 for initial load
    await loadUsers({}, 1);
  };

  const loadCurrentUserSite = async () => {
    try {
      // Try AuthService first (sync getter)
      const user = AuthService.getUser();
      if (user?.siteLavagePrincipalGerantId) {
        setCurrentUserSiteId(user.siteLavagePrincipalGerantId);
        return;
      }

      // Fallback: try reading a cached user from localStorage (if present)
      // This helps in cases where AuthService may not yet be populated.
      try {
        const raw = window?.localStorage?.getItem('currentUser');
        if (raw) {
          const parsed = JSON.parse(raw);
          if (parsed?.siteLavagePrincipalGerantId) {
            setCurrentUserSiteId(parsed.siteLavagePrincipalGerantId);
            return;
          }
        }
      } catch (e) {
        // ignore parsing errors
      }

      // If still not found, leave as null — callers will handle and surface an error
      console.warn('currentUserSiteId not found in AuthService or localStorage');
    } catch (error) {
      console.error('Erreur lors de la récupération du site de l\'utilisateur:', error);
    }
  };

  useEffect(() => {
    return () => {
      if (searchTimeout) {
        clearTimeout(searchTimeout);
      }
    };
  }, [searchTimeout]);


  const loadUsers = async (
    customFilters?: {
      search?: string;
      typeClient?: string;
      etudiant?: string;
      hasFidelityCredit?: boolean;
    },
    page: number = currentPage
  ) => {
    try {
      setUsersLoading(true);
      setUsersError(null);

      // Mirror Orders.tsx: obtain the current user synchronously and require the site id
      const user = AuthService.getUser();
      if (!user || !user.siteLavagePrincipalGerantId) {
        setUsers([]);
        setTotalPages(0);
        setTotalUsers(0);
        setUsersError("Aucun site assigné au manager");
        return;
      }

      // Keep the state in sync
      setCurrentUserSiteId(user.siteLavagePrincipalGerantId);

      // Build filters using the manager's site id (fixed for each request)
      const filters: any = {
        search: customFilters?.search ?? searchTerm,
        typeClient: (customFilters?.typeClient ?? typeClientFilter) === 'all' ? 'all' : (customFilters?.typeClient ?? typeClientFilter) as 'Standard' | 'Premium',
        siteLavageId: user.siteLavagePrincipalGerantId,
        estEtudiant: (customFilters?.etudiant ?? etudiantFilter) === 'all' ? 'all' : (customFilters?.etudiant ?? etudiantFilter) === 'true' || (customFilters?.etudiant ?? etudiantFilter) === true,
        hasFidelityCredit: customFilters?.hasFidelityCredit ?? fidelityCreditFilter
      };

      const response = await ClientService.getUsers(page, limit, filters);

      setUsers(response.users);
      setCurrentPage(response.page);
      setTotalPages(response.totalPages);
      setTotalUsers(response.total);
    } catch (err) {
      setUsersError('Erreur lors du chargement des clients');
      console.error('Erreur:', err);
    } finally {
      setUsersLoading(false);
    }
  };

  const loadSites = async () => {
    try {
      const sitesData = await ClientService.getSites();
      setSites(sitesData);
    } catch (error) {
      console.error('Erreur lors du chargement des sites:', error);
    }
  };

  const loadClientsInvites = async () => {
    try {
      setInvitesLoading(true);
      const response = await ClientService.getClientInvites(1, 10, searchTerm);
      setClientsInvites(response.clientsInvites);
    } catch (error) {
      console.error('Erreur lors du chargement des clients invités:', error);
    } finally {
      setInvitesLoading(false);
    }
  };

  const handleTabChange = (newTab: string) => {
    setActiveTab(newTab);
    if (newTab === 'invites') {
      loadClientsInvites();
    }
  };

  const handleSearchChange = (value: string) => {
    setSearchTerm(value);
    setCurrentPage(1); // Reset to first page on search

    if (searchTimeout) {
      clearTimeout(searchTimeout);
    }

    const newTimeout = setTimeout(() => {
      if (activeTab === 'users') {
        loadUsers({ search: value }, 1);
      } else if (activeTab === 'invites') {
        loadClientsInvites();
      }
    }, 500);

    setSearchTimeout(newTimeout);
  };

  const handleFilterChange = (filterName: string, value: any) => {
    setCurrentPage(1); // Reset to first page on filter change
    
    const customFilters: any = {};
    
    switch (filterName) {
      case 'typeClient':
        setTypeClientFilter(value);
        customFilters.typeClient = value;
        break;
      case 'etudiant':
        setEtudiantFilter(value);
        customFilters.etudiant = value;
        break;
      case 'hasFidelityCredit':
        setFidelityCreditFilter(value);
        customFilters.hasFidelityCredit = value;
        break;
    }
    
    loadUsers(customFilters, 1);
  };

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setCurrentPage(newPage);
      loadUsers({}, newPage);
    }
  };

  const handleResetFilters = () => {
    setSearchTerm('');
    setTypeClientFilter('all');
    setEtudiantFilter('all');
    setFidelityCreditFilter(false);
    setCurrentPage(1);
    loadUsers({ search: '', typeClient: 'all', etudiant: 'all', hasFidelityCredit: false }, 1);
  };

  const handleViewUser = (user: User) => {
    setSelectedUser(user);
    setUserDetailsOpen(true);
  };

  const handleEditUser = (user: User) => {
    // Toujours permettre l'ouverture de la modale d'édition
    // La restriction se fera au niveau des champs dans le formulaire
    setSelectedUser(user);
    setEditUserOpen(true);
  };

  const handleDeleteUser = (user: User) => {
    setSelectedUser(user);
    setDeleteConfirmOpen(true);
  };

  const confirmDeleteUser = async () => {
    if (!selectedUser) return;

    try {
      const result = await ClientService.deleteUser(selectedUser.id);
      if (result.success) {
        toast.success('Client supprimé avec succès');
        loadUsers();
      } else {
        toast.error(result.message || 'Erreur lors de la suppression');
      }
    } catch (error) {
      toast.error('Erreur lors de la suppression du client');
    } finally {
      setDeleteConfirmOpen(false);
      setSelectedUser(null);
    }
  };

  const getStatusBadge = (user: User) => {
    return (
      <Badge variant={user.typeClient === 'Premium' ? 'default' : 'secondary'}>
        {user.typeClient || 'Standard'}
      </Badge>
    );
  };

  if (usersLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
        <span className="ml-2">Chargement des clients...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-8">
      {/* En-tête */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Gestion des Clients</h1>
          <p className="text-sm text-gray-500">
            {users.length > 0 ? (
              <>Affichage des {users.length} derniers clients{searchTerm ? ` trouvés pour "${searchTerm}"` : ' enregistrés'} (limité à 5)</>
            ) : (
              searchTerm ? `Aucun client trouvé pour "${searchTerm}"` : 'Aucun client'
            )}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Dialog open={createUserOpen} onOpenChange={setCreateUserOpen}>
            <DialogTrigger asChild>
              <Button className="flex items-center gap-2">
                <UserPlus className="h-4 w-4" />
                Nouveau client
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Créer un nouveau client</DialogTitle>
                <DialogDescription>Formulaire pour créer un nouveau client. Les champs marqués d'*' sont obligatoires.</DialogDescription>
              </DialogHeader>
              <CreateUserForm
                onSuccess={() => {
                  setCreateUserOpen(false);
                  loadUsers();
                }}
                sites={sites}
              />
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Barre de recherche et bouton filtres */}
      <div className="space-y-3">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="Rechercher un client par nom, prénom, email ou téléphone..."
              value={searchTerm}
              onChange={(e) => handleSearchChange(e.target.value.trim())}
              className="pl-10 pr-4 py-2 border-2 border-gray-200 focus:border-blue-500 rounded-lg"
            />
          </div>
          <Button
            variant={showFilters ? "default" : "outline"}
            size="default"
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center gap-2 whitespace-nowrap"
          >
            <Filter className="h-4 w-4" />
            <span className="hidden sm:inline">Filtres</span>
            {(typeClientFilter !== 'all' || etudiantFilter !== 'all' || fidelityCreditFilter) && (
              <span className="ml-1 bg-blue-600 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                {[typeClientFilter !== 'all', etudiantFilter !== 'all', fidelityCreditFilter].filter(Boolean).length}
              </span>
            )}
          </Button>
        </div>

        {/* Filtres avancés - Masquables */}
        {showFilters && (
          <Card className="border-0 shadow-md bg-green-50 rounded-lg border border-green-200">
            <CardContent className="p-4">
              <div className="space-y-4">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-semibold text-gray-700">Filtres avancés</h3>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowFilters(false)}
                    className="h-6 w-6 p-0"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {/* Filtre par type de client */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-gray-700">Type de client</label>
                    <Select value={typeClientFilter} onValueChange={(value: any) => handleFilterChange('typeClient', value)}>
                      <SelectTrigger className="h-9 border-2 border-gray-200 focus:border-blue-500 rounded-lg text-sm">
                        <SelectValue placeholder="Tous les types" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">
                          <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-gray-400"></div>
                            <span className="text-sm">Tous</span>
                          </div>
                        </SelectItem>
                        <SelectItem value="Standard">
                          <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                            <span className="text-sm">Standard</span>
                          </div>
                        </SelectItem>
                        <SelectItem value="Premium">
                          <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-yellow-500"></div>
                            <span className="text-sm">Premium</span>
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Filtre par statut étudiant */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-gray-700">Statut étudiant</label>
                    <Select value={etudiantFilter} onValueChange={(value: any) => handleFilterChange('etudiant', value)}>
                      <SelectTrigger className="h-9 border-2 border-gray-200 focus:border-blue-500 rounded-lg text-sm">
                        <SelectValue placeholder="Tous" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">
                          <div className="flex items-center gap-2">
                            <Users className="h-3 w-3 text-gray-500" />
                            <span className="text-sm">Tous</span>
                          </div>
                        </SelectItem>
                        <SelectItem value="true">
                          <div className="flex items-center gap-2">
                            <GraduationCap className="h-3 w-3 text-green-500" />
                            <span className="text-sm">Étudiants</span>
                          </div>
                        </SelectItem>
                        <SelectItem value="false">
                          <div className="flex items-center gap-2">
                            <Briefcase className="h-3 w-3 text-blue-500" />
                            <span className="text-sm">Non étudiants</span>
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Filtre par crédit de fidélité */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-gray-700">Crédit fidélité</label>
                    <div className="flex items-center space-x-2 p-2 border-2 border-gray-200 rounded-lg h-9">
                      <input
                        type="checkbox"
                        id="fidelityCredit"
                        checked={fidelityCreditFilter}
                        onChange={(e) => handleFilterChange('hasFidelityCredit', e.target.checked)}
                        className="w-3.5 h-3.5 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                      />
                      <label htmlFor="fidelityCredit" className="text-xs text-gray-700 flex items-center gap-1.5 cursor-pointer">
                        <CreditCard className="h-3 w-3 text-orange-500" />
                        Avec crédit dispo
                      </label>
                    </div>
                  </div>
                </div>

                {/* Informations sur le site et actions */}
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 pt-3 border-t border-gray-200">
                  <div className="flex items-center gap-4 text-xs text-gray-600 flex-wrap">
                    <div className="flex items-center gap-2 bg-blue-100 px-2.5 py-1.5 rounded-lg">
                      <MapPin className="h-3 w-3 text-blue-600" />
                      <span className="font-medium text-blue-800">
                        {sites.find(s => s.id === currentUserSiteId)?.nom || 'Site par défaut'}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Users className="h-3 w-3" />
                      <span className="font-medium">{totalUsers}</span> client{totalUsers > 1 ? 's' : ''}
                    </div>
                    {searchTerm && (
                      <div className="flex items-center gap-1.5 text-blue-600">
                        <Search className="h-3 w-3" />
                        <span>{users.length} résultat{users.length > 1 ? 's' : ''}</span>
                      </div>
                    )}
                  </div>
                  
                  {(searchTerm || typeClientFilter !== 'all' || etudiantFilter !== 'all' || fidelityCreditFilter) && (
                    <Button variant="ghost" size="sm" onClick={handleResetFilters} className="text-xs h-7 text-red-600 hover:text-red-700 hover:bg-red-50">
                      Réinitialiser
                    </Button>
                  )}
                </div>

                <div className="text-xs text-gray-500 text-center pt-2 border-t border-gray-200">
                  Page {currentPage} sur {totalPages} · Affichage de {limit} clients par page
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Onglets */}
      <Tabs defaultValue="users" value={activeTab} onValueChange={handleTabChange}>
        {/* <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="users" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Clients inscrits
            </TabsTrigger>
            <TabsTrigger value="invites" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Clients invités
            </TabsTrigger>
          </TabsList> */}

        {/* Clients inscrits */}
        <TabsContent value="users" className="space-y-4">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Clients inscrits
          </div>
          {usersError ? (
            <div className="flex items-center justify-center h-32">
              <AlertCircle className="h-8 w-8 text-red-500" />
              <span className="ml-2 text-red-500">{usersError}</span>
              <Button onClick={() => loadUsers()} className="ml-4">
                Réessayer
              </Button>
            </div>
          ) : users.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              {searchTerm || typeClientFilter !== 'all' || etudiantFilter !== 'all' || fidelityCreditFilter ? (
                <div>
                  <p>Aucun client trouvé avec ces critères</p>
                  <Button variant="outline" size="sm" onClick={handleResetFilters} className="mt-2">
                    Effacer les filtres
                  </Button>
                </div>
              ) : (
                'Aucun client inscrit'
              )}
            </div>
          ) : (
            <div className="grid gap-4">
              {users.map((user) => (
                <UserCard
                  key={user.id}
                  user={user}
                  onEdit={handleEditUser}
                  onDelete={handleDeleteUser}
                  onView={handleViewUser}
                  getStatusBadge={getStatusBadge}
                  canEditUser={canEditUser}
                />
              ))}
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <Card className="mt-6 border-0 shadow-md">
              <CardContent className="p-3 sm:p-4">
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
                  <div className="flex items-center gap-2 text-xs sm:text-sm text-gray-600">
                    <span>
                      Affichage de {((currentPage - 1) * limit) + 1} à {Math.min(currentPage * limit, totalUsers)} 
                      sur {totalUsers} client{totalUsers > 1 ? 's' : ''}
                    </span>
                  </div>
                  
                  <div className="flex items-center gap-1 sm:gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handlePageChange(currentPage - 1)}
                      disabled={currentPage <= 1}
                      className="h-8 w-8 sm:w-auto p-0 sm:px-3"
                    >
                      <ChevronLeft className="h-4 w-4 sm:mr-1" />
                      <span className="hidden sm:inline">Précédent</span>
                    </Button>
                    
                    <div className="flex items-center gap-1">
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
                            className={`h-8 w-8 sm:min-w-[40px] p-0 text-xs sm:text-sm ${
                              currentPage === pageNum 
                                ? 'bg-blue-600 text-white shadow-md' 
                                : 'hover:bg-blue-50'
                            }`}
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
                      className="h-8 w-8 sm:w-auto p-0 sm:px-3"
                    >
                      <span className="hidden sm:inline">Suivant</span>
                      <ChevronRight className="h-4 w-4 sm:ml-1" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Clients invités */}
        {/* <TabsContent value="invites" className="space-y-4">
          {invitesLoading ? (
            <div className="flex items-center justify-center h-32">
              <Loader2 className="h-8 w-8 animate-spin" />
              <span className="ml-2">Chargement des clients invités...</span>
            </div>
          ) : clientsInvites.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              Aucun client invité trouvé
            </div>
          ) : (
            <div className="grid gap-4">
              {clientsInvites.map((client) => (
                <ClientInviteCard key={client.id} client={client} />
              ))}
            </div>
          )}
        </TabsContent> */}
      </Tabs>

      {/* Modales */}
      <Dialog open={editUserOpen} onOpenChange={setEditUserOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Modifier le client</DialogTitle>
            <DialogDescription>Formulaire de modification des informations du client et gestion des abonnements premium.</DialogDescription>
          </DialogHeader>
          {selectedUser && (
            <EditUserForm
              user={selectedUser}
              onSuccess={() => {
                setEditUserOpen(false);
                setSelectedUser(null);
                loadUsers();
              }}
              sites={sites}
            />
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Confirmer la suppression</DialogTitle>
            <DialogDescription>Confirmez la suppression définitive du client choisi.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <p>Êtes-vous sûr de vouloir supprimer ce client ?</p>
            {selectedUser && (
              <div className="p-3 bg-gray-50 rounded">
                <p className="font-medium">{selectedUser.prenom} {selectedUser.nom}</p>
                <p className="text-sm text-gray-500">{selectedUser.email || selectedUser.telephone}</p>
              </div>
            )}
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setDeleteConfirmOpen(false)}>
                Annuler
              </Button>
              <Button variant="destructive" onClick={confirmDeleteUser}>
                Supprimer
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modale des détails de l'utilisateur */}
      <Dialog open={userDetailsOpen} onOpenChange={setUserDetailsOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Détails du client</DialogTitle>
            <DialogDescription>Affichage des informations détaillées du client, fidélité et abonnements.</DialogDescription>
          </DialogHeader>
          {selectedUser && (
            <div className="space-y-6">
              {/* Informations générales */}
              <div>
                <h3 className="text-lg font-semibold mb-3">Informations générales</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-500">Nom complet</p>
                    <p className="font-medium">{selectedUser.prenom} {selectedUser.nom}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Type de client</p>
                    <Badge variant={selectedUser.typeClient === 'Premium' ? 'default' : 'secondary'}>
                      {selectedUser.typeClient || 'Standard'}
                    </Badge>
                  </div>
                  {selectedUser.email && (
                    <div>
                      <p className="text-sm text-gray-500">Email</p>
                      <p className="font-medium">{selectedUser.email}</p>
                    </div>
                  )}
                  {selectedUser.telephone && (
                    <div>
                      <p className="text-sm text-gray-500">Téléphone</p>
                      <a
                        href={`tel:${selectedUser.telephone}`}
                        className="font-medium text-blue-600 hover:text-blue-800 hover:underline cursor-pointer"
                        title="Cliquer pour appeler"
                      >
                        {selectedUser.telephone}
                      </a>
                    </div>
                  )}
                  {selectedUser.adresseText && (
                    <div className="col-span-2">
                      <p className="text-sm text-gray-500">Adresse</p>
                      <p className="font-medium">{selectedUser.adresseText}</p>
                    </div>
                  )}
                  <div>
                    <p className="text-sm text-gray-500">Étudiant</p>
                    <p className="font-medium">{selectedUser.estEtudiant ? 'Oui' : 'Non'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Date d'inscription</p>
                    <p className="font-medium">{new Date(selectedUser.createdAt).toLocaleDateString('fr-FR')}</p>
                  </div>
                  {selectedUser.createdBy && (
                    <div className="col-span-2">
                      <p className="text-sm text-gray-500">Créé par</p>
                      <div className="flex items-center gap-2">
                        {selectedUser.createdBy.prenom} {selectedUser.createdBy.nom}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Informations de fidélité */}
              {selectedUser.fidelite && (
                <div>
                  <h3 className="text-lg font-semibold mb-3">Programme de fidélité</h3>
                  <div className="space-y-4">
                    {/* Numéro de carte */}
                    <div className="p-4 bg-gradient-to-r from-blue-50 to-green-50 rounded-lg border border-green-200">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-green-700">Numéro de carte fidélité</p>
                          <p className="text-xl font-bold text-green-800 tracking-wider font-mono">
                            {selectedUser.fidelite.numeroCarteFidelite}
                          </p>
                        </div>
                        <div className="text-green-600">
                          <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M4 4a2 2 0 00-2 2v8a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2H4zm2 3a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm0 3a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1z" clipRule="evenodd" />
                          </svg>
                        </div>
                      </div>
                    </div>

                    {/* Statistiques principales */}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                        <p className="text-sm text-green-700 mb-1">Nombre de lavages</p>
                        <p className="text-2xl font-bold text-green-800">{selectedUser.fidelite.nombreLavageTotal}</p>
                      </div>
                      <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                        <p className="text-sm text-blue-700 mb-1">Poids total lavé</p>
                        <p className="text-2xl font-bold text-blue-800">{selectedUser.fidelite.poidsTotalLaveKg} kg</p>
                      </div>
                    </div>

                    {/* Points et crédit de fidélité */}
                    <div>
                      <h4 className="font-semibold text-lg mb-3 text-gray-800">Fidélité</h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                          <div className="flex items-center justify-between mb-2">
                            <p className="text-sm font-medium text-blue-700">Crédit disponible</p>
                            <div className="flex items-center">
                              <span className="text-2xl font-bold text-blue-800">
                                {selectedUser.fidelite.creditDisponible || 0}
                              </span>
                              <span className="text-sm text-blue-600 ml-1">FCFA</span>
                            </div>
                          </div>
                        </div>

                        <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                          <div className="flex items-center justify-between mb-2">
                            <p className="text-sm font-medium text-green-700">Points fidélité</p>
                            <div className="flex items-center">
                              <span className="text-2xl font-bold text-green-800">
                                {selectedUser.fidelite.pointsDisponible}
                              </span>
                              <span className="text-sm text-green-600 ml-1">pts</span>
                            </div>
                          </div>
                          <div className="text-xs text-green-600 bg-green-100 px-2 py-1 rounded">
                            40 pts → 2000 FCFA
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Progression vers conversion automatique */}
                    {selectedUser.fidelite.pointsDisponible > 0 && selectedUser.fidelite.pointsDisponible < 40 && (
                      <div className="p-4 bg-amber-50 rounded-lg border border-amber-200">
                        <h5 className="font-medium text-amber-700 mb-3">Prochaine fidélité</h5>
                        <div className="space-y-2">
                          <div className="flex justify-between text-sm mb-1">
                            <span className="font-semibold text-amber-800">{selectedUser.fidelite.pointsDisponible}/40 pts</span>
                          </div>
                          <div className="w-full bg-amber-200 rounded-full h-3">
                            <div
                              className="bg-gradient-to-r from-amber-400 to-amber-600 h-3 rounded-full transition-all duration-300 shadow-sm"
                              style={{ width: `${(selectedUser.fidelite.pointsDisponible / 40) * 100}%` }}
                            ></div>
                          </div>
                          <p className="text-xs text-amber-600 mt-1">
                            Plus que {40 - selectedUser.fidelite.pointsDisponible} pts pour gagner 2000 FCFA de crédit
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Abonnements Premium */}
              {selectedUser.typeClient === 'Premium' && selectedUser.abonnementsPremium && (
                <div>
                  <h3 className="text-lg font-semibold mb-3">Abonnement(s) Premium</h3>
                  <div className="space-y-3">
                    {selectedUser.abonnementsPremium.length === 0 ? (
                      <p className="text-gray-500">Aucun abonnement premium trouvé</p>
                    ) : (
                      selectedUser.abonnementsPremium.map((abonnement) => {
                        const limite = Number(abonnement.limiteKg) || 0;
                        const utilises = Number(abonnement.kgUtilises) || 0;
                        const pourcentageUtilise = limite > 0 ? (utilises / limite) * 100 : 0;
                        const isCurrentMonth = new Date().getFullYear() === abonnement.annee && (new Date().getMonth() + 1) === abonnement.mois;

                        return (
                          <div
                            key={abonnement.id}
                            className={`p-4 rounded-lg border-2 ${isCurrentMonth ? 'border-blue-500 bg-blue-50' : 'border-gray-200 bg-gray-50'}`}
                          >
                            <div className="flex justify-between items-start mb-3">
                              <div>
                                <h4 className="font-semibold text-blue-800">
                                  {abonnement.mois.toString().padStart(2, '0')}/{abonnement.annee}
                                  {isCurrentMonth && <span className="ml-2 text-sm bg-blue-600 text-white px-2 py-1 rounded">Actuel</span>}
                                </h4>
                                <p className="text-sm text-gray-600">Créé le {new Date(abonnement.createdAt).toLocaleDateString('fr-FR')}</p>
                                {abonnement.createdBy && (
                                  <p className="text-sm text-gray-600">Par : {abonnement.createdBy}</p>
                                )}
                              </div>
                            </div>

                            <div className="grid grid-cols-3 gap-4 mb-3">
                              <div>
                                <p className="text-sm text-gray-600">Limite mensuelle</p>
                                <p className="text-lg font-bold text-blue-800">{limite} kg</p>
                              </div>
                              <div>
                                <p className="text-sm text-gray-600">Utilisé</p>
                                <p className="text-lg font-bold text-blue-800">{utilises} kg</p>
                              </div>
                              <div>
                                <p className="text-sm text-gray-600">Restant</p>
                                <p className="text-lg font-bold text-green-800">{(Math.max(limite - utilises, 0)).toFixed(1)} kg</p>
                              </div>
                            </div>

                            {/* Affichage de l'option repassage et du montant */}
                            <div className="mb-3 p-3 bg-white rounded border">
                              <div className="flex items-center justify-between mb-2">
                                <span className="text-sm font-medium">Option repassage:</span>
                                <span className={`text-sm px-2 py-1 rounded ${abonnement.aOptionRepassageIncluse ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                                  {abonnement.aOptionRepassageIncluse ? 'Incluse' : 'Non incluse'}
                                </span>
                              </div>
                              <div className="flex items-center justify-between">
                                <span className="text-sm font-medium">Montant:</span>
                                <span className="text-sm font-semibold">{abonnement.montant?.toLocaleString() || '16 000'} FCFA</span>
                              </div>
                            </div>

                            <div className="w-full bg-gray-200 rounded-full h-3">
                              <div
                                className={`h-3 rounded-full transition-all duration-300 ${pourcentageUtilise >= 90 ? 'bg-red-500' :
                                    pourcentageUtilise >= 70 ? 'bg-yellow-500' :
                                      'bg-green-500'
                                  }`}
                                style={{ width: `${Math.min(pourcentageUtilise, 100)}%` }}
                              ></div>
                            </div>
                            <p className="text-xs text-gray-600 mt-1">{pourcentageUtilise.toFixed(1)}% utilisé</p>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

// Composant Card pour les utilisateurs
interface UserCardProps {
  user: User;
  onEdit: (user: User) => void;
  onDelete: (user: User) => void;
  onView: (user: User) => void;
  getStatusBadge: (user: User) => JSX.Element;
  canEditUser: (user: User) => boolean;
}

const UserCard: React.FC<UserCardProps> = ({ user, onEdit, onView, getStatusBadge }) => {

  return (
    <Card className="hover:bg-gray-50">
      <CardContent className="p-4">
        <div className="flex justify-between items-start">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <h3 className="font-medium">{user.prenom} {user.nom}</h3>
              {getStatusBadge(user)}
              {user.estEtudiant && (
                <Badge variant="outline">Étudiant</Badge>
              )}
            </div>

            <div className="space-y-1 text-sm text-gray-500">
              {user.email && (
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4" />
                  {user.email}
                </div>
              )}
              {user.telephone && (
                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4" />
                  <a
                    href={`tel:${user.telephone}`}
                    className="text-blue-600 hover:text-blue-800 hover:underline cursor-pointer"
                    title="Cliquer pour appeler"
                  >
                    {user.telephone}
                  </a>
                </div>
              )}
              {user.adresseText && (
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4" />
                  {user.adresseText}
                </div>
              )}
              {user.createdBy && (
                <div className="flex items-center gap-2">
                  Créé par {user.createdBy.prenom} {user.createdBy.nom}
                </div>
              )}
            </div>

            {user.fidelite && (
              <div className="mt-3 p-3 bg-green-50 rounded-lg border border-green-200">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-medium text-green-800">Programme de fidélité</p>
                  <p className="text-xs font-mono text-green-700 bg-green-100 px-2 py-1 rounded">
                    {user.fidelite.numeroCarteFidelite}
                  </p>
                </div>
                {/* Stats 6 mois + Fidélité (crédit et points) */}
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <p className="text-green-700">Poids</p>
                    <p className="font-bold text-green-800">{user.stats6mois ? `${user.stats6mois.poids6mois} kg` : `${user.fidelite.poidsTotalLaveKg} kg`}</p>
                  </div>
                  <div>
                    <p className="text-green-700">Lavages</p>
                    <p className="font-bold text-green-800">{user.stats6mois ? user.stats6mois.lavages6mois : user.fidelite.nombreLavageTotal}</p>
                  </div>
                  <div>
                    <p className="text-blue-700">Crédit dispo.</p>
                    <p className="font-bold text-blue-800">{user.stats6mois ? `${user.stats6mois.creditDisponible ?? 0} FCFA` : `${user.fidelite.creditDisponible ?? 0} FCFA`}</p>
                  </div>
                  <div>
                    <p className="text-green-700">Points fidélité</p>
                    <p className="font-bold text-green-800">{user.stats6mois ? user.stats6mois.pointsDisponible : (user.fidelite.pointsDisponible ?? 0)} pts</p>
                  </div>
                </div>
              </div>
            )}

            {user.typeClient === 'Premium' && user.abonnementsPremium && user.abonnementsPremium.length > 0 && (
              <div className="mt-3 p-2 bg-blue-50 rounded">
                <div className="flex items-center justify-between mb-1">
                  <p className="text-xs text-blue-800 font-medium">Abonnement Premium actuel:</p>
                </div>
                <div className="text-xs text-blue-700">
                  <p>Période: {user.abonnementsPremium[0].mois.toString().padStart(2, '0')}/{user.abonnementsPremium[0].annee}</p>
                  <p>Limite: {user.abonnementsPremium[0].limiteKg}kg • Utilisé: {Math.min(user.abonnementsPremium[0].kgUtilises, 40)}kg</p>
                  <p>Restant: {Math.max(user.abonnementsPremium[0].limiteKg - user.abonnementsPremium[0].kgUtilises, 0).toFixed(1)}kg</p>
                  <p>{user.abonnementsPremium[0].aOptionRepassageIncluse ? (
                    <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">
                      + Repassage inclus
                    </span>
                  ) : (
                    <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                      Sans repassage
                    </span>
                  )}</p>
                </div>
              </div>
            )}
          </div>

          <div className="flex flex-col items-center gap-1 ml-4">
            <Button variant="outline" size="sm" onClick={() => onView(user)}>
              <Eye className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onEdit(user)}
            >
              <Edit className="h-4 w-4" />
            </Button>
          </div>

        </div>
      </CardContent>
    </Card>
  );
};

// Composant Card pour les clients invités
interface ClientInviteCardProps {
  client: ClientInvite;
}

const ClientInviteCard: React.FC<ClientInviteCardProps> = ({ client }) => {
  return (
    <Card className="hover:bg-gray-50">
      <CardContent className="p-4">
        <div className="flex justify-between items-start">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <h3 className="font-medium">{client.prenom} {client.nom}</h3>
              <Badge variant="secondary">Client invité</Badge>
              {client.createdBy && (
                <div className="flex items-center gap-2">
                  Créé par {client.createdBy.prenom} {client.createdBy.nom}
                </div>
              )}
            </div>

            <div className="space-y-1 text-sm text-gray-500">
              {client.email && (
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4" />
                  {client.email}
                </div>
              )}
              {client.telephone && (
                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4" />
                  <a
                    href={`tel:${client.telephone}`}
                    className="text-blue-600 hover:text-blue-800 hover:underline cursor-pointer"
                    title="Cliquer pour appeler"
                  >
                    {client.telephone}
                  </a>
                </div>
              )}
              {client.adresseText && (
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4" />
                  {client.adresseText}
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-1 ml-4">
            <Button variant="outline" size="sm">
              <Eye className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

// Formulaire de création d'utilisateur
interface CreateUserFormProps {
  onSuccess: () => void;
  sites: Array<{ id: number; nom: string; ville: string }>;
}

const CreateUserForm: React.FC<CreateUserFormProps> = ({ onSuccess, sites }) => {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    nom: '',
    prenom: '',
    email: '',
    telephone: '',
    password: '',
    adresseText: '',
    typeClient: 'Standard' as 'Standard' | 'Premium',
    estEtudiant: false,
    siteLavagePrincipalGerantId: ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    // Validation côté client
    if (!formData.email && !formData.telephone) {
      toast.error('Au moins un email ou un téléphone est requis');
      setLoading(false);
      return;
    }

    // Validation du mot de passe uniquement s'il est fourni
    if (formData.password && formData.password.length < 6) {
      toast.error('Le mot de passe doit contenir au moins 6 caractères');
      setLoading(false);
      return;
    }

    try {
      // Récupérer le site du manager connecté
      const currentUser = AuthService.getUser();
      const managerSiteId = currentUser?.siteLavagePrincipalGerantId;

      // Utiliser le site du manager si disponible, sinon utiliser le site du formulaire
      const finalSiteId = managerSiteId || 
        (formData.siteLavagePrincipalGerantId ? parseInt(formData.siteLavagePrincipalGerantId) : undefined);

      const userData = {
        ...formData,
        role: 'CLIENT' as const,
        siteLavagePrincipalGerantId: finalSiteId,
        // Nettoyer les champs vides
        email: formData.email || null,
        telephone: formData.telephone || null,
        adresseText: formData.adresseText || null
      };

      const result = await ClientService.createUser(userData);

      if (result.success) {
        toast.success('Client créé avec succès');
        onSuccess();
      } else {
        toast.error(result.message || 'Erreur lors de la création');
      }
    } catch (error) {
      toast.error('Erreur lors de la création du client');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1">Prénom *</label>
          <Input
            required
            value={formData.prenom}
            onChange={(e) => setFormData({ ...formData, prenom: e.target.value })}
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Nom *</label>
          <Input
            required
            value={formData.nom}
            onChange={(e) => setFormData({ ...formData, nom: e.target.value })}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1">Email</label>
          <Input
            type="email"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            placeholder="email@exemple.com"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Téléphone</label>
          <Input
            value={formData.telephone}
            onChange={(e) => setFormData({ ...formData, telephone: e.target.value })}
            placeholder="Ex: 771234567"
          />
        </div>
      </div>

      {/* <div>
        <label className="block text-sm font-medium mb-1">Mot de passe (optionnel)</label>
        <Input
          type="password"
          value={formData.password}
          onChange={(e) => setFormData({...formData, password: e.target.value})}
          placeholder="Au moins 6 caractères (optionnel)"
        />
      </div> */}

      <div>
        <label className="block text-sm font-medium mb-1">Adresse</label>
        <Input
          value={formData.adresseText}
          onChange={(e) => setFormData({ ...formData, adresseText: e.target.value })}
          placeholder="Adresse complète (optionnel)"
        />
      </div>

      <div>
        <div className="flex items-center justify-between p-3 border rounded-md">
          <div>
            <label className="block text-sm font-medium">Statut étudiant</label>
            <p className="text-xs text-gray-500">
              {formData.estEtudiant ? 'Bénéficie de réductions étudiantes' : 'Tarifs standard'}
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <label htmlFor="student-toggle-create" className="text-sm">
              Étudiant</label>
            <input
              id="student-toggle-create"
              type="checkbox"
              checked={formData.estEtudiant}
              onChange={(e) => setFormData({ ...formData, estEtudiant: e.target.checked })}
              className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 focus:ring-2"
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1">Type de client</label>
          <Select value={formData.typeClient} onValueChange={(value: any) => setFormData({ ...formData, typeClient: value })}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Standard">Standard</SelectItem>
              <SelectItem value="Premium">Premium</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Site principal</label>
          <Select value={formData.siteLavagePrincipalGerantId} onValueChange={(value) => setFormData({ ...formData, siteLavagePrincipalGerantId: value })}>
            <SelectTrigger>
              <SelectValue placeholder="Sélectionner un site" />
            </SelectTrigger>
            <SelectContent>
              {sites.map((site) => (
                <SelectItem key={site.id} value={site.id.toString()}>
                  {site.nom} - {site.ville}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="text-sm text-gray-600 bg-blue-50 p-3 rounded">
        <strong>Note :</strong> Au moins un email ou un téléphone est requis pour créer le compte.
        <br />
        <strong>Mot de passe :</strong> Si non fourni, le client devra définir son mot de passe lors de sa première connexion.
      </div>

      <div className="flex justify-end gap-2">
        <Button type="submit" disabled={loading}>
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Créer'}
        </Button>
      </div>
    </form>
  );
};

// Formulaire d'édition d'utilisateur
interface EditUserFormProps {
  user: User;
  onSuccess: () => void;
  sites: Array<{ id: number; nom: string; ville: string }>;
}

const EditUserForm: React.FC<EditUserFormProps> = ({ user, onSuccess, sites }) => {
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('general');
  const [formData, setFormData] = useState({
    nom: user.nom,
    prenom: user.prenom,
    email: user.email || '',
    telephone: user.telephone || '',
    adresseText: user.adresseText || '',
    typeClient: user.typeClient || 'Standard',
    estEtudiant: user.estEtudiant || false,
    siteLavagePrincipalGerantId: user.siteLavagePrincipalGerantId?.toString() || ''
  });

  // Vérifier si le client peut être modifié entièrement (créé il y a moins de 12h)
  const canEditAllFields = canEditUser(user);

  // Type for abonnement with optional createdBy
  type AbonnementPremium = {
    id: number;
    annee: number;
    mois: number;
    limiteKg: number;
    kgUtilises: number;
    montant: number;
    aOptionRepassageIncluse: boolean;
    createdAt: string;
    createdBy?: string;
  };

  // États pour les abonnements premium
  const [abonnements, setAbonnements] = useState<AbonnementPremium[]>(user.abonnementsPremium || []);
  // Noms des mois en français pour l'affichage des options "Début"
  const _now = new Date();
  const defaultStartMonth = `${_now.getFullYear()}-${String(_now.getMonth() + 1).padStart(2, '0')}`;
  const monthNameThis = _now.toLocaleString('fr-FR', { month: 'long' });
  const monthNameNext = new Date(_now.getFullYear(), _now.getMonth() + 1, 1).toLocaleString('fr-FR', { month: 'long' });

  const [newAbonnement, setNewAbonnement] = useState({
    start: 'this' as 'this' | 'next',
    // explicit start month in format YYYY-MM (preferred)
    startMonth: defaultStartMonth,
    // use string so user can clear the field while typing
    count: '1',
    limiteKg: 40,
    aOptionRepassageIncluse: false
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const userData = {
        ...formData,
        siteLavagePrincipalGerantId: formData.siteLavagePrincipalGerantId ?
          parseInt(formData.siteLavagePrincipalGerantId) : undefined
      };

      const result = await ClientService.updateUser(user.id, userData);

      if (result.success) {
        toast.success('Client modifié avec succès');
        onSuccess();
      } else {
        toast.error(result.message || 'Erreur lors de la modification');
      }
    } catch (error) {
      toast.error('Erreur lors de la modification du client');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateAbonnement = async () => {
    if (!user.id) {
      alert('ID utilisateur manquant'); return;
    }

    // Récupérer le site de lavage du client ou du manager
    const siteLavageId = user.siteLavagePrincipalGerantId;
    
    if (!siteLavageId) {
      toast.error('Le site de lavage est requis pour créer un abonnement');
      return;
    }

    try {
      setLoading(true);
      const payload: any = {
        siteLavageId, // ✨ NOUVEAU: Ajout du site de lavage
        count: Number(newAbonnement.count || '1'),
        limiteKg: Number(newAbonnement.limiteKg || 40),
        aOptionRepassageIncluse: newAbonnement.aOptionRepassageIncluse
      };
      if ((newAbonnement as any).startMonth) {
        // Prevent creating subscriptions in past months
        const chosen = String((newAbonnement as any).startMonth);
        if (chosen < defaultStartMonth) {
          toast.error('Impossible de créer un abonnement pour un mois déjà passé');
          setLoading(false);
          return;
        }
        payload.startMonth = chosen;
      }
      else payload.start = newAbonnement.start;

      const result = await ClientService.createAbonnementsPremium(user.id, payload as any);

      if (result.success) {
        toast.success('Abonnement(s) premium créé(s) avec succès');
        // backend returns array of created abonnements
        const created = Array.isArray(result.data) ? result.data : [result.data];
        setAbonnements([...abonnements, ...created]);
        setNewAbonnement({ start: 'this', startMonth: defaultStartMonth, count: '1', limiteKg: 40, aOptionRepassageIncluse: false });
        // Close the edit dialog and reload parent data (same behaviour as edit submit)
        try {
          onSuccess();
        } catch (e) {
          // onSuccess should be provided by parent; swallow unexpected errors
          console.error('onSuccess callback failed after creating abonnements', e);
        }
      } else {
        toast.error(result.message || 'Erreur lors de la création de l\'abonnement');
      }
    } catch (error) {
      toast.error('Erreur lors de la création de l\'abonnement premium');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateAbonnement = async (abonnementId: number, data: { limiteKg?: number; kgUtilises?: number; aOptionRepassageIncluse?: boolean }) => {
    try {
      setLoading(true);
      const result = await ClientService.updateAbonnementsPremium(abonnementId, data);

      if (result.success) {
        toast.success('Abonnement mis à jour avec succès');
        setAbonnements(abonnements.map(ab =>
          ab.id === abonnementId ? { ...ab, ...data } : ab
        ));
      } else {
        toast.error(result.message || 'Erreur lors de la mise à jour');
      }
    } catch (error) {
      toast.error('Erreur lors de la mise à jour de l\'abonnement');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAbonnement = async (abonnementId: number) => {
    try {
      setLoading(true);
      const result = await ClientService.deleteAbonnementsPremium(abonnementId);

      if (result.success) {
        toast.success('Abonnement supprimé avec succès');
        setAbonnements(abonnements.filter(ab => ab.id !== abonnementId));
      } else {
        toast.error(result.message || 'Erreur lors de la suppression');
      }
    } catch (error) {
      toast.error('Erreur lors de la suppression de l\'abonnement');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Message d'information sur les restrictions */}
      {!canEditAllFields && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-4">
          <div className="flex items-start space-x-3">
            <Clock className="h-5 w-5 text-amber-600 mt-0.5" />
            <div>
              <h4 className="text-sm font-medium text-amber-800 mb-1">
                Modification limitée
              </h4>
            </div>
          </div>
        </div>
      )}

      {canEditAllFields && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
          <div className="flex items-start space-x-3">
            <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
            <div>
              <h4 className="text-sm font-medium text-green-800 mb-1">
                Modification complète autorisée
              </h4>
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-col space-y-8">
        {/* Informations générales */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold">Informations générales</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Prénom *</label>
                <Input
                  required
                  value={formData.prenom}
                  onChange={(e) => setFormData({ ...formData, prenom: e.target.value })}
                  disabled={!canEditAllFields}
                  className={!canEditAllFields ? "bg-gray-100" : ""}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Nom *</label>
                <Input
                  required
                  value={formData.nom}
                  onChange={(e) => setFormData({ ...formData, nom: e.target.value })}
                  disabled={!canEditAllFields}
                  className={!canEditAllFields ? "bg-gray-100" : ""}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Email</label>
                <Input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  disabled={!canEditAllFields}
                  className={!canEditAllFields ? "bg-gray-100" : ""}
                  placeholder="email@exemple.com"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Téléphone</label>
                <Input
                  value={formData.telephone}
                  onChange={(e) => setFormData({ ...formData, telephone: e.target.value })}
                  disabled={!canEditAllFields}
                  className={!canEditAllFields ? "bg-gray-100" : ""}
                  placeholder="Ex: 771234567"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Adresse</label>
              <Input
                value={formData.adresseText}
                onChange={(e) => setFormData({ ...formData, adresseText: e.target.value })}
                disabled={!canEditAllFields}
                className={!canEditAllFields ? "bg-gray-100" : ""}
                placeholder="Adresse complète (optionnel)"
              />
            </div>

            <div>
              <div className="flex items-center justify-between p-3 border rounded-md">
                <div>
                  <label className="block text-sm font-medium">Statut étudiant</label>
                  <p className="text-xs text-gray-500">
                    {formData.estEtudiant ? 'Bénéficie de réductions étudiantes' : 'Tarifs standard'}
                  </p>
                </div>
                <div className="flex items-center space-x-2">
                  <label htmlFor="student-toggle" className="text-sm">Étudiant</label>
                  <input
                    id="student-toggle"
                    type="checkbox"
                    checked={formData.estEtudiant}
                    onChange={(e) => setFormData({ ...formData, estEtudiant: e.target.checked })}
                    className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 focus:ring-2"
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div>
                <label className="block text-sm font-medium mb-1">Type de client</label>
                <Input
                  value={formData.typeClient}
                  disabled
                  className="bg-gray-100"
                />
                </div>

              <div>
                <label className="block text-sm font-medium mb-1">Site principal</label>
                <Select
                  value={formData.siteLavagePrincipalGerantId}
                  onValueChange={(value) => setFormData({ ...formData, siteLavagePrincipalGerantId: value })}
                >
                  <SelectTrigger className={!canEditAllFields ? "bg-gray-100" : ""}>
                    <SelectValue placeholder="Sélectionner un site" />
                  </SelectTrigger>
                  <SelectContent>
                    {sites.map((site) => (
                      <SelectItem key={site.id} value={site.id.toString()}>
                        {site.nom} - {site.ville}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <Button type="submit" disabled={loading}>
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Modifier'}
              </Button>
            </div>
          </form>
        </div>

        {/* Abonnements Premium */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold">Abonnements Premium</h2>

          {/* Créer un nouvel abonnement */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Créer un nouvel abonnement</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Début</label>
                  <div className="flex flex-col sm:flex-row gap-2">
                    <input
                      type="month"
                      className="px-3 py-1 border rounded w-full sm:w-auto"
                      value={(newAbonnement as any).startMonth}
                      min={defaultStartMonth}
                      onChange={(e) => setNewAbonnement({ ...newAbonnement, startMonth: e.target.value })}
                    />
                    <button
                      className={`px-3 py-1 border rounded w-full sm:w-auto`}
                      onClick={() => {
                        const next = new Date(_now.getFullYear(), _now.getMonth() + 1, 1);
                        setNewAbonnement({ ...newAbonnement, startMonth: `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, '0')}` });
                      }}
                      type="button"
                    >
                      Mois prochain ({monthNameNext})
                    </button>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Nombre de mois</label>
                  <Input
                    type="text"
                    inputMode="numeric"
                    value={newAbonnement.count}
                    onChange={(e) => setNewAbonnement({ ...newAbonnement, count: e.target.value })}
                    placeholder="1"
                    className="w-full"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Limite par mois (kg)</label>
                  <Input
                    type="number"
                    value={String(newAbonnement.limiteKg)}
                    disabled
                    className="w-full bg-gray-100"
                  />
                </div>
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="optionRepassage"
                    checked={newAbonnement.aOptionRepassageIncluse}
                    onChange={(e) => setNewAbonnement({ ...newAbonnement, aOptionRepassageIncluse: e.target.checked })}
                    className="rounded border-gray-300"
                  />
                  <label htmlFor="optionRepassage" className="text-sm font-medium">
                    Option repassage (+5 000 FCFA/mois)
                  </label>
                </div>
              </div>

              {/* Preview */}
              <div className="mt-3 p-3 border rounded bg-gray-50">
                <p className="text-sm font-medium mb-2">Aperçu</p>
                {
                  (() => {
                    const preview: { annee: number; mois: number; startDate: string; endDate: string }[] = [];
                    const base = new Date();
                    // Determine preview start date: prefer explicit startMonth (YYYY-MM) when provided
                    let startDate;
                    if ((newAbonnement as any).startMonth) {
                      const [yStr, mStr] = String((newAbonnement as any).startMonth).split('-');
                      const y = Number(yStr);
                      const m = Number(mStr);
                      if (y && m) startDate = new Date(y, m - 1, 1);
                    }
                    if (!startDate) startDate = newAbonnement.start === 'next' ? new Date(base.getFullYear(), base.getMonth() + 1, 1) : new Date(base.getFullYear(), base.getMonth(), 1);
                    const countNum = Math.max(1, Number(newAbonnement.count || '1'));
                    for (let i = 0; i < countNum; i++) {
                      const d = new Date(startDate.getFullYear(), startDate.getMonth() + i, 1);
                      const year = d.getFullYear();
                      const month = d.getMonth() + 1;
                      const end = new Date(d.getFullYear(), d.getMonth() + 1, 0);
                      preview.push({ annee: year, mois: month, startDate: d.toLocaleDateString('fr-FR'), endDate: end.toLocaleDateString('fr-FR') });
                    }

                    const baseMontant = 16000;
                    const optionRepassageMontant = newAbonnement.aOptionRepassageIncluse ? 5000 : 0;
                    const totalMontantBase = baseMontant + optionRepassageMontant;
                    const montantParMois = user.estEtudiant ? Math.round(totalMontantBase * 0.9) : totalMontantBase;
                    const total = montantParMois * preview.length;

                    return (
                      <div>
                        <p className="text-sm">Prix par mois: <strong>{montantParMois.toLocaleString()} FCFA</strong></p>
                        <p className="text-sm">Total: <strong>{total.toLocaleString()} FCFA</strong></p>
                        {preview.length > 1 && (
                          <div className="mt-2">
                            <p className="text-xs text-gray-600">Détails :</p>
                            <ul className="list-disc pl-5 text-sm">
                              {preview.map((p) => (
                                <li key={`${p.annee}-${p.mois}`}>{p.mois.toString().padStart(2, '0')}/{p.annee} — {p.startDate} au {p.endDate}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    );
                  })()
                }
              </div>

              <div className="mt-3">
                <Button onClick={handleCreateAbonnement} disabled={loading} className="w-full sm:w-auto">
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Créer l\'abonnement(s)'}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Liste des abonnements existants */}
          <div className="space-y-3">
            <h3 className="text-lg font-semibold">Abonnements existants</h3>
            {abonnements.length === 0 ? (
              <p className="text-gray-500">Aucun abonnement premium trouvé</p>
            ) : (
              abonnements.map((abonnement) => {
                const isCurrentMonth = new Date().getFullYear() === abonnement.annee && (new Date().getMonth() + 1) === abonnement.mois;

                return (
                  <Card key={abonnement.id} className={isCurrentMonth ? 'border-blue-500' : ''}>
                    <CardContent className="p-4">
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <h4 className="font-semibold">
                            {abonnement.mois.toString().padStart(2, '0')}/{abonnement.annee}
                            {isCurrentMonth && <span className="ml-2 text-sm bg-blue-600 text-white px-2 py-1 rounded">Actuel</span>}
                          </h4>
                          <p className="text-sm text-gray-600">
                            Créé le {new Date(abonnement.createdAt).toLocaleDateString('fr-FR')}
                            {abonnement.createdBy && (
                              <span className="text-sm text-gray-600"> — Par : {abonnement.createdBy}</span>
                            )}
                          </p>
                        </div>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleDeleteAbonnement(abonnement.id)}
                          disabled
                          title="Suppression désactivée depuis l'édition du client"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium mb-1">Limite (kg)</label>
                          <Input
                            type="number"
                            defaultValue={abonnement.limiteKg}
                            disabled
                            // displayed but not editable in this form
                            min={1}
                            step={0.1}
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium mb-1">Utilisé (kg)</label>
                          <Input
                            type="number"
                            defaultValue={abonnement.kgUtilises}
                            disabled
                            // displayed but not editable in this form
                            min={0}
                            step={0.1}
                          />
                        </div>
                      </div>

                      {/* Affichage de l'option repassage et du montant */}
                      <div className="mt-3 p-3 bg-gray-50 rounded border">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium">Option repassage:</span>
                          <span className={`text-sm px-2 py-1 rounded ${abonnement.aOptionRepassageIncluse ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                            {abonnement.aOptionRepassageIncluse ? 'Incluse' : 'Non incluse'}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium">Montant:</span>
                          <span className="text-sm font-semibold">{abonnement.montant?.toLocaleString() || '16 000'} FCFA</span>
                        </div>
                      </div>

                      <div className="mt-3">
                        <p className="text-sm text-gray-600 mb-1">
                          Restant: {(abonnement.limiteKg - abonnement.kgUtilises).toFixed(1)} kg
                        </p>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div
                            className={`h-2 rounded-full transition-all duration-300 ${(abonnement.kgUtilises / abonnement.limiteKg) >= 0.9 ? 'bg-red-500' :
                                (abonnement.kgUtilises / abonnement.limiteKg) >= 0.7 ? 'bg-yellow-500' :
                                  'bg-green-500'
                              }`}
                            style={{ width: `${Math.min((abonnement.kgUtilises / abonnement.limiteKg) * 100, 100)}%` }}
                          ></div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })
            )}
          </div>
        </div>


      </div>
    </div>
  );
};

export default Clients;
