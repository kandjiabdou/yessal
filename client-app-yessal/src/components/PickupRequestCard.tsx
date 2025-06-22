
import { PickupRequest } from "@/types";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatDate, formatCurrency } from "@/lib/utils";

interface PickupRequestCardProps {
  request: PickupRequest;
  onSelect?: (id: string) => void;
}

const PickupRequestCard = ({ request, onSelect }: PickupRequestCardProps) => {
  const statusColors: Record<string, string> = {
    "pending": "bg-yellow-100 text-yellow-800",
    "confirmed": "bg-blue-100 text-blue-800",
    "on-the-way": "bg-blue-100 text-blue-800",
    "picked-up": "bg-indigo-100 text-indigo-800",
    "processing": "bg-purple-100 text-purple-800",
    "out-for-delivery": "bg-indigo-100 text-indigo-800",
    "delivered": "bg-green-100 text-green-800",
    "cancelled": "bg-red-100 text-red-800",
  };

  const statusLabels: Record<string, string> = {
    "pending": "En attente",
    "confirmed": "Confirmé",
    "on-the-way": "En route",
    "picked-up": "Collecté",
    "processing": "En traitement",
    "out-for-delivery": "En livraison",
    "delivered": "Livré",
    "cancelled": "Annulé",
  };

  const handleClick = () => {
    if (onSelect) {
      onSelect(request.id);
    }
  };

  return (
    <Card className="overflow-hidden">
      <CardHeader className="p-4 pb-2 bg-muted/50">
        <div className="flex justify-between items-start">
          <CardTitle className="text-lg font-medium">
            Collecte #{request.trackingCode.slice(-5)}
          </CardTitle>
          <Badge className={statusColors[request.status]}>
            {statusLabels[request.status]}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="p-4 space-y-3 text-sm">
        <div>
          <p className="text-muted-foreground mb-1">Adresse de collecte</p>
          <p className="font-medium">{request.pickupAddress}</p>
        </div>
        
        <div className="grid grid-cols-2 gap-2">
          <div>
            <p className="text-muted-foreground mb-1">Date de collecte</p>
            <p className="font-medium">{formatDate(request.pickupTime)}</p>
          </div>
          <div>
            <p className="text-muted-foreground mb-1">Livraison prévue</p>
            <p className="font-medium">{formatDate(request.estimatedDeliveryTime)}</p>
          </div>
        </div>
        
        <div className="flex justify-between">
          <div>
            <p className="text-muted-foreground mb-1">Type de service</p>
            <p className="font-medium capitalize">{request.serviceType}</p>
          </div>
          <div>
            <p className="text-muted-foreground mb-1">Repassage</p>
            <p className="font-medium">{request.hasIroning ? "Oui" : "Non"}</p>
          </div>
        </div>
        
        <div>
          <p className="text-muted-foreground mb-1">Prix</p>
          <p className="font-medium">{formatCurrency(request.price)} CFA</p>
        </div>
        
        {request.notes && (
          <div>
            <p className="text-muted-foreground mb-1">Notes</p>
            <p>{request.notes}</p>
          </div>
        )}
      </CardContent>
      <CardFooter className="p-4 pt-0 flex gap-2">
        <Button 
          variant="default" 
          className="w-full"
          onClick={handleClick}
        >
          Voir les détails
        </Button>
        
        {(request.status === "on-the-way" || request.status === "out-for-delivery") && (
          <Button variant="outline" className="flex-shrink-0">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2">
              <circle cx="12" cy="12" r="10" />
              <path d="m9 12 2 2 4-4" />
            </svg>
            Contacter le gérant
          </Button>
        )}
      </CardFooter>
    </Card>
  );
};

export default PickupRequestCard;
