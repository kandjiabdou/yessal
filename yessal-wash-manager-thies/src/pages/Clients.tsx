
import React, { useState } from 'react';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Search, User } from 'lucide-react';

interface Client {
  id: string;
  name: string;
  phone: string;
  cardNumber: string;
  ordersCount: number;
  totalSpent: number;
}

const mockClients: Client[] = [
  { id: '1', name: 'Abdou Diop', phone: '77 123 45 67', cardNumber: 'Y10012', ordersCount: 14, totalSpent: 42000 },
  { id: '2', name: 'Fatou Ndiaye', phone: '70 876 54 32', cardNumber: 'Y10025', ordersCount: 8, totalSpent: 28500 },
  { id: '3', name: 'Moustapha Seck', phone: '76 543 21 98', cardNumber: 'Y10037', ordersCount: 5, totalSpent: 12800 },
  { id: '4', name: 'Aminata Fall', phone: '78 765 43 21', cardNumber: 'Y10042', ordersCount: 10, totalSpent: 35600 },
  { id: '5', name: 'Ousmane Diallo', phone: '77 987 65 43', cardNumber: 'Y10056', ordersCount: 3, totalSpent: 9500 },
];

const Clients: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredClients, setFilteredClients] = useState<Client[]>(mockClients);

  const handleSearch = () => {
    if (!searchQuery.trim()) {
      setFilteredClients(mockClients);
      return;
    }
    
    const results = mockClients.filter(client => 
      client.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      client.phone.replace(/\s/g, '').includes(searchQuery.replace(/\s/g, '')) ||
      client.cardNumber.toLowerCase().includes(searchQuery.toLowerCase())
    );
    
    setFilteredClients(results);
  };

  return (
    <div className="space-y-6 pb-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Clients</h1>
        <p className="text-muted-foreground">
          Gestion des clients et de leurs commandes
        </p>
      </div>

      <div className="flex gap-2">
        <Input 
          placeholder="Rechercher un client" 
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
        <Button type="button" onClick={handleSearch}>
          <Search className="h-4 w-4" />
        </Button>
      </div>

      <div className="space-y-4">
        {filteredClients.length > 0 ? (
          filteredClients.map((client) => (
            <Card key={client.id} className="hover:bg-gray-50">
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="bg-primary/10 p-2 rounded-full">
                      <User className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <div className="font-medium">{client.name}</div>
                      <div className="text-sm text-gray-500">Tél: {client.phone}</div>
                      <div className="text-sm text-gray-500">Carte: {client.cardNumber}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm"><span className="font-medium">{client.ordersCount}</span> commandes</div>
                    <div className="text-primary font-medium">{client.totalSpent.toLocaleString()} FCFA</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        ) : (
          <div className="text-center py-8">
            <User className="h-12 w-12 text-gray-300 mx-auto" />
            <p className="mt-4 text-gray-500">Aucun client trouvé</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Clients;
