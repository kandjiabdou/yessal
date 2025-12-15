const prisma = require('../utils/prismaClient');
const { NotFoundError, ValidationError } = require('../utils/errors');

/**
 * Service pour la gestion de la boutique
 */
class ShopService {
  // ============================================
  // CATÉGORIES
  // ============================================

  /**
   * Récupérer toutes les catégories
   */
  async getCategories() {
    return await prisma.categorieproduit.findMany({
      orderBy: { nom: 'asc' },
      include: {
        _count: {
          select: { produits: true }
        }
      }
    });
  }

  /**
   * Créer une catégorie
   */
  async createCategory(data) {
    return await prisma.categorieproduit.create({
      data: {
        nom: data.nom,
        description: data.description
      }
    });
  }

  /**
   * Mettre à jour une catégorie
   */
  async updateCategory(id, data) {
    const category = await prisma.categorieproduit.findUnique({
      where: { id: parseInt(id) }
    });

    if (!category) {
      throw new NotFoundError('Catégorie non trouvée');
    }

    return await prisma.categorieproduit.update({
      where: { id: parseInt(id) },
      data
    });
  }

  /**
   * Supprimer une catégorie
   */
  async deleteCategory(id) {
    const category = await prisma.categorieproduit.findUnique({
      where: { id: parseInt(id) },
      include: {
        _count: {
          select: { produits: true }
        }
      }
    });

    if (!category) {
      throw new NotFoundError('Catégorie non trouvée');
    }

    if (category._count.produits > 0) {
      throw new ValidationError('Impossible de supprimer une catégorie contenant des produits');
    }

    await prisma.categorieproduit.delete({
      where: { id: parseInt(id) }
    });

    return { message: 'Catégorie supprimée avec succès' };
  }

  // ============================================
  // PRODUITS
  // ============================================

  /**
   * Récupérer tous les produits
   */
  async getProducts(filters = {}) {
    const { categorieId, search, actif } = filters;

    const where = {};

    if (categorieId) {
      where.categorieId = parseInt(categorieId);
    }

    if (search) {
      where.OR = [
        { nom: { contains: search } },
        { codeBarres: { contains: search } },
        { description: { contains: search } }
      ];
    }

    if (actif !== undefined) {
      where.actif = actif === 'true';
    }

    return await prisma.produit.findMany({
      where,
      include: {
        categorie: true
      },
      orderBy: { nom: 'asc' }
    });
  }

  /**
   * Récupérer un produit par ID
   */
  async getProductById(id) {
    const product = await prisma.produit.findUnique({
      where: { id: parseInt(id) },
      include: {
        categorie: true
      }
    });

    if (!product) {
      throw new NotFoundError('Produit non trouvé');
    }

    return product;
  }

  /**
   * Créer un produit
   */
  async createProduct(data) {
    // Vérifier que la catégorie existe
    const category = await prisma.categorieproduit.findUnique({
      where: { id: data.categorieId }
    });

    if (!category) {
      throw new NotFoundError('Catégorie non trouvée');
    }

    // Vérifier l'unicité du code-barres si fourni
    if (data.codeBarres) {
      const existing = await prisma.produit.findFirst({
        where: { codeBarres: data.codeBarres }
      });

      if (existing) {
        throw new ValidationError('Un produit avec ce code-barres existe déjà');
      }
    }

    return await prisma.produit.create({
      data,
      include: {
        categorie: true
      }
    });
  }

  /**
   * Mettre à jour un produit
   */
  async updateProduct(id, data) {
    const product = await prisma.produit.findUnique({
      where: { id: parseInt(id) }
    });

    if (!product) {
      throw new NotFoundError('Produit non trouvé');
    }

    // Vérifier la catégorie si elle est modifiée
    if (data.categorieId) {
      const category = await prisma.categorieproduit.findUnique({
        where: { id: data.categorieId }
      });

      if (!category) {
        throw new NotFoundError('Catégorie non trouvée');
      }
    }

    // Vérifier l'unicité du code-barres si modifié
    if (data.codeBarres && data.codeBarres !== product.codeBarres) {
      const existing = await prisma.produit.findFirst({
        where: {
          codeBarres: data.codeBarres,
          id: { not: parseInt(id) }
        }
      });

      if (existing) {
        throw new ValidationError('Un produit avec ce code-barres existe déjà');
      }
    }

    return await prisma.produit.update({
      where: { id: parseInt(id) },
      data,
      include: {
        categorie: true
      }
    });
  }

