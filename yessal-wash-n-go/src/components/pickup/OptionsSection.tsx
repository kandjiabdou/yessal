
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { ServiceType } from "@/types";
import { Weight } from "lucide-react";

interface PickupOptions {
  hasIroning: boolean;
  hasExpress: boolean;
  hasDrying?: boolean;
}

interface OptionsSectionProps {
  options: PickupOptions;
  formula: ServiceType | null;
  weight: number;
  isPremium: boolean;
  monthlyUsedWeight: number;
  onOptionChange: (option: keyof PickupOptions, value: boolean) => void;
}

const OptionsSection = ({
  options,
  formula,
  weight,
  isPremium,
  monthlyUsedWeight,
  onOptionChange
}: OptionsSectionProps) => {
  const remainingPremiumWeight = 40 - monthlyUsedWeight;
  const isPremiumWithinLimit = isPremium && weight <= remainingPremiumWeight;
  const showRegularOptions = !isPremium || (isPremium && weight > remainingPremiumWeight);
  
  return (
    <div className="border rounded-lg p-3">
      <Label className="mb-2 block font-medium">Options supplémentaires</Label>
      <div className="space-y-3">
        {/* Only show ironing option for basic formula when drying is selected */}
        {showRegularOptions && formula === "basic" && options.hasDrying && (
          <div className="flex items-center space-x-2">
            <Checkbox 
              id="hasIroning" 
              checked={options.hasIroning}
              onCheckedChange={(checked) => 
                onOptionChange("hasIroning", checked === true)
              }
            />
            <div className="flex justify-between items-center w-full">
              <Label htmlFor="hasIroning">
                Option repassage
              </Label>
              <span className="text-sm font-medium">+{250 * weight} CFA ({weight}kg à 250 CFA/kg)</span>
            </div>
          </div>
        )}

        {/* Only show drying option for basic formula or when outside premium limits */}
        {showRegularOptions && formula === "basic" && (
          <div className="flex items-center space-x-2">
            <Checkbox 
              id="hasDrying" 
              checked={options.hasDrying}
              onCheckedChange={(checked) => 
                onOptionChange("hasDrying", checked === true)
              }
            />
            <div className="flex justify-between items-center w-full">
              <Label htmlFor="hasDrying">Séchage (en livraison)</Label>
              <span className="text-sm font-medium">+175 CFA/kg</span>
            </div>
          </div>
        )}

        {/* Express option is always available */}
        <div className="flex items-center space-x-2">
          <Checkbox 
            id="hasExpress" 
            checked={options.hasExpress}
            onCheckedChange={(checked) => 
              onOptionChange("hasExpress", checked === true)
            }
          />
          <div className="flex justify-between items-center w-full">
            <Label htmlFor="hasExpress">Service express (6h chrono)</Label>
            <span className="text-sm font-medium">+1000 CFA</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OptionsSection;
