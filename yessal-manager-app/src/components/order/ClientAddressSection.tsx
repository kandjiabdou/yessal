
import React from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import ClientLocationMap from './ClientLocationMap';

interface ClientAddressSectionProps {
  hasAddress: boolean;
  hasGpsCoordinates: boolean;
  client: any;
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
  if (!hasAddress && !hasGpsCoordinates) {
    // No address available - show input field
    return (
      <Card>
        <CardContent className="p-4">
          <h2 className="font-semibold mb-3">Adresse de livraison</h2>
          <p className="text-sm text-gray-500 mb-3">
            Aucune adresse disponible pour ce client. Veuillez saisir une adresse:
          </p>
          <Textarea 
            placeholder="Adresse complète du client"
            value={formData.newAddress}
            onChange={handleAddressChange}
            className="min-h-[80px]"
          />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="p-4">
        <h2 className="font-semibold mb-3">Adresse de livraison</h2>
        
        {hasGpsCoordinates ? (
          <div className="mb-3">
            <ClientLocationMap coordinates={client.coordinates} />
          </div>
        ) : hasAddress ? (
          <div className="border rounded-md p-3 mb-3 bg-gray-50">
            <p className="text-sm">{client.address}</p>
          </div>
        ) : null}
        
        <div className="flex items-center space-x-2">
          <Checkbox 
            id="modify-address" 
            checked={formData.modifyAddress} 
            onCheckedChange={handleModifyAddressChange} 
          />
          <Label htmlFor="modify-address">Modifier l'adresse</Label>
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
