
import React from 'react';
import { Card, CardContent } from "@/components/ui/card";

interface ClientInfoCardProps {
  client: any;
  guestContact: any;
  clientType: string;
}

export const ClientInfoCard: React.FC<ClientInfoCardProps> = ({ client, guestContact, clientType }) => {
  return (
    <Card className="overflow-hidden border-l-4 border-l-primary">
      <CardContent className="p-4">
        <h2 className="font-semibold mb-2">Client</h2>
        {clientType === 'registered' && client ? (
          <div>
            <p className="text-sm text-gray-500">
              <strong>{client.name}</strong>
              {client.firstName && client.lastName && (
                <span> ({client.firstName} {client.lastName})</span>
              )}
            </p>
            <p className="text-sm text-gray-500">Tél: {client.phone}</p>
            {client.cardNumber && <p className="text-sm text-gray-500">Carte: {client.cardNumber}</p>}
            {client.premium && (
              <div className="mt-1 inline-block bg-primary/20 text-primary text-xs px-2 py-0.5 rounded-full">
                Client Premium
              </div>
            )}
            {client.student && (
              <div className="mt-1 ml-1 inline-block bg-blue-100 text-blue-700 text-xs px-2 py-0.5 rounded-full">
                Étudiant
              </div>
            )}
          </div>
        ) : (
          <div>
            <p className="text-sm text-gray-500"><strong>Non inscrit - Commande anonyme</strong></p>
            {guestContact.firstName && guestContact.lastName && (
              <p className="text-sm text-gray-500">
                {guestContact.firstName} {guestContact.lastName}
              </p>
            )}
            {guestContact.phone && <p className="text-sm text-gray-500">Tél: {guestContact.phone}</p>}
            {guestContact.email && <p className="text-sm text-gray-500">Email: {guestContact.email}</p>}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
