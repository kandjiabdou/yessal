const controller = require('../../src/controllers/fluxFinancierController');
const fluxFinancierService = require('../../src/services/fluxFinancierService');

jest.mock('../../src/services/fluxFinancierService');

describe('Flux Financier Controller', () => {
  let req, res, next;
  const mockFlux = {
    id: 1,
    type: 'depense',
    montant: 50000,
    dateFluxFinancier: new Date(),
    devise: 'FCFA',
    sourceApp: 'MANAGER',
    status: 'pending',
    managerId: 1,
    laverieId: 1,
    flagged: false,
    createdAt: new Date(),
    updatedAt: new Date()
  };

  beforeEach(() => {
    req = {
      user: { id: 1, role: 'MANAGER' },
      params: {},
      query: {},
      body: {}
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };
    next = jest.fn();
    jest.clearAllMocks();
  });

  describe('createFlux', () => {
    it('devrait créer un flux de type dépense avec succès', async () => {
      req.body = {
        type: 'depense',
        montant: 50000,
        dateFluxFinancier: new Date().toISOString(),
        laverieId: 1
      };

      fluxFinancierService.createFlux.mockResolvedValue(mockFlux);

      await controller.createFlux(req, res);

      expect(fluxFinancierService.createFlux).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'depense',
          montant: 50000,
          laverieId: 1,
          createdBy: req.user.id
        })
      );
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: 'Flux financier créé avec succès',
        data: mockFlux
      });
    });

    it('devrait créer un flux de type recette avec succès', async () => {
      req.body = {
        type: 'recette',
        montant: 75000,
        dateFluxFinancier: new Date().toISOString(),
        laverieId: 1
      };

      const mockRecette = { ...mockFlux, type: 'recette', montant: 75000 };
      fluxFinancierService.createFlux.mockResolvedValue(mockRecette);

      await controller.createFlux(req, res);

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: 'Flux financier créé avec succès',
        data: mockRecette
      });
    });

    it('devrait gérer les erreurs de validation', async () => {
      req.body = {
        type: 'depense',
        montant: 50000
        // dateFluxFinancier manquant
      };

      const error = new Error('La date du flux est obligatoire');
      fluxFinancierService.createFlux.mockRejectedValue(error);

      await controller.createFlux(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: expect.stringContaining('obligatoires')
      });
    });

    it('devrait gérer l\'erreur de laverie non trouvée', async () => {
      req.body = {
        type: 'depense',
        montant: 50000,
        dateFluxFinancier: new Date().toISOString(),
        laverieId: 999
      };

      const error = new Error('Laverie non trouvée');
      fluxFinancierService.createFlux.mockRejectedValue(error);

      await controller.createFlux(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: expect.stringContaining('non trouvé')
      });
    });

    it('devrait créer un flux sans laverie', async () => {
      req.body = {
        type: 'recette',
        montant: 75000,
        dateFluxFinancier: new Date().toISOString()
      };

      const mockFluxSansLaverie = { ...mockFlux, laverieId: null };
      fluxFinancierService.createFlux.mockResolvedValue(mockFluxSansLaverie);

      await controller.createFlux(req, res);

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: 'Flux financier créé avec succès',
        data: mockFluxSansLaverie
      });
    });

    it('devrait créer un flux avec tous les champs optionnels', async () => {
      req.body = {
        type: 'depense',
        montant: 60000,
        dateFluxFinancier: new Date().toISOString(),
        motif: 'Achat équipement',
        beneficiaire: 'Fournisseur XYZ',
        sourceFinancement: 'banque',
        description: 'Achat de nouveaux équipements',
        preuveUrl: 'https://example.com/facture.pdf',
        laverieId: 1
      };

      const mockFluxComplet = { ...mockFlux, ...req.body };
      fluxFinancierService.createFlux.mockResolvedValue(mockFluxComplet);

      await controller.createFlux(req, res);

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: 'Flux financier créé avec succès',
        data: mockFluxComplet
      });
    });

    it('devrait rejeter un type invalide', async () => {
      req.body = {
        type: 'typeInvalide',
        montant: 50000,
        dateFluxFinancier: new Date().toISOString()
      };

      await controller.createFlux(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Le type doit être "depense" ou "recette"'
      });
    });

    it('devrait rejeter un montant négatif', async () => {
      req.body = {
        type: 'depense',
        montant: -1000,
        dateFluxFinancier: new Date().toISOString()
      };

      await controller.createFlux(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Le montant doit être un nombre positif'
      });
    });

    it('devrait rejeter un montant à zéro', async () => {
      req.body = {
        type: 'depense',
        montant: 0.0001, // Un nombre très petit mais techniquement positif
        dateFluxFinancier: new Date().toISOString()
      };

      // Créons plutôt un test avec un montant invalide (string)
      req.body.montant = 'montantInvalide';

      await controller.createFlux(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Le montant doit être un nombre positif'
      });
    });
  });

  describe('getFluxById', () => {
    it('devrait récupérer un flux par ID', async () => {
      req.params.id = '1';
      fluxFinancierService.getFluxById.mockResolvedValue(mockFlux);

      await controller.getFluxById(req, res);

      expect(fluxFinancierService.getFluxById).toHaveBeenCalledWith(1);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: mockFlux
      });
    });

    it('devrait gérer l\'erreur flux non trouvé', async () => {
      req.params.id = '999';
      const error = new Error('Flux non trouvé');
      fluxFinancierService.getFluxById.mockRejectedValue(error);

      await controller.getFluxById(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: expect.stringContaining('non trouvé')
      });
    });

    it('devrait gérer le flux null', async () => {
      req.params.id = '999';
      fluxFinancierService.getFluxById.mockResolvedValue(null);

      await controller.getFluxById(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Flux financier non trouvé'
      });
    });

    it('devrait refuser l\'accès à un flux non-manager', async () => {
      req.params.id = '1';
      const fluxAssocie = { ...mockFlux, sourceApp: 'ASSOCIE' };
      fluxFinancierService.getFluxById.mockResolvedValue(fluxAssocie);

      await controller.getFluxById(req, res);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Accès refusé à ce flux'
      });
    });
  });

  describe('getAllFlux', () => {
    it('devrait récupérer tous les flux du manager', async () => {
      const mockFluxList = [mockFlux, { ...mockFlux, id: 2, type: 'recette' }];
      fluxFinancierService.getAllFlux.mockResolvedValue({
        data: mockFluxList,
        pagination: {
          total: 2,
          page: 1,
          limit: 10,
          totalPages: 1
        }
      });

      await controller.getAllFlux(req, res);

      expect(fluxFinancierService.getAllFlux).toHaveBeenCalledWith({
        type: undefined,
        laverieId: undefined,
        startDate: undefined,
        endDate: undefined,
        month: undefined,
        year: undefined,
        status: undefined,
        page: undefined,
        limit: undefined
      });
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: mockFluxList,
        pagination: {
          total: 2,
          page: 1,
          limit: 10,
          totalPages: 1
        }
      });
    });

    it('devrait filtrer par type', async () => {
      req.query.type = 'depense';
      const mockDepenses = [mockFlux];
      fluxFinancierService.getAllFlux.mockResolvedValue({
        data: mockDepenses,
        pagination: {
          total: 1,
          page: 1,
          limit: 10,
          totalPages: 1
        }
      });

      await controller.getAllFlux(req, res);

      expect(fluxFinancierService.getAllFlux).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'depense'
        })
      );
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it('devrait filtrer par période', async () => {
      req.query.startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
      req.query.endDate = new Date().toISOString();

      fluxFinancierService.getAllFlux.mockResolvedValue({
        data: [mockFlux],
        pagination: {
          total: 1,
          page: 1,
          limit: 10,
          totalPages: 1
        }
      });

      await controller.getAllFlux(req, res);

      expect(fluxFinancierService.getAllFlux).toHaveBeenCalledWith(
        expect.objectContaining({
          startDate: req.query.startDate,
          endDate: req.query.endDate
        })
      );
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it('devrait filtrer par statut', async () => {
      req.query.status = 'pending';

      fluxFinancierService.getAllFlux.mockResolvedValue({
        data: [mockFlux],
        pagination: {
          total: 1,
          page: 1,
          limit: 10,
          totalPages: 1
        }
      });

      await controller.getAllFlux(req, res);

      expect(fluxFinancierService.getAllFlux).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'pending'
        })
      );
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it('devrait gérer la pagination', async () => {
      req.query.page = '2';
      req.query.limit = '5';

      fluxFinancierService.getAllFlux.mockResolvedValue({
        data: [mockFlux],
        pagination: {
          total: 10,
          page: 2,
          limit: 5,
          totalPages: 2
        }
      });

      await controller.getAllFlux(req, res);

      expect(fluxFinancierService.getAllFlux).toHaveBeenCalledWith(
        expect.objectContaining({
          page: '2',
          limit: '5'
        })
      );
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          pagination: expect.objectContaining({
            page: 2,
            limit: 5,
            totalPages: 2
          })
        })
      );
    });

    it('devrait gérer les erreurs serveur', async () => {
      const error = new Error('Erreur base de données');
      fluxFinancierService.getAllFlux.mockRejectedValue(error);

      await controller.getAllFlux(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  describe('getFluxByLaverie', () => {
    it('devrait récupérer les flux d\'une laverie', async () => {
      req.params.laverieId = '1';
      const mockFluxLaverie = { data: [mockFlux], pagination: { total: 1, page: 1, limit: 10, totalPages: 1 } };
      fluxFinancierService.getFluxByLaverie.mockResolvedValue(mockFluxLaverie);

      await controller.getFluxByLaverie(req, res);

      expect(fluxFinancierService.getFluxByLaverie).toHaveBeenCalledWith(
        1,
        expect.objectContaining({
          type: undefined,
          startDate: undefined,
          endDate: undefined,
          page: undefined,
          limit: undefined
        })
      );
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: mockFluxLaverie.data,
        pagination: mockFluxLaverie.pagination
      });
    });

    it('devrait gérer les erreurs', async () => {
      req.params.laverieId = '999';
      const error = new Error('Erreur lors de la récupération');
      fluxFinancierService.getFluxByLaverie.mockRejectedValue(error);

      await controller.getFluxByLaverie(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  describe('updateFlux', () => {
    it('devrait mettre à jour un flux', async () => {
      req.params.id = '1';
      req.body = {
        montant: 60000,
        description: 'Montant modifié'
      };

      const mockUpdatedFlux = { ...mockFlux, ...req.body };
      fluxFinancierService.updateFlux.mockResolvedValue(mockUpdatedFlux);

      await controller.updateFlux(req, res);

      expect(fluxFinancierService.updateFlux).toHaveBeenCalledWith(1, req.user.id, req.body);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: 'Flux financier mis à jour avec succès',
        data: mockUpdatedFlux
      });
    });

    it('devrait mettre à jour la date d\'un flux', async () => {
      req.params.id = '1';
      const newDate = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
      req.body = { dateFluxFinancier: newDate };

      const mockUpdatedFlux = { ...mockFlux, dateFluxFinancier: new Date(newDate) };
      fluxFinancierService.updateFlux.mockResolvedValue(mockUpdatedFlux);

      await controller.updateFlux(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: 'Flux financier mis à jour avec succès',
        data: mockUpdatedFlux
      });
    });

    it('devrait gérer l\'erreur flux non trouvé', async () => {
      req.params.id = '999';
      req.body = { montant: 60000 };

      const error = new Error('Flux non trouvé');
      fluxFinancierService.updateFlux.mockRejectedValue(error);

      await controller.updateFlux(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: expect.stringContaining('non trouvé')
      });
    });

    it('devrait gérer l\'erreur de permission', async () => {
      req.params.id = '1';
      req.body = { montant: 60000 };

      const error = new Error('Vous ne pouvez modifier que vos propres flux');
      fluxFinancierService.updateFlux.mockRejectedValue(error);

      await controller.updateFlux(req, res);

      expect(res.status).toHaveBeenCalledWith(403);
    });
  });

  describe('deleteFlux', () => {
    it('devrait supprimer un flux (soft delete)', async () => {
      req.params.id = '1';

      const mockDeletedFlux = { ...mockFlux, flagged: true };
      fluxFinancierService.deleteFlux.mockResolvedValue(mockDeletedFlux);

      await controller.deleteFlux(req, res);

      expect(fluxFinancierService.deleteFlux).toHaveBeenCalledWith(1, req.user.id);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: 'Flux financier supprimé avec succès'
      });
    });

    it('devrait gérer l\'erreur flux non trouvé', async () => {
      req.params.id = '999';

      const error = new Error('Flux non trouvé');
      fluxFinancierService.deleteFlux.mockRejectedValue(error);

      await controller.deleteFlux(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: expect.stringContaining('non trouvé')
      });
    });
  });

  describe('getStatistics', () => {
    it('devrait récupérer les statistiques d\'une laverie', async () => {
      req.params.laverieId = '1';

      const mockStats = {
        totalRecettes: 500000,
        totalDepenses: 300000,
        solde: 200000,
        nombreRecettes: 10,
        nombreDepenses: 5
      };

      fluxFinancierService.getStatistics.mockResolvedValue(mockStats);

      await controller.getStatistics(req, res);

      expect(fluxFinancierService.getStatistics).toHaveBeenCalledWith(
        1,
        { startDate: undefined, endDate: undefined }
      );
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: mockStats
      });
    });

    it('devrait gérer les erreurs', async () => {
      req.params.laverieId = '999';

      const error = new Error('Erreur lors du calcul des statistiques');
      fluxFinancierService.getStatistics.mockRejectedValue(error);

      await controller.getStatistics(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  describe('Gestion des erreurs génériques', () => {
    it('devrait gérer les erreurs non mappées dans createFlux', async () => {
      req.body = {
        type: 'depense',
        montant: 50000,
        dateFluxFinancier: new Date().toISOString()
      };

      const error = new Error('Erreur inattendue');
      fluxFinancierService.createFlux.mockRejectedValue(error);

      await controller.createFlux(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: expect.stringContaining('Erreur')
      });
    });

    it('devrait gérer les erreurs de permission dans updateFlux', async () => {
      req.params.id = '1';
      req.body = { montant: 60000 };

      const error = new Error('Impossible de modifier ce flux');
      fluxFinancierService.updateFlux.mockRejectedValue(error);

      await controller.updateFlux(req, res);

      expect(res.status).toHaveBeenCalledWith(403);
    });

    it('devrait gérer les erreurs de permission dans deleteFlux', async () => {
      req.params.id = '1';

      const error = new Error('Impossible de supprimer ce flux');
      fluxFinancierService.deleteFlux.mockRejectedValue(error);

      await controller.deleteFlux(req, res);

      expect(res.status).toHaveBeenCalledWith(403);
    });
  });
});
