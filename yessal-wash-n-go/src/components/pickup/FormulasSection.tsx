import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { ServiceType } from "@/types";

interface FormulasSectionProps {
  formula: ServiceType | null;
  isPremium: boolean;
  onFormulaChange: (formula: ServiceType | null) => void;
}

const FormulasSection = ({
  formula,
  isPremium,
  onFormulaChange
}: FormulasSectionProps) => {
  // Function to handle radio selection/deselection for premium users
  const handleRadioChange = (value: ServiceType) => {
    if (isPremium && formula === value) {
      // If premium user clicks the already selected formula, deselect it
      onFormulaChange(null);
    } else {
      // Otherwise set the formula
      onFormulaChange(value);
    }
  };

  return (
    <div className="border rounded-lg p-3">
      <Label className="mb-2 block font-medium">
        Formules {isPremium ? "(optionnel)" : ""}
      </Label>
      
      <RadioGroup
        value={formula || ""}
        onValueChange={(value) => {
          if (value) {
            handleRadioChange(value as ServiceType);
          }
        }}
        className="flex flex-col space-y-3"
      >
        {/* Basic formula option available to all users */}
        <div className="flex items-start space-x-3">
          <RadioGroupItem value="basic" id="basic" className="mt-1" />
          <div className="flex-1">
            <Label htmlFor="basic" className="font-medium">Formule de base</Label>
            <p className="text-sm text-muted-foreground">Lavage simple dans nos machines</p>
          </div>
        </div>
        
        {/* Detailed formula option available to all users */}
        <div className="flex items-start space-x-3">
          <RadioGroupItem value="detailed" id="detailed" className="mt-1" />
          <div className="flex-1">
            <Label htmlFor="detailed" className="font-medium">Formule détaillée</Label>
            <p className="text-sm text-muted-foreground">600 F/kg, lavé, repassé et livré (minimum 6 kg)</p>
          </div>
        </div>
      </RadioGroup>
    </div>
  );
};

export default FormulasSection;
