
import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Truck } from 'lucide-react';

interface Driver {
  id: string;
  name: string;
  phone: string;
  available: boolean;
}

// Mock data for drivers - in a real app, this would come from an API
const mockDrivers: Driver[] = [
  { id: 'drv1', name: 'Mamadou Diop', phone: '77 123 45 67', available: true },
  { id: 'drv2', name: 'Fatou Ndiaye', phone: '77 234 56 78', available: true },
  { id: 'drv3', name: 'Ousmane Seck', phone: '77 345 67 89', available: false },
  { id: 'drv4', name: 'Aissatou Fall', phone: '77 456 78 90', available: true }
];

interface DeliveryDriverAssignmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orderId: string;
  onAssign: (driverId: string) => void;
}

export const DeliveryDriverAssignmentDialog: React.FC<DeliveryDriverAssignmentDialogProps> = ({
  open,
  onOpenChange,
  orderId,
  onAssign
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDriver, setSelectedDriver] = useState<string | null>(null);

  const filteredDrivers = mockDrivers.filter(driver => 
    driver.available && 
    (driver.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
     driver.phone.includes(searchTerm))
  );

  const handleAssign = () => {
    if (selectedDriver) {
      onAssign(selectedDriver);
      toast.success(`Livreur assigné à la commande #${orderId}`);
      onOpenChange(false);
      setSelectedDriver(null);
      setSearchTerm('');
    } else {
      toast.error("Veuillez sélectionner un livreur");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Affecter un livreur</DialogTitle>
          <DialogDescription>
            Commande #{orderId} - Sélectionnez un livreur disponible
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <Input
            placeholder="Rechercher un livreur par nom ou téléphone"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full"
          />
          
          <div className="max-h-60 overflow-y-auto space-y-2">
            {filteredDrivers.length > 0 ? (
              filteredDrivers.map(driver => (
                <div 
                  key={driver.id}
                  onClick={() => setSelectedDriver(driver.id)}
                  className={`p-3 border rounded-md flex items-center justify-between cursor-pointer hover:bg-gray-50 ${selectedDriver === driver.id ? 'border-primary bg-primary/5' : ''}`}
                >
                  <div>
                    <p className="font-medium">{driver.name}</p>
                    <p className="text-sm text-gray-500">{driver.phone}</p>
                  </div>
                  {selectedDriver === driver.id && (
                    <Truck className="h-5 w-5 text-primary" />
                  )}
                </div>
              ))
            ) : (
              <p className="text-center py-2 text-gray-500">Aucun livreur disponible trouvé</p>
            )}
          </div>
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Annuler
          </Button>
          <Button onClick={handleAssign} disabled={!selectedDriver}>
            Affecter le livreur
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
