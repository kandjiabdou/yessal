
import { useState } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/components/ui/use-toast";
import { Location } from "@/types";
import { MapPin } from "lucide-react";
import LocationConfirmDialog from "./LocationConfirmDialog";
import LocationMap from "./LocationMap";

interface LocationSectionProps {
  address: string;
  location: Location;
  hasLocation: boolean;
  onLocationChange: (location: Location) => void;
  onAddressChange: (address: string) => void;
  onDefaultLocationChange: (useAsDefault: boolean) => void;
  onLocationStatusChange: (hasLocation: boolean) => void;
}

const LocationSection = ({
  address,
  location,
  hasLocation,
  onLocationChange,
  onAddressChange,
  onDefaultLocationChange,
  onLocationStatusChange
}: LocationSectionProps) => {
  const { toast } = useToast();
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);

  const getLocation = () => {
    if (navigator.geolocation) {
      // Use high accuracy for better precision
      const options = {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
      };
      
      navigator.geolocation.getCurrentPosition(
        (position) => {
          onLocationChange({
            ...location,
            latitude: position.coords.latitude,
            longitude: position.coords.longitude
          });
          onLocationStatusChange(true);
          toast({
            title: "Localisation obtenue",
            description: "Vos coordonnées GPS ont été enregistrées avec succès.",
          });
        },
        (error) => {
          console.error("Erreur de géolocalisation:", error);
          toast({
            title: "Erreur de localisation",
            description: "Impossible d'obtenir votre position. Veuillez autoriser l'accès à votre localisation.",
            variant: "destructive",
          });
        },
        options
      );
    } else {
      toast({
        title: "Géolocalisation non supportée",
        description: "Votre navigateur ne prend pas en charge la géolocalisation.",
        variant: "destructive",
      });
    }
  };

  const requestLocation = () => {
    if (hasLocation) {
      setShowConfirmDialog(true);
    } else {
      getLocation();
    }
  };

  const handleConfirmLocationUpdate = () => {
    getLocation();
    setShowConfirmDialog(false);
  };

  return (
    <div className="space-y-3">
      <Label htmlFor="location" className="flex items-center gap-1">
        <MapPin size={16} />
        Localisation
      </Label>
      
      <div className={`border rounded-lg p-3 ${!hasLocation ? 'border-red-300 bg-red-50' : ''}`}>
        {hasLocation ? (
          <div className="space-y-3">
            <div onClick={requestLocation} className="flex gap-2 items-center cursor-pointer text-sm p-1 hover:bg-muted rounded">
              <span className="text-muted-foreground">Coordonnées GPS:</span>
              <span className="font-medium">
                {location.latitude?.toFixed(6)}, {location.longitude?.toFixed(6)}
              </span>
              <span className="text-xs text-blue-600 ml-auto">Modifier</span>
            </div>
            
            {/* Map showing the current location */}
            <LocationMap 
              latitude={location.latitude} 
              longitude={location.longitude} 
            />
            
            <div className="flex items-center space-x-2 mt-2">
              <Checkbox 
                id="defaultLocation" 
                checked={location.useAsDefault}
                onCheckedChange={(checked) => onDefaultLocationChange(checked === true)}
              />
              <Label htmlFor="defaultLocation" className="text-sm">
                Utiliser cette localisation par défaut
              </Label>
            </div>
          </div>
        ) : (
          <div className="text-center">
            <p className="text-sm text-red-600 mb-2">Veuillez autoriser l'accès à votre localisation</p>
            <Button 
              type="button" 
              variant="outline" 
              size="sm" 
              onClick={requestLocation}
              className="w-full"
            >
              Partager ma localisation
            </Button>
          </div>
        )}
      </div>
      
      <div className="space-y-1 mt-2">
        <Label htmlFor="address" className="text-sm">Adresse (optionnel)</Label>
        <Input
          id="address"
          name="address"
          placeholder="123 Rue Principale, Thiès"
          value={address}
          onChange={(e) => onAddressChange(e.target.value)}
        />
      </div>

      <LocationConfirmDialog 
        open={showConfirmDialog}
        onOpenChange={setShowConfirmDialog}
        onConfirm={handleConfirmLocationUpdate}
      />
    </div>
  );
};

export default LocationSection;
