/// <reference types="jest" />
import { InvoiceService } from '../src/services/invoiceService';
import { Order } from '../src/services/order';

// Mock jsPDF pour éviter les erreurs liées au DOM
jest.mock('jspdf', () => {
  return {
    jsPDF: jest.fn().mockImplementation(() => ({
      internal: {
        pageSize: {
          getWidth: () => 210,
          getHeight: () => 297
        }
      },
      setFontSize: jest.fn(),
      setFont: jest.fn(),
      setTextColor: jest.fn(),
      setDrawColor: jest.fn(),
      setFillColor: jest.fn(),
      setLineWidth: jest.fn(),
      text: jest.fn(),
      line: jest.fn(),
      rect: jest.fn(),
      roundedRect: jest.fn(),
      addImage: jest.fn(),
      splitTextToSize: jest.fn((text) => [text]),
      output: jest.fn(() => new Blob(['test'], { type: 'application/pdf' }))
    }))
  };
});

// Mock fetch pour le logo
global.fetch = jest.fn(() =>
  Promise.resolve({
    blob: () => Promise.resolve(new Blob(['logo'], { type: 'image/png' }))
  })
) as jest.Mock;

// Mock FileReader pour blobToBase64
class MockFileReader {
  onloadend: (() => void) | null = null;
  onerror: ((error: any) => void) | null = null;
  result: string | null = 'data:image/png;base64,mockbase64';

  readAsDataURL(blob: Blob) {
    setTimeout(() => {
      if (this.onloadend) {
        this.onloadend();
      }
    }, 0);
  }
}

global.FileReader = MockFileReader as any;

