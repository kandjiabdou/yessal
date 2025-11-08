import React from 'react';
import { X, Download, Trash2, FileImage, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
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
import { FluxFinancier } from '@/services/fluxFinancier';

interface FluxDetailDialogProps {
  isOpen: boolean;
  onClose: () => void;
  flux: FluxFinancier | null;
  onDeletePreuve?: (preuveId: number, fileId: string) => void;
}

const FluxDetailDialog: React.FC<FluxDetailDialogProps> = ({
  isOpen,
  onClose,
  flux,
  onDeletePreuve,
}) => {
  const [imageErrors, setImageErrors] = React.useState<Record<number, boolean>>({});
  const [showDeleteDialog, setShowDeleteDialog] = React.useState(false);
  const [preuveToDelete, setPreuveToDelete] = React.useState<{ preuveId: number; fileId: string } | null>(null);

  if (!isOpen || !flux) return null;

  const formatCurrency = (amount: number) => {
    return `${amount.toLocaleString('fr-FR')} FCFA`;
  };

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

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'validated':
        return 'bg-green-100 text-green-800';
      case 'rejected':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-yellow-100 text-yellow-800';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'validated':
        return 'Validée';
      case 'rejected':
        return 'Rejetée';
      default:
        return 'En attente de validation';
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  // Générer l'URL de visualisation à partir de l'URL de téléchargement
  const getViewUrl = (downloadUrl: string): string => {
    return downloadUrl.replace('/download/', '/view/');
  };

  const handleImageError = (preuveId: number) => {
    console.error(`Erreur chargement image pour preuve ${preuveId}`);
    setImageErrors(prev => ({ ...prev, [preuveId]: true }));
  };

  const handleDeletePreuve = async (preuveId: number, fileId: string) => {
    setPreuveToDelete({ preuveId, fileId });
    setShowDeleteDialog(true);
  };

  const confirmDeletePreuve = () => {
    if (!preuveToDelete || !onDeletePreuve) return;
    
    try {
      onDeletePreuve(preuveToDelete.preuveId, preuveToDelete.fileId);
    } catch (error) {
      console.error('Erreur lors de la suppression:', error);
    } finally {
      setShowDeleteDialog(false);
      setPreuveToDelete(null);
    }
  };

  const canDeletePreuve = flux.status === 'pending';

  // Formater le nom complet de l'utilisateur
  const formatUserName = (userRef?: { nom?: string; prenom?: string }) => {
    if (!userRef) return 'Inconnu';
    if (userRef.prenom && userRef.nom) {
      return `${userRef.prenom} ${userRef.nom}`;
    }
    if (userRef.prenom) return userRef.prenom;
    if (userRef.nom) return userRef.nom;
    return 'Utilisateur';
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100] p-4 pb-24">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[85vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold">
              {flux.type === 'depense' ? 'Dépense' : 'Recette'} #{flux.id}
            </h2>
            <span
              className={`inline-block px-3 py-1 rounded-full text-xs font-medium mt-2 ${getStatusBadgeClass(
                flux.status
              )}`}
            >
              {getStatusLabel(flux.status)}
            </span>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Contenu */}
        <div className="p-6 space-y-6">
          {/* Informations principales */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-sm font-medium text-gray-500">Type</p>
              <p className="text-lg font-semibold capitalize">{flux.type}</p>
            </div>

            <div>
              <p className="text-sm font-medium text-gray-500">Montant</p>
              <p
                className={`text-2xl font-bold ${
                  flux.type === 'depense' ? 'text-red-600' : 'text-green-600'
                }`}
              >
                {flux.type === 'depense' ? '-' : '+'}
                {formatCurrency(flux.montant)}
              </p>
            </div>

            <div>
              <p className="text-sm font-medium text-gray-500">Date</p>
              <p className="text-base">{formatDate(flux.dateFluxFinancier)}</p>
            </div>

            <div>
              <p className="text-sm font-medium text-gray-500">
                Source de financement
              </p>
              <p className="text-base capitalize">
                {flux.sourceFinancement || '-'}
              </p>
            </div>

            <div>
              <p className="text-sm font-medium text-gray-500">Motif</p>
              <p className="text-base">{flux.motif || '-'}</p>
            </div>

            <div>
              <p className="text-sm font-medium text-gray-500">
                Bénéficiaire
              </p>
              <p className="text-base">{flux.beneficiaire || '-'}</p>
            </div>
          </div>

          {/* Description */}
          {flux.description && (
            <div>
              <p className="text-sm font-medium text-gray-500">
                Description
              </p>
              <p className="text-base mt-1 bg-gray-50 p-3 rounded">
                {flux.description}
              </p>
            </div>
          )}

          {/* Métadonnées */}
          <div className="border-t pt-4">
            <h3 className="text-sm font-medium text-gray-500 mb-3">
              Informations système
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
              <div>
                <span className="text-gray-500">Créé par :</span>{' '}
                <span className="font-medium">
                  {formatUserName(flux.createdByRef)}
                </span>
              </div>
              <div>
                <span className="text-gray-500">Créé le :</span>{' '}
                <span className="font-medium">
                  {formatDateTime(flux.createdAt)}
                </span>
              </div>
              <div>
                <span className="text-gray-500">Modifié le :</span>{' '}
                <span className="font-medium">
                  {formatDateTime(flux.updatedAt)}
                </span>
              </div>
              {flux.validatedByRef && flux.validatedAt && (
                <>
                  <div>
                    <span className="text-gray-500">Validé par :</span>{' '}
                    <span className="font-medium">
                      {formatUserName(flux.validatedByRef)}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-500">Validé le :</span>{' '}
                    <span className="font-medium">
                      {formatDateTime(flux.validatedAt)}
                    </span>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Pièces jointes */}
          {flux.preuves && flux.preuves.length > 0 && (
            <div className="border-t pt-4">
              <h3 className="text-sm font-medium text-gray-500 mb-3">
                Pièces jointes ({flux.preuves.length})
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {flux.preuves.map((preuve) => (
                  <div
                    key={preuve.id}
                    className="border rounded-lg overflow-hidden hover:shadow-md transition-shadow"
                  >
                    {/* Aperçu */}
                    <div className="bg-gray-100 h-48 flex items-center justify-center overflow-hidden">
                      {preuve.mimetype.startsWith('image/') ? (
                        imageErrors[preuve.id] ? (
                          <div className="text-center text-red-500">
                            <FileImage className="h-16 w-16 mx-auto mb-2" />
                            <p className="text-xs">Erreur chargement</p>
                            <p className="text-xs text-gray-500">URL: {getViewUrl(preuve.downloadUrl)}</p>
                          </div>
                        ) : (
                          <img
                            src={getViewUrl(preuve.downloadUrl)}
                            alt={preuve.filename}
                            className="w-full h-full object-cover cursor-pointer"
                            onClick={() => window.open(getViewUrl(preuve.downloadUrl), '_blank')}
                            onError={() => handleImageError(preuve.id)}
                          />
                        )
                      ) : preuve.mimetype === 'application/pdf' ? (
                        <button
                          type="button"
                          className="text-center cursor-pointer w-full h-full flex flex-col items-center justify-center hover:bg-gray-200 transition-colors border-0 bg-transparent"
                          onClick={() => window.open(getViewUrl(preuve.downloadUrl), '_blank')}
                        >
                          <FileText className="h-16 w-16 text-red-500 mb-2" />
                          <p className="text-sm text-gray-600 px-2 truncate max-w-full">
                            {preuve.filename}
                          </p>
                          <p className="text-xs text-gray-500 mt-1">Cliquer pour ouvrir</p>
                        </button>
                      ) : (
                        <div className="text-center">
                          <FileText className="h-16 w-16 text-gray-500 mx-auto mb-2" />
                          <p className="text-sm text-gray-600 px-2 truncate">
                            {preuve.filename}
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Informations */}
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

                      <p className="text-xs text-gray-500">
                        {formatFileSize(preuve.size)}
                      </p>

                      {/* Actions */}
                      <div className="flex gap-2 pt-2">
                        <a
                          href={preuve.downloadUrl}
                          download={preuve.filename}
                          className="flex-1"
                        >
                          <Button variant="outline" size="sm" className="w-full">
                            <Download className="h-4 w-4 mr-1" />
                            Télécharger
                          </Button>
                        </a>

                        {canDeletePreuve && onDeletePreuve && (
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => handleDeletePreuve(preuve.id, preuve.fileId)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-gray-50 border-t px-6 py-4 flex justify-end">
          <Button onClick={onClose}>Fermer</Button>
        </div>
      </div>

      {/* Dialogue de confirmation de suppression */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
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

export default FluxDetailDialog;
