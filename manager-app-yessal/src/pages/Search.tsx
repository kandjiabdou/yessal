import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Search as SearchIcon, ScanQrCode, User, X } from 'lucide-react';
import { toast } from "sonner";
import { startQrScanner, parseQrCodeData } from '@/utils/qrCodeScanner';
import ClientService, { Client, ClientInvite } from '@/services/client';
import { OrderData } from '@/services/order';

const Search: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Client[]>([]);
  const [isScanning, setIsScanning] = useState(false);
  const [showSearchResults, setShowSearchResults] = useState(true);
  const [guestContact, setGuestContact] = useState<ClientInvite>({
    nom: '',
    prenom: '',
    telephone: '',
    email: '',
    adresseText: '',
    creerCompte: false
  });
  const [showGuestForm, setShowGuestForm] = useState(false);
  
  const navigate = useNavigate();
  const location = useLocation();

  // Vérifier si on revient d'OrderRecap pour modification
  useEffect(() => {
    const state = location.state as { 
      selectedClient?: Client; 
      guestContact?: ClientInvite; 
      orderData?: OrderData; 
      fromOrderRecap?: boolean 
    };
    
    if (state?.fromOrderRecap && (state.selectedClient || state.guestContact)) {
      // Rediriger directement vers NewOrder avec les données
      navigate('/new-order', {
        state: {
          selectedClient: state.selectedClient,
          guestContact: state.guestContact,
          orderData: state.orderData,
          fromOrderRecap: true
        }
      });
    }
  }, [location.state, navigate]);

  // Effect for dynamic search
  useEffect(() => {
    const searchClients = async () => {
      if (searchQuery.trim()) {
        const results = await ClientService.searchClients(searchQuery);
        setSearchResults(results);
        setShowSearchResults(true);
      } else {
        setSearchResults([]);
        setShowSearchResults(false);
      }
    };

    const timeoutId = setTimeout(searchClients, 300);
    return () => clearTimeout(timeoutId);
  }, [searchQuery]);

  const resetSearch = () => {
    setSearchQuery('');
    setSearchResults([]);
    setShowSearchResults(true);
    setShowGuestForm(false);
    setGuestContact({
      nom: '',
      prenom: '',
      telephone: '',
      email: '',
      adresseText: '',
      creerCompte: false
    });
  };

  const startScanning = async () => {
    setIsScanning(true);
    
    try {
      const qrData = await startQrScanner();
      const parsedData = parseQrCodeData(qrData);
      
      if (parsedData && parsedData.clientId) {
        const client = await ClientService.getClientDetails(parseInt(parsedData.clientId));
        
        if (client) {
          toast.success(`Client trouvé: ${client.prenom} ${client.nom}`);
          navigate('/new-order', { state: { selectedClient: client } });
        } else {
          toast.error("Aucun client trouvé avec ce code");
        }
      } else {
        toast.error("QR code invalide");
      }
    } catch (error) {
      toast.error("Erreur lors du scan");
    } finally {
      setIsScanning(false);
    }
  };

  const selectClient = (client: Client) => {
    navigate('/new-order', { state: { selectedClient: client } });
  };

  const showGuestContactForm = () => {
    setShowGuestForm(true);
  };

  const handleGuestContactSubmit = async () => {
    // Cas 3 : Le client veut créer un compte
    if (guestContact.creerCompte) {
      // Validation des champs obligatoires pour la création de compte
      if (!guestContact.nom || !guestContact.prenom || !guestContact.telephone) {
        toast.error("Pour créer un compte, veuillez remplir le nom, prénom et téléphone");
        return;
      }

      try {
        // Vérifier si le client existe déjà
        const checkResult = await ClientService.checkClientExists(
          guestContact.telephone,
          guestContact.email
        );

        if (checkResult.exists) {
          toast.error(checkResult.message);
          return;
        }

        // Créer le compte client
        const createResult = await ClientService.createClient(guestContact);
        if (!createResult.success || !createResult.client) {
          toast.error(createResult.message || "Erreur lors de la création du compte client");
          return;
        }

        // Naviguer avec le client créé
        toast.success("Compte client créé avec succès");
        navigate('/new-order', { 
          state: { 
            selectedClient: createResult.client,
            isNewlyCreatedAccount: true
          } 
        });
        return;
      } catch (error) {
        console.error('Erreur lors de la création du compte:', error);
        toast.error("Une erreur est survenue lors de la création du compte");
        return;
      }
    }

    // Cas 2 : Client donne ses infos sans créer de compte
    if (guestContact.nom && guestContact.prenom) {
      navigate('/new-order', { 
        state: { 
          guestContact: {
            ...guestContact,
            creerCompte: false
          }
        } 
      });
      return;
    }

    // Cas 1 : Commande anonyme (pas d'infos)
    navigate('/new-order', { state: {} });
  };

  const skipGuestContact = () => {
    navigate('/new-order', { state: {} });
  };

  return (
    <div className="space-y-6 pb-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Commande Client</h1>
        <p className="text-muted-foreground">
          Rechercher un client ou scanner sa carte
        </p>
      </div>

      {showGuestForm ? (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold">Coordonnées du client (facultatif)</h2>
          <p className="text-sm text-gray-500">
            Ces informations seront utilisées pour l'envoi de la facture. Le client peut choisir de ne pas les fournir.
          </p>

          <div>
            <label htmlFor="guestFirstName" className="text-sm font-medium">
              Prénom
            </label>
            <Input
              id="guestFirstName"
              placeholder="Ex : Fatou"
              value={guestContact.prenom || ''}
              onChange={(e) =>
                setGuestContact({ ...guestContact, prenom: e.target.value })
              }
            />
          </div>
          
          <div>
            <label htmlFor="guestLastName" className="text-sm font-medium">
              Nom
            </label>
            <Input
              id="guestLastName"
              placeholder="Ex : Ndiaye"
              value={guestContact.nom || ''}
              onChange={(e) =>
                setGuestContact({ ...guestContact, nom: e.target.value })
              }
            />
          </div>
          
          <div>
            <label htmlFor="guestPhone" className="text-sm font-medium">
              Numéro de téléphone
            </label>
            <Input 
              id="guestPhone" 
              type="tel" 
              placeholder="Ex: 77 123 45 67" 
              value={guestContact.telephone || ''}
              onChange={(e) => setGuestContact({...guestContact, telephone: e.target.value})}
            />
          </div>
          
          <div>
            <label htmlFor="guestAddress" className="text-sm font-medium">
              Adresse
            </label>
            <Input
              id="guestAddress"
              placeholder="Ex : 24 rue des Manguiers, Dakar"
              value={guestContact.adresseText || ''}
              onChange={(e) =>
                setGuestContact({ ...guestContact, adresseText: e.target.value })
              }
            />
          </div>
          
          <div>
            <label htmlFor="guestEmail" className="text-sm font-medium">
              Email
            </label>
            <Input 
              id="guestEmail" 
              type="email" 
              placeholder="Ex: client@example.com" 
              value={guestContact.email || ''}
              onChange={(e) => setGuestContact({...guestContact, email: e.target.value})}
            />
          </div>

          <div className="flex items-center gap-2">
            <input
              id="openAccount"
              type="checkbox"
              checked={guestContact.creerCompte || false}
              onChange={(e) =>
                setGuestContact({ ...guestContact, creerCompte: e.target.checked })
              }
              className="h-4 w-4 accent-primary"
            />
            <label htmlFor="openAccount" className="text-sm">
              Souhaite ouvrir un compte
            </label>
          </div>

          <div className="flex gap-2">
            <Button 
              className="flex-1"
              variant="default" 
              onClick={handleGuestContactSubmit}
            >
              Continuer
            </Button>
            <Button 
              className="flex-1"
              variant="outline" 
              onClick={skipGuestContact}
            >
              Passer cette étape
            </Button>
          </div>
          
          <Button 
            variant="ghost" 
            className="w-full"
            onClick={resetSearch}
          >
            Annuler et revenir à la recherche
          </Button>
        </div>
      ) : (
        /* Search/Scan Interface */
        <Tabs defaultValue="search">
          <TabsList className="grid grid-cols-2">
            <TabsTrigger value="search">Recherche</TabsTrigger>
            <TabsTrigger value="scan">Scanner</TabsTrigger>
          </TabsList>
          
          <TabsContent value="search" className="space-y-4">
            <div className="flex gap-2 relative">
              <Input 
                placeholder="Nom, téléphone ou numéro de carte" 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pr-10"
              />
              {searchQuery && (
                <Button 
                  size="sm" 
                  variant="ghost" 
                  className="absolute right-2 top-1/2 transform -translate-y-1/2 h-8 w-8 p-0" 
                  onClick={resetSearch}
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
              <Button type="button" onClick={() => setSearchQuery(searchQuery)}>
                <SearchIcon className="h-4 w-4 mr-2" />
                Rechercher
              </Button>
            </div>
            
            {showSearchResults && searchResults.length > 0 ? (
              <div className="space-y-2">
                {searchResults.map((client) => (
                  <Card 
                    key={client.id} 
                    className="cursor-pointer hover:bg-gray-50" 
                    onClick={() => selectClient(client)}
                  >
                    <CardContent className="p-4">
                      <div className="flex justify-between items-center">
                        <div>
                          <div className="font-medium">{client.nom} {client.prenom}</div>
                          <div className="text-sm text-gray-500">Tél: {client.telephone}</div>
                          {client.carteNumero && (
                            <div className="text-sm text-gray-500">
                              <strong>Carte:</strong> <span className="font-mono bg-gray-100 px-1 rounded">{client.carteNumero}</span>
                            </div>
                          )}
                        </div>
                        <div className="text-right flex flex-col items-end gap-1">
                          {client.carteNumero && (
                            <div className="text-xs font-mono bg-blue-50 text-blue-700 px-2 py-1 rounded">
                              {client.carteNumero}
                            </div>
                          )}
                          {(client.typeClient === 'Premium' || client.estEtudiant) && (
                            <div className="flex gap-1">
                              {client.typeClient === 'Premium' && (
                                <div className="inline-block bg-primary/20 text-primary text-xs px-2 py-0.5 rounded-full">
                                  Premium
                                </div>
                              )}
                              {client.estEtudiant && (
                                <div className="inline-block bg-blue-100 text-blue-700 text-xs px-2 py-0.5 rounded-full">
                                  Étudiant
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : searchQuery ? (
              <div className="text-center py-8">
                <p className="text-gray-500">Aucun client trouvé</p>
                <Button className="mt-4" onClick={resetSearch}>
                  Nouvelle recherche
                </Button>
              </div>
            ) : null}
          </TabsContent>
          
          <TabsContent value="scan" className="space-y-4">
            <div className="bg-gray-100 rounded-lg aspect-square flex items-center justify-center">
              {isScanning ? (
                <div className="text-center">
                  <div className="animate-pulse">
                    <ScanQrCode className="h-12 w-12 text-primary mx-auto" />
                  </div>
                  <p className="mt-4">Scan en cours...</p>
                </div>
              ) : (
                <div className="text-center">
                  <ScanQrCode className="h-12 w-12 text-gray-400 mx-auto" />
                  <p className="mt-4">Prêt à scanner</p>
                  <Button className="mt-4" onClick={startScanning}>
                    Démarrer le scan
                  </Button>
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      )}

      {!showGuestForm && (
        <div className="border-t border-gray-200 pt-4">
          <Button 
            variant="outline" 
            className="w-full flex items-center justify-center gap-2"
            onClick={showGuestContactForm}
          >
            <User className="h-4 w-4" />
            Commande sans compte client
          </Button>
        </div>
      )}
    </div>
  );
};

export default Search;