  /**
   * Supprimer un produit
   */
  async deleteProduct(id) {
    const product = await prisma.produit.findUnique({
      where: { id: parseInt(id) }
    });

    if (!product) {
      throw new NotFoundError('Produit non trouvé');
    }

    await prisma.produit.delete({
      where: { id: parseInt(id) }
    });

    return { message: 'Produit supprimé avec succès' };
  }

  // ============================================
  // STOCK
  // ============================================

  /**
   * Récupérer le stock d'un site
   */
  async getSiteStock(siteLavageId, filters = {}) {
    const { lowStock, categorieId, search } = filters;

    const where = {
      siteLavageId: parseInt(siteLavageId)
    };

    // Filtre pour les produits en stock faible
    if (lowStock === 'true') {
      where.stock = {
        lte: prisma.raw('`stockproduit`.`stockAlerte`')
      };
    }

    // Construire les filtres sur les produits
    const produitWhere = {};

    if (categorieId) {
      produitWhere.categorieId = parseInt(categorieId);
    }

    if (search) {
      produitWhere.OR = [
        { nom: { contains: search } },
        { codeBarres: { contains: search } }
      ];
    }

    if (Object.keys(produitWhere).length > 0) {
      where.produit = produitWhere;
    }

    const stocks = await prisma.stockproduit.findMany({
      where,
      include: {
        produit: {
          include: {
            categorie: true
          }
        }
      },
      orderBy: {
        produit: {
          nom: 'asc'
        }
      }
    });

    // Filtrer manuellement pour le lowStock si nécessaire
    if (lowStock === 'true') {
      return stocks.filter(stock => stock.stock <= stock.stockAlerte);
    }

    return stocks;
  }

  /**
   * Récupérer le stock d'un produit pour un site
   */
  async getProductStock(produitId, siteLavageId) {
    const stock = await prisma.stockproduit.findUnique({
      where: {
        produitId_siteLavageId: {
          produitId: parseInt(produitId),
          siteLavageId: parseInt(siteLavageId)
        }
      },
      include: {
        produit: {
          include: {
            categorie: true
          }
        }
      }
    });

    if (!stock) {
      throw new NotFoundError('Stock non trouvé pour ce produit et ce site');
    }

    return stock;
  }

  /**
   * Initialiser le stock d'un produit pour un site
   */
  async initializeStock(produitId, siteLavageId, data) {
    // Vérifier que le produit existe
    const product = await prisma.produit.findUnique({
      where: { id: parseInt(produitId) }
    });

    if (!product) {
      throw new NotFoundError('Produit non trouvé');
    }

    // Vérifier si le stock existe déjà
    const existingStock = await prisma.stockproduit.findUnique({
      where: {
        produitId_siteLavageId: {
          produitId: parseInt(produitId),
          siteLavageId: parseInt(siteLavageId)
        }
      }
    });

    if (existingStock) {
      throw new ValidationError('Le stock existe déjà pour ce produit');
    }

    // Créer le stock
    const stock = await prisma.stockproduit.create({
      data: {
        produitId: parseInt(produitId),
        siteLavageId: parseInt(siteLavageId),
        stock: data.quantite || 0,
        stockAlerte: data.seuilAlerte || 10,
        prixVente: data.prixVente || 0
      },
      include: {
        produit: {
          include: {
            categorie: true
          }
        }
      }
    });

    // Créer un mouvement de stock
    if (data.quantite > 0) {
      await prisma.mouvementstock.create({
        data: {
          produitId: parseInt(produitId),
          siteLavageId: parseInt(siteLavageId),
          type: 'entree',
          quantite: data.quantite,
          motif: 'Initialisation du stock'
        }
      });
    }

    return stock;
  }

