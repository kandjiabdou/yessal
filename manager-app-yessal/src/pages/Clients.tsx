import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { 
  Users, 
  UserPlus, 
  Search, 
  Filter, 
  Edit, 
  Trash2, 
  Eye,
  Phone,
  Mail,
  MapPin,
  ChevronLeft,
  ChevronRight,
  Loader2,
  AlertCircle
} from 'lucide-react';
import { toast } from 'sonner';
import ClientService, { User, ClientInvite } from '@/services/client';

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
  const [siteFilter, setSiteFilter] = useState<string>('all');
  const [etudiantFilter, setEtudiantFilter] = useState<'all' | 'true' | 'false'>('all');
  
  // États pour les modales
  const [createUserOpen, setCreateUserOpen] = useState(false);
  const [editUserOpen, setEditUserOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [userDetailsOpen, setUserDetailsOpen] = useState(false);
  
  // États pour les sites (pour les filtres)
  const [sites, setSites] = useState<Array<{ id: number; nom: string; ville: string }>>([]);
  
  // États pour les timeouts de recherche
  const [searchTimeout, setSearchTimeout] = useState<NodeJS.Timeout | null>(null);

  useEffect(() => {
    loadUsers();
    loadSites();
  }, []);

  useEffect(() => {
    return () => {
      if (searchTimeout) {
        clearTimeout(searchTimeout);
      }
    };
  }, [searchTimeout]);

  const loadUsers = async (
    page: number = currentPage, 
    customFilters?: {
      search?: string;
      typeClient?: string;
      site?: string;
      etudiant?: string;
    }
  ) => {
    try {
      setUsersLoading(true);
      setUsersError(null);
      
      const filters: any = {};
      
      // Utiliser les filtres personnalisés ou les états actuels
      const currentSearch = customFilters?.search !== undefined ? customFilters.search : searchTerm;
      const currentTypeClient = customFilters?.typeClient !== undefined ? customFilters.typeClient : typeClientFilter;
      const currentSite = customFilters?.site !== undefined ? customFilters.site : siteFilter;
      const currentEtudiant = customFilters?.etudiant !== undefined ? customFilters.etudiant : etudiantFilter;
      
      if (currentSearch) filters.search = currentSearch;
      if (currentTypeClient !== 'all') filters.typeClient = currentTypeClient;
      if (currentSite !== 'all') filters.siteLavageId = parseInt(currentSite);
      if (currentEtudiant !== 'all') filters.estEtudiant = currentEtudiant === 'true';
      
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
    setCurrentPage(1);
    if (newTab === 'invites') {
      loadClientsInvites();
    }
  };

  const handleSearchChange = (value: string) => {
    setSearchTerm(value);
    
    if (searchTimeout) {
      clearTimeout(searchTimeout);
    }
    
    const newTimeout = setTimeout(() => {
      setCurrentPage(1);
      if (activeTab === 'users') {
        loadUsers(1, { search: value });
      } else if (activeTab === 'invites') {
        loadClientsInvites();
      }
    }, 500);
    
    setSearchTimeout(newTimeout);
  };



  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setCurrentPage(newPage);
      loadUsers(newPage);
    }
  };

  const handleViewUser = (user: User) => {
    setSelectedUser(user);
    setUserDetailsOpen(true);
  };

  const handleEditUser = (user: User) => {
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
        loadUsers(currentPage);
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
            {totalUsers > 0 ? (
              <>Affichage {((currentPage - 1) * limit) + 1}-{Math.min(currentPage * limit, totalUsers)} sur {totalUsers} clients</>
            ) : (
              'Aucun client'
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

      {/* Filtres */}
      <Card>
        <CardContent className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Recherche */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Rechercher un client..."
                value={searchTerm}
                onChange={(e) => handleSearchChange(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Filtre par type */}
            <Select value={typeClientFilter} onValueChange={(value: any) => { 
              setTypeClientFilter(value); 
              setCurrentPage(1);
              loadUsers(1, { typeClient: value });
            }}>
              <SelectTrigger>
                <SelectValue placeholder="Type de client" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les types</SelectItem>
                <SelectItem value="Standard">Standard</SelectItem>
                <SelectItem value="Premium">Premium</SelectItem>
              </SelectContent>
            </Select>

            {/* Filtre par étudiant */}
            <Select value={etudiantFilter} onValueChange={(value: any) => { 
              setEtudiantFilter(value); 
              setCurrentPage(1);
              loadUsers(1, { etudiant: value });
            }}>
              <SelectTrigger>
                <SelectValue placeholder="Statut étudiant" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous</SelectItem>
                <SelectItem value="true">Étudiants</SelectItem>
                <SelectItem value="false">Non étudiants</SelectItem>
              </SelectContent>
            </Select>

            {/* Filtre par site */}
            <Select value={siteFilter} onValueChange={(value) => { 
              setSiteFilter(value); 
              setCurrentPage(1);
              loadUsers(1, { site: value });
            }}>
              <SelectTrigger>
                <SelectValue placeholder="Site de lavage" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les sites</SelectItem>
                {sites.map((site) => (
                  <SelectItem key={site.id} value={site.id.toString()}>
                    {site.nom}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Résultats de recherche */}
          {searchTerm && (
            <div className="mt-4 text-sm text-gray-500">
              {totalUsers > 0 ? (
                `${totalUsers} résultat${totalUsers > 1 ? 's' : ''} trouvé${totalUsers > 1 ? 's' : ''} pour "${searchTerm}"`
              ) : (
                `Aucun résultat trouvé pour "${searchTerm}"`
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Onglets */}
      <Tabs defaultValue="users" value={activeTab} onValueChange={handleTabChange}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="users" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Clients inscrits
          </TabsTrigger>
          <TabsTrigger value="invites" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Clients invités
          </TabsTrigger>
        </TabsList>

        {/* Clients inscrits */}
        <TabsContent value="users" className="space-y-4">
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
              {searchTerm || typeClientFilter !== 'all' || siteFilter !== 'all' || etudiantFilter !== 'all' ? (
                <div>
                  <p>Aucun client trouvé avec ces critères</p>
                  <Button variant="outline" size="sm" onClick={() => {
                    setSearchTerm('');
                    setTypeClientFilter('all');
                    setSiteFilter('all');
                    setEtudiantFilter('all');
                    setCurrentPage(1);
                    loadUsers(1, { search: '', typeClient: 'all', site: 'all', etudiant: 'all' });
                  }} className="mt-2">
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
                />
              ))}
            </div>
          )}
        </TabsContent>

        {/* Clients invités */}
        <TabsContent value="invites" className="space-y-4">
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
        </TabsContent>
      </Tabs>

      {/* Pagination */}
      {totalPages > 1 && activeTab === 'users' && (
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

      {/* Modales */}
      <Dialog open={editUserOpen} onOpenChange={setEditUserOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Modifier le client</DialogTitle>
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
                      <p className="font-medium">{selectedUser.telephone}</p>
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
                        <p className="text-sm text-green-700 mb-1">Nombre total de lavages</p>
                        <p className="text-2xl font-bold text-green-800">{selectedUser.fidelite.nombreLavageTotal}</p>
                      </div>
                      <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                        <p className="text-sm text-blue-700 mb-1">Poids total lavé</p>
                        <p className="text-2xl font-bold text-blue-800">{selectedUser.fidelite.poidsTotalLaveKg} kg</p>
                      </div>
                    </div>

                    {/* Lavages gratuits disponibles */}
                    <div>
                      <h4 className="font-semibold text-lg mb-3 text-gray-800">Lavages gratuits disponibles</h4>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="p-4 bg-orange-50 rounded-lg border border-orange-200">
                          <div className="flex items-center justify-between mb-2">
                            <p className="text-sm font-medium text-orange-700">Machine 6kg</p>
                            <div className="flex items-center">
                              <span className="text-2xl font-bold text-orange-800">
                                {selectedUser.fidelite.lavagesGratuits6kgRestants}
                              </span>
                              <span className="text-sm text-orange-600 ml-1">disponible(s)</span>
                            </div>
                          </div>
                          {selectedUser.fidelite.lavagesGratuits6kgRestants > 0 && (
                            <div className="text-xs text-orange-600 bg-orange-100 px-2 py-1 rounded">
                              ✓ Lavages gratuits prêts à utiliser
                            </div>
                          )}
                        </div>
                        
                        <div className="p-4 bg-purple-50 rounded-lg border border-purple-200">
                          <div className="flex items-center justify-between mb-2">
                            <p className="text-sm font-medium text-purple-700">Machine 20kg</p>
                            <div className="flex items-center">
                              <span className="text-2xl font-bold text-purple-800">
                                {selectedUser.fidelite.lavagesGratuits20kgRestants}
                              </span>
                              <span className="text-sm text-purple-600 ml-1">disponible(s)</span>
                            </div>
                          </div>
                          {selectedUser.fidelite.lavagesGratuits20kgRestants > 0 && (
                            <div className="text-xs text-purple-600 bg-purple-100 px-2 py-1 rounded">
                              ✓ Lavages gratuits prêts à utiliser
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Progression vers le prochain lavage gratuit (pour la formule Standard) */}
                    {selectedUser.typeClient !== 'Premium' && (
                      <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                        <h5 className="font-medium text-gray-700 mb-2">Progression vers le prochain lavage gratuit</h5>
                        <div className="space-y-2">
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-600">Lavages effectués</span>
                            <span className="font-medium">{selectedUser.fidelite.nombreLavageTotal % 10}/10</span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div 
                              className="bg-green-500 h-2 rounded-full transition-all duration-300"
                              style={{ width: `${((selectedUser.fidelite.nombreLavageTotal % 10) / 10) * 100}%` }}
                            ></div>
                          </div>
                          <p className="text-xs text-gray-500">
                            {10 - (selectedUser.fidelite.nombreLavageTotal % 10)} lavage(s) restant(s) pour obtenir un lavage gratuit 6kg
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Abonnements Premium */}
              {selectedUser.typeClient === 'Premium' && selectedUser.abonnementsPremium && selectedUser.abonnementsPremium.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold mb-3">Abonnements Premium</h3>
                  <div className="space-y-3">
                    {selectedUser.abonnementsPremium.map((abonnement, index) => {
                      const pourcentageUtilise = (abonnement.kgUtilises / abonnement.limiteKg) * 100;
                      const isCurrentMonth = new Date().getFullYear() === abonnement.annee && (new Date().getMonth() + 1) === abonnement.mois;
                      
                      return (
                        <div 
                          key={abonnement.id} 
                          className={`p-4 rounded-lg border-2 ${
                            isCurrentMonth ? 'border-blue-500 bg-blue-50' : 'border-gray-200 bg-gray-50'
                          }`}
                        >
                          <div className="flex justify-between items-start mb-3">
                            <div>
                              <h4 className="font-semibold text-blue-800">
                                {abonnement.mois.toString().padStart(2, '0')}/{abonnement.annee}
                                {isCurrentMonth && <span className="ml-2 text-sm bg-blue-600 text-white px-2 py-1 rounded">Actuel</span>}
                              </h4>
                              <p className="text-sm text-gray-600">
                                Créé le {new Date(abonnement.createdAt).toLocaleDateString('fr-FR')}
                              </p>
                            </div>
                          </div>
                          
                          <div className="grid grid-cols-3 gap-4 mb-3">
                            <div>
                              <p className="text-sm text-gray-600">Limite mensuelle</p>
                              <p className="text-lg font-bold text-blue-800">{abonnement.limiteKg} kg</p>
                            </div>
                            <div>
                              <p className="text-sm text-gray-600">Utilisé</p>
                              <p className="text-lg font-bold text-blue-800">{abonnement.kgUtilises} kg</p>
                            </div>
                            <div>
                              <p className="text-sm text-gray-600">Restant</p>
                              <p className="text-lg font-bold text-green-800">
                                {(abonnement.limiteKg - abonnement.kgUtilises).toFixed(1)} kg
                              </p>
                            </div>
                          </div>
                          
                          {/* Barre de progression */}
                          <div className="w-full bg-gray-200 rounded-full h-3">
                            <div 
                              className={`h-3 rounded-full transition-all duration-300 ${
                                pourcentageUtilise >= 90 ? 'bg-red-500' : 
                                pourcentageUtilise >= 70 ? 'bg-yellow-500' : 
                                'bg-green-500'
                              }`}
                              style={{ width: `${Math.min(pourcentageUtilise, 100)}%` }}
                            ></div>
                          </div>
                          <p className="text-xs text-gray-600 mt-1">
                            {pourcentageUtilise.toFixed(1)}% utilisé
                          </p>
                        </div>
                      );
                    })}
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
}

const UserCard: React.FC<UserCardProps> = ({ user, onEdit, onDelete, onView, getStatusBadge }) => {
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
                  {user.telephone}
                </div>
              )}
              {user.adresseText && (
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4" />
                  {user.adresseText}
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
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <p className="text-green-700">Total lavages</p>
                    <p className="font-bold text-green-800">{user.fidelite.nombreLavageTotal}</p>
                  </div>
                  <div>
                    <p className="text-green-700">Poids total</p>
                    <p className="font-bold text-green-800">{user.fidelite.poidsTotalLaveKg}kg</p>
                  </div>
                </div>
                
                {/* Affichage des lavages gratuits disponibles */}
                {(user.fidelite.lavagesGratuits6kgRestants > 0 || user.fidelite.lavagesGratuits20kgRestants > 0) && (
                  <div className="mt-2 pt-2 border-t border-green-200">
                    <p className="text-xs text-green-700 mb-1">Lavages gratuits disponibles:</p>
                    <div className="flex gap-2">
                      {user.fidelite.lavagesGratuits6kgRestants > 0 && (
                        <div className="bg-orange-100 text-orange-800 px-2 py-1 rounded text-xs font-medium">
                          {user.fidelite.lavagesGratuits6kgRestants}x 6kg
                        </div>
                      )}
                      {user.fidelite.lavagesGratuits20kgRestants > 0 && (
                        <div className="bg-purple-100 text-purple-800 px-2 py-1 rounded text-xs font-medium">
                          {user.fidelite.lavagesGratuits20kgRestants}x 20kg
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {user.typeClient === 'Premium' && user.abonnementsPremium && user.abonnementsPremium.length > 0 && (
              <div className="mt-3 p-2 bg-blue-50 rounded">
                <p className="text-xs text-blue-800 font-medium mb-1">Abonnement Premium actuel:</p>
                <div className="text-xs text-blue-700">
                  <p>Période: {user.abonnementsPremium[0].mois.toString().padStart(2, '0')}/{user.abonnementsPremium[0].annee}</p>
                  <p>Limite: {user.abonnementsPremium[0].limiteKg}kg • Utilisé: {user.abonnementsPremium[0].kgUtilises}kg</p>
                  <p>Restant: {(user.abonnementsPremium[0].limiteKg - user.abonnementsPremium[0].kgUtilises).toFixed(1)}kg</p>
                </div>
              </div>
            )}
          </div>
          
          <div className="flex items-center gap-1 ml-4">
            <Button variant="outline" size="sm" onClick={() => onView(user)}>
              <Eye className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={() => onEdit(user)}>
              <Edit className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={() => onDelete(user)}>
              <Trash2 className="h-4 w-4" />
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
                  {client.telephone}
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

    if (!formData.password || formData.password.length < 6) {
      toast.error('Le mot de passe doit contenir au moins 6 caractères');
      setLoading(false);
      return;
    }

    try {
      const userData = {
        ...formData,
        role: 'Client' as const,
        siteLavagePrincipalGerantId: formData.siteLavagePrincipalGerantId ? 
          parseInt(formData.siteLavagePrincipalGerantId) : undefined,
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
            onChange={(e) => setFormData({...formData, prenom: e.target.value})}
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Nom *</label>
          <Input
            required
            value={formData.nom}
            onChange={(e) => setFormData({...formData, nom: e.target.value})}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1">Email</label>
          <Input
            type="email"
            value={formData.email}
            onChange={(e) => setFormData({...formData, email: e.target.value})}
            placeholder="email@exemple.com"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Téléphone</label>
          <Input
            value={formData.telephone}
            onChange={(e) => setFormData({...formData, telephone: e.target.value})}
            placeholder="Ex: 771234567"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">Mot de passe *</label>
        <Input
          type="password"
          required
          value={formData.password}
          onChange={(e) => setFormData({...formData, password: e.target.value})}
          placeholder="Au moins 6 caractères"
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">Adresse</label>
        <Input
          value={formData.adresseText}
          onChange={(e) => setFormData({...formData, adresseText: e.target.value})}
          placeholder="Adresse complète (optionnel)"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1">Type de client</label>
          <Select value={formData.typeClient} onValueChange={(value: any) => setFormData({...formData, typeClient: value})}>
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
          <Select value={formData.siteLavagePrincipalGerantId} onValueChange={(value) => setFormData({...formData, siteLavagePrincipalGerantId: value})}>
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

      <div className="flex items-center space-x-2">
        <input
          type="checkbox"
          id="estEtudiant"
          checked={formData.estEtudiant}
          onChange={(e) => setFormData({...formData, estEtudiant: e.target.checked})}
          className="rounded border-gray-300"
        />
        <label htmlFor="estEtudiant" className="text-sm font-medium">
          Client étudiant (réduction applicable)
        </label>
      </div>

      <div className="text-sm text-gray-600 bg-blue-50 p-3 rounded">
        <strong>Note :</strong> Au moins un email ou un téléphone est requis pour créer le compte.
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

  // États pour les abonnements premium
  const [abonnements, setAbonnements] = useState(user.abonnementsPremium || []);
  const [newAbonnement, setNewAbonnement] = useState({
    annee: new Date().getFullYear(),
    mois: new Date().getMonth() + 1,
    limiteKg: 50
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
    if (!user.id || formData.typeClient !== 'Premium') return;

    try {
      setLoading(true);
      const result = await ClientService.createAbonnementPremium(user.id, newAbonnement);
      
      if (result.success) {
        toast.success('Abonnement premium créé avec succès');
        setAbonnements([...abonnements, result.data]);
        setNewAbonnement({
          annee: new Date().getFullYear(),
          mois: new Date().getMonth() + 1,
          limiteKg: 50
        });
      } else {
        toast.error(result.message || 'Erreur lors de la création de l\'abonnement');
      }
    } catch (error) {
      toast.error('Erreur lors de la création de l\'abonnement premium');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateAbonnement = async (abonnementId: number, data: { limiteKg?: number; kgUtilises?: number }) => {
    try {
      setLoading(true);
      const result = await ClientService.updateAbonnementPremium(abonnementId, data);
      
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
      const result = await ClientService.deleteAbonnementPremium(abonnementId);
      
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
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="general">Informations générales</TabsTrigger>
          <TabsTrigger value="premium" disabled={formData.typeClient !== 'Premium'}>
            Abonnements Premium
          </TabsTrigger>
        </TabsList>

        <TabsContent value="general" className="space-y-4">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Prénom *</label>
                <Input
                  required
                  value={formData.prenom}
                  onChange={(e) => setFormData({...formData, prenom: e.target.value})}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Nom *</label>
                <Input
                  required
                  value={formData.nom}
                  onChange={(e) => setFormData({...formData, nom: e.target.value})}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Email</label>
              <Input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({...formData, email: e.target.value})}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Téléphone</label>
              <Input
                value={formData.telephone}
                onChange={(e) => setFormData({...formData, telephone: e.target.value})}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Adresse</label>
              <Input
                value={formData.adresseText}
                onChange={(e) => setFormData({...formData, adresseText: e.target.value})}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Type de client</label>
                <Select value={formData.typeClient} onValueChange={(value: any) => setFormData({...formData, typeClient: value})}>
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
                <Select value={formData.siteLavagePrincipalGerantId} onValueChange={(value) => setFormData({...formData, siteLavagePrincipalGerantId: value})}>
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

            <div className="flex justify-end gap-2">
              <Button type="submit" disabled={loading}>
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Modifier'}
              </Button>
            </div>
          </form>
        </TabsContent>

        <TabsContent value="premium" className="space-y-4">
          {formData.typeClient === 'Premium' && (
            <>
              {/* Créer un nouvel abonnement */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Créer un nouvel abonnement</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-1">Année</label>
                      <Input
                        type="number"
                        value={newAbonnement.annee}
                        onChange={(e) => setNewAbonnement({...newAbonnement, annee: parseInt(e.target.value)})}
                        min={new Date().getFullYear()}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Mois</label>
                      <Select 
                        value={newAbonnement.mois.toString()} 
                        onValueChange={(value) => setNewAbonnement({...newAbonnement, mois: parseInt(value)})}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {Array.from({length: 12}, (_, i) => (
                            <SelectItem key={i + 1} value={(i + 1).toString()}>
                              {new Date(0, i).toLocaleDateString('fr-FR', { month: 'long' })}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Limite (kg)</label>
                      <Input
                        type="number"
                        value={newAbonnement.limiteKg}
                        onChange={(e) => setNewAbonnement({...newAbonnement, limiteKg: parseFloat(e.target.value)})}
                        min={1}
                        step={0.1}
                      />
                    </div>
                  </div>
                  <Button onClick={handleCreateAbonnement} disabled={loading}>
                    {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Créer l\'abonnement'}
                  </Button>
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
                              </p>
                            </div>
                            <Button 
                              variant="destructive" 
                              size="sm"
                              onClick={() => handleDeleteAbonnement(abonnement.id)}
                              disabled={loading}
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
                                onBlur={(e) => {
                                  const newValue = parseFloat(e.target.value);
                                  if (newValue !== abonnement.limiteKg) {
                                    handleUpdateAbonnement(abonnement.id, { limiteKg: newValue });
                                  }
                                }}
                                min={1}
                                step={0.1}
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium mb-1">Utilisé (kg)</label>
                              <Input
                                type="number"
                                defaultValue={abonnement.kgUtilises}
                                onBlur={(e) => {
                                  const newValue = parseFloat(e.target.value);
                                  if (newValue !== abonnement.kgUtilises) {
                                    handleUpdateAbonnement(abonnement.id, { kgUtilises: newValue });
                                  }
                                }}
                                min={0}
                                step={0.1}
                              />
                            </div>
                          </div>
                          
                          <div className="mt-3">
                            <p className="text-sm text-gray-600 mb-1">
                              Restant: {(abonnement.limiteKg - abonnement.kgUtilises).toFixed(1)} kg
                            </p>
                            <div className="w-full bg-gray-200 rounded-full h-2">
                              <div 
                                className={`h-2 rounded-full transition-all duration-300 ${
                                  (abonnement.kgUtilises / abonnement.limiteKg) >= 0.9 ? 'bg-red-500' : 
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
            </>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Clients;
