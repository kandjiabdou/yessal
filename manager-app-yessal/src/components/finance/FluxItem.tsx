import React from 'react';
import { Calendar, TrendingDown, TrendingUp, Eye, Edit, FileText, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { FluxFinancier } from '@/services/fluxFinancier';

interface FluxItemProps {
    flux: FluxFinancier;
    onViewDetails: (flux: FluxFinancier) => void;
    onEdit: (flux: FluxFinancier) => void;
    onDelete?: (flux: FluxFinancier) => void;
}

const FluxItem: React.FC<FluxItemProps> = ({ flux, onViewDetails, onEdit, onDelete }) => {
    const formatCurrency = (amount: number) => {
        return `${amount.toLocaleString('fr-FR')} FCFA`;
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('fr-FR', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
        });
    };

    const getStatusConfig = (status: string) => {
        switch (status) {
            case 'validated':
                return { class: 'bg-green-100 text-green-800', label: 'Validée' };
            case 'rejected':
                return { class: 'bg-red-100 text-red-800', label: 'Rejetée' };
            default:
                return { class: 'bg-yellow-100 text-yellow-800', label: 'En attente' };
        }
    };

    const statusConfig = getStatusConfig(flux.validationStatus);
    const isDepense = flux.type === 'depense';
    const preuveCount = flux.preuves?.length || 0;
    const canDelete = flux.validationStatus === 'pending' && onDelete;

    return (
        <Card className="card-shadow hover:shadow-lg transition-shadow">
            <CardContent className="p-4">
                <div className="flex flex-col gap-3">
                    {/* Première ligne: Icône + Type + Date + Status */}
                    <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                            {/* Icône */}
                            <div className={`p-2 rounded-full ${isDepense ? 'bg-red-100' : 'bg-green-100'}`}>
                                {isDepense ? (
                                    <TrendingDown className="h-5 w-5 text-red-600" />
                                ) : (
                                    <TrendingUp className="h-5 w-5 text-green-600" />
                                )}
                            </div>

                            {/* Type badge */}
                            <span className={`px-2 py-1 rounded text-xs font-medium ${isDepense ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'}`}>
                                {isDepense ? 'Dépense' : 'Recette'}
                            </span>

                            {/* Date */}
                            <span className="text-xs text-gray-500 flex items-center gap-1">
                                <Calendar className="h-3 w-3" />
                                {formatDate(flux.dateFluxFinancier)}
                            </span>
                        </div>

                        {/* Status badge */}
                        <span className={`px-2 py-1 rounded text-xs font-medium ${statusConfig.class}`}>
                            {statusConfig.label}
                        </span>
                    </div>

                    {/* Deuxième ligne: Motif + Montant */}
                    <div className="flex items-center justify-between gap-4">
                        <h3 className="font-semibold text-base flex-1 truncate">
                            {flux.motif || 'Sans motif'}
                        </h3>
                        <p className={`text-lg font-bold flex-shrink-0 ${isDepense ? 'text-red-600' : 'text-green-600'}`}>
                            {isDepense ? '-' : '+'}{formatCurrency(flux.montant)}
                        </p>
                    </div>

                    {/* Troisième ligne: Preuves + Actions */}
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pt-2 border-t">
                        <div className="flex items-center gap-2">
                            {preuveCount > 0 && (
                                <span className="flex items-center gap-1 px-2 py-1 bg-blue-50 text-blue-700 rounded text-xs font-medium">
                                    <FileText className="h-3 w-3" />
                                    <span>{preuveCount} pièce{preuveCount > 1 ? 's' : ''} jointe{preuveCount > 1 ? 's' : ''}</span>
                                </span>
                            )}
                        </div>

                        <div className="flex items-center gap-2">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => onViewDetails(flux)}
                                className="flex items-center gap-1"
                            >
                                <Eye className="h-4 w-4" />
                                <span className="hidden sm:inline">Détails</span>
                            </Button>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => onEdit(flux)}
                                className="flex items-center gap-1"
                            >
                                <Edit className="h-4 w-4" />
                                <span className="hidden sm:inline">Modifier</span>
                            </Button>
                            {canDelete && (
                                <Button
                                    variant="destructive"
                                    size="sm"
                                    onClick={() => onDelete(flux)}
                                    className="flex items-center gap-1"
                                >
                                    <Trash2 className="h-4 w-4" />
                                    <span className="hidden sm:inline">Supprimer</span>
                                </Button>
                            )}
                        </div>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
};

export default FluxItem;
