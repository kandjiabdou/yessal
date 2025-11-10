import apiClient from '@/lib/axios';
import axios from 'axios';
import { FILE_SERVICE_URL, FILE_SERVICE_API_KEY } from '@/config/env';
export interface FluxFinancierPreuve {
  id: number;
  fluxFinancierId: number;
  fileId: string;
  filename: string;
  downloadUrl: string;
  mimetype: string;
  size: number;
  uploadedAt: string;
}

export interface UserReference {
  id: string;
  sourceApp: 'ASSOCIE' | 'MANAGER';
  sourceUserId: string;
  email?: string | null;
  prenom?: string;
  nom?: string;
  lastSyncedAt: string;
}

export interface LaverieReference {
  id: string;
  sourceApp: 'ASSOCIE' | 'MANAGER';
  sourceLaverieId: number;
  nom: string;
  adresse?: string;
  telephone?: string;
  ville?: string;
  lastSyncedAt: string;
}

export interface FluxFinancier {
  id: number;
  type: "depense" | "recette" | "emprunt" | "pret";
  montant: number;
  dateFluxFinancier: string;
  motif?: string;
  beneficiaire?: string;
  sourceFinancement?: "caisse" | "banque" | "autre";
  description?: string;
  status: "pending" | "validated" | "rejected" | "cancelled";
  laverieId: number; // Gardé pour compatibilité
  laverieRefId?: string;
  laverieRef?: LaverieReference;
  createdByRefId: string;
  createdByRef?: UserReference;
  validatedByRefId?: string;
  validatedByRef?: UserReference;
  validatedAt?: string;
  createdAt: string;
  updatedAt: string;
  preuves?: FluxFinancierPreuve[];
}

export interface CreateFluxFinancierData {
  type: 'depense' | 'recette' | 'emprunt' | 'pret';
  montant: number;
  dateFluxFinancier: string;
  motif?: string;
  beneficiaire?: string;
  sourceFinancement?: 'caisse' | 'banque' | 'propre' | 'autre';
  description?: string;
  laverieId?: number; // Optionnel pour associé
  createdBy: number;
  actionnaire?: string; // Pour emprunt/prêt
  dateEcheance?: string; // Pour emprunt/prêt
  devise?: 'FCFA' | 'EUR' | 'USD';
}

export interface FluxFinancierResponse {
  success: boolean;
  message?: string;
  data?: FluxFinancier;
}

export interface FluxFinancierListResponse {
  success: boolean;
  message?: string;
  data?: FluxFinancier[];
  pagination?: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
  total?: number; // Pour mode groupé
}

export interface FluxFinancierGroupedByLaverie {
  laverieRefId: string | null;
  laverieRef?: LaverieReference;
  flux: FluxFinancier[];
  stats: {
    depenses: { total: number; count: number };
    recettes: { total: number; count: number };
    emprunts: { total: number; count: number };
    prets: { total: number; count: number };
  };
}

export interface FluxFinancierGroupedResponse {
  success: boolean;
  message?: string;
  data?: FluxFinancierGroupedByLaverie[];
  total?: number;
}

export interface FluxFinancierStatsResponse {
  success: boolean;
  message?: string;
  data?: {
    depenses: {
      total: number;
      count: number;
    };
    recettes: {
      total: number;
      count: number;
    };
    emprunts?: {
      total: number;
      count: number;
    };
    prets?: {
      total: number;
      count: number;
    };
    solde: number;
    devise: string;
  };
}

export interface UploadFileResponse {
  success: boolean;
  data?: {
    fileId: string;
    filename: string;
    downloadUrl: string;
    mimetype: string;
    size: number;
  };
  message?: string;
}

export interface UploadMultipleFilesResponse {
  success: boolean;
  data?: Array<{
    fileId: string;
    filename: string;
    downloadUrl: string;
    mimetype: string;
    size: number;
  }>;
  errors?: Array<{
    index: number;
    filename: string;
    error: string;
  }>;
  message?: string;
}

class FluxFinancierService {
  /**
   * Crée un nouveau flux financier
   */
  static async createFluxFinancier(data: CreateFluxFinancierData): Promise<FluxFinancierResponse> {
    try {
      const response = await apiClient.post<FluxFinancierResponse>('/flux-financier', data);
      return response.data;
    } catch (error) {
      console.error('Erreur lors de la création du flux financier:', error);
      if (axios.isAxiosError(error) && error.response) {
        return error.response.data;
      }
      return {
        success: false,
        message: 'Erreur lors de la création du flux financier'
      };
    }
  }

