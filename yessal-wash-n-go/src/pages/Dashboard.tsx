
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import NavBar from "@/components/NavBar";
import LoyaltyCard from "@/components/LoyaltyCard";
import { mockUser, mockTransactions, mockSites, mockUsers } from "@/lib/mockData";
import { useIsMobile } from "@/hooks/use-mobile";
import { User, UserSubscription } from "@/types";
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel";

const Dashboard = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("loyalty");
  const isMobile = useIsMobile();
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  
  useEffect(() => {
    // Check if we have a user email in localStorage
    const userEmail = localStorage.getItem('userEmail');

    // If we have a user email, try to find the user in mockUsers
    if (userEmail && mockUsers[userEmail]) {
      setCurrentUser(mockUsers[userEmail]);
    } else {
      // Otherwise use the default mockUser
      setCurrentUser(mockUser);
    }
  }, []);

  const handleViewTransaction = (id: string) => {
    navigate(`/transaction/${id}`);
  };

  // Filter only the two closest sites
  const closestSites = mockSites.slice(0, 2);

  if (!currentUser) {
    return <div className="p-4 text-center">Chargement...</div>;
  }
  
  return (
    <div className="pb-20 max-w-md mx-auto w-full">
      {/* Header */}
      <div className="bg-gradient-to-r from-yessal-green to-yessal-blue p-4 pt-8 text-white">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h1 className="text-xl font-bold">Bonjour, {currentUser.name.split(' ')[0]}</h1>
            <p className="text-white/80 text-sm">Bienvenue chez Yessal</p>
          </div>
        </div>
      </div>
      
      {/* Content */}
      <div className="px-4 py-4">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid grid-cols-2 mb-4 w-full">
            <TabsTrigger value="loyalty">Fidélité</TabsTrigger>
            <TabsTrigger value="sites">Nos sites</TabsTrigger>
          </TabsList>
          
          <TabsContent value="loyalty" className="mt-0">
            <div id="loyalty-qrcode" className="mb-4">
              <LoyaltyCard user={currentUser} />
            </div>
          </TabsContent>
          
          <TabsContent value="sites" className="mt-0">
            <div className="space-y-4">
              {closestSites.map(site => (
                <Card key={site.id}>
                  <CardContent className="p-4">
                    <h3 className="font-medium">{site.name}</h3>
                    <div className="text-sm space-y-1">
                      <p className="text-muted-foreground">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="inline-block mr-1 -mt-0.5">
                          <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                          <circle cx="12" cy="10" r="3" />
                        </svg>
                        {site.address}
                      </p>
                      <p className="text-muted-foreground">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="inline-block mr-1 -mt-0.5">
                          <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
                        </svg>
                        {site.phone}
                      </p>
                      <p className="text-muted-foreground">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="inline-block mr-1 -mt-0.5">
                          <circle cx="12" cy="12" r="10" />
                          <polyline points="12 6 12 12 16 14" />
                        </svg>
                        {site.openingHours}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              ))}
              
              <Button variant="outline" className="w-full" onClick={() => navigate('/website?section=sites')}>
                Voir tous les sites disponibles
              </Button>
            </div>
          </TabsContent>
        </Tabs>
        
        {/* Additional sections */}
        <div className="mt-6 space-y-4">
          <Card className="cursor-pointer hover:shadow-md transition-shadow">
            <CardContent className="p-4">
              <div onClick={() => navigate('/pickup')} className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium">Collecte</h3>
                  <p className="text-sm text-muted-foreground">Demande de collecte à domicile</p>
                </div>
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-primary">
                  <circle cx="12" cy="12" r="10" />
                  <path d="m12 8 4 4-4 4" />
                  <path d="m8 12h8" />
                </svg>
              </div>
            </CardContent>
          </Card>
          
          <div>
            <h3 className="font-medium mb-2">Tarifs et Promotions</h3>
            <Carousel className="w-full">
              <CarouselContent>
                {/* Formules de base */}
                <CarouselItem>
                  <Card>
                    <CardContent className="p-4">
                      <h4 className="font-medium text-primary">Formules de base</h4>
                      <div className="space-y-2 mt-2">
                        <div className="flex justify-between">
                          <span>Lave-linge 6 kg</span>
                          <span className="font-medium">2000 F CFA</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="font-normal">Lave-linge 20 kg</span>
                          <span className="font-medium">4000 F CFA</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-base font-normal">Séche-linge 13 kg (/20 min)</span>
                          <span className="font-medium">1000 F CFA</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="font-normal">Repassage( /kg)</span>
                          <span className="font-medium">+250 F CFA</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </CarouselItem>

                {/* Formule abonnement */}
                <CarouselItem>
                  <Card>
                    <CardContent className="p-4">
                      <h4 className="font-medium text-primary">Formule abonnement</h4>
                      <div className="space-y-2 mt-2">
                        <p className="text-base">15 000 F/mois pour 40 kg max cumulés par mois
Minimum 6 kg par lavage</p>
                        <p className="font-medium">Inclus :</p>
                        <ul className="text-sm list-disc ml-4 space-y-1">
                          <li>Lavage</li>
                          <li>Repassage</li>
                          <li>Livraison à domicile</li>
                        </ul>
                      </div>
                    </CardContent>
                  </Card>
                </CarouselItem>

                {/* Formule 600 F/kg */}
                <CarouselItem>
                  <Card>
                    <CardContent className="p-4">
                      <h4 className="font-medium text-primary">Formule 600 F/kg</h4>
                      <div className="space-y-2 mt-2">
                        <p className="text-sm">Lavé, repassé et livré</p>
                        <p className="text-sm font-medium">Minimum 6 kg</p>
                        <div className="flex justify-between mt-2">
                          <span>Prix</span>
                          <span className="font-medium">600 F CFA/kg</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </CarouselItem>
              </CarouselContent>
              <div className="flex justify-center mt-2">
                <CarouselPrevious className="relative static -left-0 -translate-y-0 mr-2" />
                <CarouselNext className="relative static -right-0 -translate-y-0" />
              </div>
            </Carousel>
          </div>
        </div>
      </div>
      
      <NavBar />
    </div>
  );
};

export default Dashboard;
