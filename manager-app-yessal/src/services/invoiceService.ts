import { jsPDF } from "jspdf";
import { Order } from "./order";

export class InvoiceService {
  // Helper pour formater les prix avec des espaces
  private static formatPrice(amount: number): string {
    return Math.abs(amount).toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ");
  }

  static async generateInvoice(order: Order): Promise<Blob> {
    return new Promise(async (resolve, reject) => {
      try {
        // Créer un nouveau document PDF
        const doc = new jsPDF({
          orientation: "portrait",
          unit: "mm",
          format: "a4",
        });

        // Informations de l'entreprise
        const companyInfo = {
          companyName: "G.I.E Yessal",
          address: "QRT. Mbour 2, Thies",
          ninea: "011579648",
          rc: "SN THS 2024 5527",
          phone: "+221 78 786 60 60",
          email: "contact@yessal.sn",
        };

        // Charger le logo
        let logoData: string | null = null;
        try {
          const response = await fetch("/logo_yessal_laundry.png");
          const blob = await response.blob();
          logoData = await this.blobToBase64(blob);
        } catch (error) {
          console.warn("Logo non chargé:", error);
        }

        let yPosition = 25;

        // En-tête avec informations de l'entreprise
        yPosition = this.drawHeader(doc, companyInfo, yPosition, logoData);

        // Informations du client et facture
        yPosition = this.drawClientAndInvoiceInfo(doc, order, yPosition);

        // Détails de la commande
        yPosition = this.drawOrderDetails(doc, order, yPosition);

        // Tableau récapitulatif détaillé
        yPosition = this.drawDetailedPriceTable(doc, order, yPosition);

        // Pied de page
        this.drawFooter(doc);

        // Convertir en Blob
        const pdfBlob = doc.output("blob");
        resolve(pdfBlob);
      } catch (error) {
        reject(error);
      }
    });
  }

  private static blobToBase64(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }

  private static drawHeader(
    doc: jsPDF,
    companyInfo: any,
    startY: number,
    logoData: string | null
  ): number {
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 20; // Augmenté de 15 à 20

    // Logo à gauche
    if (logoData) {
      try {
        doc.addImage(logoData, "PNG", margin, startY, 25, 25);
      } catch (error) {
        console.warn("Erreur ajout logo:", error);
      }
    }

    // Informations de l'entreprise à droite (sur la même ligne que le logo)
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(51, 51, 51);

    const rightX = pageWidth - margin;
    let rightYPos = startY + 4;
    doc.text(companyInfo.companyName, rightX, rightYPos, { align: "right" });
    rightYPos += 4;
    doc.text(companyInfo.address, rightX, rightYPos, { align: "right" });
    rightYPos += 4;
    doc.text(`NINEA: ${companyInfo.ninea}`, rightX, rightYPos, { align: "right" });
    rightYPos += 4;
    doc.text(`RC: ${companyInfo.rc}`, rightX, rightYPos, { align: "right" });
    rightYPos += 4;
    doc.text(companyInfo.phone, rightX, rightYPos, { align: "right" });
    rightYPos += 4;
    doc.text(companyInfo.email, rightX, rightYPos, { align: "right" });

    // Ligne de séparation verte après le logo et les infos
    let yPos = startY + 28; // Augmenté pour ne pas chevaucher l'email
    doc.setDrawColor(102, 217, 161); // #66d9a1
    doc.setLineWidth(0.8);
    doc.line(margin, yPos, pageWidth - margin, yPos);

    yPos += 8;

    yPos += 15;

    // Titre FACTURE avec fond coloré
    const titleWidth = 60;
    const titleX = (pageWidth - titleWidth) / 2;
    doc.setFillColor(102, 217, 161); // #66d9a1
    doc.roundedRect(titleX, yPos - 5, titleWidth, 12, 3, 3, "F");

    doc.setFontSize(22);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(255, 255, 255);
    doc.text("FACTURE", pageWidth / 2, yPos + 3, { align: "center" });

    return yPos + 18;
  }

