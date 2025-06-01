
import React, { useEffect, useState } from 'react';
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { Check, X } from 'lucide-react';

interface Order {
  id: string;
  clientName: string;
  price: number;
  weight: number;
  date: string;
  time: string;
}

interface PendingOrderNotificationProps {
  pendingOrders: Order[];
  onAccept: (orderId: string) => void;
  onReject: (orderId: string) => void;
}

export const PendingOrderNotification: React.FC<PendingOrderNotificationProps> = ({
  pendingOrders,
  onAccept,
  onReject
}) => {
  const [currentOrderIndex, setCurrentOrderIndex] = useState(0);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    // Only show notifications if there are pending orders
    if (pendingOrders.length === 0) {
      setOpen(false);
      return;
    }

    // Show notification immediately
    setOpen(true);

    // Set up interval to show notification every 10 seconds
    const interval = setInterval(() => {
      if (pendingOrders.length > 0) {
        // Play notification sound
        const audio = new Audio('/notification.mp3');
        audio.play().catch(error => {
          // Handle the error or ignore it (browser might require user interaction)
          console.log('Audio playback failed:', error);
        });
        
        // Show dialog
        setOpen(true);
        
        // Cycle through pending orders
        setCurrentOrderIndex(prevIndex => 
          prevIndex < pendingOrders.length - 1 ? prevIndex + 1 : 0
        );
      } else {
        setOpen(false);
      }
    }, 10000);

    return () => clearInterval(interval);
  }, [pendingOrders]);

  const handleAccept = () => {
    if (pendingOrders.length > 0) {
      const orderId = pendingOrders[currentOrderIndex].id;
      onAccept(orderId);
      toast.success(`Commande #${orderId} acceptée`);
      
      // Check if there are more pending orders
      if (pendingOrders.length > 1) {
        // Move to the next order
        setCurrentOrderIndex(prevIndex => 
          prevIndex < pendingOrders.length - 2 ? prevIndex : 0
        );
      } else {
        // Close the dialog if this was the last order
        setOpen(false);
      }
    }
  };

  const handleReject = () => {
    if (pendingOrders.length > 0) {
      const orderId = pendingOrders[currentOrderIndex].id;
      onReject(orderId);
      toast.error(`Commande #${orderId} refusée`);
      
      // Check if there are more pending orders
      if (pendingOrders.length > 1) {
        // Move to the next order
        setCurrentOrderIndex(prevIndex => 
          prevIndex < pendingOrders.length - 2 ? prevIndex : 0
        );
      } else {
        // Close the dialog if this was the last order
        setOpen(false);
      }
    }
  };

  if (pendingOrders.length === 0) return null;

  const currentOrder = pendingOrders[currentOrderIndex];

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Nouvelle commande avec livraison</DialogTitle>
          <DialogDescription>
            Commande #{currentOrder.id} - En attente de validation
          </DialogDescription>
        </DialogHeader>
        
        <div className="py-4">
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="font-medium">Client:</span>
              <span>{currentOrder.clientName}</span>
            </div>
            <div className="flex justify-between">
              <span className="font-medium">Prix:</span>
              <span>{currentOrder.price.toLocaleString()} FCFA</span>
            </div>
            <div className="flex justify-between">
              <span className="font-medium">Poids:</span>
              <span>{currentOrder.weight} kg</span>
            </div>
            <div className="flex justify-between">
              <span className="font-medium">Date:</span>
              <span>{currentOrder.date} à {currentOrder.time}</span>
            </div>
          </div>
        </div>
        
        <DialogFooter className="flex flex-row gap-2">
          <Button 
            onClick={handleReject}
            variant="destructive"
            className="flex-1 flex items-center justify-center"
          >
            <X className="mr-2 h-4 w-4" />
            Refuser
          </Button>
          <Button 
            onClick={handleAccept}
            className="flex-1 bg-[#00bf63] hover:bg-[#00a857] flex items-center justify-center"
          >
            <Check className="mr-2 h-4 w-4" />
            Accepter
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