  /**
   * Récupère tous les flux financiers (pas besoin de laverieId pour associé)
   * Supporte deux modes:
   * - simple (groupByLaverie=false): liste triée par date avec pagination
   * - groupé (groupByLaverie=true): flux regroupés par laverie avec stats
   */
  static async getFluxFinanciers(
    options?: {
      laverieIds?: number[]; // Filtrer par laveries spécifiques
      page?: number;
      limit?: number;
      month?: string; // Format: YYYY-MM
      year?: string;
      type?: 'depense' | 'recette' | 'emprunt' | 'pret';
      sourceApp?: 'MANAGER' | 'ASSOCIE'; // Filtrer par source
      groupByLaverie?: boolean; // Mode groupé ou simple
    }
  ): Promise<FluxFinancierListResponse | FluxFinancierGroupedResponse> {
    try {
      const params = new URLSearchParams();

      if (options?.laverieIds && options.laverieIds.length > 0) {
        params.append('laverieIds', options.laverieIds.join(','));
      }
      if (options?.page) params.append('page', options.page.toString());
      if (options?.limit) params.append('limit', options.limit.toString());
      if (options?.month) params.append('month', options.month);
      if (options?.year) params.append('year', options.year);
      if (options?.type) params.append('type', options.type);
      if (options?.sourceApp) params.append('sourceApp', options.sourceApp);
      if (options?.groupByLaverie) params.append('groupByLaverie', 'true');

      const response = await apiClient.get<FluxFinancierListResponse | FluxFinancierGroupedResponse>(
        `/flux-financier?${params.toString()}`
      );
      
      return response.data;
    } catch (error) {
      console.error('Erreur lors de la récupération des flux financiers:', error);
      if (axios.isAxiosError(error) && error.response) {
        return error.response.data;
      }
      return {
        success: false,
        message: 'Erreur lors de la récupération des flux financiers',
        data: [],
        pagination: { total: 0, page: 1, limit: 20, totalPages: 0 }
      };
    }
  }

  /**
   * Récupère les statistiques des flux financiers
   */
  static async getStatistics(
    laverieId?: number, // Optionnel pour associé
    options?: {
      month?: string; // Format: YYYY-MM
      year?: string;
      startDate?: string;
      endDate?: string;
    }
  ): Promise<FluxFinancierStatsResponse> {
    try {
      const params = new URLSearchParams();

      if (options?.month) params.append('month', options.month);
      if (options?.year) params.append('year', options.year);
      if (options?.startDate) params.append('startDate', options.startDate);
      if (options?.endDate) params.append('endDate', options.endDate);

      const queryString = params.toString();
      // Si laverieId est fourni, utiliser l'ancienne route, sinon la route générale
      const baseUrl = laverieId 
        ? `/flux-financier/${laverieId}/stats`
        : `/flux-financier/stats`;
      const url = queryString ? `${baseUrl}?${queryString}` : baseUrl;

      const response = await apiClient.get<FluxFinancierStatsResponse>(url);
      return response.data;
    } catch (error) {
      console.error('Erreur lors de la récupération des statistiques:', error);
      if (axios.isAxiosError(error) && error.response) {
        return error.response.data;
      }
      return {
        success: false,
        message: 'Erreur lors de la récupération des statistiques'
      };
    }
  }

  /**
   * Récupère un flux financier par son ID
   */
  static async getFluxFinancierById(id: number): Promise<FluxFinancier | null> {
    try {
      const response = await apiClient.get<FluxFinancierResponse>(`/flux-financier/${id}`);
      if (response.data.success && response.data.data) {
        return response.data.data;
      }
      return null;
    } catch (error) {
      console.error('Erreur lors de la récupération du flux financier:', error);
      return null;
    }
  }

  /**
   * Met à jour un flux financier
   */
  static async updateFlux(
    fluxId: number,
    data: Partial<Omit<CreateFluxFinancierData, 'laverieId' | 'createdBy'>>
  ): Promise<FluxFinancierResponse> {
    try {
      const response = await apiClient.put<FluxFinancierResponse>(
        `/flux-financier/${fluxId}`,
        data
      );
      return response.data;
    } catch (error) {
      console.error('Erreur lors de la modification du flux financier:', error);
      if (axios.isAxiosError(error) && error.response) {
        return error.response.data;
      }
      return {
        success: false,
        message: 'Erreur lors de la modification du flux financier'
      };
    }
  }

