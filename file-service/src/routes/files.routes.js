import express from 'express';
import filesController from '../controllers/files.controller.js';
import { uploadSingle, uploadMultiple } from '../utils/upload.js';
import { authenticateApiKey, verifyDownloadToken } from '../middleware/auth.js';

const router = express.Router();

/**
 * @route POST /api/files/upload
 * @desc Upload un nouveau fichier
 * @access Privé (API Key requise)
 */
router.post(
  '/upload',
  authenticateApiKey,
  uploadSingle,
  filesController.uploadFile
);

/**
 * @route POST /api/files/upload-multiple
 * @desc Upload plusieurs fichiers (max 10 par défaut)
 * @access Privé (API Key requise)
 */
router.post(
  '/upload-multiple',
  authenticateApiKey,
  uploadMultiple,
  filesController.uploadMultipleFiles
);

/**
 * @route GET /api/files/:fileId
 * @desc Récupère les informations d'un fichier
 * @access Privé (API Key requise)
 */
router.get(
  '/:fileId',
  authenticateApiKey,
  filesController.getFileInfo
);

/**
 * @route GET /api/files/download/:fileId
 * @desc Télécharge un fichier avec token signé
 * @access Public (token signé requis)
 */
router.get(
  '/download/:fileId',
  verifyDownloadToken,
  filesController.downloadFile
);

/**
 * @route DELETE /api/files/:fileId
 * @desc Supprime un fichier
 * @access Privé (API Key requise)
 */
router.delete(
  '/:fileId',
  authenticateApiKey,
  filesController.deleteFile
);

/**
 * @route GET /api/files
 * @desc Liste tous les fichiers
 * @access Privé (API Key requise)
 */
router.get(
  '/',
  authenticateApiKey,
  filesController.listFiles
);

export default router;
