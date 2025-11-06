import express from 'express';
import filesController from '../controllers/files.controller.js';
import { uploadSingle, uploadMultiple } from '../utils/upload.js';
import { authenticateApiKey } from '../middleware/auth.js';

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
 * @route GET /api/files/list
 * @desc Liste tous les fichiers
 * @access Privé (API Key requise)
 */
router.get(
  '/list',
  authenticateApiKey,
  filesController.listFiles
);

/**
 * @route GET /api/files/download/:fileId
 * @desc Télécharge un fichier (force download)
 * @access Public (UUID difficile à deviner)
 */
router.get(
  '/download/:fileId',
  filesController.downloadFile
);

/**
 * @route GET /api/files/view/:fileId
 * @desc Affiche/visualise un fichier dans le navigateur (inline)
 * @access Public (UUID difficile à deviner)
 */
router.get(
  '/view/:fileId',
  filesController.viewFile
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
 * @route DELETE /api/files/:fileId
 * @desc Supprime un fichier
 * @access Privé (API Key requise)
 */
router.delete(
  '/:fileId',
  authenticateApiKey,
  filesController.deleteFile
);

export default router;
