import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import NavBar from "@/components/NavBar";
import PageHeader from "@/components/PageHeader";
import { mockPickupRequests } from "@/lib/mockData";
import { formatDate, formatCurrency, getStatusProgress } from "@/lib/utils";
const PickupDetail = () => {
  const {
    id
  } = useParams<{
    id: string;
  }>();
  const navigate = useNavigate();
  const request = mockPickupRequests.find(p => p.id === id);
  if (!request) {
    return <div className="container max-w-md mx-auto p-4">
        <PageHeader title="Demande non trouvée" showBackButton />
        <div className="text-center py-10">
          <p className="text-muted-foreground">
            Cette demande n'existe pas ou a été supprimée.
          </p>
          <Button className="mt-4" onClick={() => navigate("/pickup")}>
            Retour aux demandes
          </Button>
        </div>
      </div>;
  }
  const statusColors: Record<string, string> = {
    "pending": "bg-yellow-100 text-yellow-800",
    "confirmed": "bg-blue-100 text-blue-800",
    "on-the-way": "bg-blue-100 text-blue-800",
    "picked-up": "bg-indigo-100 text-indigo-800",
    "processing": "bg-purple-100 text-purple-800",
    "out-for-delivery": "bg-indigo-100 text-indigo-800",
    "delivered": "bg-green-100 text-green-800",
    "cancelled": "bg-red-100 text-red-800"
  };
  const statusLabels: Record<string, string> = {
    "pending": "En attente",
    "confirmed": "Confirmé",
    "on-the-way": "En route",
    "picked-up": "Collecté",
    "processing": "En traitement",
    "out-for-delivery": "En livraison",
    "delivered": "Livré",
    "cancelled": "Annulé"
  };
  const statusProgress = getStatusProgress(request.status);
  return <div className="container max-w-md mx-auto pb-20">
      <div className="p-4">
        <PageHeader title={`Collecte #${request.trackingCode.slice(-5)}`} showBackButton />
        
        <div className="space-y-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium">
                  Statut
                </h3>
                <Badge className={statusColors[request.status]}>
                  {statusLabels[request.status]}
                </Badge>
              </div>
              
              {request.status !== "cancelled" && <div className="space-y-2">
                  <Progress value={statusProgress} className="h-2" />
                  
                  <div className="grid grid-cols-5 text-xs">
                    <div className="text-center">
                      <div className={`w-3 h-3 rounded-full mx-auto mb-1 ${statusProgress >= 20 ? 'bg-primary' : 'bg-muted'}`}></div>
                      <span className={statusProgress >= 20 ? 'font-medium' : 'text-muted-foreground'}>
                        Confirmé
                      </span>
                    </div>
                    <div className="text-center">
                      <div className={`w-3 h-3 rounded-full mx-auto mb-1 ${statusProgress >= 40 ? 'bg-primary' : 'bg-muted'}`}></div>
                      <span className={statusProgress >= 40 ? 'font-medium' : 'text-muted-foreground'}>
                        En route
                      </span>
                    </div>
                    <div className="text-center">
                      <div className={`w-3 h-3 rounded-full mx-auto mb-1 ${statusProgress >= 60 ? 'bg-primary' : 'bg-muted'}`}></div>
                      <span className={statusProgress >= 60 ? 'font-medium' : 'text-muted-foreground'}>
                        Collecté
                      </span>
                    </div>
                    <div className="text-center">
                      <div className={`w-3 h-3 rounded-full mx-auto mb-1 ${statusProgress >= 80 ? 'bg-primary' : 'bg-muted'}`}></div>
                      <span className={statusProgress >= 80 ? 'font-medium' : 'text-muted-foreground'}>
                        En retour
                      </span>
                    </div>
                    <div className="text-center">
                      <div className={`w-3 h-3 rounded-full mx-auto mb-1 ${statusProgress >= 100 ? 'bg-primary' : 'bg-muted'}`}></div>
                      <span className={statusProgress >= 100 ? 'font-medium' : 'text-muted-foreground'}>
                        Retourné
                      </span>
                    </div>
                  </div>
                </div>}
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <h3 className="text-lg font-medium mb-4">Détails de la demande</h3>
              
              <div className="space-y-3">
                <div className="space-y-1">
                  <span className="text-sm text-muted-foreground">Code de suivi</span>
                  <p className="font-medium">{request.trackingCode}</p>
                </div>
                
                <div className="space-y-1">
                  <span className="text-sm text-muted-foreground">Adresse de collecte</span>
                  <p className="font-medium">{request.pickupAddress}</p>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <span className="text-sm text-muted-foreground">Date de collecte</span>
                    <p className="font-medium">{formatDate(request.pickupTime)}</p>
                  </div>
                  <div className="space-y-1">
                    <span className="text-sm text-muted-foreground">Livraison prévue</span>
                    <p className="font-medium">{formatDate(request.estimatedDeliveryTime)}</p>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <span className="text-sm text-muted-foreground">Type de service</span>
                    <p className="font-medium capitalize">{request.serviceType}</p>
                  </div>
                  <div className="space-y-1">
                    <span className="text-sm text-muted-foreground">Repassage</span>
                    <p className="font-medium">{request.hasIroning ? "Oui" : "Non"}</p>
                  </div>
                </div>

                <div className="space-y-1">
                  <span className="text-sm text-muted-foreground">Prix total</span>
                  <p className="font-medium">{formatCurrency(request.price)} CFA</p>
                </div>
                
                {request.notes && <div className="space-y-1">
                    <span className="text-sm text-muted-foreground">Notes</span>
                    <p>{request.notes}</p>
                  </div>}
              </div>
            </CardContent>
          </Card>
          
          {(request.status === "on-the-way" || request.status === "out-for-delivery") && <Card>
              <CardContent className="p-4">
                <Button className="w-full">Contacter le gérant</Button>
              </CardContent>
            </Card>}
          
          {request.status !== "delivered" && request.status !== "cancelled"}
          
          {request.status === "delivered" && <Card>
              <CardContent className="p-4 text-center">
                <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-primary mx-auto mb-2">
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                  <polyline points="22 4 12 14.01 9 11.01" />
                </svg>
                <h3 className="text-lg font-medium mb-1">Livraison complétée</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Merci d'avoir utilisé nos services de collecte et livraison
                </p>
                <Button variant="outline" className="w-full">
                  Noter le service
                </Button>
              </CardContent>
            </Card>}
        </div>
      </div>
      
      <NavBar />
    </div>;
};
export default PickupDetail;