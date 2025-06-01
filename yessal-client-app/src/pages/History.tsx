
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import NavBar from "@/components/NavBar";
import TransactionCard from "@/components/TransactionCard";
import PageHeader from "@/components/PageHeader";
import { mockTransactions, mockPickupRequests } from "@/lib/mockData";
import PickupRequestCard from "@/components/PickupRequestCard";

const History = () => {
  const navigate = useNavigate();
  const [filter, setFilter] = useState<"completed" | "active-pickups">("completed");
  
  // Filter transactions based on the selected filter
  const filteredTransactions = mockTransactions.filter(transaction => {
    if (filter === "active-pickups") return false;
    return transaction.status === "completed";
  });

  // Filter active pickup requests
  const activePickupRequests = mockPickupRequests.filter(request => 
    !["delivered", "cancelled"].includes(request.status)
  );
  
  const handleViewTransaction = (id: string) => {
    navigate(`/transaction/${id}`);
  };

  const handleViewPickupRequest = (id: string) => {
    navigate(`/pickup/${id}`);
  };

  return (
    <div className="container max-w-md mx-auto pb-20">
      <div className="p-4">
        <PageHeader title="Historique des lavages" />
        
        <div className="grid grid-cols-2 gap-2 mb-4">
          <FilterButton active={filter === "completed"} onClick={() => setFilter("completed")}>
            Complétés
          </FilterButton>
          <FilterButton active={filter === "active-pickups"} onClick={() => setFilter("active-pickups")}>
            En cours
          </FilterButton>
        </div>
        
        {filter === "active-pickups" ? (
          activePickupRequests.length === 0 ? (
            <div className="text-center p-8">
              <p className="text-lg font-medium">Aucune collecte active trouvée</p>
              <p className="text-muted-foreground">Vous n'avez pas encore de collecte en cours</p>
            </div>
          ) : (
            <div className="space-y-4">
              {activePickupRequests.map((request) => (
                <PickupRequestCard 
                  key={request.id}
                  request={request}
                  onSelect={handleViewPickupRequest}
                />
              ))}
            </div>
          )
        ) : (
          filteredTransactions.length === 0 ? (
            <div className="text-center p-8">
              <p className="text-lg font-medium">Aucune transaction trouvée</p>
              <p className="text-muted-foreground">Vous n'avez pas encore de transactions complétées</p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredTransactions.map((transaction) => (
                <TransactionCard 
                  key={transaction.id}
                  transaction={transaction}
                  onClick={() => handleViewTransaction(transaction.id)}
                />
              ))}
            </div>
          )
        )}
      </div>
      <NavBar />
    </div>
  );
};

const FilterButton = ({ children, active, onClick }: { children: React.ReactNode, active: boolean, onClick: () => void }) => (
  <button
    className={`px-4 py-1.5 rounded-lg text-sm w-full ${
      active
        ? "bg-primary text-primary-foreground"
        : "bg-muted text-muted-foreground hover:bg-muted/80"
    }`}
    onClick={onClick}
  >
    {children}
  </button>
);

export default History;
