import React, { useState, useEffect } from 'react';
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
import { Truck, Loader2 } from 'lucide-react';
import LivreurService, { Livreur } from '@/services/livreur';

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
  const [livreurs, setLivreurs] = useState<Livreur[]>([]);
  const [loading, setLoading] = useState(false);

  // Charger les livreurs disponibles quand le dialog s'ouvre
  useEffect(() => {
    if (open) {
      loadLivreurs();
    }
  }, [open]);

  const loadLivreurs = async () => {
    try {
      setLoading(true);
      const livreursData = await LivreurService.getAvailableLivreurs();
      setLivreurs(livreursData);
    } catch (error) {
      console.error('Erreur lors du chargement des livreurs:', error);
      toast.error('Erreur lors du chargement des livreurs');
    } finally {
      setLoading(false);
    }
  };

  const filteredDrivers = livreurs.filter(livreur => 
    livreur.statutDisponibilite && 
    (`${livreur.prenom} ${livreur.nom}`.toLowerCase().includes(searchTerm.toLowerCase()) || 
     (livreur.telephone && livreur.telephone.includes(searchTerm)))
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

  const handleClose = () => {
    onOpenChange(false);
    setSelectedDriver(null);
    setSearchTerm('');
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
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
            {loading ? (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="h-6 w-6 animate-spin" />
                <span className="ml-2">Chargement des livreurs...</span>
              </div>
            ) : filteredDrivers.length > 0 ? (
              filteredDrivers.map(livreur => (
                <div 
                  key={livreur.id}
                  onClick={() => setSelectedDriver(livreur.id.toString())}
                  className={`p-3 border rounded-md flex items-center justify-between cursor-pointer hover:bg-gray-50 ${selectedDriver === livreur.id.toString() ? 'border-primary bg-primary/5' : ''}`}
                >
                  <div>
                    <p className="font-medium">{livreur.prenom} {livreur.nom}</p>
                    <p className="text-sm text-gray-500">{livreur.telephone || 'Pas de téléphone'}</p>
                    {livreur.moyenLivraison && (
                      <p className="text-xs text-gray-400">{livreur.moyenLivraison}</p>
                    )}
                  </div>
                  {selectedDriver === livreur.id.toString() && (
                    <Truck className="h-5 w-5 text-primary" />
                  )}
                </div>
              ))
            ) : (
              <p className="text-center py-2 text-gray-500">
                {loading ? 'Chargement...' : 'Aucun livreur disponible trouvé'}
              </p>
            )}
          </div>
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Annuler
          </Button>
          <Button onClick={handleAssign} disabled={!selectedDriver || loading}>
            Affecter le livreur
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