  /**
   * Mettre à jour le stock
   */
  async updateStock(produitId, siteLavageId, data) {
    const stock = await prisma.stockproduit.findUnique({
      where: {
        produitId_siteLavageId: {
          produitId: parseInt(produitId),
          siteLavageId: parseInt(siteLavageId)
        }
      }
    });

    if (!stock) {
      throw new NotFoundError('Stock non trouvé');
    }

    const updateData = {};

    if (data.quantite !== undefined) {
      const diff = data.quantite - stock.stock;
      updateData.stock = data.quantite;

      // Créer un mouvement de stock
      if (diff !== 0) {
        await prisma.mouvementstock.create({
          data: {
            stockProduitId: stock.id,
            type: diff > 0 ? 'Entree' : 'Sortie',
            quantite: Math.abs(diff),
            motif: data.motif || 'Ajustement manuel'
          }
        });
      }
    }

    if (data.seuilAlerte !== undefined) {
      updateData.stockAlerte = data.seuilAlerte;
    }

    return await prisma.stockproduit.update({
      where: {
        produitId_siteLavageId: {
          produitId: parseInt(produitId),
          siteLavageId: parseInt(siteLavageId)
        }
      },
      data: updateData,
      include: {
        produit: {
          include: {
            categorie: true
          }
        }
      }
    });
  }

  /**
   * Ajuster le stock (ajout ou retrait)
   */
  async adjustStock(produitId, siteLavageId, data, managerUserId) {
    const stock = await prisma.stockproduit.findUnique({
      where: {
        produitId_siteLavageId: {
          produitId: parseInt(produitId),
          siteLavageId: parseInt(siteLavageId)
        }
      }
    });

    if (!stock) {
      throw new NotFoundError('Stock non trouvé');
    }

    const newQuantity = stock.stock + data.quantite;

    if (newQuantity < 0) {
      throw new ValidationError('Stock insuffisant pour effectuer cette opération');
    }

    // Mettre à jour le stock
    const updatedStock = await prisma.stockproduit.update({
      where: {
        produitId_siteLavageId: {
          produitId: parseInt(produitId),
          siteLavageId: parseInt(siteLavageId)
        }
      },
      data: {
        stock: newQuantity
      },
      include: {
        produit: {
          include: {
            categorie: true
          }
        }
      }
    });

    // Créer un mouvement de stock
    await prisma.mouvementstock.create({
      data: {
        stockProduitId: stock.id,
        type: data.quantite > 0 ? 'Entree' : 'Sortie',
        quantite: Math.abs(data.quantite),
        motif: data.motif || 'Ajustement manuel'
      }
    });

    return updatedStock;
  }

  /**
   * Récupérer les mouvements de stock
   */
  async getStockMovements(siteLavageId, filters = {}) {
    const { produitId, type, startDate, endDate } = filters;

    const where = {
      siteLavageId: parseInt(siteLavageId)
    };

    if (produitId) {
      where.produitId = parseInt(produitId);
    }

    if (type) {
      where.type = type;
    }

    if (startDate || endDate) {
      where.dateMouvement = {};
      if (startDate) {
        where.dateMouvement.gte = new Date(startDate);
      }
      if (endDate) {
        where.dateMouvement.lte = new Date(endDate);
      }
    }

    return await prisma.mouvementstock.findMany({
      where,
      include: {
        produit: {
          include: {
            categorie: true
          }
        }
      },
      orderBy: {
        dateMouvement: 'desc'
      }
    });
  }

  // ============================================
  // VENTES
  // ============================================