  private static drawClientAndInvoiceInfo(
    doc: jsPDF,
    order: Order,
    startY: number
  ): number {
    const margin = 20; // Augmenté
    const pageWidth = doc.internal.pageSize.getWidth();
    let yPos = startY;

    // Boîte pour les informations du client (augmentée à 95mm)
    doc.setDrawColor(102, 217, 161);
    doc.setLineWidth(0.3);
    doc.roundedRect(margin, yPos, 95, 30, 2, 2);

    yPos += 5;

    // Informations du client (à gauche)
    let clientName = "Client inconnu";
    let clientPhone = "";
    let clientEmail = "";

    if (order.clientUser) {
      clientName = `${order.clientUser.prenom} ${order.clientUser.nom}`;
      clientPhone = order.clientUser.telephone || "";
      clientEmail = order.clientUser.email || "";
    } else if (order.clientInvite) {
      clientName = order.clientInvite.nom || "Client invité";
      clientPhone = order.clientInvite.telephone || "";
      clientEmail = order.clientInvite.email || "";
    }

    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(102, 217, 161); // #66d9a1
    doc.text("FACTURÉ À:", margin + 3, yPos);

    yPos += 6;
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(51, 51, 51);
    doc.text(clientName, margin + 3, yPos);

    if (clientPhone) {
      yPos += 5;
      doc.setFont("helvetica", "normal");
      doc.text(`Tél: ${clientPhone}`, margin + 3, yPos);
    }

    if (clientEmail) {
      yPos += 5;
      doc.text(`Email: ${clientEmail}`, margin + 3, yPos);
    }

    // Boîte pour informations de facture (à droite)
    const boxWidth = 70;
    const rightBoxX = pageWidth - margin - boxWidth;
    doc.setDrawColor(121, 223, 246); // #79dff6
    doc.roundedRect(rightBoxX, startY, boxWidth, 30, 2, 2);

    // Date et heure de génération de la facture (maintenant)
    const invoiceDate = new Date();
    const formattedDate = invoiceDate.toLocaleDateString("fr-FR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
    const formattedTime = invoiceDate.toLocaleTimeString("fr-FR", {
      hour: "2-digit",
      minute: "2-digit",
    });

    // Année actuelle pour le numéro de facture
    const currentYear = invoiceDate.getFullYear();
    const invoiceNumber = `FACT-${currentYear}-${order.id}`;

    let rightYPos = startY + 8;

    // N° Facture: sur la même ligne
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(121, 223, 246); // #79dff6
    doc.text("N° Facture:", rightBoxX + 3, rightYPos);

    doc.setFont("helvetica", "bold");
    doc.setTextColor(51, 51, 51);
    doc.text(invoiceNumber, rightBoxX + 22, rightYPos);

    rightYPos += 8;

    // Date et heure: sur deux lignes
    doc.setFont("helvetica", "bold");
    doc.setTextColor(121, 223, 246);
    doc.text("Date:", rightBoxX + 3, rightYPos);

    doc.setFont("helvetica", "normal");
    doc.setTextColor(51, 51, 51);
    doc.text(formattedDate, rightBoxX + 15, rightYPos);

    rightYPos += 5;

    doc.setFont("helvetica", "bold");
    doc.setTextColor(121, 223, 246);
    doc.text("Heure:", rightBoxX + 3, rightYPos);

    doc.setFont("helvetica", "normal");
    doc.setTextColor(51, 51, 51);
    doc.text(formattedTime, rightBoxX + 15, rightYPos);

    return startY + 35;
  }

  private static drawOrderDetails(
    doc: jsPDF,
    order: Order,
    startY: number
  ): number {
    const margin = 20; // Augmenté
    let yPos = startY;

    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(102, 217, 161); // #66d9a1
    doc.text("DÉTAILS DE LA COMMANDE", margin, yPos);

    yPos += 7;
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(51, 51, 51);

    // Formule
    const formuleText =
      order.formuleCommande === "BaseMachine"
        ? "Formule machine"
        : "Formule détaillée";
    doc.text(`Formule: ${formuleText}`, margin, yPos);

    // Poids
    yPos += 5;
    doc.text(
      `Poids indicatif: ${order.masseClientIndicativeKg} kg`,
      margin,
      yPos
    );

    if (order.masseVerifieeKg) {
      yPos += 5;
      doc.text(`Poids vérifié: ${order.masseVerifieeKg} kg`, margin, yPos);
    }

    // Site de lavage
    if (order.siteLavage) {
      yPos += 5;
      doc.text(
        `Site de lavage: ${order.siteLavage.nom} - ${order.siteLavage.ville}`,
        margin,
        yPos
      );
    }

    // Options
    if (order.options) {
      const options = [];
      if (order.options.aOptionRepassage) options.push("Repassage");
      if (order.options.aOptionSechage) options.push("Séchage");
      if (order.options.aOptionExpress) options.push("Express");
      if (order.options.aOptionLivraison) options.push("Livraison");

      if (options.length > 0) {
        yPos += 5;
        doc.text(`Options: ${options.join(", ")}`, margin, yPos);
      }
    }

    // Type de réduction
    if (order.typeReduction) {
      const reductionText =
        order.typeReduction === "Etudiant"
          ? "Réduction étudiant"
          : "Réduction ouverture";
      yPos += 5;
      doc.text(`Réduction appliquée: ${reductionText}`, margin, yPos);
    }

    // Répartition des machines
    if (order.repartitionMachines && order.repartitionMachines.length > 0) {
      yPos += 5;
      const machinesText = order.repartitionMachines
        .map((m: any) => {
          const type = m.typeMachine === 'Machine20kg' ? '20Kg' : '6Kg';
          return `${type} (${m.quantite}x)`;
        })
        .join(', ');
      doc.text(`Machines utilisées: ${machinesText}`, margin, yPos);
    }

    return yPos + 12;
  }

  private static drawDetailedPriceTable(
    doc: jsPDF,
    order: Order,
    startY: number
  ): number {
    const margin = 20; // Augmenté
    const pageWidth = doc.internal.pageSize.getWidth();
    const tableWidth = pageWidth - 2 * margin;
    let yPos = startY;

    // Colonnes du tableau - mieux espacées
    const col1X = margin + 3; // Désignation (gauche)
    const col2X = margin + tableWidth * 0.5; // Quantité (réduit)
    const col3X = margin + tableWidth * 0.67; // Prix unitaire
    const col4X = pageWidth - margin - 3; // Montant (droite aligné)

    // En-tête du tableau avec gradient
    doc.setFillColor(102, 217, 161); // #66d9a1
    doc.roundedRect(margin, yPos, tableWidth, 10, 2, 2, "F");

    doc.setFontSize(8);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(255, 255, 255);
    doc.text("Désignation", col1X, yPos + 6.5);
    doc.text("Qté", col2X, yPos + 6.5, { align: "center" });
    doc.text("Prix unit. (FCFA)", col3X, yPos + 6.5, { align: "center" });
    doc.text("Montant (FCFA)", col4X, yPos + 6.5, { align: "right" });

    yPos += 10;

    // Lignes du tableau
    doc.setFont("helvetica", "normal");
    doc.setTextColor(51, 51, 51);

    let rowIndex = 0;

    console.log('🔍 DEBUG INVOICE:', {
      formuleCommande: order.formuleCommande,
      repartitionMachines: order.repartitionMachines,
      hasRepartition: !!order.repartitionMachines,
      length: order.repartitionMachines?.length
    });

    // Si formule BaseMachine : afficher les machines
    if (
      order.formuleCommande === "BaseMachine" &&
      order.repartitionMachines &&
      order.repartitionMachines.length > 0
    ) {
      for (const machine of order.repartitionMachines) {
        const machineType = machine.typeMachine === 'Machine20kg' ? '20Kg' : '6Kg';
        yPos = this.drawDetailedTableRow(
          doc,
          `Formule machine (${machineType})`,
          machine.quantite.toString(),
          this.formatPrice(machine.prixUnitaire),
          machine.quantite * machine.prixUnitaire,
          yPos,
          col1X,
          col2X,
          col3X,
          col4X,
          tableWidth,
          margin,
          rowIndex++
        );
      }
    } else if (order.formuleCommande === "Detail") {
      // Si formule Détail : afficher prix au kg
        const poids = order.masseClientIndicativeKg || 0;
        const prixPerKg = Math.round(poids*600);
      yPos = this.drawDetailedTableRow(
        doc,
        "Formule détaillée",
        `${poids}`,
        "600", // Prix au kg
        prixPerKg,
        yPos,
        col1X,
        col2X,
        col3X,
        col4X,
        tableWidth,
        margin,
        rowIndex++
      );
    }

    // Options
    // Pour la formule Detail : seul Express est facturé en supplément (séchage, livraison, repassage sont inclus)
    // Pour la formule BaseMachine : toutes les options sont facturées
    if (order.options) {
      const isDetailFormula = order.formuleCommande === "Detail";

      // Option Livraison (seulement pour BaseMachine)
      if (order.options.aOptionLivraison && !isDetailFormula) {
        const livraisonPrice = order.priceDetails?.options?.livraison || 1000;
        yPos = this.drawDetailedTableRow(
          doc,
          "Option Livraison",
          "1",
          this.formatPrice(livraisonPrice),
          livraisonPrice,
          yPos,
          col1X,
          col2X,
          col3X,
          col4X,
          tableWidth,
          margin,
          rowIndex++
        );
      }

      // Option Séchage - 150 FCFA par kg (seulement pour BaseMachine)
      if (order.options.aOptionSechage && !isDetailFormula) {
        const poids = order.masseVerifieeKg || order.masseClientIndicativeKg || 0;
        const sechagePrice = order.priceDetails?.options?.sechage?.prix || (poids * 150);
        
        yPos = this.drawDetailedTableRow(
          doc,
          "Option Séchage",
          `${poids}`,
          "150",
          sechagePrice,
          yPos,
          col1X,
          col2X,
          col3X,
          col4X,
          tableWidth,
          margin,
          rowIndex++
        );
      }

      // Option Repassage (seulement pour BaseMachine)
      if (order.options.aOptionRepassage && !isDetailFormula) {
        const repassagePrice = order.priceDetails?.options?.repassage || 0;
        if (repassagePrice > 0) {
          yPos = this.drawDetailedTableRow(
            doc,
            "Option Repassage",
            "1",
            this.formatPrice(repassagePrice),
            repassagePrice,
            yPos,
            col1X,
            col2X,
            col3X,
            col4X,
            tableWidth,
            margin,
            rowIndex++
          );
        }
      }

      // Option Express (pour les deux formules)
      if (order.options.aOptionExpress) {
        const expressPrice = order.priceDetails?.options?.express || 1000;
        yPos = this.drawDetailedTableRow(
          doc,
          "Option Express",
          "1",
          this.formatPrice(expressPrice),
          expressPrice,
          yPos,
          col1X,
          col2X,
          col3X,
          col4X,
          tableWidth,
          margin,
          rowIndex++
        );
      }
    }

    // Réduction étudiant/ouverture - utiliser priceDetails.reduction si disponible
    if (order.typeReduction && order.priceDetails?.reduction) {
      const reductionAmount = order.priceDetails.reduction.montantReduction;
      
      if (reductionAmount > 0) {
        const reductionLabel = order.typeReduction === "Etudiant" 
          ? "Réduction étudiant (10%)" 
          : "Réduction ouverture (5%)";
        
        yPos = this.drawDetailedTableRow(
          doc,
          reductionLabel,
          "1",
          this.formatPrice(reductionAmount),
          -reductionAmount,
          yPos,
          col1X,
          col2X,
          col3X,
          col4X,
          tableWidth,
          margin,
          rowIndex++
        );
      }
    } else if (order.typeReduction) {
      // Fallback si pas de priceDetails : calculer sur le TOTAL (base + options)
      let reductionAmount = 0;
      
      // Calculer le prix de base
      const basePrice = order.formuleCommande === "BaseMachine" 
        ? (order.repartitionMachines || []).reduce((sum, m) => sum + (m.quantite * m.prixUnitaire), 0)
        : (order.masseVerifieeKg || order.masseClientIndicativeKg || 0) * 600;
      
      // Calculer le prix des options
      let optionsPrice = 0;
      const poids = order.masseVerifieeKg || order.masseClientIndicativeKg || 0;
      
      if (order.options?.aOptionLivraison) {
        optionsPrice += 1000; // Livraison
      }
      if (order.options?.aOptionSechage) {
        optionsPrice += poids * 150; // Séchage 150 FCFA/kg
      }
      if (order.options?.aOptionExpress) {
        optionsPrice += 1000; // Express
      }
      
      // Total = base + options
      const totalAvantReduction = basePrice + optionsPrice;

      // Appliquer la réduction sur le TOTAL
      if (order.typeReduction === "Etudiant") {
        reductionAmount = totalAvantReduction * 0.1; // 10% de réduction
      } else if (order.typeReduction === "Ouverture") {
        reductionAmount = totalAvantReduction * 0.05; // 5% de réduction
      }

      if (reductionAmount > 0) {
        const reductionLabel = order.typeReduction === "Etudiant" 
          ? "Réduction étudiant (10%)" 
          : "Réduction ouverture (10%)";
        
        yPos = this.drawDetailedTableRow(
          doc,
          reductionLabel,
          "1",
          this.formatPrice(reductionAmount),
          -reductionAmount,
          yPos,
          col1X,
          col2X,
          col3X,
          col4X,
          tableWidth,
          margin,
          rowIndex++
        );
      }
    }

    // Ajustement
    if (order.ajustementType && order.ajustementValeur) {
      let ajustementValue = order.ajustementValeur;

      if (order.ajustementMethode === "Pourcentage") {
        const montantAjustement =
          (order.prixTotal || 0) * (ajustementValue / 100);
        ajustementValue =
          order.ajustementType === "Diminution"
            ? -montantAjustement
            : montantAjustement;
      } else {
        ajustementValue =
          order.ajustementType === "Diminution"
            ? -ajustementValue
            : ajustementValue;
      }

      const ajustementLabel = `Ajustement (${order.ajustementType})`;
      yPos = this.drawDetailedTableRow(
        doc,
        ajustementLabel,
        "1",
        this.formatPrice(Math.abs(ajustementValue)),
        ajustementValue,
        yPos,
        col1X,
        col2X,
        col3X,
        col4X,
        tableWidth,
        margin,
        rowIndex++
      );
    }

    // Crédit fidélité
    if (order.montantReductionPoints) {
      yPos = this.drawDetailedTableRow(
        doc,
        "Crédit fidélité utilisé",
        "1",
        this.formatPrice(order.montantReductionPoints),
        -order.montantReductionPoints,
        yPos,
        col1X,
        col2X,
        col3X,
        col4X,
        tableWidth,
        margin,
        rowIndex++
      );
    }

    // Ligne de séparation
    yPos += 3;
    doc.setDrawColor(102, 217, 161);
    doc.setLineWidth(0.5);
    doc.line(margin, yPos, pageWidth - margin, yPos);
    yPos += 8;

    // Total avec fond coloré
    doc.setFillColor(121, 223, 246); // #79dff6
    doc.roundedRect(margin, yPos - 3, tableWidth, 10, 2, 2, "F");

    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(0, 0, 0); // Noir foncé au lieu de blanc

    const totalText =
      order.prixPaye === 0 && order.clientUser?.typeClient === "Premium"
        ? "TOTAL (Inclus dans abonnement)"
        : "TOTAL À PAYER";

    doc.text(totalText, col1X, yPos + 4);
    doc.text(
      `${this.formatPrice(order.prixPaye || 0)} F CFA`,
      col4X - 3,
      yPos + 4,
      { align: "right" }
    );

    yPos += 12;

    // Mode de paiement
    if (order.modePaiement) {
      doc.setFontSize(9);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(102, 102, 102);
      doc.text(`Mode de paiement: ${order.modePaiement}`, margin, yPos);
      yPos += 5;
    }

    return yPos;
  }

  private static drawDetailedTableRow(
    doc: jsPDF,
    designation: string,
    quantity: string,
    unitPrice: string,
    amount: number,
    yPos: number,
    col1X: number,
    col2X: number,
    col3X: number,
    col4X: number,
    tableWidth: number,
    margin: number,
    rowIndex: number
  ): number {
    const rowHeight = 8;

    // Fond alterné
    if (rowIndex % 2 === 0) {
      doc.setFillColor(249, 249, 249);
      doc.rect(margin, yPos, tableWidth, rowHeight, "F");
    }

    // Contenu
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(51, 51, 51);

    // Désignation (tronquer si trop long)
    const maxDesignationWidth = col2X - col1X - 5;
    const designationLines = doc.splitTextToSize(
      designation,
      maxDesignationWidth
    );
    doc.text(designationLines[0], col1X, yPos + 5.5);

    // Quantité
    doc.text(quantity, col2X, yPos + 5.5, { align: "center" });

    // Prix unitaire
    doc.text(`${unitPrice}`, col3X, yPos + 5.5, { align: "center" });

    // Montant
    const amountColor = amount < 0 ? [220, 38, 38] : [51, 51, 51];
    doc.setTextColor(amountColor[0], amountColor[1], amountColor[2]);
    doc.text(
      `${amount >= 0 ? "" : "-"}${this.formatPrice(Math.abs(amount))}`,
      col4X,
      yPos + 5.5,
      { align: "right" }
    );

    return yPos + rowHeight;
  }

  private static drawFooter(doc: jsPDF) {
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 20; // Augmenté
    const pageWidth = doc.internal.pageSize.getWidth();
    const footerY = pageHeight - 30;

    // Ligne de séparation avec couleurs de l'entreprise
    doc.setDrawColor(102, 217, 161); // #66d9a1
    doc.setLineWidth(0.5);
    doc.line(margin, footerY, pageWidth - margin, footerY);

    // Texte du pied de page
    doc.setFontSize(8);
    doc.setFont("helvetica", "italic");
    doc.setTextColor(102, 102, 102);

    doc.text("Merci pour votre confiance !", pageWidth / 2, footerY + 6, {
      align: "center",
    });

    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.text(
      "Cette facture est générée automatiquement et ne nécessite pas de signature.",
      pageWidth / 2,
      footerY + 11,
      { align: "center" }
    );
  }

  static downloadPDF(blob: Blob, filename: string) {
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }
}
