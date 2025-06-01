
import React from 'react';
import { Card, CardContent } from "@/components/ui/card";

interface OrderSummaryCardProps {
  price: number;
  weight: number;
  hasDiscount: boolean;
}

export const OrderSummaryCard: React.FC<OrderSummaryCardProps> = ({ price, weight, hasDiscount }) => {
  return (
    <Card className="bg-primary/5">
      <CardContent className="p-4">
        <h2 className="font-semibold text-lg mb-3">Résumé</h2>
        <div className="space-y-2">
          <div className="flex justify-between border-b pb-2">
            <span>Poids total</span>
            <span className="font-medium">{weight} kg</span>
          </div>
          
          {hasDiscount && price > 0 && (
            <div className="flex justify-between text-sm">
              <span>Réduction étudiant</span>
              <span className="text-green-600">-10%</span>
            </div>
          )}
          
          <div className="flex justify-between pt-1">
            <span className="text-lg">Prix total</span>
            <span className="font-bold text-xl text-primary">
              {price === 0 ? 'Inclus dans l\'abonnement' : `${price.toLocaleString()} FCFA`}
            </span>
          </div>
          
          <div className="flex justify-between text-xs text-gray-500 mt-2">
            <span>Date de commande</span>
            <span>{new Date().toLocaleDateString()}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
