import React, { useState, useEffect } from 'react';
import { X, Save, Loader2, Upload, Trash2, FileImage, FileText } from 'lucide-react';
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import FluxFinancierService, { FluxFinancier } from '@/services/fluxFinancier';
import AuthService from '@/services/auth';

interface EditFluxDialogProps {
  isOpen: boolean;
  onClose: () => void;
  flux: FluxFinancier;
  onSuccess: () => void;
  mode: 'view' | 'edit';
}

const EditFluxDialog: React.FC<EditFluxDialogProps> = ({
  isOpen,
  onClose,
  flux,
  onSuccess,
  mode: initialMode,
}) => {
  const [mode, setMode] = useState<'view' | 'edit'>(initialMode);
  const [formData, setFormData] = useState({
    type: flux.type,
    montant: flux.montant,
    dateFluxFinancier: flux.dateFluxFinancier.split('T')[0],
    motif: flux.motif || '',
    beneficiaire: flux.beneficiaire || '',
    sourceFinancement: flux.sourceFinancement || 'caisse',
    description: flux.description || '',
  });

  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // État pour la confirmation de suppression de preuve
  const [showDeletePreuveDialog, setShowDeletePreuveDialog] = useState(false);
  const [preuveToDelete, setPreuveToDelete] = useState<{ preuveId: number; fileId: string } | null>(null);

  useEffect(() => {
    setMode(initialMode);
    setFormData({
      type: flux.type,
      montant: flux.montant,
      dateFluxFinancier: flux.dateFluxFinancier.split('T')[0],
      motif: flux.motif || '',
      beneficiaire: flux.beneficiaire || '',
      sourceFinancement: flux.sourceFinancement || 'caisse',
      description: flux.description || '',
    });
    setSelectedFiles([]);
    setError(null);
  }, [flux, initialMode, isOpen]);

  const formatCurrency = (amount: number) => `${amount.toLocaleString('fr-FR')} FCFA`;
  
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    });
  };

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString('fr-FR', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'validated':
        return { class: 'bg-green-100 text-green-800', label: 'Validée' };
      case 'rejected':
        return { class: 'bg-red-100 text-red-800', label: 'Rejetée' };
      default:
        return { class: 'bg-yellow-100 text-yellow-800', label: 'En attente de validation' };
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const validFiles = files.filter(file => {
      const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'application/pdf'];
      const maxSize = 10 * 1024 * 1024;
      
      if (!validTypes.includes(file.type)) {
        setError(`${file.name}: Type de fichier non autorisé`);
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

  const handleDeletePreuve = async (preuveId: number, fileId: string) => {
    setPreuveToDelete({ preuveId, fileId });
    setShowDeletePreuveDialog(true);
  };

  const confirmDeletePreuve = async () => {
    if (!preuveToDelete) return;
    
    try {
      const result = await FluxFinancierService.deletePreuve(preuveToDelete.preuveId, preuveToDelete.fileId);
      if (result.success) {
        toast.success('Pièce jointe supprimée avec succès');
        onSuccess();
      } else {
        const errorMsg = result.message || 'Erreur lors de la suppression';
        setError(errorMsg);
        toast.error(errorMsg);
      }
    } catch (err) {
      console.error('Erreur lors de la suppression:', err);
      const errorMsg = 'Erreur lors de la suppression de la pièce jointe';
      setError(errorMsg);
      toast.error(errorMsg);
    } finally {
      setShowDeletePreuveDialog(false);
      setPreuveToDelete(null);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);

    try {
      // Préparer les données de mise à jour
      const updateData = {
        type: formData.type,
        montant: formData.montant,
        dateFluxFinancier: formData.dateFluxFinancier,
        motif: formData.motif || undefined,
        beneficiaire: formData.beneficiaire || undefined,
        sourceFinancement: formData.sourceFinancement || undefined,
        description: formData.description || undefined,
      };

      // Appel du service pour mettre à jour le flux et ajouter les nouveaux fichiers
      const result = await FluxFinancierService.updateFluxWithFiles(
        flux.id,
        updateData,
        selectedFiles,
        flux.createdByRef?.sourceUserId ? Number.parseInt(flux.createdByRef.sourceUserId) : 0
      );

      if (result.success) {
        toast.success(result.message || 'Flux financier modifié avec succès');
        onSuccess(); // Recharger les données
        setMode('view'); // Retour en mode visualisation
        setSelectedFiles([]); // Nettoyer les fichiers sélectionnés
      } else {
        const errorMsg = result.message || 'Erreur lors de la modification';
        setError(errorMsg);
        toast.error(errorMsg);
      }
    } catch (err) {
      console.error('Erreur lors de la sauvegarde:', err);
      const errorMsg = 'Erreur lors de la modification du flux financier';
      setError(errorMsg);
      toast.error(errorMsg);
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  const statusConfig = getStatusConfig(flux.status);

  
  // Vérifier si l'utilisateur connecté est le créateur du flux
  const currentUser = AuthService.getUser();
  const isCreator = currentUser && flux.createdByRef?.sourceUserId === String(currentUser.id);
  const canEdit = flux.status === 'pending' && isCreator;
  // On peut supprimer une preuve uniquement si:
  // - Le flux est en status "pending"
  // - L'utilisateur est le créateur
  const canDeletePreuve = canEdit;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100] p-4 pb-24">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[85vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold">
              {flux.type === 'depense' ? 'Dépense' : 'Recette'} #{flux.id}
            </h2>
            <span className={`inline-block px-3 py-1 rounded-full text-xs font-medium mt-2 ${statusConfig.class}`}>
              {statusConfig.label}
            </span>
          </div>
          <div className="flex items-center gap-2">
            {mode === 'view' && canEdit && (
              <Button
                variant="outline"
                onClick={() => setMode('edit')}
                size="sm"
              >
                Modifier
              </Button>
            )}
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
              <X className="h-6 w-6" />
            </button>
          </div>
        </div>

        {/* Contenu */}
        <div className="p-6 space-y-6">
          {mode === 'view' ? (
            <ViewMode
              flux={flux}
              formatCurrency={formatCurrency}
              formatDate={formatDate}
              formatDateTime={formatDateTime}
              formatFileSize={formatFileSize}
              canDeletePreuve={canDeletePreuve}
              onDeletePreuve={handleDeletePreuve}
            />
          ) : (
            <EditMode
              formData={formData}
              setFormData={setFormData}
              selectedFiles={selectedFiles}
              handleFileChange={handleFileChange}
              removeFile={removeFile}
              formatFileSize={formatFileSize}
              saving={saving}
              flux={flux}
              canDeletePreuve={canDeletePreuve}
              onDeletePreuve={handleDeletePreuve}
            />
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded">
              {error}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-gray-50 border-t px-6 py-4 flex justify-end gap-2">
          {mode === 'edit' ? (
            <>
              <Button variant="outline" onClick={() => setMode('view')} disabled={saving}>
                Annuler
              </Button>
              <Button onClick={handleSave} disabled={saving}>
                {saving ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Enregistrement...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Enregistrer
                  </>
                )}
              </Button>
            </>
          ) : (
            <Button onClick={onClose}>Fermer</Button>
          )}
        </div>
      </div>

      {/* Dialogue de confirmation de suppression de preuve */}
      <AlertDialog open={showDeletePreuveDialog} onOpenChange={setShowDeletePreuveDialog}>
        <AlertDialogContent className="z-[200]">
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmer la suppression</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-2">
                <p>Êtes-vous sûr de vouloir supprimer cette pièce jointe ?</p>
                <p className="text-red-600">Cette action est irréversible.</p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmDeletePreuve}
              className="bg-red-600 hover:bg-red-700"
            >
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

// Composant View Mode
interface ViewModeProps {
  flux: FluxFinancier;
  formatCurrency: (amount: number) => string;
  formatDate: (dateString: string) => string;
  formatDateTime: (dateString: string) => string;
  formatFileSize: (bytes: number) => string;
  canDeletePreuve: boolean;
  onDeletePreuve: (preuveId: number, fileId: string) => void;
}

const ViewMode: React.FC<ViewModeProps> = ({
  flux,
  formatCurrency,
  formatDate,
  formatDateTime,
  formatFileSize,
  canDeletePreuve,
  onDeletePreuve,
}) => (
  <>
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <InfoField label="Type" value={flux.type === 'depense' ? 'Dépense' : 'Recette'} />
      <InfoField
        label="Montant"
        value={`${flux.type === 'depense' ? '-' : '+'}${formatCurrency(flux.montant)}`}
        className={flux.type === 'depense' ? 'text-red-600' : 'text-green-600'}
      />
      <InfoField label="Date" value={formatDate(flux.dateFluxFinancier)} />
      <InfoField label="Source de financement" value={flux.sourceFinancement || '-'} capitalize />
      <InfoField label="Motif" value={flux.motif || '-'} />
      <InfoField label="Bénéficiaire" value={flux.beneficiaire || '-'} />
    </div>

    {flux.description && (
      <div>
        <Label className="text-sm font-medium text-gray-500">Description</Label>
        <p className="text-base mt-1 bg-gray-50 p-3 rounded">{flux.description}</p>
      </div>
    )}

    <div className="border-t pt-4">
      <h3 className="text-sm font-medium text-gray-500 mb-3">Informations système</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
        <div>
          <span className="text-gray-500">Créé le :</span>{' '}
          <span className="font-medium">{formatDateTime(flux.createdAt)}</span>
        </div>
        <div>
          <span className="text-gray-500">Modifié le :</span>{' '}
          <span className="font-medium">{formatDateTime(flux.updatedAt)}</span>
        </div>
        {flux.validatedAt && (
          <div>
            <span className="text-gray-500">Validé le :</span>{' '}
            <span className="font-medium">{formatDateTime(flux.validatedAt)}</span>
          </div>
        )}
      </div>
    </div>

    {flux.preuves && flux.preuves.length > 0 && (
      <div className="border-t pt-4">
        <h3 className="text-sm font-medium text-gray-500 mb-3">
          Pièces jointes ({flux.preuves.length})
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {flux.preuves.map((preuve) => (
            <PreuveCard
              key={preuve.id}
              preuve={preuve}
              formatFileSize={formatFileSize}
              canDelete={canDeletePreuve}
              onDelete={onDeletePreuve}
            />
          ))}
        </div>
      </div>
    )}
  </>
);

// Composant Edit Mode
interface EditModeProps {
  formData: any;
  setFormData: (data: any) => void;
  selectedFiles: File[];
  handleFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  removeFile: (index: number) => void;
  formatFileSize: (bytes: number) => string;
  saving: boolean;
  flux: FluxFinancier;
  canDeletePreuve: boolean;
  onDeletePreuve: (preuveId: number, fileId: string) => void;
}

const EditMode: React.FC<EditModeProps> = ({
  formData,
  setFormData,
  selectedFiles,
  handleFileChange,
  removeFile,
  formatFileSize,
  saving,
  flux,
  canDeletePreuve,
  onDeletePreuve,
}) => (
  <div className="space-y-4">
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div>
        <Label htmlFor="type">Type *</Label>
        <Select
          value={formData.type}
          onValueChange={(value: 'depense' | 'recette') =>
            setFormData({ ...formData, type: value })
          }
          disabled={saving}
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

      <div>
        <Label htmlFor="montant">Montant (FCFA) *</Label>
        <Input
          id="montant"
          type="number"
          min="0"
          value={formData.montant}
          onChange={(e) => setFormData({ ...formData, montant: Number.parseFloat(e.target.value) })}
          disabled={saving}
        />
      </div>

      <div>
        <Label htmlFor="date">Date *</Label>
        <Input
          id="date"
          type="date"
          value={formData.dateFluxFinancier}
          onChange={(e) => setFormData({ ...formData, dateFluxFinancier: e.target.value })}
          disabled={saving}
        />
      </div>

      <div>
        <Label htmlFor="source">Source de financement</Label>
        <Select
          value={formData.sourceFinancement}
          onValueChange={(value) => setFormData({ ...formData, sourceFinancement: value })}
          disabled={saving}
        >
          <SelectTrigger id="source">
            <SelectValue placeholder="Sélectionner la source" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="caisse">Caisse</SelectItem>
            <SelectItem value="banque">Banque</SelectItem>
            <SelectItem value="autre">Autre</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label htmlFor="motif">Motif</Label>
        <Input
          id="motif"
          value={formData.motif}
          onChange={(e) => setFormData({ ...formData, motif: e.target.value })}
          disabled={saving}
        />
      </div>

      <div>
        <Label htmlFor="beneficiaire">Bénéficiaire</Label>
        <Input
          id="beneficiaire"
          value={formData.beneficiaire}
          onChange={(e) => setFormData({ ...formData, beneficiaire: e.target.value })}
          disabled={saving}
        />
      </div>
    </div>

    <div>
      <Label htmlFor="description">Description</Label>
      <Textarea
        id="description"
        rows={3}
        value={formData.description}
        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
        disabled={saving}
      />
    </div>

    {/* Pièces jointes existantes */}
    {flux.preuves && flux.preuves.length > 0 && (
      <div className="border-t pt-4">
        <h3 className="text-sm font-medium text-gray-700 mb-3">
          Pièces jointes existantes ({flux.preuves.length})
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {flux.preuves.map((preuve) => (
            <PreuveCard
              key={preuve.id}
              preuve={preuve}
              formatFileSize={formatFileSize}
              canDelete={canDeletePreuve}
              onDelete={onDeletePreuve}
            />
          ))}
        </div>
      </div>
    )}

    {/* Ajouter de nouvelles pièces jointes */}
    <div className="border-t pt-4">
      <Label htmlFor="files">Ajouter de nouvelles pièces jointes</Label>
      <p className="text-xs text-gray-500 mb-2">
        Vous pouvez ajouter de nouvelles pièces jointes sans supprimer les existantes
      </p>
      <div className="flex items-center gap-2 mt-1">
        <Input
          id="files"
          type="file"
          multiple
          accept="image/*,.pdf"
          onChange={handleFileChange}
          disabled={saving}
        />
        <Upload className="h-5 w-5 text-gray-400" />
      </div>
      {selectedFiles.length > 0 && (
        <div className="mt-2 space-y-1">
          <p className="text-sm font-medium text-gray-700 mb-1">
            {selectedFiles.length} nouveau(x) fichier(s) à ajouter :
          </p>
          {selectedFiles.map((file, index) => (
            <div key={file.name + index} className="flex items-center justify-between bg-blue-50 p-2 rounded border border-blue-200">
              <div className="flex items-center gap-2 flex-1">
                {file.type.startsWith('image/') ? (
                  <FileImage className="h-4 w-4 text-blue-500" />
                ) : (
                  <FileText className="h-4 w-4 text-red-500" />
                )}
                <span className="text-sm truncate">{file.name}</span>
                <span className="text-xs text-gray-500">({formatFileSize(file.size)})</span>
              </div>
              <button
                type="button"
                onClick={() => removeFile(index)}
                disabled={saving}
                className="text-red-500 hover:text-red-700"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  </div>
);

// Composants utilitaires
const InfoField: React.FC<{ label: string; value: string; className?: string; capitalize?: boolean }> = ({
  label,
  value,
  className = '',
  capitalize = false,
}) => (
  <div>
    <Label className="text-sm font-medium text-gray-500">{label}</Label>
    <p className={`text-base font-semibold ${capitalize ? 'capitalize' : ''} ${className}`}>{value}</p>
  </div>
);

const PreuveCard: React.FC<{
  preuve: any;
  formatFileSize: (bytes: number) => string;
  canDelete: boolean;
  onDelete: (id: number, fileId: string) => void;
}> = ({ preuve, formatFileSize, canDelete, onDelete }) => {
  // Générer l'URL de visualisation à partir de l'URL de téléchargement
  const getViewUrl = (downloadUrl: string): string => {
    return downloadUrl.replace('/download/', '/view/');
  };

  return (
    <div className="border rounded-lg overflow-hidden hover:shadow-md transition-shadow">
      <div className="bg-gray-100 h-48 flex items-center justify-center">
        {preuve.mimetype.startsWith('image/') ? (
          <img 
            src={getViewUrl(preuve.downloadUrl)} 
            alt={preuve.filename} 
            className="w-full h-full object-cover cursor-pointer"
            onClick={() => window.open(getViewUrl(preuve.downloadUrl), '_blank')}
          />
        ) : preuve.mimetype === 'application/pdf' ? (
          <div 
            className="text-center cursor-pointer w-full h-full flex flex-col items-center justify-center hover:bg-gray-200 transition-colors"
            onClick={() => window.open(getViewUrl(preuve.downloadUrl), '_blank')}
          >
            <FileText className="h-16 w-16 text-red-500 mb-2" />
            <p className="text-sm text-gray-600 px-2 truncate max-w-full">{preuve.filename}</p>
            <p className="text-xs text-gray-500 mt-1">Cliquer pour ouvrir</p>
          </div>
        ) : (
          <div className="text-center">
            <FileText className="h-16 w-16 text-gray-500 mx-auto mb-2" />
            <p className="text-sm text-gray-600 px-2 truncate">{preuve.filename}</p>
          </div>
        )}
      </div>
      <div className="p-3 space-y-2">
        <div className="flex items-start gap-2">
          {preuve.mimetype.startsWith('image/') ? (
            <FileImage className="h-4 w-4 text-blue-500 flex-shrink-0 mt-0.5" />
          ) : (
            <FileText className="h-4 w-4 text-red-500 flex-shrink-0 mt-0.5" />
          )}
          <p className="text-sm truncate flex-1" title={preuve.filename}>
            {preuve.filename}
          </p>
        </div>
        <p className="text-xs text-gray-500">{formatFileSize(preuve.size)}</p>
        <div className="flex gap-2 pt-2">
          <a href={preuve.downloadUrl} download={preuve.filename} className="flex-1">
            <Button variant="outline" size="sm" className="w-full">
              Télécharger
            </Button>
          </a>
          {canDelete && (
            <Button variant="destructive" size="sm" onClick={() => onDelete(preuve.id, preuve.fileId)}>
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

export default EditFluxDialog;
