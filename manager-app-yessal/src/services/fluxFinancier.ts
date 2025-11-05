import apiClient from '@/lib/axios';
import axios from 'axios';

// URL du service de fichiers
const FILE_SERVICE_URL = "http://localhost:4540";
const FILE_SERVICE_API_KEY = 'yessal-manager-2025';

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

export interface FluxFinancier {
  id: number;
  type: 'depense' | 'recette';
  montant: number;
  dateFluxFinancier: string;
  motif?: string;
  beneficiaire?: string;
  sourceFinancement?: 'caisse' | 'banque' | 'autre';
  description?: string;
  validationStatus: 'pending' | 'validated' | 'rejected';
  laverieId: number;
  createdBy: number;
  validatedBy?: number;
  validatedAt?: string;
  createdAt: string;
  updatedAt: string;
  preuves?: FluxFinancierPreuve[];
}

export interface CreateFluxFinancierData {
  type: 'depense' | 'recette';
  montant: number;
  dateFluxFinancier: string;
  motif?: string;
  beneficiaire?: string;
  sourceFinancement?: 'caisse' | 'banque' | 'autre';
  description?: string;
  laverieId: number;
  createdBy: number;
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
   * Récupère tous les flux financiers d'une laverie
   */
  static async getFluxFinanciers(
    laverieId: number,
    options?: {
      page?: number;
      limit?: number;
      month?: string; // Format: YYYY-MM
      year?: string;
      type?: 'depense' | 'recette';
    }
  ): Promise<FluxFinancierListResponse> {
    try {
      const params = new URLSearchParams({
        laverieId: laverieId.toString()
      });

      if (options?.page) params.append('page', options.page.toString());
      if (options?.limit) params.append('limit', options.limit.toString());
      if (options?.month) params.append('month', options.month);
      if (options?.year) params.append('year', options.year);
      if (options?.type) params.append('type', options.type);

      const response = await apiClient.get<FluxFinancierListResponse>(
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
    laverieId: number,
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
      const baseUrl = `/flux-financier/laverie/${laverieId}/stats`;
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
   * Supprime une preuve d'un flux financier
   */
  static async deletePreuve(preuveId: number): Promise<{ success: boolean; message?: string }> {
    try {
      const response = await apiClient.delete<{ success: boolean; message?: string }>(
        `/flux-financier/preuves/${preuveId}`
      );
      return response.data;
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
}

export default FluxFinancierService;
