import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ArrowLeft, Upload, Trash2, Loader2 } from "lucide-react";
import { toast } from "react-toastify";
import AuthService from '@/services/auth';
import FluxFinancierService from '@/services/fluxFinancier';

interface CreateFluxFinancierData {
  type: 'depense' | 'recette' | 'apport' | 'retrait';
  montant: number;
  dateFluxFinancier: string;
  motif?: string;
  beneficiaire?: string;
  sourceFinancement?: 'caisse' | 'banque' | 'propre' | 'autre';
  description?: string;
  laverieId?: number;
  createdBy: number;
  actionnaire?: string;
  dateEcheance?: string;
  devise?: 'FCFA' | 'EUR' | 'USD';
}

const AddFlux: React.FC = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState<CreateFluxFinancierData>({
    type: 'depense',
    montant: 0,
    dateFluxFinancier: new Date().toISOString().split('T')[0],
    motif: '',
    beneficiaire: '',
    sourceFinancement: 'caisse',
    description: '',
    laverieId: undefined, // Optionnel pour associé
    createdBy: 0,
    actionnaire: '',
    dateEcheance: '',
    devise: 'FCFA'
  });

  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  // Gérer automatiquement la source de financement selon le type
  const handleTypeChange = (newType: 'depense' | 'recette' | 'apport' | 'retrait') => {
    let newSourceFinancement: 'caisse' | 'banque' | 'propre' | 'autre' | undefined = 'caisse';
    
    if (newType === 'apport') {
      newSourceFinancement = 'propre'; // Fonds propres pour apport
    } else if (newType === 'recette' || newType === 'retrait') {
      newSourceFinancement = undefined; // Pas de source de financement
    }

    setFormData({ 
      ...formData, 
      type: newType,
      sourceFinancement: newSourceFinancement
    });
  };

  React.useEffect(() => {
    const user = AuthService.getUser();
    if (!user) {
      navigate('/');
      return;
    }
    setFormData(prev => ({
      ...prev,
      laverieId: 0,
      createdBy: user.id,
      dateFluxFinancier: new Date().toISOString().split('T')[0],
    }));
  }, [navigate]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);

    // Validation
    const validFiles = files.filter(file => {
      const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'application/pdf'];
      const maxSize = 10 * 1024 * 1024; // 10MB

      if (!validTypes.includes(file.type)) {
        setError(`${file.name}: Type de fichier non autorisé (images et PDF uniquement)`);
        return false;
      }

      if (file.size > maxSize) {
        setError(`${file.name}: Fichier trop volumineux (max 10MB)`);
        return false;
      }

      return true;
    });

    setSelectedFiles(prev => [...prev, ...validFiles]);
    setError(null);
  };

  const removeFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setUploading(true);
    setUploadProgress(0);
    setError(null);

    try {
      // Validation
      if (!formData.montant || formData.montant <= 0) {
        setError('Le montant doit être supérieur à 0');
        setUploading(false);
        return;
      }

      // Validation : au moins une pièce jointe obligatoire
      if (selectedFiles.length === 0) {
        setError('Au moins une pièce jointe est obligatoire');
        setUploading(false);
        return;
      }

      setUploadProgress(20);

      // Créer le flux avec fichiers
      const result = await FluxFinancierService.createFluxWithFiles(formData, selectedFiles);

      setUploadProgress(100);

      if (result.success) {
        const typeLabels = {
          depense: 'Dépense',
          recette: 'Recette',
          apport: 'Apport',
          retrait: 'Retrait'
        };
        toast.success(`${typeLabels[formData.type]} créé(e) avec succès`);
        navigate('/depenses');
      } else {
        const errorMsg = result.message || 'Erreur lors de la création';
        setError(errorMsg);
        toast.error(errorMsg);
      }
    } catch (err) {
      console.error('Erreur:', err);
      const errorMsg = 'Une erreur est survenue lors de la création';
      setError(errorMsg);
      toast.error(errorMsg);
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const formatFileSize = (bytes: number): string => {
    return (bytes / 1024).toFixed(2) + ' KB';
  };

  // Obtenir la date du jour au format YYYY-MM-DD
  const getTodayDate = (): string => {
    return new Date().toISOString().split('T')[0];
  };

  return (
    <div className="space-y-6 pb-8">
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate('/depenses')}
          className="h-8 w-8"
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h1 className="text-2xl font-bold tracking-tight">Ajouter un flux financier</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Informations du flux</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Type */}
            <div className="space-y-2">
              <Label htmlFor="type">Type *</Label>
              <Select
                value={formData.type}
                onValueChange={handleTypeChange}
                disabled={uploading}
              >
                <SelectTrigger id="type">
                  <SelectValue placeholder="Sélectionner le type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="depense">Dépense</SelectItem>
                  <SelectItem value="recette">Recette</SelectItem>
                  <SelectItem value="apport">Apport</SelectItem>
                  <SelectItem value="retrait">Retrait</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Montant */}
            <div className="space-y-2">
              <Label htmlFor="montant">Montant (FCFA) *</Label>
              <Input
                id="montant"
                type="number"
                min="0"
                step="1"
                value={formData.montant || ''}
                onChange={(e) =>
                  setFormData({ ...formData, montant: Number.parseFloat(e.target.value) || 0 })
                }
                required
                disabled={uploading}
              />
            </div>

            {/* Date */}
            <div className="space-y-2">
              <Label htmlFor="date">Date *</Label>
              <Input
                id="date"
                type="date"
                value={formData.dateFluxFinancier}
                onChange={(e) =>
                  setFormData({ ...formData, dateFluxFinancier: e.target.value })
                }
                max={getTodayDate()}
                required
                disabled={uploading}
              />
            </div>

            {/* Date d'échéance (pour apport/retrait uniquement) */}
            {(formData.type === 'apport' || formData.type === 'retrait') && (
              <div className="space-y-2">
                <Label htmlFor="dateEcheance">Date d'échéance</Label>
                <Input
                  id="dateEcheance"
                  type="date"
                  value={formData.dateEcheance || ''}
                  onChange={(e) =>
                    setFormData({ ...formData, dateEcheance: e.target.value })
                  }
                  disabled={uploading}
                />
                <p className="text-xs text-gray-500">
                  Date prévue pour le remboursement
                </p>
              </div>
            )}

            {/* Motif */}
            <div className="space-y-2">
              <Label htmlFor="motif">Motif</Label>
              <Input
                id="motif"
                type="text"
                placeholder="Ex: Achat détergent, Paiement électricité..."
                value={formData.motif || ''}
                onChange={(e) =>
                  setFormData({ ...formData, motif: e.target.value })
                }
                disabled={uploading}
              />
            </div>

            {/* Bénéficiaire */}
            <div className="space-y-2">
              <Label htmlFor="beneficiaire">Bénéficiaire</Label>
              <Input
                id="beneficiaire"
                type="text"
                placeholder="Nom du fournisseur ou bénéficiaire"
                value={formData.beneficiaire || ''}
                onChange={(e) =>
                  setFormData({ ...formData, beneficiaire: e.target.value })
                }
                disabled={uploading}
              />
            </div>

            {/* Source financement - Visible uniquement pour les dépenses */}
            {formData.type === 'depense' && (
              <div className="space-y-2">
                <Label htmlFor="source">Source de financement</Label>
                <Select
                  value={formData.sourceFinancement || 'caisse'}
                  onValueChange={(value: 'caisse' | 'banque' | 'propre' | 'autre') =>
                    setFormData({ ...formData, sourceFinancement: value })
                  }
                  disabled={uploading}
                >
                  <SelectTrigger id="source">
                    <SelectValue placeholder="Sélectionner la source" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="caisse">Caisse</SelectItem>
                    <SelectItem value="banque">Banque</SelectItem>
                    <SelectItem value="propre">Fonds propres</SelectItem>
                    <SelectItem value="autre">Autre</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Source financement - Affichage pour apport (non éditable) */}
            {formData.type === 'apport' && (
              <div className="space-y-2">
                <Label htmlFor="source">Source de financement</Label>
                <Input
                  id="source"
                  value="Fonds propres"
                  disabled
                  className="bg-gray-100"
                />
                <p className="text-xs text-gray-500">
                  La source de financement est automatiquement définie à "Fonds propres" pour les apports
                </p>
              </div>
            )}

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                rows={3}
                placeholder="Détails supplémentaires..."
                value={formData.description || ''}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                disabled={uploading}
              />
            </div>

            {/* Upload fichiers */}
            <div className="space-y-2">
              <Label htmlFor="files">Pièces jointes (images, PDF) *</Label>
              <div className="flex items-center gap-2">
                <Input
                  id="files"
                  type="file"
                  multiple
                  accept="image/*,.pdf"
                  onChange={handleFileChange}
                  disabled={uploading}
                  className="flex-1"
                  required
                />
                <Upload className="h-5 w-5 text-gray-400" />
              </div>
              <p className="text-sm text-gray-500">
                Au moins un fichier est obligatoire (max 10MB par fichier)
              </p>
              {selectedFiles.length > 0 && (
                <div className="mt-2 space-y-2">
                  <p className="text-sm text-gray-600">
                    {selectedFiles.length} fichier(s) sélectionné(s)
                  </p>
                  <div className="space-y-1 max-h-40 overflow-y-auto">
                    {selectedFiles.map((file, index) => (
                      <div
                        key={`${file.name}-${file.size}-${file.lastModified}`}
                        className="flex items-center justify-between bg-gray-50 p-2 rounded"
                      >
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          <div className="flex-shrink-0">
                            {file.type.startsWith('image/') ? (
                              <div className="w-8 h-8 bg-blue-100 rounded flex items-center justify-center">
                                <span className="text-xs text-blue-600">IMG</span>
                              </div>
                            ) : (
                              <div className="w-8 h-8 bg-red-100 rounded flex items-center justify-center">
                                <span className="text-xs text-red-600">PDF</span>
                              </div>
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium truncate">{file.name}</p>
                            <p className="text-xs text-gray-500">{formatFileSize(file.size)}</p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeFile(index)}
                          disabled={uploading}
                          className="text-red-500 hover:text-red-700 disabled:opacity-50 ml-2 flex-shrink-0"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Barre de progression */}
            {uploading && (
              <div className="space-y-2">
                <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary transition-all duration-300"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
                <p className="text-sm text-center text-gray-600">
                  {uploadProgress}% - Création en cours...
                </p>
              </div>
            )}

            {/* Erreur */}
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded">
                {error}
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate('/depenses')}
                disabled={uploading}
                className="flex-1"
              >
                Annuler
              </Button>
              <Button
                type="submit"
                disabled={uploading}
                className="flex-1"
              >
                {uploading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Création...
                  </>
                ) : (
                  'Créer'
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default AddFlux;