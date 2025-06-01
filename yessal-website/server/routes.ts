import type { Express } from "express";
import { createServer, type Server } from "http";
import { z } from "zod";
import sanitizeHtml from "sanitize-html";
import nodemailer from "nodemailer";
import dotenv from "dotenv";

dotenv.config(); // Charger .env

// Vérification des variables
if (!process.env.MAIL_USER || !process.env.MAIL_PASS) {
  throw new Error("MAIL_USER ou MAIL_PASS manquant dans .env");
}

// Configurer Nodemailer
const transporter = nodemailer.createTransport({
  host: "smtp.mail.ovh.net",
  port: 465,
  secure: true,
  auth: {
    user: process.env.MAIL_USER,
    pass: process.env.MAIL_PASS,
  },
});

// Schéma du formulaire
const contactFormSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  phone: z.string().optional(),
  message: z.string().min(10),
});

// Fonction pour nettoyer les champs
const sanitizeFields = <T extends Record<string, any>>(data: T): T => {
  const sanitized: any = {};
  for (const [key, value] of Object.entries(data)) {
    sanitized[key] = typeof value === "string"
      ? sanitizeHtml(value, { allowedTags: [], allowedAttributes: {} })
      : value;
  }
  return sanitized;
};

// Fonction pour envoyer le mail de confirmation à l'utilisateur
const sendConfirmationToUser = async (to: string, name: string) => {
  const content = `
    <p>Bonjour ${name},</p>
    <p>Nous avons bien reçu votre message. Merci de nous avoir contacté !</p>
    <p>Nous vous répondrons dans les plus brefs délais.</p>
    <p>— L'équipe Yessal Clean</p>
  `;

  await transporter.sendMail({
    from: `"Yessal Clean" <${process.env.MAIL_USER}>`,
    to : to,
    subject: "📩 Confirmation de réception de votre message",
    html: content,
  });
};

// Fonction pour envoyer le mail interne à Yessal
const sendInternalEmail = async (data: any) => {
  const content = `
    <h2>Nouveau message depuis le formulaire de contact</h2>
    <p><strong>Nom :</strong> ${data.name}</p>
    <p><strong>Email :</strong> ${data.email}</p>
    ${data.phone ? `<p><strong>Téléphone :</strong> ${data.phone}</p>` : ""}
    <p><strong>Message :</strong></p>
    <p>${data.message.replace(/\n/g, "<br>")}</p>
  `;

  await transporter.sendMail({
    from: `"Yessal Clean" <${process.env.MAIL_USER}>`,
    to: "contact@yessal.sn",
    subject: "📥 Nouveau message de contact",
    html: content,
  });
};

export async function registerRoutes(app: Express): Promise<Server> {
  app.post("/api/contact", async (req, res) => {
    try {
      const parsed = contactFormSchema.parse(req.body);
      const sanitized = sanitizeFields(parsed);
      console.log("Nouveau message de contact:", sanitized);

      // Envoyer les emails
      await Promise.all([
        sendInternalEmail(sanitized),
        sendConfirmationToUser(sanitized.email, sanitized.name)
      ]);

      return res.status(200).json({
        success: true,
        message: "Votre message a été envoyé avec succès.",
      });
    } catch (error) {
      console.error("Erreur formulaire contact:", error);
      return res.status(400).json({
        success: false,
        message: "Erreur lors de l'envoi du formulaire.",
      });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