  /**
   * Workflow complet : modifier un flux financier et ajouter des nouveaux fichiers
   */
  static async updateFluxWithFiles(
    fluxId: number,
    fluxData: Partial<Omit<CreateFluxFinancierData, 'laverieId' | 'createdBy'>>,
    newFiles: File[],
    createdBy: number
  ): Promise<{ success: boolean; message: string }> {
    try {
      // Étape 1 : Mettre à jour le flux financier
      const updateResponse = await this.updateFlux(fluxId, fluxData);
      
      if (!updateResponse.success) {
        return {
          success: false,
          message: updateResponse.message || 'Erreur lors de la modification du flux financier'
        };
      }

      // Étape 2 : Upload et attachement des nouveaux fichiers (si présents)
      if (newFiles.length > 0) {
        const uploadResponse = await this.uploadMultipleFiles(newFiles, createdBy);

        if (!uploadResponse.success || !uploadResponse.data) {
          return {
            success: true, // Le flux est modifié mais sans nouveaux fichiers
            message: 'Flux modifié mais erreur lors de l\'upload des nouveaux fichiers'
          };
        }

        // Étape 3 : Attacher les nouveaux fichiers au flux
        const uploadedFiles = uploadResponse.data;
        const attachPromises = uploadedFiles.map(fileInfo =>
          this.addPreuve(fluxId, fileInfo)
        );

        const attachResults = await Promise.all(attachPromises);
        const failedAttachments = attachResults.filter(r => !r.success);

        if (failedAttachments.length > 0) {
          return {
            success: true,
            message: `Flux modifié. ${uploadedFiles.length - failedAttachments.length}/${uploadedFiles.length} nouveau(x) fichier(s) ajouté(s)`
          };
        }

        return {
          success: true,
          message: `Flux financier modifié avec ${uploadedFiles.length} nouveau(x) fichier(s) ajouté(s)`
        };
      }

      return {
        success: true,
        message: 'Flux financier modifié avec succès'
      };
    } catch (error) {
      console.error('Erreur dans updateFluxWithFiles:', error);
      return {
        success: false,
        message: 'Erreur lors de la modification du flux financier'
      };
    }
  }

