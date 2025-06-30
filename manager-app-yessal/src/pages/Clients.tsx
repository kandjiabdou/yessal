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
  
  // États pour les modales
  const [createUserOpen, setCreateUserOpen] = useState(false);
  const [editUserOpen, setEditUserOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  
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
      
      if (currentSearch) filters.search = currentSearch;
      if (currentTypeClient !== 'all') filters.typeClient = currentTypeClient;
      if (currentSite !== 'all') filters.siteLavageId = parseInt(currentSite);
      
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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
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
              {searchTerm || typeClientFilter !== 'all' || siteFilter !== 'all' ? (
                <div>
                  <p>Aucun client trouvé avec ces critères</p>
                  <Button variant="outline" size="sm" onClick={() => {
                    setSearchTerm('');
                    setTypeClientFilter('all');
                    setSiteFilter('all');
                    setCurrentPage(1);
                    loadUsers(1, { search: '', typeClient: 'all', site: 'all' });
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
        <DialogContent className="max-w-md">
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
    </div>
  );
};

// Composant Card pour les utilisateurs
interface UserCardProps {
  user: User;
  onEdit: (user: User) => void;
  onDelete: (user: User) => void;
  getStatusBadge: (user: User) => JSX.Element;
}

const UserCard: React.FC<UserCardProps> = ({ user, onEdit, onDelete, getStatusBadge }) => {
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
              <div className="mt-3 p-2 bg-green-50 rounded">
                <p className="text-xs text-green-800">
                  Fidélité: {user.fidelite.nombreLavageTotal} lavages • {user.fidelite.poidsTotalLaveKg}kg
                </p>
              </div>
            )}
          </div>
          
          <div className="flex items-center gap-1 ml-4">
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
    adresseText: '',
    typeClient: 'Standard' as 'Standard' | 'Premium',
    estEtudiant: false,
    siteLavagePrincipalGerantId: ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const userData = {
        ...formData,
        role: 'Client' as const,
        siteLavagePrincipalGerantId: formData.siteLavagePrincipalGerantId ? 
          parseInt(formData.siteLavagePrincipalGerantId) : undefined
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
  );
};

export default Clients;
