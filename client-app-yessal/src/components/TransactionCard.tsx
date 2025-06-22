
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { Transaction } from "@/types";

interface TransactionCardProps {
  transaction: Transaction;
  onClick: () => void;
}

const TransactionCard = ({ transaction, onClick }: TransactionCardProps) => {
  const { date, location, totalPrice, totalWeight, status } = transaction;
  
  // Format the date with a French locale
  const formattedDate = format(new Date(date), "d MMMM yyyy", { locale: fr });
  const formattedTime = format(new Date(date), "HH:mm");
  
  // Display in kg with 1 decimal place
  const formattedWeight = `${totalWeight.toFixed(1)} kg`;
  
  return (
    <Card 
      className="cursor-pointer hover:shadow-md transition-shadow"
      onClick={onClick}
    >
      <div className="p-4">
        <div className="flex justify-between items-start">
          <div>
            <p className="text-sm text-muted-foreground">{formattedDate} · {formattedTime}</p>
            <h3 className="font-medium mt-0.5">{location}</h3>
          </div>
          <StatusBadge status={status} />
        </div>
        
        <div className="flex justify-between mt-3">
          <div className="flex items-center">
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-muted-foreground mr-1.5">
              <rect x="2" y="6" width="20" height="12" rx="2" />
              <path d="M12 11a2 2 0 1 0 0 4 2 2 0 0 0 0-4Z" />
              <path d="M12 11V7" />
            </svg>
            <span>{formattedWeight}</span>
          </div>
          <p className="font-medium">{totalPrice.toLocaleString()} CFA</p>
        </div>
      </div>
    </Card>
  );
};

// Status badge component with appropriate styling based on status
const StatusBadge = ({ status }: { status: string }) => {
  let variant:
    | "default"
    | "secondary"
    | "destructive"
    | "outline" = "default";
  let label = "";
  
  switch (status) {
    case "completed":
      variant = "default";
      label = "Complété";
      break;
    case "pending":
      variant = "secondary";
      label = "En cours";
      break;
    case "cancelled":
      variant = "destructive";
      label = "Annulé";
      break;
    default:
      variant = "outline";
      label = status;
  }
  
  return <Badge variant={variant}>{label}</Badge>;
};

export default TransactionCard;