  /**
   * Upload un seul fichier vers le file-service
   */
  static async uploadFile(file: File, uploadedBy: number): Promise<UploadFileResponse> {
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('uploadedBy', uploadedBy.toString());
      formData.append('context', 'flux_financier');
      formData.append('description', `Preuve flux financier`);

      const response = await axios.post<UploadFileResponse>(
        `${FILE_SERVICE_URL}/api/files/upload`,
        formData,
        {
          headers: {
            'x-api-key': FILE_SERVICE_API_KEY,
            'Content-Type': 'multipart/form-data',
          },
        }
      );

      return response.data;
    } catch (error) {
      console.error('Erreur lors de l\'upload du fichier:', error);
      if (axios.isAxiosError(error) && error.response) {
        return error.response.data;
      }
      return {
        success: false,
        message: 'Erreur lors de l\'upload du fichier'
      };
    }
  }

  /**
   * Upload plusieurs fichiers vers le file-service (batch)
   */
  static async uploadMultipleFiles(files: File[], uploadedBy: number): Promise<UploadMultipleFilesResponse> {
    try {
      const formData = new FormData();
      
      for (const file of files) {
        formData.append('files', file);
      }
      
      formData.append('uploadedBy', uploadedBy.toString());
      formData.append('context', 'flux_financier');
      formData.append('description', `Preuves flux financier`);

      const response = await axios.post<UploadMultipleFilesResponse>(
        `${FILE_SERVICE_URL}/api/files/upload-multiple`,
        formData,
        {
          headers: {
            'x-api-key': FILE_SERVICE_API_KEY,
            'Content-Type': 'multipart/form-data',
          },
        }
      );

      return response.data;
    } catch (error) {
      console.error('Erreur lors de l\'upload des fichiers:', error);
      if (axios.isAxiosError(error) && error.response) {
        return error.response.data;
      }
      return {
        success: false,
        message: 'Erreur lors de l\'upload des fichiers'
      };
    }
  }

  /**
   * Ajoute une preuve (pièce jointe) à un flux financier
   */
  static async addPreuve(
    fluxId: number,
    preuveData: {
      fileId: string;
      filename: string;
      downloadUrl: string;
      mimetype: string;
      size: number;
    }
  ): Promise<FluxFinancierResponse> {
    try {
      const response = await apiClient.post<FluxFinancierResponse>(
        `/flux-financier/${fluxId}/preuves`,
        preuveData
      );
      return response.data;
    } catch (error) {
      console.error('Erreur lors de l\'ajout de la preuve:', error);
      if (axios.isAxiosError(error) && error.response) {
        return error.response.data;
      }
      return {
        success: false,
        message: 'Erreur lors de l\'ajout de la preuve'
      };
    }
  }

  /**
   * Supprime un fichier du file-service
   */
  static async deleteFile(fileId: string): Promise<{ success: boolean; message?: string }> {
    try {
      const response = await axios.delete<{ success: boolean; message?: string }>(
        `${FILE_SERVICE_URL}/api/files/${fileId}`,
        {
          headers: {
            'x-api-key': FILE_SERVICE_API_KEY,
          },
        }
      );
      return response.data;
    } catch (error) {
      console.error('Erreur lors de la suppression du fichier:', error);
      if (axios.isAxiosError(error) && error.response) {
        return error.response.data;
      }
      return {
        success: false,
        message: 'Erreur lors de la suppression du fichier'
      };
    }
  }

  /**
   * Supprime plusieurs fichiers du file-service
   */
  static async deleteMultipleFiles(fileIds: string[]): Promise<{ 
    success: boolean; 
    deleted: number; 
    failed: number;
    message?: string 
  }> {
    try {
      const deletePromises = fileIds.map(fileId => this.deleteFile(fileId));
      const results = await Promise.all(deletePromises);
      
      const deleted = results.filter(r => r.success).length;
      const failed = results.filter(r => !r.success).length;
      
      return {
        success: failed === 0,
        deleted,
        failed,
        message: failed > 0 
          ? `${deleted} fichier(s) supprimé(s), ${failed} échec(s)`
          : `${deleted} fichier(s) supprimé(s) avec succès`
      };
    } catch (error) {
      console.error('Erreur lors de la suppression des fichiers:', error);
      return {
        success: false,
        deleted: 0,
        failed: fileIds.length,
        message: 'Erreur lors de la suppression des fichiers'
      };
    }
  }

  /**
   * Supprime une preuve d'un flux financier (avec suppression du fichier physique)
   * Étape 1: Récupère les infos de la preuve
   * Étape 2: Supprime la référence en base via l'API
   * Étape 3: Supprime le fichier physique du file-service
   */
  static async deletePreuve(preuveId: number, fileId: string): Promise<{ success: boolean; message?: string }> {
    try {
      // Étape 1: Supprimer la référence en base de données
      const deletePreuveResponse = await apiClient.delete<{ success: boolean; message?: string }>(
        `/flux-financier/preuves/${preuveId}`
      );

      if (!deletePreuveResponse.data.success) {
        return deletePreuveResponse.data;
      }

      // Étape 2: Supprimer le fichier physique du file-service
      const deleteFileResponse = await this.deleteFile(fileId);

      if (!deleteFileResponse.success) {
        console.warn(`Preuve supprimée mais erreur lors de la suppression du fichier ${fileId}`);
        // On retourne quand même success car la référence est supprimée
        return {
          success: true,
          message: 'Preuve supprimée (fichier physique non supprimé)'
        };
      }

      return {
        success: true,
        message: 'Preuve et fichier supprimés avec succès'
      };
    } catch (error) {
      console.error('Erreur lors de la suppression de la preuve:', error);
      if (axios.isAxiosError(error) && error.response) {
        return error.response.data;
      }
      return {
        success: false,
        message: 'Erreur lors de la suppression de la preuve'
      };
    }
  }

  /**
   * Workflow complet : créer un flux financier avec upload de fichiers
   */
  static async createFluxWithFiles(
    fluxData: CreateFluxFinancierData,
    files: File[]
  ): Promise<{ success: boolean; message: string; fluxId?: number }> {
    try {
      // Étape 1 : Créer le flux financier
      const fluxResponse = await this.createFluxFinancier(fluxData);
      
      if (!fluxResponse.success || !fluxResponse.data) {
        return {
          success: false,
          message: fluxResponse.message || 'Erreur lors de la création du flux financier'
        };
      }

      const fluxId = fluxResponse.data.id;

      // Étape 2 : Upload des fichiers (si présents)
      if (files.length > 0) {
        const uploadResponse = await this.uploadMultipleFiles(files, fluxData.createdBy);

        if (!uploadResponse.success || !uploadResponse.data) {
          return {
            success: true, // Le flux est créé mais sans fichiers
            message: 'Flux créé mais erreur lors de l\'upload des fichiers',
            fluxId
          };
        }

        // Étape 3 : Attacher les fichiers au flux
        const uploadedFiles = uploadResponse.data;
        const attachPromises = uploadedFiles.map(fileInfo =>
          this.addPreuve(fluxId, fileInfo)
        );

        const attachResults = await Promise.all(attachPromises);
        const failedAttachments = attachResults.filter(r => !r.success);

        if (failedAttachments.length > 0) {
          return {
            success: true,
            message: `Flux créé. ${uploadedFiles.length - failedAttachments.length}/${uploadedFiles.length} fichiers attachés`,
            fluxId
          };
        }

        return {
          success: true,
          message: `Flux financier créé avec ${uploadedFiles.length} pièce(s) jointe(s)`,
          fluxId
        };
      }

      return {
        success: true,
        message: 'Flux financier créé avec succès',
        fluxId
      };
    } catch (error) {
      console.error('Erreur dans createFluxWithFiles:', error);
      return {
        success: false,
        message: 'Erreur lors de la création du flux financier'
      };
    }
  }

  /**
   * Supprime un flux financier et tous ses fichiers associés
   * Étape 1: Supprime le flux et récupère les fileIds des preuves
   * Étape 2: Supprime tous les fichiers physiques
   */
  static async deleteFlux(fluxId: number): Promise<{ success: boolean; message: string }> {
    try {
      // Étape 1: Supprimer le flux et récupérer les fileIds
      const deleteFluxResponse = await apiClient.delete<{
        success: boolean;
        message?: string;
        data?: {
          fileIds: string[];
          preuvesCount: number;
        };
      }>(`/flux-financier/${fluxId}`);

      if (!deleteFluxResponse.data.success) {
        return {
          success: false,
          message: deleteFluxResponse.data.message || 'Erreur lors de la suppression du flux'
        };
      }

      const fileIds = deleteFluxResponse.data.data?.fileIds || [];
      const preuvesCount = deleteFluxResponse.data.data?.preuvesCount || 0;

      // Étape 2: Supprimer tous les fichiers physiques (si présents)
      if (fileIds.length > 0) {
        const deleteFilesResult = await this.deleteMultipleFiles(fileIds);
        
        if (!deleteFilesResult.success) {
          console.warn(`Flux supprimé mais ${deleteFilesResult.failed} fichier(s) non supprimé(s)`);
          return {
            success: true,
            message: `Flux supprimé (${deleteFilesResult.deleted}/${preuvesCount} fichier(s) supprimé(s))`
          };
        }

        return {
          success: true,
          message: `Flux et ${preuvesCount} fichier(s) supprimés avec succès`
        };
      }

      return {
        success: true,
        message: 'Flux financier supprimé avec succès'
      };
    } catch (error) {
      console.error('Erreur lors de la suppression du flux:', error);
      if (axios.isAxiosError(error) && error.response) {
        return error.response.data;
      }
      return {
        success: false,
        message: 'Erreur lors de la suppression du flux financier'
      };
    }
  }

  /**
   * Valider un flux financier (ASSOCIE)
   */
  static async validateFlux(fluxId: number): Promise<FluxFinancierResponse> {
    try {
      const response = await apiClient.post<FluxFinancierResponse>(`/flux-financier/${fluxId}/validate`);
      return response.data;
    } catch (error) {
      console.error('Erreur lors de la validation du flux financier:', error);
      if (axios.isAxiosError(error) && error.response) {
        return error.response.data;
      }
      return { success: false, message: 'Erreur lors de la validation du flux financier' };
    }
  }
}

export default FluxFinancierService;
