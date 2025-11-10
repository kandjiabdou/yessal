import React from 'react';
import { Loader2, AlertCircle } from 'lucide-react';
import FluxItem from './FluxItem';
import { FluxFinancier } from '@/services/fluxFinancier';

interface FluxItemListProps {
  fluxList: FluxFinancier[];
  loading?: boolean;
  error?: string | null;
  emptyMessage?: string;
  onViewDetails: (flux: FluxFinancier) => void;
  onEdit: (flux: FluxFinancier) => void;
  onDelete?: (flux: FluxFinancier) => void;
  onValidate?: (flux: FluxFinancier) => void;
  onRetry?: () => void;
  formatCurrency?: (amount: number) => string;
}

const FluxItemList: React.FC<FluxItemListProps> = ({
  fluxList,
  loading = false,
  error = null,
  emptyMessage = 'Aucune transaction enregistrée',
  onViewDetails,
  onEdit,
  onDelete,
  onValidate,
  onRetry,
  formatCurrency,
}) => {
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-6">
        <Loader2 className="h-8 w-8 animate-spin text-primary mb-2" />
        <p className="text-gray-500">Chargement des transactions...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <AlertCircle className="h-12 w-12 text-red-500 mb-2" />
        <p className="text-lg font-medium text-gray-900 mb-1">Erreur</p>
        <p className="text-gray-600 mb-2">{error}</p>
        {onRetry && (
          <button
            onClick={onRetry}
            className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary/90"
          >
            Réessayer
          </button>
        )}
      </div>
    );
  }

  if (fluxList.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-6">
        <p className="text-gray-500 text-center">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className="space-y-2 -mx-4">
      {fluxList.map((flux) => (
        <FluxItem
          key={flux.id}
          flux={flux}
          onViewDetails={onViewDetails}
          onEdit={onEdit}
          onDelete={onDelete}
          onValidate={onValidate}
          formatCurrency={formatCurrency}
        />
      ))}
    </div>
  );
};

export default FluxItemList;
