import React from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Client, ClientInvite } from '@/services/client';

interface ClientInfoCardProps {
  client?: Client | null;
  guestContact?: ClientInvite | null;
  clientType: 'registered' | 'non-registered';
}

export const ClientInfoCard: React.FC<ClientInfoCardProps> = ({ client, guestContact, clientType }) => {
  return (
    <Card className="overflow-hidden border-l-4 border-l-primary">
      <CardContent className="p-4">
        <h2 className="font-semibold mb-2">Client</h2>
        {clientType === 'registered' && client ? (
          <div>
            <p className="text-sm text-gray-500">
              <strong>{client.nom} {client.prenom}</strong>
            </p>
            <p className="text-sm text-gray-500">Tél: {client.telephone}</p>
            {client.carteNumero && (
              <p className="text-sm text-gray-500">
                <strong>Carte de fidélité:</strong> <span className="font-mono bg-blue-50 text-blue-700 px-2 py-1 rounded text-xs">{client.carteNumero}</span>
              </p>
            )}
            {client.typeClient === 'Premium' && (
              <div className="mt-1 inline-block bg-primary/20 text-primary text-xs px-2 py-0.5 rounded-full">
                Client Premium
              </div>
            )}
            {client.estEtudiant && (
              <div className="mt-1 ml-1 inline-block bg-blue-100 text-blue-700 text-xs px-2 py-0.5 rounded-full">
                Étudiant
              </div>
            )}
          </div>
        ) : (
          <div>
            {!guestContact ? (
            <p className="text-sm text-gray-500"><strong>Non inscrit - Commande anonyme</strong></p>
            ) : (
              <>
              <p className="text-sm text-gray-500">
                  <strong>Non inscrit - {guestContact.nom} {guestContact.prenom}</strong>
              </p>
                {guestContact.telephone && <p className="text-sm text-gray-500">Tél: {guestContact.telephone}</p>}
                {guestContact.email && <p className="text-sm text-gray-500">Email: {guestContact.email}</p>}
              </>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
