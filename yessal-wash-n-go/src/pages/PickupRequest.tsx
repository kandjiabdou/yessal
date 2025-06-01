import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import NavBar from "@/components/NavBar";
import PageHeader from "@/components/PageHeader";
import { mockPickupRequests, mockUsers, mockUser } from "@/lib/mockData";
import NewPickupForm from "@/components/pickup/NewPickupForm";
import ActivePickupRequests from "@/components/pickup/ActivePickupRequests";
import { User, UserSubscription } from "@/types";

const PickupRequest = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("new");
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  
  useEffect(() => {
    // Check if we have a user email in localStorage
    const userEmail = localStorage.getItem('userEmail');
    
    // If we have a user email, try to find the user in mockUsers
    if (userEmail && mockUsers[userEmail]) {
      const user = mockUsers[userEmail];
      setCurrentUser(user as User);
    } else {
      // Otherwise use the default mockUser
      setCurrentUser(mockUser as User);
    }
  }, []);

  // Check if the user has a premium subscription and/or is a student
  const isPremium = currentUser?.subscription === 'premium';
  const isStudent = currentUser?.isStudent || false;

  // Filter to only show active pickup requests (not delivered or cancelled)
  const activePickupRequests = mockPickupRequests.filter(request => 
    !["delivered", "cancelled"].includes(request.status)
  );

  const handleFormSuccess = () => {
    setActiveTab("active");
  };

  const handleViewPickupRequest = (id: string) => {
    navigate(`/pickup/${id}`);
  };

  if (!currentUser) {
    return <div className="p-4 text-center">Chargement...</div>;
  }

  return (
    <div className="container max-w-md mx-auto pb-20">
      <div className="p-4">
        <PageHeader title="Collecte de linge" />

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid grid-cols-2 mb-4">
            <TabsTrigger value="new">Nouvelle demande</TabsTrigger>
            <TabsTrigger value="active">Demandes actives</TabsTrigger>
          </TabsList>

          <TabsContent value="new" className="mt-0">
            <NewPickupForm 
              isPremium={isPremium}
              isStudent={isStudent}
              defaultLocation={currentUser.defaultLocation}
              onSuccess={handleFormSuccess}
            />
          </TabsContent>

          <TabsContent value="active" className="mt-0">
            <ActivePickupRequests 
              requests={activePickupRequests}
              onViewRequest={handleViewPickupRequest}
            />
            {activePickupRequests.length === 0 && (
              <Button onClick={() => setActiveTab("new")}>
                Nouvelle demande
              </Button>
            )}
          </TabsContent>
        </Tabs>
      </div>

      <NavBar />
    </div>
  );
};

export default PickupRequest;
