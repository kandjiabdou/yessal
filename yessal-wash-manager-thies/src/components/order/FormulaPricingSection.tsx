
import React from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";

interface FormulaPricingSectionProps {
  showFormulaSelection: boolean;
  formulaType: string;
  handleFormulaChange: (value: 'basic' | 'detailed') => void;
}

export const FormulaPricingSection: React.FC<FormulaPricingSectionProps> = ({ 
  showFormulaSelection,
  formulaType,
  handleFormulaChange
}) => {
  if (!showFormulaSelection) {
    return (
      <Card>
        <CardContent className="p-4">
          <h2 className="font-semibold mb-4">Formule</h2>
          <div className="bg-primary/10 rounded-lg p-3 text-sm">
            <p>Client premium - volume couvert par l'abonnement</p>
            <p className="text-xs mt-1 text-gray-600">
              Abonnement de 40 kg/mois (hors service express)
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="p-4">
        <h2 className="font-semibold mb-4">Formule</h2>
        <RadioGroup 
          value={formulaType} 
          onValueChange={value => handleFormulaChange(value as 'basic' | 'detailed')} 
          className="space-y-2"
        >
          <div className="flex items-center space-x-2 border rounded-md p-3 hover:bg-gray-50 cursor-pointer">
            <RadioGroupItem value="basic" id="formula-basic" />
            <Label htmlFor="formula-basic" className="flex-grow cursor-pointer">
              <div>
                <span className="font-medium">Formule de base</span>
                <p className="text-xs text-gray-500 mt-0.5">
                  Lavage standard en machine (plusieurs vêtements ensemble)
                </p>
              </div>
            </Label>
          </div>
          <div className="flex items-center space-x-2 border rounded-md p-3 hover:bg-gray-50 cursor-pointer">
            <RadioGroupItem value="detailed" id="formula-detailed" />
            <Label htmlFor="formula-detailed" className="flex-grow cursor-pointer">
              <div>
                <span className="font-medium">Formule détaillée</span>
                <p className="text-xs text-gray-500 mt-0.5">
                  Traitement spécifique pour chaque type de vêtement
                </p>
              </div>
            </Label>
          </div>
        </RadioGroup>
      </CardContent>
    </Card>
  );
};
