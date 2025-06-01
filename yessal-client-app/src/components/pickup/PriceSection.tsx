
interface PriceDetails {
  basePrice: number;
  ironingPrice: number;
  expressPrice: number;
  dryingPrice?: number;
  excessWeight?: number;
  subtotal: number;
  discountAmount: number;
  hasStudentDiscount: boolean;
  totalPrice: number;
  isPremiumFree?: boolean;
}

interface PriceSectionProps {
  priceDetails: PriceDetails;
  formula: string | null;
  options: {
    hasIroning: boolean;
    hasExpress: boolean;
    hasDrying?: boolean;
  };
  isStudent?: boolean;
  weight?: number;
}

const PriceSection = ({ priceDetails, formula, options, isStudent, weight = 0 }: PriceSectionProps) => {
  return (
    <div className="pt-2">
      <div className="bg-muted p-3 rounded-md">
        {priceDetails.isPremiumFree ? (
          <div className="text-center text-green-600 font-medium py-1">
            Inclus dans votre abonnement Premium
          </div>
        ) : (
          <>
            <div className="flex justify-between mb-1">
              <span>Prix de base</span>
              <span>
                {formula === "basic" 
                  ? `${priceDetails.basePrice} CFA`
                  : formula === "detailed"
                  ? `${priceDetails.basePrice} CFA (${weight}kg à 600 CFA/kg)`
                  : "0 CFA"}
              </span>
            </div>
            
            {priceDetails.excessWeight && priceDetails.excessWeight > 0 && (
              <div className="flex justify-between mb-1 text-amber-600">
                <span>Excédent Premium ({priceDetails.excessWeight}kg)</span>
                <span>Facturé</span>
              </div>
            )}

            {options.hasIroning && options.hasDrying && formula === "basic" && (
              <div className="flex justify-between mb-1">
                <span>Option repassage</span>
                <span>{priceDetails.ironingPrice} CFA ({weight}kg à 250 CFA/kg)</span>
              </div>
            )}

            {options.hasDrying && (
              <div className="flex justify-between mb-1">
                <span>Séchage (en livraison)</span>
                <span>{priceDetails.dryingPrice} CFA ({weight}kg à 175 CFA/kg)</span>
              </div>
            )}

            {options.hasExpress && (
              <div className="flex justify-between mb-1">
                <span>Service express</span>
                <span>1000 CFA</span>
              </div>
            )}
            
            {priceDetails.subtotal !== priceDetails.totalPrice && (
              <>
                <div className="flex justify-between mb-1 pt-1 border-t border-border">
                  <span>Sous-total</span>
                  <span>{priceDetails.subtotal} CFA</span>
                </div>
                {isStudent && priceDetails.discountAmount > 0 && (
                  <div className="flex justify-between mb-1 text-green-600">
                    <span>Réduction étudiant (10%)</span>
                    <span>-{priceDetails.discountAmount} CFA</span>
                  </div>
                )}
              </>
            )}
            
            <div className="flex justify-between font-medium border-t border-border mt-2 pt-2">
              <span>Total</span>
              <span>{priceDetails.totalPrice} CFA</span>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default PriceSection;
