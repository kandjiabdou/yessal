
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import QRCode from "@/components/QRCode";
import { mockUser } from "@/lib/mockData";

const LoyaltyCard = ({ user = mockUser }) => {
  // Calculate loyalty points based on total washes modulo 10
  const loyaltyPoints = user.totalWashes % 10;
  const loyaltyProgress = loyaltyPoints * 10; // Percentage progress for next reward
  const nextRewardAt = 10 - loyaltyPoints;
  const hasRewardAvailable = loyaltyPoints === 0 && user.totalWashes > 0;
  
  // Determine user status based on subscription and student status
  const isPremium = user.subscription === 'premium';
  const isStudent = user.isStudent;
  
  let userStatus = null;
  if (isPremium && isStudent) {
    userStatus = 'Étudiant + Premium';
  } else if (isPremium) {
    userStatus = 'Premium';
  } else if (isStudent) {
    userStatus = 'Étudiant';
  } else {
    userStatus = 'Sans abonnement';
  }
  
  // Monthly washed kg - this value is now important for premium calculations
  const monthlyWashedKg = user.monthlyWashedKg || 0;

  const handleDownloadCard = () => {
    const qrElement = document.querySelector('#loyalty-qrcode svg');
    if (!qrElement) return;
    
    // Create a canvas element to hold our card
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    
    // Set card size (width, height)
    canvas.width = 600;
    canvas.height = 320;
    
    // Draw card background with gradient
    const gradient = ctx.createLinearGradient(0, 0, canvas.width, 0);
    gradient.addColorStop(0, "#00bf63");  // yessal-green
    gradient.addColorStop(1, "#0891b2");  // yessal-blue
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Add translucent overlay
    ctx.fillStyle = "rgba(255, 255, 255, 0.1)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Add card title
    ctx.font = "bold 28px Arial";
    ctx.fillStyle = "white";
    ctx.fillText("Carte de Fidélité", 40, 50);
    
    ctx.font = "20px Arial";
    ctx.fillStyle = "rgba(255, 255, 255, 0.9)";
    ctx.fillText("Yessal", 40, 80);
    
    // Add user info
    ctx.font = "16px Arial";
    ctx.fillStyle = "rgba(255, 255, 255, 0.8)";
    ctx.fillText("Client", 40, 140);
    ctx.font = "bold 20px Arial";
    ctx.fillStyle = "white";
    ctx.fillText(user.name, 40, 170);
    
    ctx.font = "16px Arial";
    ctx.fillStyle = "rgba(255, 255, 255, 0.8)";
    ctx.fillText("ID Client", 40, 220);
    ctx.font = "bold 20px Arial";
    ctx.fillStyle = "white";
    ctx.fillText(user.id, 40, 250);
    
    // Add points info
    ctx.font = "16px Arial";
    ctx.fillStyle = "rgba(255, 255, 255, 0.8)";
    ctx.fillText("Points", 300, 140);
    ctx.font = "bold 28px Arial";
    ctx.fillStyle = "white";
    ctx.fillText(user.loyaltyPoints.toString(), 300, 170);
    
    // Convert SVG QR code to an image
    const svgData = new XMLSerializer().serializeToString(qrElement);
    const img = new Image();
    
    img.onload = () => {
      // Draw the QR code onto our card
      ctx.drawImage(img, 380, 120, 180, 180);
      
      // Convert the canvas to a downloadable PNG
      const pngFile = canvas.toDataURL("image/png");
      
      // Download the file
      const downloadLink = document.createElement("a");
      downloadLink.download = `yessal-carte-fidelite-${user.id}.png`;
      downloadLink.href = pngFile;
      downloadLink.click();
    };
    
    img.src = "data:image/svg+xml;base64," + btoa(unescape(encodeURIComponent(svgData)));
  };

  return (
    <Card className="w-full overflow-hidden">
      <div className="yessal-gradient text-white p-4 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-full bg-white/10 backdrop-blur-sm opacity-50"></div>
        <div className="relative z-10">
          <div className="flex justify-between items-start">
            <div>
              <h3 className="font-bold text-xl mb-1">Carte de Fidélité</h3>
              <p className="text-sm opacity-90 mb-4">Yessal</p>
            </div>
            <Badge className="bg-white text-primary hover:bg-white/90">
              {userStatus}
            </Badge>
          </div>
          
          <div className="flex justify-between items-center">
            <div>
              <p className="text-xs opacity-80">Client</p>
              <p className="font-semibold">{user.name}</p>
            </div>
            <div>
              <p className="text-xs opacity-80">ID Client</p>
              <p className="font-semibold">{user.id}</p>
            </div>
          </div>
        </div>
      </div>
      
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-sm text-muted-foreground">Kg lavés ce mois</p>
            <p className="text-2xl font-bold">{monthlyWashedKg}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Points actuels</p>
            <p className="text-2xl font-bold">{loyaltyPoints}</p>
          </div>
        </div>
        
        {hasRewardAvailable ? (
          <div className="mb-4 bg-primary/10 p-3 rounded-lg border border-primary/20">
            <div className="flex items-center space-x-2">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-primary">
                <path d="M20 12V8H6a2 2 0 0 1-2-2c0-1.1.9-2 2-2h12v4"></path>
                <path d="M4 6v12c0 1.1.9 2 2 2h14v-4"></path>
                <path d="M18 12a2 2 0 0 0 0 4h4v-4Z"></path>
              </svg>
              <span className="font-medium text-primary">Un lavage gratuit vous attend!</span>
            </div>
          </div>
        ) : (
          <div className="space-y-2 mb-4">
            <div className="flex justify-between text-sm">
              <span>Progression récompense</span>
              <span className="font-medium">{loyaltyPoints}/10</span>
            </div>
            <Progress value={loyaltyProgress} className="h-2" />
            <p className="text-sm text-muted-foreground">
              Encore {nextRewardAt} lavage{nextRewardAt > 1 ? "s" : ""} pour obtenir un lavage gratuit de 6kg!
            </p>
          </div>
        )}
        
        <div className="flex flex-col items-center space-y-4">
          <QRCode value={`loyalty-card`} userId={user.id} size={140} />
          <p className="text-sm text-center text-muted-foreground">
            Présentez ce code QR lors de votre visite
          </p>
          <Button variant="outline" className="w-full" onClick={handleDownloadCard}>
            Télécharger
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default LoyaltyCard;