  /**
   * Créer une vente
   */
  async createSale(data, managerUserId) {
    const { siteLavageId, clientUserId, modePaiement, lignes } = data;

    // Vérifier les stocks disponibles
    for (const ligne of lignes) {
      const stock = await prisma.stockproduit.findUnique({
        where: {
          produitId_siteLavageId: {
            produitId: ligne.produitId,
            siteLavageId
          }
        }
      });

      if (!stock) {
        const product = await prisma.produit.findUnique({
          where: { id: ligne.produitId }
        });
        throw new ValidationError(`Produit "${product?.nom || ligne.produitId}" non disponible dans ce site`);
      }

      if (stock.stock < ligne.quantite) {
        const product = await prisma.produit.findUnique({
          where: { id: ligne.produitId }
        });
        throw new ValidationError(`Stock insuffisant pour "${product?.nom || ligne.produitId}"`);
      }
    }

    // Calculer le montant total
    const montantTotal = lignes.reduce((sum, ligne) => {
      return sum + (ligne.prixUnitaire * ligne.quantite);
    }, 0);

    const nombreArticles = lignes.reduce((sum, ligne) => sum + ligne.quantite, 0);

    // Générer le numéro de facture
    const numeroFacture = await this.generateInvoiceNumber(siteLavageId);

    // Créer la vente avec ses lignes dans une transaction
    const vente = await prisma.$transaction(async (tx) => {
      // Créer la vente
      const newVente = await tx.vente.create({
        data: {
          numeroFacture,
          siteLavageId,
          managerUserId,
          clientUserId: clientUserId || null,
          dateVente: new Date(),
          montantTotal,
          montantPaye: montantTotal,
          modePaiement,
          nombreArticles
        }
      });

      // Créer les lignes de vente
      for (const ligne of lignes) {
        await tx.lignevente.create({
          data: {
            venteId: newVente.id,
            produitId: ligne.produitId,
            quantite: ligne.quantite,
            prixUnitaire: ligne.prixUnitaire,
            sousTotal: ligne.quantite * ligne.prixUnitaire
          }
        });

        // Mettre à jour le stock
        const currentStock = await tx.stockproduit.findUnique({
          where: {
            produitId_siteLavageId: {
              produitId: ligne.produitId,
              siteLavageId
            }
          }
        });
        
        await tx.stockproduit.update({
          where: {
            produitId_siteLavageId: {
              produitId: ligne.produitId,
              siteLavageId
            }
          },
          data: {
            stock: {
              decrement: ligne.quantite
            }
          }
        });

        // Créer un mouvement de stock
        await tx.mouvementstock.create({
          data: {
            stockProduitId: currentStock.id,
            type: 'Sortie',
            quantite: ligne.quantite,
            motif: `Vente ${numeroFacture}`
          }
        });
      }

      return newVente;
    });

    // Retourner la vente avec ses détails
    return await this.getSaleById(vente.id);
  }

  /**
   * Récupérer les ventes
   */
  async getSales(siteLavageId, filters = {}) {
    const { startDate, endDate, clientUserId, managerUserId, page = 1, limit = 10 } = filters;

    const where = {
      siteLavageId: parseInt(siteLavageId)
      // On récupère toutes les ventes, y compris celles annulées
    };

    if (clientUserId) {
      where.clientUserId = parseInt(clientUserId);
    }

    if (managerUserId) {
      where.managerUserId = parseInt(managerUserId);
    }

    if (startDate || endDate) {
      where.dateVente = {};
      if (startDate) {
        where.dateVente.gte = new Date(startDate);
      }
      if (endDate) {
        where.dateVente.lte = new Date(endDate);
      }
    }

    // Calculer le skip pour la pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const take = parseInt(limit);

    // Récupérer le total et les ventes
    const [total, ventes] = await Promise.all([
      prisma.vente.count({ where }),
      prisma.vente.findMany({
        where,
        include: {
          lignesVente: {
            include: {
              produit: true
            }
          },
          clientUser: {
            select: {
              id: true,
              nom: true,
              prenom: true,
              telephone: true
            }
          },
          manager: {
            select: {
              id: true,
              nom: true,
              prenom: true
            }
          }
        },
        orderBy: {
          dateVente: 'desc'
        },
        skip,
        take
      })
    ]);

    return {
      ventes,
      total,
      page: parseInt(page),
      limit: parseInt(limit),
      totalPages: Math.ceil(total / parseInt(limit))
    };
  }

  /**
   * Récupérer une vente par ID
   */
  async getSaleById(id) {
    const vente = await prisma.vente.findUnique({
      where: { id: parseInt(id) },
      include: {
        lignesVente: {
          include: {
            produit: {
              include: {
                categorie: true
              }
            }
          }
        },
        clientUser: {
          select: {
            id: true,
            nom: true,
            prenom: true,
            telephone: true,
            email: true
          }
        },
        manager: {
          select: {
            id: true,
            nom: true,
            prenom: true
          }
        }
      }
    });

    if (!vente) {
      throw new NotFoundError('Vente non trouvée');
    }

    return vente;
  }

