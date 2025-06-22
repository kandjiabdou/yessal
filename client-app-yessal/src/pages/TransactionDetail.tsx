
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/components/ui/use-toast";
import NavBar from "@/components/NavBar";
import PageHeader from "@/components/PageHeader";
import { mockTransactions } from "@/lib/mockData";
import { formatCurrency, formatDate } from "@/lib/utils";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

const TransactionDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const transaction = mockTransactions.find(t => t.id === id);
  
  if (!transaction) {
    return (
      <div className="container max-w-md mx-auto p-4">
        <PageHeader title="Transaction non trouvée" showBackButton />
        <div className="text-center py-10">
          <p className="text-muted-foreground">
            Cette transaction n'existe pas ou a été supprimée.
          </p>
          <Button className="mt-4" onClick={() => navigate("/history")}>
            Retour à l'historique
          </Button>
        </div>
      </div>
    );
  }
  
  const statusColors: Record<string, string> = {
    "pending": "bg-yellow-100 text-yellow-800",
    "in-progress": "bg-blue-100 text-blue-800",
    "completed": "bg-green-100 text-green-800",
    "cancelled": "bg-red-100 text-red-800",
  };
  
  const statusLabels: Record<string, string> = {
    "pending": "En attente",
    "in-progress": "En cours",
    "completed": "Terminé",
    "cancelled": "Annulé",
  };

  // Get service type from transaction (assume basic if not found)
  const serviceType = transaction.serviceType || "basic";

  const handleDownloadInvoice = () => {
    toast({
      title: "Téléchargement de la facture",
      description: "Votre facture PDF est en cours de génération."
    });

    // Create a new PDF document
    const doc = new jsPDF();
    
    // Add Yessal logo info at the top
    doc.setFontSize(20);
    doc.setTextColor(0, 191, 99); // Green color for Yessal
    doc.text("YESSAL", 105, 20, { align: 'center' });
    doc.setFontSize(16);
    doc.setTextColor(0, 0, 0);
    doc.text(`FACTURE #${transaction.id.slice(-5)}`, 105, 30, { align: 'center' });
    
    // Add date
    doc.setFontSize(10);
    doc.text(`Date: ${formatDate(transaction.date)}`, 20, 40);
    
    // Add client info
    doc.text(`Client: ${mockUser.name}`, 20, 50);
    doc.text(`Téléphone: ${mockUser.phone}`, 20, 56);
    doc.text(`Email: ${mockUser.email}`, 20, 62);
    
    // Add transaction details
    doc.setFontSize(12);
    doc.text("Détails de la transaction", 20, 75);
    
    const details = [
      ["Description", "Quantité", "Prix unitaire", "Total"],
      [
        `Lavage (${serviceType})`,
        `${transaction.totalWeight} kg`,
        formatCurrency(transaction.totalPrice / transaction.totalWeight) + " CFA",
        formatCurrency(transaction.totalPrice) + " CFA"
      ]
    ];
    
    // Add extras if applicable
    if (transaction.hasIroning) {
      details.push(["Repassage", "1", "Inclus", "Inclus"]);
    }
    
    if (transaction.hasDelivery) {
      details.push(["Livraison", "1", "Inclus", "Inclus"]);
    }
    
    // Add discounts if applicable
    if (transaction.discounts.length > 0) {
      transaction.discounts.forEach(discount => {
        details.push([
          `Réduction (${discount.name})`,
          "1",
          `-${discount.percentage}%`,
          `- ${formatCurrency((transaction.totalPrice * discount.percentage) / 100)} CFA`
        ]);
      });
    }
    
    // Add table with details
    autoTable(doc, {
      head: [details[0]],
      body: details.slice(1),
      startY: 80,
      theme: 'striped',
      styles: { fontSize: 10 },
      headStyles: { fillColor: [0, 191, 99], textColor: [255, 255, 255] }
    });
    
    const tableEndY = (doc as any).lastAutoTable.finalY;
    
    // Add total
    doc.setFontSize(12);
    doc.setFont(undefined, 'bold');
    doc.text(`Total: ${formatCurrency(transaction.totalPrice)} CFA`, 150, tableEndY + 15, { align: 'right' });
    
    // Add footer
    doc.setFontSize(10);
    doc.setFont(undefined, 'normal');
    doc.text("Merci pour votre confiance!", 105, tableEndY + 30, { align: 'center' });
    doc.text("Pour toute question, contactez-nous à contact@yessal.sn", 105, tableEndY + 36, { align: 'center' });
    
    // Save the PDF
    doc.save(`facture-yessal-${transaction.id.slice(-5)}.pdf`);
    
    toast({
      title: "Facture téléchargée",
      description: "Votre facture a été téléchargée avec succès."
    });
  };

  return (
    <div className="container max-w-md mx-auto pb-20">
      <div className="p-4">
        <PageHeader 
          title={`Transaction #${transaction.id.slice(-5)}`} 
          showBackButton
        />
        
        <div className="space-y-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex justify-between items-center mb-4">
                <div>
                  <h3 className="text-lg font-medium">
                    {formatCurrency(transaction.totalPrice)} CFA
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {formatDate(transaction.date)}
                  </p>
                </div>
                <Badge className={statusColors[transaction.status]}>
                  {statusLabels[transaction.status]}
                </Badge>
              </div>
              
              <Separator className="my-4" />
              
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Site</span>
                  <span className="font-medium truncate max-w-[60%] text-right">{transaction.location}</span>
                </div>
                
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Poids total</span>
                  <span className="font-medium">{transaction.totalWeight} kg</span>
                </div>
                
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Formule</span>
                  <span className="font-medium truncate max-w-[60%] text-right">
                    {serviceType === "basic" ? "Formule de base" : 
                     serviceType === "detailed" ? "Formule détaillée" : 
                     serviceType || "Standard"}
                  </span>
                </div>
                
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Repassage</span>
                  <span className="font-medium">{transaction.hasIroning ? "Oui" : "Non"}</span>
                </div>
                
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Livraison</span>
                  <span className="font-medium">{transaction.hasDelivery ? "Oui" : "Non"}</span>
                </div>
                
                {transaction.discounts.length > 0 && (
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Réduction</span>
                    <span className="font-medium truncate max-w-[60%] text-right">
                      {transaction.discounts
                        .map(d => `${d.name} (${d.percentage}%)`)
                        .join(", ")}
                    </span>
                  </div>
                )}
              </div>
              
              <Separator className="my-4" />
              
              <div className="flex justify-between items-center">
                <span className="text-lg font-medium">Total</span>
                <span className="text-lg font-bold text-primary">
                  {formatCurrency(transaction.totalPrice)} CFA
                </span>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <h3 className="font-medium mb-2">Télécharger votre reçu</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Vous pouvez télécharger une copie de votre reçu pour vos dossiers.
              </p>
              <Button variant="outline" className="w-full" onClick={handleDownloadInvoice}>
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="7 10 12 15 17 10" />
                  <line x1="12" x2="12" y1="15" y2="3" />
                </svg>
                Télécharger la facture
              </Button>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <h3 className="font-medium mb-2">Besoin d'aide?</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Si vous avez des questions concernant cette transaction, contactez-nous.
              </p>
              <Button 
                variant="outline" 
                className="w-full"
                onClick={() => navigate('/help')}
              >
                Contacter le support
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
      
      <NavBar />
    </div>
  );
};

// Declaration for mockUser to be used in the invoice
const mockUser = {
  name: "Mohamed Diallo",
  email: "mohamed.diallo@example.com",
  phone: "+221 77 123 45 67"
};

export default TransactionDetail;
