import React from 'react';
import { Calendar, TrendingDown, TrendingUp, Eye, Edit, FileText, Trash2, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { FluxFinancier } from '@/services/fluxFinancier';
import AuthService from '@/services/auth';

interface FluxItemProps {
    flux: FluxFinancier;
    onViewDetails: (flux: FluxFinancier) => void;
    onEdit: (flux: FluxFinancier) => void;
    onDelete?: (flux: FluxFinancier) => void;
    onValidate?: (flux: FluxFinancier) => void;
    formatCurrency?: (amount: number) => string;
}

const FluxItem: React.FC<FluxItemProps> = ({ flux, onViewDetails, onEdit, onDelete, onValidate, formatCurrency: formatCurrencyProp }) => {
    const formatCurrency = formatCurrencyProp || ((amount: number) => {
        return `${amount.toLocaleString('fr-FR')} FCFA`;
    });

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

    const statusConfig = getStatusConfig(flux.status);
    const preuveCount = flux.preuves?.length || 0;
    // Nom de la laverie si présent
    const laverieName = flux.laverieRef?.nom || null;
    
    // Déterminer la couleur et l'icône selon le type
    const getTypeConfig = () => {
        switch (flux.type) {
            case 'depense':
                return { color: 'red', icon: TrendingDown, label: 'Dépense', sign: '-' };
            case 'recette':
                return { color: 'green', icon: TrendingUp, label: 'Recette', sign: '+' };
            case 'emprunt':
                return { color: 'orange', icon: TrendingUp, label: 'Emprunt', sign: '+' };
            case 'pret':
                return { color: 'blue', icon: TrendingDown, label: 'Prêt', sign: '-' };
            default:
                return { color: 'gray', icon: TrendingDown, label: flux.type, sign: '' };
        }
    };
    
    const typeConfig = getTypeConfig();
    const TypeIcon = typeConfig.icon;
    
    // Helper pour obtenir les classes CSS en fonction de la couleur
    const getColorClasses = (color: string) => {
        const classes = {
            red: {
                bg: 'bg-red-100',
                text: 'text-red-600',
                badgeBg: 'bg-red-100',
                badgeText: 'text-red-800'
            },
            green: {
                bg: 'bg-green-100',
                text: 'text-green-600',
                badgeBg: 'bg-green-100',
                badgeText: 'text-green-800'
            },
            orange: {
                bg: 'bg-orange-100',
                text: 'text-orange-600',
                badgeBg: 'bg-orange-100',
                badgeText: 'text-orange-800'
            },
            blue: {
                bg: 'bg-blue-100',
                text: 'text-blue-600',
                badgeBg: 'bg-blue-100',
                badgeText: 'text-blue-800'
            },
            gray: {
                bg: 'bg-gray-100',
                text: 'text-gray-600',
                badgeBg: 'bg-gray-100',
                badgeText: 'text-gray-800'
            }
        };
        return classes[color as keyof typeof classes] || classes.gray;
    };
    
    const colorClasses = getColorClasses(typeConfig.color);
    
    // Vérifier si l'utilisateur connecté est le créateur du flux
    const currentUser = AuthService.getUser();
    const isCreator = currentUser && ((flux?.createdByRef?.email?.toLowerCase() === currentUser?.email?.toLowerCase()));
    
    // On peut supprimer uniquement si:
    // - Le flux est en status "pending"
    // - L'utilisateur est le créateur
    // - La fonction onDelete est fournie
    const canDelete = flux.status === 'pending' && isCreator && onDelete;

    // On peut valider uniquement si:
    // - Le flux est en status "pending"
    // - Il y a au moins une preuve
    // - L'utilisateur connecté n'est pas le créateur
    // - La fonction onValidate est fournie
    const canValidate = flux.status === 'pending' && preuveCount > 0 && !isCreator && !!onValidate;

    // Formater le nom complet de l'utilisateur
    const formatUserName = (userRef?: { nom?: string; prenom?: string }) => {
        if (!userRef) return null;
        if (userRef.prenom && userRef.nom) {
            return `${userRef.prenom} ${userRef.nom}`;
        }
        if (userRef.prenom) return userRef.prenom;
        if (userRef.nom) return userRef.nom;
        return 'Utilisateur';
    };

    const createdByName = formatUserName(flux.createdByRef);

    return (
        <div className="px-2">
            <Card className="card-shadow hover:shadow-lg transition-shadow w-full">
                <CardContent className="p-3">
                    <div className="flex flex-col gap-2">
                    {/* Première ligne: Icône + Type + Date + Status */}
                    <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                            {/* Icône */}
                            <div className={`p-1.5 rounded-full ${colorClasses.bg}`}>
                                <TypeIcon className={`h-5 w-5 ${colorClasses.text}`} />
                            </div>

                            {/* Type badge */}
                            <span className={`px-2 py-0.5 rounded text-xs font-medium ${colorClasses.badgeBg} ${colorClasses.badgeText}`}>
                                {typeConfig.label}
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
                    <div className="flex items-center justify-between gap-3">
                        <div className="flex-1 min-w-0">
                            <h3 className="font-semibold text-base truncate">
                                {flux.motif || 'Sans motif'}
                            </h3>
                            {createdByName && (
                                <p className="text-xs text-gray-500 mt-0.5">
                                    Par {createdByName}{laverieName && (<><span> — </span>{laverieName}</>)}
                                </p>
                            )}
                            {flux.validatedByRef && (
                                <p className="text-xs text-gray-500 mt-0.5">
                                    Validé par {formatUserName(flux.validatedByRef)}
                                </p>
                            )}
                            {!createdByName && laverieName && (
                                <p className="text-xs text-gray-500 mt-0.5">
                                    Laverie: {laverieName}
                                </p>
                            )}
                        </div>
                        <p className={`text-lg font-bold flex-shrink-0 ${colorClasses.text}`}>
                            {typeConfig.sign}{formatCurrency(flux.montant)}
                        </p>
                    </div>

                    {/* Troisième ligne: Preuves + Actions */}
                    <div className="flex items-center justify-between gap-1 pt-1 border-t">
                        <div className="flex items-center gap-2">
                            {preuveCount > 0 && (
                                <span className="flex items-center gap-1 px-2 py-0.5 bg-blue-50 text-blue-700 rounded text-xs font-medium">
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
                            {canValidate && (<Button
                                variant="outline"
                                size="sm"
                                onClick={() => onValidate?.(flux)}
                                className="flex items-center gap-1"
                            >
                                <Check className="h-4 w-4" />
                                <span className="hidden sm:inline">Valider</span>
                            </Button>)}
                            {canDelete && (<Button
                                variant="outline"
                                size="sm"
                                onClick={() => onEdit(flux)}
                                className="flex items-center gap-1"
                            >
                                <Edit className="h-4 w-4" />
                                <span className="hidden sm:inline">Modifier</span>
                            </Button>)}
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
        </div>
    );
};

export default FluxItem;
