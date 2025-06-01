
import React from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

interface OptionsSectionProps {
  options: {
    delivery: boolean;
    drying: boolean;
    ironing: boolean;
    express: boolean;
  };
  handleOptionChange: (option: string) => void;
  formulaType: string;
  clientCategory: string;
  isPremiumWithExcessWeight: boolean;
}

export const OptionsSection: React.FC<OptionsSectionProps> = ({ 
  options, 
  handleOptionChange,
  formulaType,
  clientCategory,
  isPremiumWithExcessWeight
}) => {
  // Determine which options to show based on formula type and client category
  const showDryingOption = formulaType === 'basic' && options.delivery;
  const showIroningOption = formulaType === 'basic' && options.drying;
  
  return (
    <Card>
      <CardContent className="p-4">
        <h2 className="font-semibold mb-4">Options</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {formulaType === 'basic' && (
            <div className="flex items-center space-x-2 border rounded-md p-3 hover:bg-gray-50">
              <Checkbox 
                id="option-delivery" 
                checked={options.delivery} 
                onCheckedChange={() => handleOptionChange('delivery')} 
              />
              <div className="flex-grow">
                <Label htmlFor="option-delivery" className="cursor-pointer">Livraison</Label>
                <p className="text-xs text-gray-500">+1000 FCFA</p>
              </div>
            </div>
          )}
          
          {showDryingOption && (
            <div className="flex items-center space-x-2 border rounded-md p-3 hover:bg-gray-50">
              <Checkbox 
                id="option-drying" 
                checked={options.drying} 
                onCheckedChange={() => handleOptionChange('drying')} 
              />
              <div className="flex-grow">
                <Label htmlFor="option-drying" className="cursor-pointer">Séchage</Label>
                <p className="text-xs text-gray-500">+150 FCFA/kg</p>
              </div>
            </div>
          )}
          
          {showIroningOption && (
            <div className="flex items-center space-x-2 border rounded-md p-3 hover:bg-gray-50">
              <Checkbox 
                id="option-ironing" 
                checked={options.ironing} 
                onCheckedChange={() => handleOptionChange('ironing')} 
                disabled={!options.drying}
              />
              <div className="flex-grow">
                <Label htmlFor="option-ironing" className="cursor-pointer">Repassage</Label>
                <p className="text-xs text-gray-500">+200 FCFA/kg</p>
                {!options.drying && (
                  <p className="text-xs text-amber-600">Nécessite l'option Séchage</p>
                )}
              </div>
            </div>
          )}
          
          <div className="flex items-center space-x-2 border rounded-md p-3 hover:bg-gray-50">
            <Checkbox 
              id="option-express" 
              checked={options.express} 
              onCheckedChange={() => handleOptionChange('express')} 
            />
            <div className="flex-grow">
              <Label htmlFor="option-express" className="cursor-pointer">Express (6h)</Label>
              <p className="text-xs text-gray-500">+1000 FCFA</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
