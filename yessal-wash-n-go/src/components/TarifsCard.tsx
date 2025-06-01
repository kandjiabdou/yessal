
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { mockTarifs } from "@/lib/mockData";
import { formatCurrency } from "@/lib/utils";
import { useNavigate } from "react-router-dom";

const TarifsCard = () => {
  const navigate = useNavigate();

  const handleTarifsClick = () => {
    // Redirect to the tarifs page via our WebView with a specific hash for tarifs section
    navigate("/website?section=tarifs");
  };

  return (
    <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={handleTarifsClick}>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg">Tarifs et Promotions</CardTitle>
      </CardHeader>
      <CardContent className="p-4">
        <div className="space-y-3">
          {mockTarifs.map((tarif) => (
            <div key={tarif.id} className="flex justify-between items-center">
              <div>
                <div className="flex items-center gap-2">
                  <p className="font-medium">{tarif.name}</p>
                  {tarif.isPromotion && (
                    <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">
                      Promo
                    </Badge>
                  )}
                </div>
                <p className="text-sm text-muted-foreground">{tarif.description}</p>
              </div>
              {tarif.price > 0 ? (
                <span className="font-medium">{formatCurrency(tarif.price)} CFA</span>
              ) : (
                <span className="font-medium text-green-600">Gratuit</span>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default TarifsCard;
