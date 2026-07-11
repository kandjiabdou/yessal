import React, { useState } from 'react';
import { X, Upload, Loader2, FileImage, FileText, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'react-toastify';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import FluxFinancierService, { CreateFluxFinancierData, RubriqueBilan } from '@/services/fluxFinancier';
import AuthService from '@/services/auth';

interface AddFluxDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const AddFluxDialog: React.FC<AddFluxDialogProps> = ({ isOpen, onClose, onSuccess }) => {
  const [formData, setFormData] = useState<CreateFluxFinancierData>({
    type: 'depense',
    rubrique: 'Commun',
    montant: 0,
    dateFluxFinancier: new Date().toISOString().split('T')[0],
    motif: '',
    beneficiaire: '',
    sourceFinancement: 'caisse',
    description: '',
    laverieId: 0,
    createdBy: 0,
  });

  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  React.useEffect(() => {
    if (isOpen) {
      const user = AuthService.getUser();
      if (user) {
        setFormData(prev => ({
          ...prev,
          laverieId: user.siteLavagePrincipalGerantId || 0,
          createdBy: user.id,
          dateFluxFinancier: new Date().toISOString().split('T')[0],
        }));
      }
      // Reset
      setSelectedFiles([]);
      setUploadProgress(0);
      setError(null);
    }
  }, [isOpen]);

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

      if (!formData.laverieId) {
        setError('Site de lavage non défini');
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
        toast.success(`${formData.type === 'depense' ? 'Dépense' : 'Recette'} créée avec succès`);
        onSuccess();
        onClose();
        resetForm();
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

  const resetForm = () => {
    const user = AuthService.getUser();
    setFormData({
      type: 'depense',
      rubrique: 'Commun',
      montant: 0,
      dateFluxFinancier: new Date().toISOString().split('T')[0],
      motif: '',
      beneficiaire: '',
      sourceFinancement: 'caisse',
      description: '',
      laverieId: user?.siteLavagePrincipalGerantId || 0,
      createdBy: user?.id || 0,
    });
    setSelectedFiles([]);
    setError(null);
  };

  const formatFileSize = (bytes: number): string => {
    return (bytes / 1024).toFixed(2) + ' KB';
  };

  // Obtenir la date du jour au format YYYY-MM-DD
  const getTodayDate = (): string => {
    return new Date().toISOString().split('T')[0];
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100] p-4 pb-24">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[85vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold">Ajouter une {formData.type}</h2>
          <button
            onClick={onClose}
            disabled={uploading}
            className="text-gray-400 hover:text-gray-600 disabled:opacity-50"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Type */}
          <div className="space-y-2">
            <Label htmlFor="type">Type *</Label>
            <Select
              value={formData.type}
              onValueChange={(value: 'depense' | 'recette') =>
                setFormData({ ...formData, type: value })
              }
              disabled={uploading}
            >
              <SelectTrigger id="type">
                <SelectValue placeholder="Sélectionner le type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="depense">Dépense</SelectItem>
                <SelectItem value="recette">Recette</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Rubrique (activité pour le bilan) */}
          <div className="space-y-2">
            <Label htmlFor="rubrique">Activité (bilan)</Label>
            <Select
              value={formData.rubrique || 'Commun'}
              onValueChange={(value: RubriqueBilan) =>
                setFormData({ ...formData, rubrique: value })
              }
              disabled={uploading}
            >
              <SelectTrigger id="rubrique">
                <SelectValue placeholder="Sélectionner l'activité" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Laverie">Laverie</SelectItem>
                <SelectItem value="Boutique">Boutique</SelectItem>
                <SelectItem value="Commun">Commun (non affecté)</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-sm text-gray-500">
              Rattache ce flux au bilan Laverie, Boutique, ou Commun (compté uniquement au bilan global).
            </p>
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

          {/* Source financement */}
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
                        {file.type.startsWith('image/') ? (
                          <FileImage className="h-4 w-4 text-blue-500 flex-shrink-0" />
                        ) : (
                          <FileText className="h-4 w-4 text-red-500 flex-shrink-0" />
                        )}
                        <span className="text-sm truncate">{file.name}</span>
                        <span className="text-xs text-gray-500 flex-shrink-0">
                          ({formatFileSize(file.size)})
                        </span>
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
              onClick={onClose}
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
      </div>
    </div>
  );
};

export default AddFluxDialog;
