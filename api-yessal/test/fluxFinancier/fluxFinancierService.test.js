jest.mock('../../src/utils/prismaSharedClient');
jest.mock('../../src/utils/prismaClient');

const fluxFinancierService = require('../../src/services/fluxFinancierService');
const prismaShared = require('../../src/utils/prismaSharedClient');
const prisma = require('../../src/utils/prismaClient');

describe('FluxFinancierService', () => {
  const mockUser = {
    id: 1,
    nom: 'Test',
    prenom: 'User',
    role: 'MANAGER'
  };

  const mockLaverie = {
    id: 1,
    nom: 'Laverie Test'
  };

  const mockFlux = {
    id: 1,
    type: 'depense',
    montant: 50000,
    dateFluxFinancier: new Date('2025-11-01'),
    devise: 'FCFA',
    motif: 'Achat équipement',
    beneficiaire: 'Fournisseur XYZ',
    sourceFinancement: 'caisse',
    description: 'Test',
    laverieId: 1,
    laverieName: 'Laverie Test',
    createdBy: '1',
    sourceApp: 'MANAGER',
    status: 'pending',
    flagged: false,
    createdAt: new Date(),
    updatedAt: new Date(),
    preuves: []
  };

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Réinitialiser les mocks avec les méthodes
    prisma.sitelavage = {
      findUnique: jest.fn(),
      findMany: jest.fn()
    };
    prisma.user = {
      findUnique: jest.fn(),
      findMany: jest.fn()
    };
    prismaShared.fluxFinancier = {
      create: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      count: jest.fn(),
      aggregate: jest.fn()
    };
    prismaShared.fluxFinancierPreuve = {
      create: jest.fn(),
      findUnique: jest.fn(),
      delete: jest.fn()
    };
  });

  describe('createFlux', () => {
    const validFluxData = {
      type: 'depense',
      montant: 50000,
      dateFluxFinancier: '2025-11-01',
      motif: 'Achat équipement',
      beneficiaire: 'Fournisseur XYZ',
      sourceFinancement: 'caisse',
      description: 'Test',
      preuveUrl: null,
      laverieId: 1,
      createdBy: 1
    };

    it('devrait créer un flux avec une laverie', async () => {
      prisma.sitelavage.findUnique.mockResolvedValue(mockLaverie);
      prisma.user.findUnique.mockResolvedValue(mockUser);
      prismaShared.fluxFinancier.create.mockResolvedValue(mockFlux);

      const result = await fluxFinancierService.createFlux(validFluxData);

      expect(result).toEqual(mockFlux);
      expect(prisma.sitelavage.findUnique).toHaveBeenCalledWith({
        where: { id: 1 }
      });
      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: { id: 1 }
      });
      expect(prismaShared.fluxFinancier.create).toHaveBeenCalled();
    });

    it('devrait créer un flux sans laverie', async () => {
      const fluxDataSansLaverie = { ...validFluxData, laverieId: null };
      prisma.user.findUnique.mockResolvedValue(mockUser);
      prismaShared.fluxFinancier.create.mockResolvedValue({ ...mockFlux, laverieId: null });

      const result = await fluxFinancierService.createFlux(fluxDataSansLaverie);

      expect(result).toBeDefined();
      expect(prisma.sitelavage.findUnique).not.toHaveBeenCalled();
      expect(prisma.user.findUnique).toHaveBeenCalled();
    });

    it('devrait rejeter un type invalide', async () => {
      const invalidData = { ...validFluxData, type: 'invalide' };

      await expect(fluxFinancierService.createFlux(invalidData))
        .rejects
        .toThrow('Le type de flux doit être "depense" ou "recette"');
    });

    it('devrait rejeter si la laverie n\'existe pas', async () => {
      prisma.sitelavage.findUnique.mockResolvedValue(null);
      prisma.user.findUnique.mockResolvedValue(mockUser);

      await expect(fluxFinancierService.createFlux(validFluxData))
        .rejects
        .toThrow('Laverie non trouvée');
    });

    it('devrait rejeter si l\'utilisateur n\'existe pas', async () => {
      prisma.sitelavage.findUnique.mockResolvedValue(mockLaverie);
      prisma.user.findUnique.mockResolvedValue(null);

      await expect(fluxFinancierService.createFlux(validFluxData))
        .rejects
        .toThrow('Utilisateur non trouvé');
    });

    it('devrait créer une recette', async () => {
      const recetteData = { ...validFluxData, type: 'recette' };
      prisma.sitelavage.findUnique.mockResolvedValue(mockLaverie);
      prisma.user.findUnique.mockResolvedValue(mockUser);
      prismaShared.fluxFinancier.create.mockResolvedValue({ ...mockFlux, type: 'recette' });

      const result = await fluxFinancierService.createFlux(recetteData);

      expect(result.type).toBe('recette');
    });
  });

  describe('getFluxById', () => {
    it('devrait retourner un flux par ID', async () => {
      prismaShared.fluxFinancier.findUnique.mockResolvedValue(mockFlux);

      const result = await fluxFinancierService.getFluxById(1);

      expect(result).toEqual(mockFlux);
      expect(prismaShared.fluxFinancier.findUnique).toHaveBeenCalledWith({
        where: { id: 1 },
        include: { preuves: true }
      });
    });

    it('devrait retourner null si le flux n\'existe pas', async () => {
      prismaShared.fluxFinancier.findUnique.mockResolvedValue(null);

      const result = await fluxFinancierService.getFluxById(999);

      expect(result).toBeNull();
    });
  });

  describe('getAllFlux', () => {
    const mockFluxList = [mockFlux, { ...mockFlux, id: 2, type: 'recette' }];

    it('devrait retourner tous les flux sans filtres', async () => {
      prismaShared.fluxFinancier.findMany.mockResolvedValue(mockFluxList);
      prismaShared.fluxFinancier.count.mockResolvedValue(2);

      const result = await fluxFinancierService.getAllFlux();

      expect(result.data).toEqual(mockFluxList);
      expect(result.pagination.total).toBe(2);
    });

    it('devrait retourner tous les flux avec pagination', async () => {
      prismaShared.fluxFinancier.findMany.mockResolvedValue(mockFluxList);
      prismaShared.fluxFinancier.count.mockResolvedValue(2);

      const result = await fluxFinancierService.getAllFlux({
        page: 1,
        limit: 10
      });

      expect(result.data).toEqual(mockFluxList);
      expect(result.pagination).toEqual({
        total: 2,
        page: 1,
        limit: 10,
        totalPages: 1
      });
    });

    it('devrait filtrer par type', async () => {
      const depenses = [mockFlux];
      prismaShared.fluxFinancier.findMany.mockResolvedValue(depenses);
      prismaShared.fluxFinancier.count.mockResolvedValue(1);

      const result = await fluxFinancierService.getAllFlux({
        type: 'depense'
      });

      expect(result.data).toEqual(depenses);
      expect(prismaShared.fluxFinancier.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            type: 'depense'
          })
        })
      );
    });

    it('devrait filtrer par laverie', async () => {
      prismaShared.fluxFinancier.findMany.mockResolvedValue([mockFlux]);
      prismaShared.fluxFinancier.count.mockResolvedValue(1);

      await fluxFinancierService.getAllFlux({
        laverieId: 1
      });

      expect(prismaShared.fluxFinancier.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            laverieId: 1
          })
        })
      );
    });

    it('devrait filtrer par période', async () => {
      prismaShared.fluxFinancier.findMany.mockResolvedValue([mockFlux]);
      prismaShared.fluxFinancier.count.mockResolvedValue(1);

      const startDate = '2025-11-01';
      const endDate = '2025-11-30';

      await fluxFinancierService.getAllFlux({
        startDate,
        endDate
      });

      expect(prismaShared.fluxFinancier.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            dateFluxFinancier: expect.objectContaining({
              gte: expect.any(Date),
              lte: expect.any(Date)
            })
          })
        })
      );
    });

    it('devrait filtrer par statut de validation', async () => {
      prismaShared.fluxFinancier.findMany.mockResolvedValue([mockFlux]);
      prismaShared.fluxFinancier.count.mockResolvedValue(1);

      await fluxFinancierService.getAllFlux({
        status: 'pending'
      });

      expect(prismaShared.fluxFinancier.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: 'pending'
          })
        })
      );
    });

    it('devrait filtrer avec seulement startDate', async () => {
      prismaShared.fluxFinancier.findMany.mockResolvedValue([mockFlux]);
      prismaShared.fluxFinancier.count.mockResolvedValue(1);

      await fluxFinancierService.getAllFlux({
        startDate: '2025-11-01'
      });

      expect(prismaShared.fluxFinancier.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            dateFluxFinancier: expect.objectContaining({
              gte: expect.any(Date)
            })
          })
        })
      );
    });

    it('devrait filtrer avec seulement endDate', async () => {
      prismaShared.fluxFinancier.findMany.mockResolvedValue([mockFlux]);
      prismaShared.fluxFinancier.count.mockResolvedValue(1);

      await fluxFinancierService.getAllFlux({
        endDate: '2025-11-30'
      });

      expect(prismaShared.fluxFinancier.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            dateFluxFinancier: expect.objectContaining({
              lte: expect.any(Date)
            })
          })
        })
      );
    });

    it('devrait gérer la pagination (page 2)', async () => {
      prismaShared.fluxFinancier.findMany.mockResolvedValue([mockFlux]);
      prismaShared.fluxFinancier.count.mockResolvedValue(15);

      const result = await fluxFinancierService.getAllFlux({
        page: 2,
        limit: 5
      });

      expect(result.pagination.page).toBe(2);
      expect(result.pagination.totalPages).toBe(3);
      expect(prismaShared.fluxFinancier.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 5,
          take: 5
        })
      );
    });

    it('ne devrait pas filtrer par type si invalide', async () => {
      prismaShared.fluxFinancier.findMany.mockResolvedValue([mockFlux]);
      prismaShared.fluxFinancier.count.mockResolvedValue(1);

      await fluxFinancierService.getAllFlux({
        type: 'invalide'
      });

      expect(prismaShared.fluxFinancier.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.not.objectContaining({
            type: 'invalide'
          })
        })
      );
    });
  });

  describe('getFluxByLaverie', () => {
    it('devrait retourner les flux d\'une laverie', async () => {
      const mockFluxLaverie = [mockFlux];
      prismaShared.fluxFinancier.findMany.mockResolvedValue(mockFluxLaverie);
      prismaShared.fluxFinancier.count.mockResolvedValue(1);

      const result = await fluxFinancierService.getFluxByLaverie(1);

      expect(result.data).toEqual(mockFluxLaverie);
      expect(result.pagination).toBeDefined();
      expect(prismaShared.fluxFinancier.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            laverieId: 1,
            sourceApp: 'MANAGER'
          })
        })
      );
    });

    it('devrait filtrer par type pour une laverie', async () => {
      prismaShared.fluxFinancier.findMany.mockResolvedValue([mockFlux]);
      prismaShared.fluxFinancier.count.mockResolvedValue(1);

      await fluxFinancierService.getFluxByLaverie(1, { type: 'depense' });

      expect(prismaShared.fluxFinancier.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            type: 'depense',
            laverieId: 1
          })
        })
      );
    });

    it('devrait filtrer par période pour une laverie', async () => {
      prismaShared.fluxFinancier.findMany.mockResolvedValue([mockFlux]);
      prismaShared.fluxFinancier.count.mockResolvedValue(1);

      await fluxFinancierService.getFluxByLaverie(1, {
        startDate: '2025-11-01',
        endDate: '2025-11-30'
      });

      expect(prismaShared.fluxFinancier.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            dateFluxFinancier: expect.any(Object)
          })
        })
      );
    });

    it('devrait filtrer avec seulement startDate pour une laverie', async () => {
      prismaShared.fluxFinancier.findMany.mockResolvedValue([mockFlux]);
      prismaShared.fluxFinancier.count.mockResolvedValue(1);

      await fluxFinancierService.getFluxByLaverie(1, {
        startDate: '2025-11-01'
      });

      expect(prismaShared.fluxFinancier.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            dateFluxFinancier: expect.objectContaining({
              gte: expect.any(Date)
            })
          })
        })
      );
    });

    it('devrait filtrer avec seulement endDate pour une laverie', async () => {
      prismaShared.fluxFinancier.findMany.mockResolvedValue([mockFlux]);
      prismaShared.fluxFinancier.count.mockResolvedValue(1);

      await fluxFinancierService.getFluxByLaverie(1, {
        endDate: '2025-11-30'
      });

      expect(prismaShared.fluxFinancier.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            dateFluxFinancier: expect.objectContaining({
              lte: expect.any(Date)
            })
          })
        })
      );
    });

    it('devrait paginer les résultats', async () => {
      prismaShared.fluxFinancier.findMany.mockResolvedValue([mockFlux]);
      prismaShared.fluxFinancier.count.mockResolvedValue(10);

      const result = await fluxFinancierService.getFluxByLaverie(1, {
        page: 2,
        limit: 5
      });

      expect(result.pagination.page).toBe(2);
      expect(result.pagination.totalPages).toBe(2);
    });
  });

  describe('updateFlux', () => {
    const updateData = {
      montant: 60000,
      description: 'Montant modifié'
    };

    it('devrait mettre à jour un flux', async () => {
      prismaShared.fluxFinancier.findUnique.mockResolvedValue(mockFlux);
      prismaShared.fluxFinancier.update.mockResolvedValue({ ...mockFlux, ...updateData });

      const result = await fluxFinancierService.updateFlux(1, 1, updateData);

      expect(result.montant).toBe(60000);
      expect(prismaShared.fluxFinancier.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: updateData,
        include: { preuves: true }
      });
    });

    it('devrait convertir la date si fournie', async () => {
      const dataWithDate = { dateFluxFinancier: '2025-11-15' };
      prismaShared.fluxFinancier.findUnique.mockResolvedValue(mockFlux);
      prismaShared.fluxFinancier.update.mockResolvedValue(mockFlux);

      await fluxFinancierService.updateFlux(1, 1, dataWithDate);

      expect(prismaShared.fluxFinancier.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { dateFluxFinancier: expect.any(Date) },
        include: { preuves: true }
      });
    });

    it('devrait rejeter si le flux n\'existe pas', async () => {
      prismaShared.fluxFinancier.findUnique.mockResolvedValue(null);

      await expect(fluxFinancierService.updateFlux(999, 1, updateData))
        .rejects
        .toThrow('Flux financier non trouvé');
    });

    it('devrait rejeter si sourceApp n\'est pas manager', async () => {
      const fluxAssocie = { ...mockFlux, sourceApp: 'ASSOCIE' };
      prismaShared.fluxFinancier.findUnique.mockResolvedValue(fluxAssocie);
      prisma.user.findUnique.mockResolvedValue(mockUser);

      await expect(fluxFinancierService.updateFlux(1, 1, updateData))
        .rejects
        .toThrow('Impossible de modifier ce flux');
    });

    it('devrait rejeter si l\'utilisateur n\'est pas le créateur', async () => {
      prismaShared.fluxFinancier.findUnique.mockResolvedValue(mockFlux);
      prisma.user.findUnique.mockResolvedValue(mockUser);

      await expect(fluxFinancierService.updateFlux(1, 999, updateData))
        .rejects
        .toThrow('Seul le créateur peut modifier ce flux');
    });

    it('devrait rejeter si le flux n\'est pas en attente', async () => {
      const fluxValide = { ...mockFlux, status: 'validated' };
      prismaShared.fluxFinancier.findUnique.mockResolvedValue(fluxValide);
      prisma.user.findUnique.mockResolvedValue(mockUser);

      await expect(fluxFinancierService.updateFlux(1, 1, updateData))
        .rejects
        .toThrow('Impossible de modifier un flux déjà validé ou rejeté');
    });

    it('devrait filtrer les champs non autorisés', async () => {
      const dataWithInvalidFields = {
        montant: 60000,
        type: 'recette', // Non autorisé
        sourceApp: 'hacker', // Non autorisé
        status: 'validated' // Non autorisé
      };

      prismaShared.fluxFinancier.findUnique.mockResolvedValue(mockFlux);
      prismaShared.fluxFinancier.update.mockResolvedValue(mockFlux);

      await fluxFinancierService.updateFlux(1, 1, dataWithInvalidFields);

      expect(prismaShared.fluxFinancier.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { montant: 60000 }, // Seul le montant doit être mis à jour
        include: { preuves: true }
      });
    });
  });

  describe('deleteFlux', () => {
    it('devrait supprimer un flux (soft delete)', async () => {
      prismaShared.fluxFinancier.findUnique.mockResolvedValue(mockFlux);
      prismaShared.fluxFinancier.update.mockResolvedValue({ ...mockFlux, flagged: true });

      const result = await fluxFinancierService.deleteFlux(1, 1);

      expect(result.flagged).toBe(true);
      expect(prismaShared.fluxFinancier.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { flagged: true }
      });
    });

    it('devrait rejeter si le flux n\'existe pas', async () => {
      prismaShared.fluxFinancier.findUnique.mockResolvedValue(null);

      await expect(fluxFinancierService.deleteFlux(999, 1))
        .rejects
        .toThrow('Flux financier non trouvé');
    });

    it('devrait rejeter si sourceApp n\'est pas manager', async () => {
      const fluxAssocie = { ...mockFlux, sourceApp: 'ASSOCIE' };
      prismaShared.fluxFinancier.findUnique.mockResolvedValue(fluxAssocie);
      prisma.user.findUnique.mockResolvedValue(mockUser);

      await expect(fluxFinancierService.deleteFlux(1, 1))
        .rejects
        .toThrow('Impossible de supprimer ce flux');
    });

    it('devrait rejeter si l\'utilisateur n\'est pas le créateur', async () => {
      prismaShared.fluxFinancier.findUnique.mockResolvedValue(mockFlux);
      prisma.user.findUnique.mockResolvedValue(mockUser);

      await expect(fluxFinancierService.deleteFlux(1, 999))
        .rejects
        .toThrow('Seul le créateur peut supprimer ce flux');
    });

    it('devrait rejeter si le flux n\'est pas en attente', async () => {
      const fluxValide = { ...mockFlux, status: 'validated' };
      prismaShared.fluxFinancier.findUnique.mockResolvedValue(fluxValide);
      prisma.user.findUnique.mockResolvedValue(mockUser);

      await expect(fluxFinancierService.deleteFlux(1, 1))
        .rejects
        .toThrow('Impossible de supprimer un flux déjà validé ou rejeté');
    });
  });

  describe('getStatistics', () => {
    it('devrait calculer les statistiques d\'une laverie', async () => {
      const mockAggregateDepenses = { _sum: { montant: 150000 } };
      const mockAggregateRecettes = { _sum: { montant: 250000 } };

      prismaShared.fluxFinancier.aggregate
        .mockResolvedValueOnce(mockAggregateDepenses) // Dépenses
        .mockResolvedValueOnce(mockAggregateRecettes); // Recettes

      prismaShared.fluxFinancier.count
        .mockResolvedValueOnce(5) // Nombre de dépenses
        .mockResolvedValueOnce(10); // Nombre de recettes

      const result = await fluxFinancierService.getStatistics(1);

      expect(result).toEqual({
        depenses: {
          total: 150000,
          count: 5
        },
        recettes: {
          total: 250000,
          count: 10
        },
        solde: 100000,
        devise: 'FCFA'
      });
    });

    it('devrait gérer le cas où il n\'y a aucune dépense', async () => {
      prismaShared.fluxFinancier.aggregate
        .mockResolvedValueOnce({ _sum: { montant: null } }) // Pas de dépenses
        .mockResolvedValueOnce({ _sum: { montant: 100000 } });

      prismaShared.fluxFinancier.count
        .mockResolvedValueOnce(0)
        .mockResolvedValueOnce(5);

      const result = await fluxFinancierService.getStatistics(1);

      expect(result.depenses.total).toBe(0);
      expect(result.solde).toBe(100000);
    });

    it('devrait gérer le cas où il n\'y a aucune recette', async () => {
      prismaShared.fluxFinancier.aggregate
        .mockResolvedValueOnce({ _sum: { montant: 80000 } })
        .mockResolvedValueOnce({ _sum: { montant: null } }); // Pas de recettes

      prismaShared.fluxFinancier.count
        .mockResolvedValueOnce(3)
        .mockResolvedValueOnce(0);

      const result = await fluxFinancierService.getStatistics(1);

      expect(result.recettes.total).toBe(0);
      expect(result.solde).toBe(-80000); // Solde négatif
    });

    it('devrait filtrer par période', async () => {
      prismaShared.fluxFinancier.aggregate
        .mockResolvedValueOnce({ _sum: { montant: 50000 } })
        .mockResolvedValueOnce({ _sum: { montant: 75000 } });

      prismaShared.fluxFinancier.count
        .mockResolvedValueOnce(2)
        .mockResolvedValueOnce(3);

      await fluxFinancierService.getStatistics(1, {
        startDate: '2025-11-01',
        endDate: '2025-11-30'
      });

      expect(prismaShared.fluxFinancier.aggregate).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            dateFluxFinancier: expect.any(Object)
          })
        })
      );
    });

    it('devrait filtrer avec seulement startDate', async () => {
      prismaShared.fluxFinancier.aggregate
        .mockResolvedValueOnce({ _sum: { montant: 30000 } })
        .mockResolvedValueOnce({ _sum: { montant: 50000 } });

      prismaShared.fluxFinancier.count
        .mockResolvedValueOnce(1)
        .mockResolvedValueOnce(2);

      await fluxFinancierService.getStatistics(1, {
        startDate: '2025-11-01'
      });

      expect(prismaShared.fluxFinancier.aggregate).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            dateFluxFinancier: expect.objectContaining({
              gte: expect.any(Date)
            })
          })
        })
      );
    });

    it('devrait filtrer avec seulement endDate', async () => {
      prismaShared.fluxFinancier.aggregate
        .mockResolvedValueOnce({ _sum: { montant: 40000 } })
        .mockResolvedValueOnce({ _sum: { montant: 60000 } });

      prismaShared.fluxFinancier.count
        .mockResolvedValueOnce(2)
        .mockResolvedValueOnce(3);

      await fluxFinancierService.getStatistics(1, {
        endDate: '2025-11-30'
      });

      expect(prismaShared.fluxFinancier.aggregate).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            dateFluxFinancier: expect.objectContaining({
              lte: expect.any(Date)
            })
          })
        })
      );
    });

    it('devrait exclure les flux flaggés', async () => {
      prismaShared.fluxFinancier.aggregate
        .mockResolvedValueOnce({ _sum: { montant: 30000 } })
        .mockResolvedValueOnce({ _sum: { montant: 50000 } });

      prismaShared.fluxFinancier.count
        .mockResolvedValueOnce(1)
        .mockResolvedValueOnce(2);

      await fluxFinancierService.getStatistics(1);

      expect(prismaShared.fluxFinancier.aggregate).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            flagged: false
          })
        })
      );
    });
  });

  describe('addPreuve', () => {
    const mockPreuveData = {
      fileId: 'uuid-123',
      filename: 'facture.pdf',
      downloadUrl: 'http://localhost:4600/api/files/download/uuid-123?token=xxx',
      mimetype: 'application/pdf',
      size: 245678
    };

    const mockFluxWithSourceApp = {
      ...mockFlux,
      sourceApp: 'MANAGER',
      status: 'pending'
    };

    it('devrait ajouter une preuve à un flux', async () => {
      const mockPreuve = {
        id: 1,
        fluxFinancierId: 1,
        ...mockPreuveData,
        uploadedAt: new Date()
      };

      prismaShared.fluxFinancier.findUnique.mockResolvedValue(mockFluxWithSourceApp);
      prismaShared.fluxFinancierPreuve.create.mockResolvedValue(mockPreuve);

      const result = await fluxFinancierService.addPreuve(1, 1, mockPreuveData);

      expect(result).toEqual(mockPreuve);
      expect(prismaShared.fluxFinancierPreuve.create).toHaveBeenCalledWith({
        data: {
          fluxFinancierId: 1,
          ...mockPreuveData
        }
      });
    });

    it('devrait rejeter si le flux n\'existe pas', async () => {
      prismaShared.fluxFinancier.findUnique.mockResolvedValue(null);

      await expect(
        fluxFinancierService.addPreuve(999, 1, mockPreuveData)
      ).rejects.toThrow('Flux financier non trouvé');
    });

    it('devrait rejeter si sourceApp n\'est pas manager', async () => {
      const fluxAssocie = { ...mockFlux, sourceApp: 'ASSOCIE' };
      prismaShared.fluxFinancier.findUnique.mockResolvedValue(fluxAssocie);
      prisma.user.findUnique.mockResolvedValue(mockUser);

      await expect(
        fluxFinancierService.addPreuve(1, 1, mockPreuveData)
      ).rejects.toThrow('Impossible d\'ajouter une preuve à ce flux');
    });

    it('devrait rejeter si l\'utilisateur n\'est pas le créateur', async () => {
      prismaShared.fluxFinancier.findUnique.mockResolvedValue(mockFluxWithSourceApp);
      prisma.user.findUnique.mockResolvedValue(mockUser);

      await expect(
        fluxFinancierService.addPreuve(1, 999, mockPreuveData)
      ).rejects.toThrow('Seul le créateur peut ajouter une preuve');
    });

    it('devrait rejeter si le flux n\'est pas en pending', async () => {
      const fluxValidated = { ...mockFluxWithSourceApp, status: 'validated' };
      prismaShared.fluxFinancier.findUnique.mockResolvedValue(fluxValidated);
      prisma.user.findUnique.mockResolvedValue(mockUser);

      await expect(
        fluxFinancierService.addPreuve(1, 1, mockPreuveData)
      ).rejects.toThrow('Impossible d\'ajouter une preuve à un flux déjà validé ou rejeté');
    });
  });

  describe('deletePreuve', () => {
    const mockPreuve = {
      id: 1,
      fluxFinancierId: 1,
      fileId: 'uuid-123',
      filename: 'facture.pdf',
      downloadUrl: 'http://localhost:4600/api/files/download/uuid-123',
      mimetype: 'application/pdf',
      size: 245678,
      uploadedAt: new Date()
    };

    const mockFluxWithSourceApp = {
      ...mockFlux,
      sourceApp: 'MANAGER',
      status: 'pending'
    };

    it('devrait supprimer une preuve', async () => {
      const preuveWithFlux = {
        ...mockPreuve,
        fluxFinancier: mockFluxWithSourceApp
      };
      prismaShared.fluxFinancierPreuve.findUnique.mockResolvedValue(preuveWithFlux);
      prismaShared.fluxFinancierPreuve.delete.mockResolvedValue(mockPreuve);

      const result = await fluxFinancierService.deletePreuve(1, 1);

      expect(result).toBe(true);
      expect(prismaShared.fluxFinancierPreuve.delete).toHaveBeenCalledWith({
        where: { id: 1 }
      });
    });

    it('devrait rejeter si la preuve n\'existe pas', async () => {
      prismaShared.fluxFinancierPreuve.findUnique.mockResolvedValue(null);

      await expect(
        fluxFinancierService.deletePreuve(999, 1)
      ).rejects.toThrow('Preuve non trouvée');
    });

    it('devrait rejeter si le flux n\'existe pas', async () => {
      const preuveWithoutFlux = {
        ...mockPreuve,
        fluxFinancier: null
      };
      prismaShared.fluxFinancierPreuve.findUnique.mockResolvedValue(preuveWithoutFlux);

      await expect(
        fluxFinancierService.deletePreuve(1, 1)
      ).rejects.toThrow();
    });

    it('devrait rejeter si sourceApp n\'est pas manager', async () => {
      const fluxAssocie = { ...mockFlux, sourceApp: 'ASSOCIE' };
      const preuveWithFlux = {
        ...mockPreuve,
        fluxFinancier: fluxAssocie
      };
      prismaShared.fluxFinancierPreuve.findUnique.mockResolvedValue(preuveWithFlux);
      prisma.user.findUnique.mockResolvedValue(mockUser);

      await expect(
        fluxFinancierService.deletePreuve(1, 1)
      ).rejects.toThrow('Impossible de supprimer cette preuve');
    });

    it('devrait rejeter si l\'utilisateur n\'est pas le créateur', async () => {
      const preuveWithFlux = {
        ...mockPreuve,
        fluxFinancier: mockFluxWithSourceApp
      };
      prismaShared.fluxFinancierPreuve.findUnique.mockResolvedValue(preuveWithFlux);
      prisma.user.findUnique.mockResolvedValue(mockUser);

      await expect(
        fluxFinancierService.deletePreuve(1, 999)
      ).rejects.toThrow('Seul le créateur peut supprimer cette preuve');
    });

    it('devrait rejeter si le flux n\'est pas en pending', async () => {
      const fluxValidated = { ...mockFluxWithSourceApp, status: 'validated' };
      const preuveWithFlux = {
        ...mockPreuve,
        fluxFinancier: fluxValidated
      };
      prismaShared.fluxFinancierPreuve.findUnique.mockResolvedValue(preuveWithFlux);
      prisma.user.findUnique.mockResolvedValue(mockUser);

      await expect(
        fluxFinancierService.deletePreuve(1, 1)
      ).rejects.toThrow('Impossible de supprimer une preuve d\'un flux déjà validé ou rejeté');
    });
  });
});