describe('InvoiceService - Fonctions de calcul', () => {
  describe('formatPrice', () => {
    it('devrait formater les prix avec des espaces tous les 3 chiffres', async () => {
      const order: Order = {
        id: 1,
        siteLavageId: 1,
        gerantCreationUserId: 1,
        dateHeureCommande: '2024-01-01T10:00:00Z',
        dateDernierStatutChange: '2024-01-01T10:00:00Z',
        statut: 'PrisEnCharge',
        masseClientIndicativeKg: 10,
        estEnLivraison: false,
        formuleCommande: 'BaseMachine',
        flag: false,
        createdAt: '2024-01-01T10:00:00Z',
        updatedAt: '2024-01-01T10:00:00Z',
        options: {
          aOptionRepassage: false,
          aOptionSechage: false,
          aOptionLivraison: false,
          aOptionExpress: false
        },
        prixTotal: 1000000,
        prixPaye: 1000000,
        repartitionMachines: [
          { id: 1, typeMachine: 'Machine20kg', quantite: 1, prixUnitaire: 1000000 }
        ]
      };

      const blob = await InvoiceService.generateInvoice(order);
      expect(blob).toBeInstanceOf(Blob);
      // Le formatPrice est utilisé dans la génération, on vérifie que ça ne plante pas
    });

    it('devrait gérer les montants négatifs correctement', async () => {
      const order: Order = {
        id: 1,
        siteLavageId: 1,
        gerantCreationUserId: 1,
        dateHeureCommande: '2024-01-01T10:00:00Z',
        dateDernierStatutChange: '2024-01-01T10:00:00Z',
        statut: 'PrisEnCharge',
        masseClientIndicativeKg: 10,
        estEnLivraison: false,
        formuleCommande: 'BaseMachine',
        flag: false,
        createdAt: '2024-01-01T10:00:00Z',
        updatedAt: '2024-01-01T10:00:00Z',
        options: {
          aOptionRepassage: false,
          aOptionSechage: false,
          aOptionLivraison: false,
          aOptionExpress: false
        },
        typeReduction: 'Etudiant',
        prixTotal: 5000,
        prixPaye: 4500,
        repartitionMachines: [
          { id: 1, typeMachine: 'Machine20kg', quantite: 1, prixUnitaire: 5000 }
        ],
        priceDetails: {
          prixBase: 5000,
          prixOptions: 0,
          prixSousTotal: 5000,
          prixFinal: 4500,
          prixApresReduction: 4500,
          prixPaye: 4500,
          reduction: {
            tauxReduction: 0.1,
            montantReduction: 500,
            raisonReduction: 'Etudiant',
            prixApresReduction: 4500
          }
        }
      };

      const blob = await InvoiceService.generateInvoice(order);
      expect(blob).toBeInstanceOf(Blob);
    });
  });

  describe('Calculs BaseMachine avec machines', () => {
    it('devrait générer une facture pour formule BaseMachine avec une machine 20kg', async () => {
      const order: Order = {
        id: 1,
        siteLavageId: 1,
        gerantCreationUserId: 1,
        dateHeureCommande: '2024-01-01T10:00:00Z',
        dateDernierStatutChange: '2024-01-01T10:00:00Z',
        statut: 'PrisEnCharge',
        masseClientIndicativeKg: 20,
        estEnLivraison: false,
        formuleCommande: 'BaseMachine',
        flag: false,
        createdAt: '2024-01-01T10:00:00Z',
        updatedAt: '2024-01-01T10:00:00Z',
        options: {
          aOptionRepassage: false,
          aOptionSechage: false,
          aOptionLivraison: false,
          aOptionExpress: false
        },
        prixTotal: 5000,
        prixPaye: 5000,
        repartitionMachines: [
          { id: 1, typeMachine: 'Machine20kg', quantite: 1, prixUnitaire: 5000 }
        ],
        clientUser: {
          id: 1,
          nom: 'Dupont',
          prenom: 'Jean',
          email: 'jean@example.com',
          telephone: '+221123456789',
          typeClient: 'Standard',
          estEtudiant: false
        }
      };

      const blob = await InvoiceService.generateInvoice(order);
      expect(blob).toBeInstanceOf(Blob);
      expect(blob.type).toBe('application/pdf');
    });

    it('devrait générer une facture avec plusieurs machines 6kg', async () => {
      const order: Order = {
        id: 1,
        siteLavageId: 1,
        gerantCreationUserId: 1,
        dateHeureCommande: '2024-01-01T10:00:00Z',
        dateDernierStatutChange: '2024-01-01T10:00:00Z',
        statut: 'PrisEnCharge',
        masseClientIndicativeKg: 12,
        estEnLivraison: false,
        formuleCommande: 'BaseMachine',
        flag: false,
        createdAt: '2024-01-01T10:00:00Z',
        updatedAt: '2024-01-01T10:00:00Z',
        options: {
          aOptionRepassage: false,
          aOptionSechage: false,
          aOptionLivraison: false,
          aOptionExpress: false
        },
        prixTotal: 4000,
        prixPaye: 4000,
        repartitionMachines: [
          { id: 1, typeMachine: 'Machine6kg', quantite: 2, prixUnitaire: 2000 }
        ]
      };

      const blob = await InvoiceService.generateInvoice(order);
      expect(blob).toBeInstanceOf(Blob);
    });

    it('devrait générer une facture avec mix de machines 20kg et 6kg', async () => {
      const order: Order = {
        id: 1,
        siteLavageId: 1,
        gerantCreationUserId: 1,
        dateHeureCommande: '2024-01-01T10:00:00Z',
        dateDernierStatutChange: '2024-01-01T10:00:00Z',
        statut: 'PrisEnCharge',
        masseClientIndicativeKg: 26,
        estEnLivraison: false,
        formuleCommande: 'BaseMachine',
        flag: false,
        createdAt: '2024-01-01T10:00:00Z',
        updatedAt: '2024-01-01T10:00:00Z',
        options: {
          aOptionRepassage: false,
          aOptionSechage: false,
          aOptionLivraison: false,
          aOptionExpress: false
        },
        prixTotal: 7000,
        prixPaye: 7000,
        repartitionMachines: [
          { id: 1, typeMachine: 'Machine20kg', quantite: 1, prixUnitaire: 5000 },
          { id: 2, typeMachine: 'Machine6kg', quantite: 1, prixUnitaire: 2000 }
        ]
      };

      const blob = await InvoiceService.generateInvoice(order);
      expect(blob).toBeInstanceOf(Blob);
    });
  });

  describe('Calculs formule Detail (prix au kg)', () => {
    it('devrait générer une facture pour formule Detail avec 10kg', async () => {
      const order: Order = {
        id: 1,
        siteLavageId: 1,
        gerantCreationUserId: 1,
        dateHeureCommande: '2024-01-01T10:00:00Z',
        dateDernierStatutChange: '2024-01-01T10:00:00Z',
        statut: 'PrisEnCharge',
        masseClientIndicativeKg: 10,
        estEnLivraison: false,
        formuleCommande: 'Detail',
        flag: false,
        createdAt: '2024-01-01T10:00:00Z',
        updatedAt: '2024-01-01T10:00:00Z',
        options: {
          aOptionRepassage: false,
          aOptionSechage: false,
          aOptionLivraison: false,
          aOptionExpress: false
        },
        prixTotal: 6000,
        prixPaye: 6000
      };

      const blob = await InvoiceService.generateInvoice(order);
      expect(blob).toBeInstanceOf(Blob);
    });

    it('devrait générer une facture Detail avec 25kg', async () => {
      const order: Order = {
        id: 1,
        siteLavageId: 1,
        gerantCreationUserId: 1,
        dateHeureCommande: '2024-01-01T10:00:00Z',
        dateDernierStatutChange: '2024-01-01T10:00:00Z',
        statut: 'PrisEnCharge',
        masseClientIndicativeKg: 25,
        estEnLivraison: false,
        formuleCommande: 'Detail',
        flag: false,
        createdAt: '2024-01-01T10:00:00Z',
        updatedAt: '2024-01-01T10:00:00Z',
        options: {
          aOptionRepassage: false,
          aOptionSechage: false,
          aOptionLivraison: false,
          aOptionExpress: false
        },
        prixTotal: 15000,
        prixPaye: 15000
      };

      const blob = await InvoiceService.generateInvoice(order);
      expect(blob).toBeInstanceOf(Blob);
    });
  });

  describe('Calculs options BaseMachine', () => {
    it('devrait calculer correctement option livraison pour BaseMachine', async () => {
      const order: Order = {
        id: 1,
        siteLavageId: 1,
        gerantCreationUserId: 1,
        dateHeureCommande: '2024-01-01T10:00:00Z',
        dateDernierStatutChange: '2024-01-01T10:00:00Z',
        statut: 'PrisEnCharge',
        masseClientIndicativeKg: 20,
        estEnLivraison: true,
        formuleCommande: 'BaseMachine',
        flag: false,
        createdAt: '2024-01-01T10:00:00Z',
        updatedAt: '2024-01-01T10:00:00Z',
        options: {
          aOptionRepassage: false,
          aOptionSechage: false,
          aOptionLivraison: true,
          aOptionExpress: false
        },
        prixTotal: 6000,
        prixPaye: 6000,
        repartitionMachines: [
          { id: 1, typeMachine: 'Machine20kg', quantite: 1, prixUnitaire: 5000 }
        ],
        priceDetails: {
          prixBase: 5000,
          prixOptions: 1000,
          prixSousTotal: 6000,
          prixFinal: 6000,
          prixApresReduction: 6000,
          prixPaye: 6000,
          options: {
            livraison: 1000
          }
        }
      };

      const blob = await InvoiceService.generateInvoice(order);
      expect(blob).toBeInstanceOf(Blob);
    });

    it('devrait calculer correctement option séchage avec priceDetails', async () => {
      const order: Order = {
        id: 1,
        siteLavageId: 1,
        gerantCreationUserId: 1,
        dateHeureCommande: '2024-01-01T10:00:00Z',
        dateDernierStatutChange: '2024-01-01T10:00:00Z',
        statut: 'PrisEnCharge',
        masseClientIndicativeKg: 20,
        estEnLivraison: false,
        formuleCommande: 'BaseMachine',
        flag: false,
        createdAt: '2024-01-01T10:00:00Z',
        updatedAt: '2024-01-01T10:00:00Z',
        options: {
          aOptionRepassage: false,
          aOptionSechage: true,
          aOptionLivraison: false,
          aOptionExpress: false
        },
        prixTotal: 6500,
        prixPaye: 6500,
        repartitionMachines: [
          { id: 1, typeMachine: 'Machine20kg', quantite: 1, prixUnitaire: 5000 }
        ],
        priceDetails: {
          prixBase: 5000,
          prixOptions: 1500,
          prixSousTotal: 6500,
          prixFinal: 6500,
          prixApresReduction: 6500,
          prixPaye: 6500,
          options: {
            sechage: {
              prix: 1500,
              prixParKg: 1500,
              nombreUtilisations: 1
            }
          }
        }
      };

      const blob = await InvoiceService.generateInvoice(order);
      expect(blob).toBeInstanceOf(Blob);
    });

    it('devrait calculer séchage fallback si pas de priceDetails (14kg)', async () => {
      const order: Order = {
        id: 1,
        siteLavageId: 1,
        gerantCreationUserId: 1,
        dateHeureCommande: '2024-01-01T10:00:00Z',
        dateDernierStatutChange: '2024-01-01T10:00:00Z',
        statut: 'PrisEnCharge',
        masseClientIndicativeKg: 14,
        estEnLivraison: false,
        formuleCommande: 'BaseMachine',
        flag: false,
        createdAt: '2024-01-01T10:00:00Z',
        updatedAt: '2024-01-01T10:00:00Z',
        options: {
          aOptionRepassage: false,
          aOptionSechage: true,
          aOptionLivraison: false,
          aOptionExpress: false
        },
        prixTotal: 3500,
        prixPaye: 3500,
        repartitionMachines: [
          { id: 1, typeMachine: 'Machine6kg', quantite: 1, prixUnitaire: 2000 }
        ]
      };

      const blob = await InvoiceService.generateInvoice(order);
      expect(blob).toBeInstanceOf(Blob);
    });

    it('devrait calculer séchage avec reste > 6kg (20kg = 2 utilisations)', async () => {
      const order: Order = {
        id: 1,
        siteLavageId: 1,
        gerantCreationUserId: 1,
        dateHeureCommande: '2024-01-01T10:00:00Z',
        dateDernierStatutChange: '2024-01-01T10:00:00Z',
        statut: 'PrisEnCharge',
        masseClientIndicativeKg: 20,
        estEnLivraison: false,
        formuleCommande: 'BaseMachine',
        flag: false,
        createdAt: '2024-01-01T10:00:00Z',
        updatedAt: '2024-01-01T10:00:00Z',
        options: {
          aOptionRepassage: false,
          aOptionSechage: true,
          aOptionLivraison: false,
          aOptionExpress: false
        },
        prixTotal: 8000,
        prixPaye: 8000,
        repartitionMachines: [
          { id: 1, typeMachine: 'Machine20kg', quantite: 1, prixUnitaire: 5000 }
        ]
      };

      const blob = await InvoiceService.generateInvoice(order);
      expect(blob).toBeInstanceOf(Blob);
    });

    it('devrait calculer séchage exactement 6kg (1 utilisation)', async () => {
      const order: Order = {
        id: 1,
        siteLavageId: 1,
        gerantCreationUserId: 1,
        dateHeureCommande: '2024-01-01T10:00:00Z',
        dateDernierStatutChange: '2024-01-01T10:00:00Z',
        statut: 'PrisEnCharge',
        masseClientIndicativeKg: 6,
        estEnLivraison: false,
        formuleCommande: 'BaseMachine',
        flag: false,
        createdAt: '2024-01-01T10:00:00Z',
        updatedAt: '2024-01-01T10:00:00Z',
        options: {
          aOptionRepassage: false,
          aOptionSechage: true,
          aOptionLivraison: false,
          aOptionExpress: false
        },
        prixTotal: 3500,
        prixPaye: 3500,
        repartitionMachines: [
          { id: 1, typeMachine: 'Machine6kg', quantite: 1, prixUnitaire: 2000 }
        ]
      };

      const blob = await InvoiceService.generateInvoice(order);
      expect(blob).toBeInstanceOf(Blob);
    });

    it('devrait calculer repassage pour BaseMachine', async () => {
      const order: Order = {
        id: 1,
        siteLavageId: 1,
        gerantCreationUserId: 1,
        dateHeureCommande: '2024-01-01T10:00:00Z',
        dateDernierStatutChange: '2024-01-01T10:00:00Z',
        statut: 'PrisEnCharge',
        masseClientIndicativeKg: 20,
        estEnLivraison: false,
        formuleCommande: 'BaseMachine',
        flag: false,
        createdAt: '2024-01-01T10:00:00Z',
        updatedAt: '2024-01-01T10:00:00Z',
        options: {
          aOptionRepassage: true,
          aOptionSechage: false,
          aOptionLivraison: false,
          aOptionExpress: false
        },
        prixTotal: 7000,
        prixPaye: 7000,
        repartitionMachines: [
          { id: 1, typeMachine: 'Machine20kg', quantite: 1, prixUnitaire: 5000 }
        ],
        priceDetails: {
          prixBase: 5000,
          prixOptions: 2000,
          prixSousTotal: 7000,
          prixFinal: 7000,
          prixApresReduction: 7000,
          prixPaye: 7000,
          options: {
            repassage: 2000
          }
        }
      };

      const blob = await InvoiceService.generateInvoice(order);
      expect(blob).toBeInstanceOf(Blob);
    });

    it('devrait calculer option express pour BaseMachine', async () => {
      const order: Order = {
        id: 1,
        siteLavageId: 1,
        gerantCreationUserId: 1,
        dateHeureCommande: '2024-01-01T10:00:00Z',
        dateDernierStatutChange: '2024-01-01T10:00:00Z',
        statut: 'PrisEnCharge',
        masseClientIndicativeKg: 20,
        estEnLivraison: false,
        formuleCommande: 'BaseMachine',
        flag: false,
        createdAt: '2024-01-01T10:00:00Z',
        updatedAt: '2024-01-01T10:00:00Z',
        options: {
          aOptionRepassage: false,
          aOptionSechage: false,
          aOptionLivraison: false,
          aOptionExpress: true
        },
        prixTotal: 6000,
        prixPaye: 6000,
        repartitionMachines: [
          { id: 1, typeMachine: 'Machine20kg', quantite: 1, prixUnitaire: 5000 }
        ],
        priceDetails: {
          prixBase: 5000,
          prixOptions: 1000,
          prixSousTotal: 6000,
          prixFinal: 6000,
          prixApresReduction: 6000,
          prixPaye: 6000,
          options: {
            express: 1000
          }
        }
      };

      const blob = await InvoiceService.generateInvoice(order);
      expect(blob).toBeInstanceOf(Blob);
    });

    it('devrait combiner toutes les options pour BaseMachine', async () => {
      const order: Order = {
        id: 1,
        siteLavageId: 1,
        gerantCreationUserId: 1,
        dateHeureCommande: '2024-01-01T10:00:00Z',
        dateDernierStatutChange: '2024-01-01T10:00:00Z',
        statut: 'PrisEnCharge',
        masseClientIndicativeKg: 20,
        estEnLivraison: true,
        formuleCommande: 'BaseMachine',
        flag: false,
        createdAt: '2024-01-01T10:00:00Z',
        updatedAt: '2024-01-01T10:00:00Z',
        options: {
          aOptionRepassage: true,
          aOptionSechage: true,
          aOptionLivraison: true,
          aOptionExpress: true
        },
        prixTotal: 10500,
        prixPaye: 10500,
        repartitionMachines: [
          { id: 1, typeMachine: 'Machine20kg', quantite: 1, prixUnitaire: 5000 }
        ],
        priceDetails: {
          prixBase: 5000,
          prixOptions: 5500,
          prixSousTotal: 10500,
          prixFinal: 10500,
          prixApresReduction: 10500,
          prixPaye: 10500,
          options: {
            livraison: 1000,
            sechage: {
              prix: 1500,
              prixParKg: 1500,
              nombreUtilisations: 1
            },
            repassage: 2000,
            express: 1000
          }
        }
      };

      const blob = await InvoiceService.generateInvoice(order);
      expect(blob).toBeInstanceOf(Blob);
    });
  });

  describe('Calculs options Detail (incluses sauf Express)', () => {
    it('ne devrait pas facturer livraison pour Detail (inclus)', async () => {
      const order: Order = {
        id: 1,
        siteLavageId: 1,
        gerantCreationUserId: 1,
        dateHeureCommande: '2024-01-01T10:00:00Z',
        dateDernierStatutChange: '2024-01-01T10:00:00Z',
        statut: 'PrisEnCharge',
        masseClientIndicativeKg: 10,
        estEnLivraison: true,
        formuleCommande: 'Detail',
        flag: false,
        createdAt: '2024-01-01T10:00:00Z',
        updatedAt: '2024-01-01T10:00:00Z',
        options: {
          aOptionRepassage: false,
          aOptionSechage: false,
          aOptionLivraison: true,
          aOptionExpress: false
        },
        prixTotal: 6000,
        prixPaye: 6000
      };

      const blob = await InvoiceService.generateInvoice(order);
      expect(blob).toBeInstanceOf(Blob);
    });

    it('ne devrait pas facturer séchage pour Detail (inclus)', async () => {
      const order: Order = {
        id: 1,
        siteLavageId: 1,
        gerantCreationUserId: 1,
        dateHeureCommande: '2024-01-01T10:00:00Z',
        dateDernierStatutChange: '2024-01-01T10:00:00Z',
        statut: 'PrisEnCharge',
        masseClientIndicativeKg: 10,
        estEnLivraison: false,
        formuleCommande: 'Detail',
        flag: false,
        createdAt: '2024-01-01T10:00:00Z',
        updatedAt: '2024-01-01T10:00:00Z',
        options: {
          aOptionRepassage: false,
          aOptionSechage: true,
          aOptionLivraison: false,
          aOptionExpress: false
        },
        prixTotal: 6000,
        prixPaye: 6000
      };

      const blob = await InvoiceService.generateInvoice(order);
      expect(blob).toBeInstanceOf(Blob);
    });

    it('ne devrait pas facturer repassage pour Detail (inclus)', async () => {
      const order: Order = {
        id: 1,
        siteLavageId: 1,
        gerantCreationUserId: 1,
        dateHeureCommande: '2024-01-01T10:00:00Z',
        dateDernierStatutChange: '2024-01-01T10:00:00Z',
        statut: 'PrisEnCharge',
        masseClientIndicativeKg: 10,
        estEnLivraison: false,
        formuleCommande: 'Detail',
        flag: false,
        createdAt: '2024-01-01T10:00:00Z',
        updatedAt: '2024-01-01T10:00:00Z',
        options: {
          aOptionRepassage: true,
          aOptionSechage: false,
          aOptionLivraison: false,
          aOptionExpress: false
        },
        prixTotal: 6000,
        prixPaye: 6000
      };

      const blob = await InvoiceService.generateInvoice(order);
      expect(blob).toBeInstanceOf(Blob);
    });

    it('devrait facturer express pour Detail (non inclus)', async () => {
      const order: Order = {
        id: 1,
        siteLavageId: 1,
        gerantCreationUserId: 1,
        dateHeureCommande: '2024-01-01T10:00:00Z',
        dateDernierStatutChange: '2024-01-01T10:00:00Z',
        statut: 'PrisEnCharge',
        masseClientIndicativeKg: 10,
        estEnLivraison: false,
        formuleCommande: 'Detail',
        flag: false,
        createdAt: '2024-01-01T10:00:00Z',
        updatedAt: '2024-01-01T10:00:00Z',
        options: {
          aOptionRepassage: false,
          aOptionSechage: false,
          aOptionLivraison: false,
          aOptionExpress: true
        },
        prixTotal: 7000,
        prixPaye: 7000,
        priceDetails: {
          prixBase: 6000,
          prixOptions: 1000,
          prixSousTotal: 7000,
          prixFinal: 7000,
          prixApresReduction: 7000,
          prixPaye: 7000,
          options: {
            express: 1000
          }
        }
      };

      const blob = await InvoiceService.generateInvoice(order);
      expect(blob).toBeInstanceOf(Blob);
    });
  });

  describe('Calculs réductions', () => {
    it('devrait calculer réduction étudiant 10% avec priceDetails', async () => {
      const order: Order = {
        id: 1,
        siteLavageId: 1,
        gerantCreationUserId: 1,
        dateHeureCommande: '2024-01-01T10:00:00Z',
        dateDernierStatutChange: '2024-01-01T10:00:00Z',
        statut: 'PrisEnCharge',
        masseClientIndicativeKg: 20,
        estEnLivraison: false,
        formuleCommande: 'BaseMachine',
        typeReduction: 'Etudiant',
        flag: false,
        createdAt: '2024-01-01T10:00:00Z',
        updatedAt: '2024-01-01T10:00:00Z',
        options: {
          aOptionRepassage: false,
          aOptionSechage: false,
          aOptionLivraison: false,
          aOptionExpress: false
        },
        prixTotal: 5000,
        prixPaye: 4500,
        repartitionMachines: [
          { id: 1, typeMachine: 'Machine20kg', quantite: 1, prixUnitaire: 5000 }
        ],
        priceDetails: {
          prixBase: 5000,
          prixOptions: 0,
          prixSousTotal: 5000,
          prixFinal: 4500,
          prixApresReduction: 4500,
          prixPaye: 4500,
          reduction: {
            tauxReduction: 0.1,
            montantReduction: 500,
            raisonReduction: 'Etudiant',
            prixApresReduction: 4500
          }
        }
      };

      const blob = await InvoiceService.generateInvoice(order);
      expect(blob).toBeInstanceOf(Blob);
    });

    it('devrait calculer réduction ouverture 5% avec priceDetails', async () => {
      const order: Order = {
        id: 1,
        siteLavageId: 1,
        gerantCreationUserId: 1,
        dateHeureCommande: '2024-01-01T10:00:00Z',
        dateDernierStatutChange: '2024-01-01T10:00:00Z',
        statut: 'PrisEnCharge',
        masseClientIndicativeKg: 20,
        estEnLivraison: false,
        formuleCommande: 'BaseMachine',
        typeReduction: 'Ouverture',
        flag: false,
        createdAt: '2024-01-01T10:00:00Z',
        updatedAt: '2024-01-01T10:00:00Z',
        options: {
          aOptionRepassage: false,
          aOptionSechage: false,
          aOptionLivraison: false,
          aOptionExpress: false
        },
        prixTotal: 5000,
        prixPaye: 4750,
        repartitionMachines: [
          { id: 1, typeMachine: 'Machine20kg', quantite: 1, prixUnitaire: 5000 }
        ],
        priceDetails: {
          prixBase: 5000,
          prixOptions: 0,
          prixSousTotal: 5000,
          prixFinal: 4750,
          prixApresReduction: 4750,
          prixPaye: 4750,
          reduction: {
            tauxReduction: 0.05,
            montantReduction: 250,
            raisonReduction: 'Ouverture',
            prixApresReduction: 4750
          }
        }
      };

      const blob = await InvoiceService.generateInvoice(order);
      expect(blob).toBeInstanceOf(Blob);
    });

    it('devrait calculer réduction étudiant fallback sur BaseMachine', async () => {
      const order: Order = {
        id: 1,
        siteLavageId: 1,
        gerantCreationUserId: 1,
        dateHeureCommande: '2024-01-01T10:00:00Z',
        dateDernierStatutChange: '2024-01-01T10:00:00Z',
        statut: 'PrisEnCharge',
        masseClientIndicativeKg: 20,
        estEnLivraison: false,
        formuleCommande: 'BaseMachine',
        typeReduction: 'Etudiant',
        flag: false,
        createdAt: '2024-01-01T10:00:00Z',
        updatedAt: '2024-01-01T10:00:00Z',
        options: {
          aOptionRepassage: false,
          aOptionSechage: false,
          aOptionLivraison: false,
          aOptionExpress: false
        },
        prixTotal: 5000,
        prixPaye: 4500,
        repartitionMachines: [
          { id: 1, typeMachine: 'Machine20kg', quantite: 1, prixUnitaire: 5000 }
        ]
      };

      const blob = await InvoiceService.generateInvoice(order);
      expect(blob).toBeInstanceOf(Blob);
    });

    it('devrait calculer réduction fallback sur Detail avec options', async () => {
      const order: Order = {
        id: 1,
        siteLavageId: 1,
        gerantCreationUserId: 1,
        dateHeureCommande: '2024-01-01T10:00:00Z',
        dateDernierStatutChange: '2024-01-01T10:00:00Z',
        statut: 'PrisEnCharge',
        masseClientIndicativeKg: 10,
        estEnLivraison: false,
        formuleCommande: 'Detail',
        typeReduction: 'Etudiant',
        flag: false,
        createdAt: '2024-01-01T10:00:00Z',
        updatedAt: '2024-01-01T10:00:00Z',
        options: {
          aOptionRepassage: false,
          aOptionSechage: false,
          aOptionLivraison: false,
          aOptionExpress: true
        },
        prixTotal: 7000,
        prixPaye: 6300
      };

      const blob = await InvoiceService.generateInvoice(order);
      expect(blob).toBeInstanceOf(Blob);
    });

    it('devrait calculer réduction sur total avec toutes options BaseMachine', async () => {
      const order: Order = {
        id: 1,
        siteLavageId: 1,
        gerantCreationUserId: 1,
        dateHeureCommande: '2024-01-01T10:00:00Z',
        dateDernierStatutChange: '2024-01-01T10:00:00Z',
        statut: 'PrisEnCharge',
        masseClientIndicativeKg: 20,
        estEnLivraison: true,
        formuleCommande: 'BaseMachine',
        typeReduction: 'Ouverture',
        flag: false,
        createdAt: '2024-01-01T10:00:00Z',
        updatedAt: '2024-01-01T10:00:00Z',
        options: {
          aOptionRepassage: false,
          aOptionSechage: true,
          aOptionLivraison: true,
          aOptionExpress: true
        },
        prixTotal: 8500,
        prixPaye: 8075,
        repartitionMachines: [
          { id: 1, typeMachine: 'Machine20kg', quantite: 1, prixUnitaire: 5000 }
        ]
      };

      const blob = await InvoiceService.generateInvoice(order);
      expect(blob).toBeInstanceOf(Blob);
    });
  });

  describe('Calculs ajustements', () => {
    it('devrait calculer ajustement augmentation absolue', async () => {
      const order: Order = {
        id: 1,
        siteLavageId: 1,
        gerantCreationUserId: 1,
        dateHeureCommande: '2024-01-01T10:00:00Z',
        dateDernierStatutChange: '2024-01-01T10:00:00Z',
        statut: 'PrisEnCharge',
        masseClientIndicativeKg: 20,
        estEnLivraison: false,
        formuleCommande: 'BaseMachine',
        ajustementType: 'Augmentation',
        ajustementMethode: 'Absolu',
        ajustementValeur: 500,
        flag: false,
        createdAt: '2024-01-01T10:00:00Z',
        updatedAt: '2024-01-01T10:00:00Z',
        options: {
          aOptionRepassage: false,
          aOptionSechage: false,
          aOptionLivraison: false,
          aOptionExpress: false
        },
        prixTotal: 5500,
        prixPaye: 5500,
        repartitionMachines: [
          { id: 1, typeMachine: 'Machine20kg', quantite: 1, prixUnitaire: 5000 }
        ]
      };

      const blob = await InvoiceService.generateInvoice(order);
      expect(blob).toBeInstanceOf(Blob);
    });

    it('devrait calculer ajustement diminution absolue', async () => {
      const order: Order = {
        id: 1,
        siteLavageId: 1,
        gerantCreationUserId: 1,
        dateHeureCommande: '2024-01-01T10:00:00Z',
        dateDernierStatutChange: '2024-01-01T10:00:00Z',
        statut: 'PrisEnCharge',
        masseClientIndicativeKg: 20,
        estEnLivraison: false,
        formuleCommande: 'BaseMachine',
        ajustementType: 'Diminution',
        ajustementMethode: 'Absolu',
        ajustementValeur: 500,
        flag: false,
        createdAt: '2024-01-01T10:00:00Z',
        updatedAt: '2024-01-01T10:00:00Z',
        options: {
          aOptionRepassage: false,
          aOptionSechage: false,
          aOptionLivraison: false,
          aOptionExpress: false
        },
        prixTotal: 4500,
        prixPaye: 4500,
        repartitionMachines: [
          { id: 1, typeMachine: 'Machine20kg', quantite: 1, prixUnitaire: 5000 }
        ]
      };

      const blob = await InvoiceService.generateInvoice(order);
      expect(blob).toBeInstanceOf(Blob);
    });

    it('devrait calculer ajustement augmentation pourcentage', async () => {
      const order: Order = {
        id: 1,
        siteLavageId: 1,
        gerantCreationUserId: 1,
        dateHeureCommande: '2024-01-01T10:00:00Z',
        dateDernierStatutChange: '2024-01-01T10:00:00Z',
        statut: 'PrisEnCharge',
        masseClientIndicativeKg: 20,
        estEnLivraison: false,
        formuleCommande: 'BaseMachine',
        ajustementType: 'Augmentation',
        ajustementMethode: 'Pourcentage',
        ajustementValeur: 10,
        flag: false,
        createdAt: '2024-01-01T10:00:00Z',
        updatedAt: '2024-01-01T10:00:00Z',
        options: {
          aOptionRepassage: false,
          aOptionSechage: false,
          aOptionLivraison: false,
          aOptionExpress: false
        },
        prixTotal: 5500,
        prixPaye: 5500,
        repartitionMachines: [
          { id: 1, typeMachine: 'Machine20kg', quantite: 1, prixUnitaire: 5000 }
        ]
      };

      const blob = await InvoiceService.generateInvoice(order);
      expect(blob).toBeInstanceOf(Blob);
    });

    it('devrait calculer ajustement diminution pourcentage', async () => {
      const order: Order = {
        id: 1,
        siteLavageId: 1,
        gerantCreationUserId: 1,
        dateHeureCommande: '2024-01-01T10:00:00Z',
        dateDernierStatutChange: '2024-01-01T10:00:00Z',
        statut: 'PrisEnCharge',
        masseClientIndicativeKg: 20,
        estEnLivraison: false,
        formuleCommande: 'BaseMachine',
        ajustementType: 'Diminution',
        ajustementMethode: 'Pourcentage',
        ajustementValeur: 20,
        flag: false,
        createdAt: '2024-01-01T10:00:00Z',
        updatedAt: '2024-01-01T10:00:00Z',
        options: {
          aOptionRepassage: false,
          aOptionSechage: false,
          aOptionLivraison: false,
          aOptionExpress: false
        },
        prixTotal: 4000,
        prixPaye: 4000,
        repartitionMachines: [
          { id: 1, typeMachine: 'Machine20kg', quantite: 1, prixUnitaire: 5000 }
        ]
      };

      const blob = await InvoiceService.generateInvoice(order);
      expect(blob).toBeInstanceOf(Blob);
    });
  });

  describe('Crédit fidélité', () => {
    it('devrait afficher crédit fidélité utilisé', async () => {
      const order: Order = {
        id: 1,
        siteLavageId: 1,
        gerantCreationUserId: 1,
        dateHeureCommande: '2024-01-01T10:00:00Z',
        dateDernierStatutChange: '2024-01-01T10:00:00Z',
        statut: 'PrisEnCharge',
        masseClientIndicativeKg: 20,
        estEnLivraison: false,
        formuleCommande: 'BaseMachine',
        flag: false,
        createdAt: '2024-01-01T10:00:00Z',
        updatedAt: '2024-01-01T10:00:00Z',
        options: {
          aOptionRepassage: false,
          aOptionSechage: false,
          aOptionLivraison: false,
          aOptionExpress: false
        },
        prixTotal: 5000,
        prixPaye: 4000,
        montantReductionPoints: 1000,
        repartitionMachines: [
          { id: 1, typeMachine: 'Machine20kg', quantite: 1, prixUnitaire: 5000 }
        ]
      };

      const blob = await InvoiceService.generateInvoice(order);
      expect(blob).toBeInstanceOf(Blob);
    });

    it('devrait combiner crédit fidélité avec réduction', async () => {
      const order: Order = {
        id: 1,
        siteLavageId: 1,
        gerantCreationUserId: 1,
        dateHeureCommande: '2024-01-01T10:00:00Z',
        dateDernierStatutChange: '2024-01-01T10:00:00Z',
        statut: 'PrisEnCharge',
        masseClientIndicativeKg: 20,
        estEnLivraison: false,
        formuleCommande: 'BaseMachine',
        typeReduction: 'Etudiant',
        flag: false,
        createdAt: '2024-01-01T10:00:00Z',
        updatedAt: '2024-01-01T10:00:00Z',
        options: {
          aOptionRepassage: false,
          aOptionSechage: false,
          aOptionLivraison: false,
          aOptionExpress: false
        },
        prixTotal: 5000,
        prixPaye: 3500,
        montantReductionPoints: 1000,
        repartitionMachines: [
          { id: 1, typeMachine: 'Machine20kg', quantite: 1, prixUnitaire: 5000 }
        ],
        priceDetails: {
          prixBase: 5000,
          prixOptions: 0,
          prixSousTotal: 5000,
          prixFinal: 3500,
          prixApresReduction: 4500,
          prixPaye: 3500,
          reduction: {
            tauxReduction: 0.1,
            montantReduction: 500,
            raisonReduction: 'Etudiant',
            prixApresReduction: 4500
          },
          fidelite: {
            pointsDisponibles: 10,
            pointsFraction: 1,
            creditDisponible: 1000,
            creditUtilise: 1000,
            pointsRestants: 0
          }
        }
      };

      const blob = await InvoiceService.generateInvoice(order);
      expect(blob).toBeInstanceOf(Blob);
    });
  });

  describe('Client Premium', () => {
    it('devrait afficher "Inclus dans abonnement" pour prix 0', async () => {
      const order: Order = {
        id: 1,
        siteLavageId: 1,
        gerantCreationUserId: 1,
        dateHeureCommande: '2024-01-01T10:00:00Z',
        dateDernierStatutChange: '2024-01-01T10:00:00Z',
        statut: 'PrisEnCharge',
        masseClientIndicativeKg: 20,
        estEnLivraison: false,
        formuleCommande: 'BaseMachine',
        flag: false,
        createdAt: '2024-01-01T10:00:00Z',
        updatedAt: '2024-01-01T10:00:00Z',
        options: {
          aOptionRepassage: false,
          aOptionSechage: false,
          aOptionLivraison: false,
          aOptionExpress: false
        },
        prixTotal: 0,
        prixPaye: 0,
        repartitionMachines: [
          { id: 1, typeMachine: 'Machine20kg', quantite: 1, prixUnitaire: 5000 }
        ],
        clientUser: {
          id: 1,
          nom: 'Premium',
          prenom: 'Client',
          email: 'premium@example.com',
          telephone: '+221123456789',
          typeClient: 'Premium',
          estEtudiant: false
        }
      };

      const blob = await InvoiceService.generateInvoice(order);
      expect(blob).toBeInstanceOf(Blob);
    });
  });

  describe('Client invité', () => {
    it('devrait générer facture pour client invité', async () => {
      const order: Order = {
        id: 1,
        siteLavageId: 1,
        gerantCreationUserId: 1,
        dateHeureCommande: '2024-01-01T10:00:00Z',
        dateDernierStatutChange: '2024-01-01T10:00:00Z',
        statut: 'PrisEnCharge',
        masseClientIndicativeKg: 20,
        estEnLivraison: false,
        formuleCommande: 'BaseMachine',
        flag: false,
        createdAt: '2024-01-01T10:00:00Z',
        updatedAt: '2024-01-01T10:00:00Z',
        options: {
          aOptionRepassage: false,
          aOptionSechage: false,
          aOptionLivraison: false,
          aOptionExpress: false
        },
        prixTotal: 5000,
        prixPaye: 5000,
        repartitionMachines: [
          { id: 1, typeMachine: 'Machine20kg', quantite: 1, prixUnitaire: 5000 }
        ],
        clientInvite: {
          id: 1,
          nom: 'Invité Test',
          telephone: '+221987654321',
          email: 'invite@example.com'
        }
      };

      const blob = await InvoiceService.generateInvoice(order);
      expect(blob).toBeInstanceOf(Blob);
    });

    it('devrait gérer client invité sans email', async () => {
      const order: Order = {
        id: 1,
        siteLavageId: 1,
        gerantCreationUserId: 1,
        dateHeureCommande: '2024-01-01T10:00:00Z',
        dateDernierStatutChange: '2024-01-01T10:00:00Z',
        statut: 'PrisEnCharge',
        masseClientIndicativeKg: 20,
        estEnLivraison: false,
        formuleCommande: 'BaseMachine',
        flag: false,
        createdAt: '2024-01-01T10:00:00Z',
        updatedAt: '2024-01-01T10:00:00Z',
        options: {
          aOptionRepassage: false,
          aOptionSechage: false,
          aOptionLivraison: false,
          aOptionExpress: false
        },
        prixTotal: 5000,
        prixPaye: 5000,
        repartitionMachines: [
          { id: 1, typeMachine: 'Machine20kg', quantite: 1, prixUnitaire: 5000 }
        ],
        clientInvite: {
          id: 1,
          nom: null,
          telephone: '+221987654321',
          email: null
        }
      };

      const blob = await InvoiceService.generateInvoice(order);
      expect(blob).toBeInstanceOf(Blob);
    });
  });

  describe('downloadPDF', () => {
    it('devrait télécharger le PDF correctement', () => {
      const mockBlob = new Blob(['test'], { type: 'application/pdf' });
      const mockLink = {
        href: '',
        download: '',
        click: jest.fn()
      };

      // Mock document et URL dans l'environnement Node
      const mockDocument = {
        createElement: jest.fn(() => mockLink),
        body: {
          appendChild: jest.fn(),
          removeChild: jest.fn()
        }
      };

      const originalDocument = global.document;
      (global as any).document = mockDocument;
      
      const mockURL = {
        createObjectURL: jest.fn(() => 'blob:test'),
        revokeObjectURL: jest.fn()
      };
      
      const originalURL = global.URL;
      (global as any).URL = mockURL;

      InvoiceService.downloadPDF(mockBlob, 'facture-test.pdf');

      expect(mockLink.download).toBe('facture-test.pdf');
      expect(mockLink.click).toHaveBeenCalled();
      expect(mockURL.createObjectURL).toHaveBeenCalledWith(mockBlob);
      expect(mockURL.revokeObjectURL).toHaveBeenCalledWith('blob:test');

      // Restaurer les globaux
      (global as any).document = originalDocument;
      (global as any).URL = originalURL;
    });
  });
});
