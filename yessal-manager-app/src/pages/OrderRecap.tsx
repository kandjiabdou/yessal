import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import { ArrowLeft } from 'lucide-react';
import { Client, ClientInvite } from '@/services/client';
import ClientService from '@/services/client';
import OrderService, { OrderData } from '@/services/order';
import { SiteLavage } from '@/services/types';
import { useAuth } from '@/hooks/useAuth';

interface OrderRecapProps {
  orderData: OrderData;
  client?: Client;
  siteLavage?: SiteLavage;
  guestContact?: ClientInvite;
}

const OrderRecap: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { orderData, client, siteLavage, guestContact } = location.state as OrderRecapProps;

  const handleModify = () => {
    navigate('/new-order', { 
      state: { 
        selectedClient: client,
        guestContact,
        orderData: {
          ...orderData,
          siteLavageId: siteLavage?.id || user?.siteLavagePrincipalGerantId || orderData.siteLavageId
        }
      } 
    });
  };

  const handleCancel = () => {
    navigate('/search');
  };

  const handleSubmit = async () => {
    try {
      // Si c'est un client invité qui veut créer un compte
      if (guestContact?.creerCompte) {
        // Vérifier si le client existe déjà
        const checkResult = await ClientService.checkClientExists(
          guestContact.telephone,
          guestContact.email
        );

        if (checkResult.exists) {
          toast.error(checkResult.message);
          return;
        }

        // Créer le compte client
        const createResult = await ClientService.createClient(guestContact);
        if (!createResult.success || !createResult.client) {
          toast.error(createResult.message || "Erreur lors de la création du compte client");
          return;
        }

        // Mettre à jour l'orderData avec l'ID du nouveau client
        orderData.clientUserId = createResult.client.id;
        orderData.clientInvite = undefined;

        toast.success("Compte client créé avec succès");
      }

      // Créer la commande
      const result = await OrderService.createOrder({
        ...orderData,
        siteLavageId: siteLavage?.id || user?.siteLavagePrincipalGerantId || orderData.siteLavageId
      });

      if (result.success && result.order) {
        toast.success("Commande créée avec succès");
        navigate('/orders');
      } else {
        toast.error("Erreur lors de la création de la commande");
      }
    } catch (error) {
      console.error('Erreur lors de la création de la commande:', error);
      toast.error("Une erreur est survenue");
    }
  };

  return (
    <div className="space-y-6 pb-8">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" onClick={handleModify} className="h-8 w-8">
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h1 className="text-2xl font-semibold">Récapitulatif de la commande</h1>
      </div>

      <Card>
        <CardContent className="p-4 space-y-4">
          <div>
            <h2 className="font-semibold mb-2">Client</h2>
            {client ? (
              <p>{client.nom} {client.prenom}</p>
            ) : guestContact ? (
              <div>
                <p>{guestContact.nom} {guestContact.creerCompte ? '(Création de compte)' : '(Client invité)'}</p>
                {guestContact.telephone && <p className="text-sm text-muted-foreground">Tél: {guestContact.telephone}</p>}
                {guestContact.email && <p className="text-sm text-muted-foreground">Email: {guestContact.email}</p>}
              </div>
            ) : null}
          </div>

          <div>
            <h2 className="font-semibold mb-2">Site de lavage</h2>
            <p>{siteLavage?.nom || 'Site principal'} - {siteLavage?.ville}</p>
          </div>

          <div>
            <h2 className="font-semibold mb-2">Détails de la commande</h2>
            <ul className="space-y-2">
              <li>Poids indicatif : {orderData.masseClientIndicativeKg} kg</li>
              <li>Formule : {orderData.formuleCommande === 'BaseMachine' ? 'Formule de base' : 'Formule détaillée'}</li>
              <li>Mode de paiement : {
                orderData.modePaiement === 'Espece' ? 'Espèces' :
                orderData.modePaiement === 'MobileMoney' ? 'Orange Money' : 'Autre'
              }</li>
            </ul>
          </div>

          <div>
            <h2 className="font-semibold mb-2">Options sélectionnées</h2>
            <ul className="space-y-1">
              {orderData.options.aOptionLivraison && (
                <li>✓ Livraison {orderData.adresseLivraison?.adresseText && `(${orderData.adresseLivraison.adresseText})`}</li>
              )}
              {orderData.options.aOptionSechage && <li>✓ Séchage</li>}
              {orderData.options.aOptionRepassage && <li>✓ Repassage</li>}
              {orderData.options.aOptionExpress && <li>✓ Express (6h)</li>}
            </ul>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end gap-4">
        <Button variant="outline" onClick={handleCancel}>
          Annuler
        </Button>
        <Button variant="outline" onClick={handleModify}>
          Modifier
        </Button>
        <Button onClick={handleSubmit}>
          Confirmer la commande
        </Button>
      </div>
    </div>
  );
};

export default OrderRecap; 