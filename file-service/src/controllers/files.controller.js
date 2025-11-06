import storageService from '../utils/storage.js';

/**
 * Contrôleur pour la gestion des fichiers
 */
class FilesController {
  /**
   * Upload un nouveau fichier
   * POST /api/files/upload
   */
  async uploadFile(req, res) {
    try {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: 'Aucun fichier fourni'
        });
      }
      
      const metadata = {
        uploadedBy: req.body.uploadedBy || 'unknown',
        source: req.source, // manager ou associe
        context: req.body.context || 'general', // flux_financier, transaction, etc.
        description: req.body.description || ''
      };
      
      const fileInfo = await storageService.saveFile(req.file, metadata);
      
      // Générer les URLs permanentes
      const downloadUrl = storageService.generateDownloadUrl(fileInfo.id);
      const viewUrl = storageService.generateViewUrl(fileInfo.id);
      
      res.status(201).json({
        success: true,
        message: 'Fichier uploadé avec succès',
        data: {
          fileId: fileInfo.id,
          filename: fileInfo.originalName,
          mimetype: fileInfo.mimetype,
          size: fileInfo.size,
          downloadUrl,
          viewUrl,
          uploadedAt: fileInfo.uploadedAt
        }
      });
    } catch (error) {
      console.error('❌ Erreur upload fichier:', error);
      res.status(500).json({
        success: false,
        message: 'Erreur lors de l\'upload du fichier',
        error: error.message
      });
    }
  }

  /**
   * Upload plusieurs fichiers
   * POST /api/files/upload-multiple
   */
  async uploadMultipleFiles(req, res) {
    try {
      if (!req.files || req.files.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Aucun fichier fourni'
        });
      }
      
      const metadata = {
        uploadedBy: req.body.uploadedBy || 'unknown',
        source: req.source, // manager ou associe
        context: req.body.context || 'general',
        description: req.body.description || ''
      };
      
      const uploadedFiles = [];
      const errors = [];
      
      // Traiter chaque fichier
      for (let i = 0; i < req.files.length; i++) {
        try {
          const file = req.files[i];
          const fileInfo = await storageService.saveFile(file, metadata);
          const downloadUrl = storageService.generateDownloadUrl(fileInfo.id);
          const viewUrl = storageService.generateViewUrl(fileInfo.id);
          
          uploadedFiles.push({
            fileId: fileInfo.id,
            filename: fileInfo.originalName,
            mimetype: fileInfo.mimetype,
            size: fileInfo.size,
            downloadUrl,
            viewUrl,
            uploadedAt: fileInfo.uploadedAt
          });
        } catch (error) {
          errors.push({
            index: i,
            filename: req.files[i].originalname,
            error: error.message
          });
        }
      }
      
      // Si tous les fichiers ont échoué
      if (uploadedFiles.length === 0) {
        return res.status(500).json({
          success: false,
          message: 'Échec de l\'upload de tous les fichiers',
          errors
        });
      }
      
      // Si certains fichiers ont échoué (207 Multi-Status)
      if (errors.length > 0) {
        return res.status(207).json({
          success: true,
          message: `${uploadedFiles.length}/${req.files.length} fichier(s) uploadé(s)`,
          data: uploadedFiles,
          errors
        });
      }
      
      // Tous les fichiers uploadés avec succès
      res.status(201).json({
        success: true,
        message: `${uploadedFiles.length} fichier(s) uploadé(s) avec succès`,
        data: uploadedFiles
      });
    } catch (error) {
      console.error('❌ Erreur upload multiple:', error);
      res.status(500).json({
        success: false,
        message: 'Erreur lors de l\'upload des fichiers',
        error: error.message
      });
    }
  }

  /**
   * Récupère les informations d'un fichier
   * GET /api/files/:fileId
   */
  async getFileInfo(req, res) {
    try {
      const { fileId } = req.params;
      
      const fileInfo = storageService.getFileInfo(fileId);
      
      if (!fileInfo) {
        return res.status(404).json({
          success: false,
          message: 'Fichier non trouvé'
        });
      }
      
      // Générer les URLs permanentes
      const downloadUrl = storageService.generateDownloadUrl(fileInfo.id);
      const viewUrl = storageService.generateViewUrl(fileInfo.id);
      
      res.json({
        success: true,
        data: {
          fileId: fileInfo.id,
          filename: fileInfo.originalName,
          mimetype: fileInfo.mimetype,
          size: fileInfo.size,
          downloadUrl,
          viewUrl,
          uploadedAt: fileInfo.uploadedAt,
          metadata: fileInfo.metadata
        }
      });
    } catch (error) {
      console.error('❌ Erreur récupération info fichier:', error);
      res.status(500).json({
        success: false,
        message: 'Erreur lors de la récupération des informations',
        error: error.message
      });
    }
  }

  /**
   * Télécharge un fichier (force le download)
   * GET /api/files/download/:fileId
   */
  async downloadFile(req, res) {
    try {
      const { fileId } = req.params;
      
      const fileInfo = storageService.getFileInfo(fileId);
      
      if (!fileInfo) {
        return res.status(404).json({
          success: false,
          message: 'Fichier non trouvé'
        });
      }
      
      // Envoyer le fichier avec header de téléchargement
      res.setHeader('Content-Type', fileInfo.mimetype);
      res.setHeader('Content-Disposition', `attachment; filename="${fileInfo.originalName}"`);
      res.sendFile(fileInfo.path, { root: '.' });
    } catch (error) {
      console.error('❌ Erreur téléchargement fichier:', error);
      res.status(500).json({
        success: false,
        message: 'Erreur lors du téléchargement',
        error: error.message
      });
    }
  }

  /**
   * Affiche/visualise un fichier (inline dans le navigateur)
   * GET /api/files/view/:fileId
   */
  async viewFile(req, res) {
    try {
      const { fileId } = req.params;
      
      const fileInfo = storageService.getFileInfo(fileId);
      
      if (!fileInfo) {
        return res.status(404).json({
          success: false,
          message: 'Fichier non trouvé'
        });
      }
      
      // Envoyer le fichier pour affichage inline
      res.setHeader('Content-Type', fileInfo.mimetype);
      res.setHeader('Content-Disposition', `inline; filename="${fileInfo.originalName}"`);
      res.sendFile(fileInfo.path, { root: '.' });
    } catch (error) {
      console.error('❌ Erreur visualisation fichier:', error);
      res.status(500).json({
        success: false,
        message: 'Erreur lors de la visualisation',
        error: error.message
      });
    }
  }

  /**
   * Supprime un fichier
   * DELETE /api/files/:fileId
   */
  async deleteFile(req, res) {
    try {
      const { fileId } = req.params;
      
      const fileInfo = storageService.getFileInfo(fileId);
      
      if (!fileInfo) {
        return res.status(404).json({
          success: false,
          message: 'Fichier non trouvé'
        });
      }
      
      // Vérifier que la source correspond (manager ne peut pas supprimer les fichiers de l'associé)
      if (fileInfo.metadata.source !== req.source) {
        return res.status(403).json({
          success: false,
          message: 'Vous n\'avez pas l\'autorisation de supprimer ce fichier'
        });
      }
      
      const deleted = storageService.deleteFile(fileId);
      
      if (!deleted) {
        return res.status(500).json({
          success: false,
          message: 'Erreur lors de la suppression du fichier'
        });
      }
      
      res.json({
        success: true,
        message: 'Fichier supprimé avec succès'
      });
    } catch (error) {
      console.error('❌ Erreur suppression fichier:', error);
      res.status(500).json({
        success: false,
        message: 'Erreur lors de la suppression',
        error: error.message
      });
    }
  }

  /**
   * Liste tous les fichiers (pour administration)
   * GET /api/files
   */
  async listFiles(req, res) {
    try {
      const files = storageService.listFiles();
      
      // Filtrer par source si spécifié
      let filteredFiles = files;
      if (req.query.source) {
        filteredFiles = files.filter(f => f.metadata?.source === req.query.source);
      }
      
      // Générer les URLs permanentes
      const filesWithUrls = filteredFiles.map(file => ({
        fileId: file.id,
        filename: file.originalName,
        mimetype: file.mimetype,
        size: file.size,
        uploadedAt: file.uploadedAt,
        metadata: file.metadata,
        downloadUrl: storageService.generateDownloadUrl(file.id),
        viewUrl: storageService.generateViewUrl(file.id)
      }));
      
      res.json({
        success: true,
        data: filesWithUrls,
        total: filesWithUrls.length
      });
    } catch (error) {
      console.error('❌ Erreur liste fichiers:', error);
      res.status(500).json({
        success: false,
        message: 'Erreur lors de la récupération de la liste',
        error: error.message
      });
    }
  }
}

export default new FilesController();