  /**
   * Récupérer les statistiques de vente
   */
  async getSalesStats(siteLavageId, filters = {}) {
    const { startDate, endDate } = filters;

    const where = {
      siteLavageId: parseInt(siteLavageId),
      flag: true // Exclure les ventes annulées
    };

    if (startDate || endDate) {
      where.dateVente = {};
      if (startDate) {
        where.dateVente.gte = new Date(startDate);
      }
      if (endDate) {
        where.dateVente.lte = new Date(endDate);
      }
    }

    const [ventes, totalRevenue, allStocks] = await Promise.all([
      // Nombre de ventes
      prisma.vente.count({ where }),

      // Revenu total
      prisma.vente.aggregate({
        where,
        _sum: {
          montantTotal: true
        }
      }),

      // Récupérer tous les stocks pour compter ceux en alerte
      prisma.stockproduit.findMany({
        where: {
          siteLavageId: parseInt(siteLavageId)
        },
        select: {
          stock: true,
          stockAlerte: true
        }
      })
    ]);

    // Compter les produits en stock faible (stock <= stockAlerte)
    const lowStockCount = allStocks.filter(s => s.stock <= s.stockAlerte).length;

    // Nombre total de produits disponibles pour ce site
    const totalProducts = allStocks.length;

    return {
      ventesCount: ventes,
      totalRevenue: totalRevenue._sum.montantTotal || 0,
      lowStockCount,
      totalProducts
    };
  }

  /**
   * Générer un numéro de facture unique
   */
  async generateInvoiceNumber(siteLavageId) {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');

    // Trouver le dernier numéro de facture du jour
    const lastVente = await prisma.vente.findFirst({
      where: {
        siteLavageId: parseInt(siteLavageId),
        numeroFacture: {
          startsWith: `V-${year}${month}${day}`
        }
      },
      orderBy: {
        numeroFacture: 'desc'
      }
    });

    let sequence = 1;
    if (lastVente) {
      const lastSequence = parseInt(lastVente.numeroFacture.split('-').pop());
      sequence = lastSequence + 1;
    }

    return `V-${year}${month}${day}-${String(sequence).padStart(4, '0')}`;
  }

  /**
   * Annuler une vente
   */
  async cancelSale(venteId, managerUserId) {
    const vente = await prisma.vente.findUnique({
      where: { id: parseInt(venteId) },
      include: {
        lignesVente: {
          include: {
            produit: true
          }
        }
      }
    });

    if (!vente) {
      throw new NotFoundError('Vente non trouvée');
    }

    // Vérifier que la vente n'est pas déjà annulée
    if (!vente.flag) {
      throw new ValidationError('Cette vente est déjà annulée');
    }

    // Vérifier que c'est le manager qui a créé la vente
    if (vente.managerUserId !== managerUserId) {
      throw new ValidationError('Seul le manager ayant enregistré la vente peut l\'annuler');
    }

    // Vérifier que la vente a moins de 12h
    const saleDate = new Date(vente.dateVente);
    const now = new Date();
    const hoursDiff = (now - saleDate) / (1000 * 60 * 60);

    if (hoursDiff > 12) {
      throw new ValidationError('Impossible d\'annuler une vente de plus de 12 heures');
    }

    // Annuler la vente dans une transaction (soft delete)
    await prisma.$transaction(async (tx) => {
      // Remettre les stocks
      for (const ligne of vente.lignesVente) {
        // Récupérer le stock actuel
        const currentStock = await tx.stockproduit.findUnique({
          where: {
            produitId_siteLavageId: {
              produitId: ligne.produitId,
              siteLavageId: vente.siteLavageId
            }
          }
        });

        if (currentStock) {
          // Restaurer le stock
          await tx.stockproduit.update({
            where: {
              produitId_siteLavageId: {
                produitId: ligne.produitId,
                siteLavageId: vente.siteLavageId
              }
            },
            data: {
              stock: {
                increment: ligne.quantite
              }
            }
          });

          // Créer un mouvement de stock pour l'annulation
          await tx.mouvementstock.create({
            data: {
              stockProduitId: currentStock.id,
              type: 'Entree',
              quantite: ligne.quantite,
              motif: `Annulation vente ${vente.numeroFacture}`
            }
          });
        }
      }

      // Marquer la vente comme annulée (soft delete)
      await tx.vente.update({
        where: { id: vente.id },
        data: {
          flag: false
        }
      });
    });

    return { message: 'Vente annulée avec succès' };
  }
}

module.exports = new ShopService();
