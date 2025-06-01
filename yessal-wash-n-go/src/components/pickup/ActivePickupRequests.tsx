
import { PickupRequest } from "@/types";
import PickupRequestCard from "@/components/PickupRequestCard";

interface ActivePickupRequestsProps {
  requests: PickupRequest[];
  onViewRequest: (id: string) => void;
}

const ActivePickupRequests = ({ requests, onViewRequest }: ActivePickupRequestsProps) => {
  return (
    <>
      {requests.length > 0 ? (
        <div className="space-y-3">
          {requests.map((request) => (
            <PickupRequestCard
              key={request.id}
              request={request}
              onSelect={onViewRequest}
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-10">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-muted mb-4">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M12 2v4" />
              <path d="m4.93 10.93 1.41 1.41" />
              <path d="M2 18h2" />
              <path d="M20 18h2" />
              <path d="m19.07 10.93-1.41 1.41" />
              <path d="M22 22H2" />
              <path d="m8 22 4-10 4 10" />
              <path d="M12 6a4 4 0 0 0-4 4v10h8V10a4 4 0 0 0-4-4Z" />
            </svg>
          </div>
          <h3 className="font-medium text-lg">Aucune collecte active</h3>
          <p className="text-muted-foreground mb-4">
            Vous n'avez pas encore de demande de collecte en cours
          </p>
        </div>
      )}
    </>
  );
};

export default ActivePickupRequests;
