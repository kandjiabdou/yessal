import React from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import ClientLocationMap from './ClientLocationMap';
import { Client } from '@/services/client';

interface ClientAddressSectionProps {
  hasAddress: boolean;
  hasGpsCoordinates: boolean;
  client: Client | null;
  formData: {
    modifyAddress: boolean;
    newAddress: string;
  };
  handleModifyAddressChange: () => void;
  handleAddressChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
}

export const ClientAddressSection: React.FC<ClientAddressSectionProps> = ({ 
  hasAddress,
  hasGpsCoordinates,
  client,
  formData,
  handleModifyAddressChange,
  handleAddressChange
}) => {
  return (
    <Card>
      <CardContent className="p-4">
        <h2 className="font-semibold mb-3">Adresse de livraison</h2>
        
        {hasGpsCoordinates && client?.coordonnees ? (
          <div className="mb-3">
            <ClientLocationMap coordinates={client.coordonnees} />
          </div>
        ) : hasAddress && client?.adresseText ? (
          <div className="border rounded-md p-3 mb-3 bg-gray-50">
            <p className="text-sm">{client.adresseText}</p>
          </div>
        ) : null}
        
        <div className="flex items-center space-x-2">
          <Checkbox 
            id="modify-address" 
            checked={formData.modifyAddress} 
            onCheckedChange={handleModifyAddressChange} 
          />
          <Label htmlFor="modify-address">
            {hasAddress ? 'Modifier l\'adresse' : 'Ajouter une adresse'}
          </Label>
        </div>
        
        {formData.modifyAddress && (
          <div className="mt-3">
            <Textarea 
              placeholder="Nouvelle adresse"
              value={formData.newAddress}
              onChange={handleAddressChange}
              className="min-h-[80px]"
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
};
