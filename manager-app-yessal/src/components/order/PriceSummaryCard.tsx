import React from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { PriceDetails, PriceService } from '@/services/price';
import { OrderOptions } from '@/services/order';
import { Calculator, Truck, Crown, AlertCircle } from 'lucide-react';

interface PriceSummaryCardProps {
  formule: 'BaseMachine' | 'Detail';
  poids: number;
  options: OrderOptions;
  estLivraison: boolean;
  typeReduction?: 'Etudiant' | 'Ouverture';
  estEtudiant?: boolean;
  typeClient?: 'Standard' | 'Premium';
  // Peut provenir de différentes API : soit un objet unique `abonnementPremium`,
  // soit un tableau `abonnementsPremium`. On accepte les deux formes.
  abonnementPremium?: any; // object | any[] | null
  cumulMensuel?: number;
  // Ajout des props d'ajustement
  hasAdjustment?: boolean;
  adjustmentType?: 'Augmentation' | 'Diminution';
  adjustmentMethod?: 'Pourcentage' | 'Absolu';
  adjustmentValue?: number;
  adjustmentReason?: string;
}

export const PriceSummaryCard: React.FC<PriceSummaryCardProps> = ({
  formule,
  poids,
  options,
  estLivraison,
  typeReduction,
  estEtudiant,
  typeClient = 'Standard',
  abonnementPremium,
  cumulMensuel = 0,
  hasAdjustment = false,
  adjustmentType,
  adjustmentMethod,
  adjustmentValue,
  adjustmentReason
}) => {
  // Vérifier si le poids est valide pour éviter les erreurs pendant la saisie
  const poidsValide = poids >= 6 || typeClient === 'Premium';
  
  // Ne pas afficher le résumé si le poids n'est pas valide
  if (!poidsValide) {
    return (
      <Card className="bg-gray-50 border-gray-200">
        <CardContent className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <Calculator className="h-5 w-5 text-gray-400" />
            <h2 className="font-semibold text-lg text-gray-600">Résumé des prix</h2>
          </div>
          <div className="text-center py-4">
            <p className="text-gray-500 text-sm">
              Veuillez saisir un poids minimum de 6 kg pour voir le résumé des prix
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Déterminer le type de réduction
  let typeReductionFinal = typeReduction;
  if (estEtudiant && !typeReductionFinal) {
    typeReductionFinal = 'Etudiant';
  }

  // Normaliser l'abonnement : préférer un objet unique si fourni, sinon
  // prendre le premier élément du tableau `abonnementsPremium`.
  const abonnementNormalise = Array.isArray(abonnementPremium)
    ? abonnementPremium.length > 0 ? abonnementPremium[0] : null
    : abonnementPremium || null;

  // calculerPrixCommande attend la forme `abonnementPremiums` (tableau) —
  // on fournit soit le tableau d'origine soit un tableau construit à partir
  // de l'objet normalisé, ou null.
  const abonnementPourCalcul = Array.isArray(abonnementPremium)
    ? abonnementPremium
    : (abonnementNormalise ? [abonnementNormalise] : null);

  // Calculer les prix selon le type de client
  const prixDetails = PriceService.calculerPrixCommande(
    formule,
    poids,
    options,
    estLivraison,
    typeClient,
    abonnementPourCalcul,
    cumulMensuel,
    typeReductionFinal
  );

  // Calculer le prix ajusté si un ajustement est appliqué
  const calculateAdjustedPrice = () => {
    if (!hasAdjustment || !adjustmentType || !adjustmentMethod || !adjustmentValue) {
      return prixDetails.prixFinal;
    }

    let adjustedPrice = prixDetails.prixFinal;
    let adjustmentAmount = 0;

    if (adjustmentMethod === 'Pourcentage') {
      adjustmentAmount = (prixDetails.prixFinal * adjustmentValue) / 100;
    } else {
      adjustmentAmount = adjustmentValue;
    }

    if (adjustmentType === 'Augmentation') {
      adjustedPrice = prixDetails.prixFinal + adjustmentAmount;
    } else {
      adjustedPrice = prixDetails.prixFinal - adjustmentAmount;
    }

    return Math.max(0, adjustedPrice); // Éviter les prix négatifs
  };

  const prixFinalAjuste = calculateAdjustedPrice();
  const montantAjustement = prixFinalAjuste - prixDetails.prixFinal;

  return (
    <Card className={`${typeClient === 'Premium' && abonnementPremium != null ? 'bg-amber-50 border-amber-200' : 'bg-primary/5'}`}>
      <CardContent className="p-4">
        <div className="flex items-center gap-2 mb-3">
          {typeClient === 'Premium' && abonnementPremium != null ? (
            <Crown className="h-5 w-5 text-amber-600" />
          ) : (
            <Calculator className="h-5 w-5 text-primary" />
          )}
          <h2 className="font-semibold text-lg">
            Résumé des prix
          </h2>
        </div>

        <div className="space-y-3">
          {/* Informations client premium */}
          {typeClient === 'Premium' && abonnementPremium != null && prixDetails.premiumDetails && (
            <div className="bg-amber-100 rounded-lg p-3">
              <h3 className="text-sm font-medium mb-2 text-amber-800">Abonnement mensuel :</h3>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span>Quota mensuel</span>
                  <span className="font-medium">{prixDetails.premiumDetails.quotaMensuel} kg</span>
                </div>
                <div className="flex justify-between">
                  <span>Déjà utilisé</span>
                  <span className="font-medium">{prixDetails.premiumDetails.cumulMensuel} kg</span>
                </div>
                <div className="flex justify-between">
                  <span>Quota restant</span>
                  <span className="font-medium text-amber-700">{prixDetails.premiumDetails.quotaRestant} kg</span>
                </div>
                <div className="flex justify-between border-t pt-1">
                  <span>Poids couvert par abonnement</span>
                  <span className="font-medium text-green-600">{prixDetails.premiumDetails.poidsCouvert} kg</span>
                </div>
                {prixDetails.premiumDetails.surplus > 0 && (
                  <div className="flex justify-between">
                    <span className="text-red-600">Surplus à facturer</span>
                    <span className="font-medium text-red-600">{prixDetails.premiumDetails.surplus} kg</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Formule et poids - Toujours affiché */}
          <div className="flex justify-between items-center border-b pb-2">
            <span className="text-sm font-medium">
              {formule === 'BaseMachine' ? 'Formule de base' : 'Formule détaillée'}
            </span>
            <span className="text-sm font-medium">{poids} kg</span>
          </div>

          {/* Avertissement surplus obligatoire */}
          {typeClient === 'Premium' && abonnementPremium != null && prixDetails.premiumDetails?.surplusDetails?.obligatoire && (
            <div className="bg-orange-50 border-l-4 border-orange-400 p-3">
              <div className="flex items-center">
                <AlertCircle className="h-4 w-4 text-orange-400 mr-2" />
                <span className="text-sm text-orange-700">
                  {prixDetails.premiumDetails.surplusDetails.raison}
                </span>
              </div>
            </div>
          )}

          {/* Répartition des machines - Toujours affichée */}
          <div className="bg-gray-50 rounded-lg p-3">
            <h3 className="text-sm font-medium mb-2">
              Répartition des machines :
              {typeClient === 'Premium' && abonnementPremium != null && prixDetails.premiumDetails?.surplus > 0 && (
                <span className="text-xs text-orange-600 ml-2">(pour le surplus)</span>
              )}
            </h3>
            <div className="space-y-1 text-sm">
              {(() => {
                // Utiliser la répartition existante ou calculer une nouvelle
                let repartition;
                
                if (prixDetails.repartitionMachines) {
                  repartition = prixDetails.repartitionMachines;
                } else {
                  // Calculer la répartition pour le poids total
                  const calcul = PriceService.calculerRepartitionMachines(poids);
                  repartition = {
                    machine20kg: calcul.nombreMachine20kg,
                    machine6kg: calcul.nombreMachine6kg
                  };
                }
                
                return (
                  <>
                    {repartition.machine20kg > 0 && (
                      <div className="flex justify-between">
                        <span>Machine 20kg × {repartition.machine20kg}</span>
                        <span className="font-medium">
                          {PriceService.formaterPrix(
                            repartition.machine20kg * PriceService.PRIX_MACHINE_20KG
                          )}
                        </span>
                      </div>
                    )}
                    {repartition.machine6kg > 0 && (
                      <div className="flex justify-between">
                        <span>Machine 6kg × {repartition.machine6kg}</span>
                        <span className="font-medium">
                          {PriceService.formaterPrix(
                            repartition.machine6kg * PriceService.PRIX_MACHINE_6KG
                          )}
                        </span>
                      </div>
                    )}
                  </>
                );
              })()}
            </div>
          </div>

          {/* Inclus pour formule détaillée ou premium */}
          {(formule === 'Detail' && prixDetails.inclus) || (typeClient === 'Premium' &&  abonnementPremium != null && prixDetails.premiumDetails?.inclus) ? (
            <div className="bg-green-50 rounded-lg p-3">
              <h3 className="text-sm font-medium mb-2 text-green-700">Services inclus :</h3>
              <div className="flex flex-wrap gap-1">
                {(prixDetails.inclus || prixDetails.premiumDetails?.inclus || []).map((service) => (
                  <span
                    key={service}
                    className="inline-block bg-green-100 text-green-700 text-xs px-2 py-1 rounded-full"
                  >
                    {service}
                  </span>
                ))}
              </div>
              {formule === 'Detail' && (
                <div className="mt-2 text-sm text-green-600">
                  <div>Prix de base : 600 FCFA/kg</div>
                  <div className="text-xs mt-1">Inclus : collecte, lavage, séchage, livraison</div>
                </div>
              )}
              {typeClient === 'Premium' && abonnementPremium != null && prixDetails.premiumDetails?.estCouvertParAbonnement && (
                <div className="mt-2 text-sm text-green-600">
                  Couvert par l'abonnement premium
                </div>
              )}
            </div>
          ) : null}

          {/* Prix de base */}
          {prixDetails.prixBase > 0 && (
            <div className="flex justify-between">
              <span>Prix de base</span>
              <span className="font-medium">
                {PriceService.formaterPrix(prixDetails.prixBase)}
              </span>
            </div>
          )}

          {/* Options */}
          {(prixDetails.prixOptions > 0 || (formule === 'Detail' && prixDetails.options.repassage)) && (
            <div className="space-y-1">
              <div className="text-sm font-medium">Options sélectionnées :</div>
              
              {prixDetails.options.livraison && (
                <div className="flex justify-between text-sm pl-4">
                  <div className="flex items-center gap-1">
                    <Truck className="h-3 w-3" />
                    <span>Livraison</span>
                  </div>
                  <span>+{PriceService.formaterPrix(prixDetails.options.livraison)}</span>
                </div>
              )}
              
              {prixDetails.options.sechage && (
                <div className="flex justify-between text-sm pl-4">
                  <span>Séchage ( {prixDetails.options.sechage.nombreUtilisations} x {prixDetails.options.sechage.prixParKg} FCFA)</span>
                  <span>+{PriceService.formaterPrix(prixDetails.options.sechage.prix)}</span>
                </div>
              )}
              
              {prixDetails.options.repassage && (
                <div className="flex justify-between text-sm pl-4">
                  <span>Repassage ({poids} kg × 150 FCFA)</span>
                  <span>+{PriceService.formaterPrix(prixDetails.options.repassage)}</span>
                </div>
              )}
              
              {prixDetails.options.express && (
                <div className="flex justify-between text-sm pl-4">
                  <span>Express (6h)</span>
                  <span>+{PriceService.formaterPrix(prixDetails.options.express)}</span>
                </div>
              )}
            </div>
          )}

          {/* Sous-total */}
          {prixDetails.prixOptions > 0 && prixDetails.prixBase > 0 && (
            <div className="flex justify-between border-t pt-2">
              <span>Sous-total</span>
              <span className="font-medium">
                {PriceService.formaterPrix(prixDetails.prixSousTotal)}
              </span>
            </div>
          )}

          {/* Réduction */}
          {prixDetails.reduction && prixDetails.reduction.montantReduction > 0 && (
            <div className="bg-amber-50 rounded-lg p-2">
              <div className="flex justify-between text-sm">
                <span className="text-amber-700">
                  {prixDetails.reduction.raisonReduction} (-{prixDetails.reduction.tauxReduction}%)
                </span>
                <span className="font-medium text-amber-700">
                  -{PriceService.formaterPrix(prixDetails.reduction.montantReduction)}
                </span>
              </div>
            </div>
          )}

          {/* Prix avant ajustement si ajustement appliqué */}
          {hasAdjustment && (
            <div className="flex justify-between border-t pt-2">
              <span className="font-medium">Prix avant ajustement</span>
              <span className="font-medium">
                {prixDetails.prixFinal === 0 && typeClient === 'Premium' && abonnementPremium != null ? 'Inclus dans l\'abonnement' : PriceService.formaterPrix(prixDetails.prixFinal)}
              </span>
            </div>
          )}

          {/* Ajustement de prix */}
          {hasAdjustment && adjustmentType && adjustmentMethod && adjustmentValue && (
            <div className={`rounded-lg p-2 ${adjustmentType === 'Augmentation' ? 'bg-red-50' : 'bg-green-50'}`}>
              <div className="flex justify-between text-sm">
                <div className="flex flex-col">
                  <span className={`font-medium ${adjustmentType === 'Augmentation' ? 'text-red-700' : 'text-green-700'}`}>
                    {adjustmentType} {adjustmentMethod === 'Pourcentage' ? `(${adjustmentValue}%)` : `(${adjustmentValue} FCFA)`}
                  </span>
                  {adjustmentReason && (
                    <span className="text-xs text-gray-600 mt-1">
                      Raison: {adjustmentReason}
                    </span>
                  )}
                </div>
                <span className={`font-medium ${adjustmentType === 'Augmentation' ? 'text-red-700' : 'text-green-700'}`}>
                  {adjustmentType === 'Augmentation' ? '+' : '-'}{PriceService.formaterPrix(Math.abs(montantAjustement))}
                </span>
              </div>
            </div>
          )}

          {/* Prix final */}
          <div className="flex justify-between border-t pt-2">
            <span className="text-lg font-semibold">Prix total</span>
            <span className={`font-bold text-xl ${typeClient === 'Premium' && abonnementPremium != null && prixFinalAjuste === 0 ? 'text-green-600' : hasAdjustment ? 'text-orange-600' : 'text-primary'}`}>
              {typeClient === 'Premium' && abonnementPremium != null && prixFinalAjuste === 0 ? 'Inclus dans l\'abonnement' : PriceService.formaterPrix(prixFinalAjuste)}
            </span>
          </div>

          {/* Date de commande */}
          <div className="flex justify-between text-xs text-gray-500 mt-2">
            <span>Date de commande</span>
            <span>{new Date().toLocaleDateString('fr-FR')}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}; 