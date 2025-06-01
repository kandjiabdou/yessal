const prisma = require('../utils/prismaClient');
const { AppError } = require('../utils/errors');

const updateManagerSite = async (req, res, next) => {
  try {
    const managerId = parseInt(req.params.id);
    const { siteId } = req.body;

    // Vérifier que le manager existe
    const manager = await prisma.user.findUnique({
      where: { id: managerId, role: 'Manager' }
    });

    if (!manager) {
      throw new AppError('Manager non trouvé', 404);
    }

    // Vérifier que le site existe
    const site = await prisma.siteLavage.findUnique({
      where: { id: siteId }
    });

    if (!site) {
      throw new AppError('Site de lavage non trouvé', 404);
    }

    // Vérifier que le manager qui fait la requête est bien celui qui est concerné
    if (req.user.id !== managerId) {
      throw new AppError('Vous ne pouvez pas modifier le site principal d\'un autre manager', 403);
    }

    // Mettre à jour le site principal du manager
    const updatedManager = await prisma.user.update({
      where: { id: managerId },
      data: { siteLavagePrincipalGerantId: siteId }
    });

    res.json({
      success: true,
      message: 'Site principal mis à jour avec succès',
      data: {
        id: updatedManager.id,
        siteLavagePrincipalGerantId: updatedManager.siteLavagePrincipalGerantId
      }
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  updateManagerSite
}; 