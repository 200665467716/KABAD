/*
 * Account e-mails (address check, password reset). SMTP_URL configures the server, for example
 * smtps://user:password@smtp.example.org:465. Without it, in development only, the e-mail is printed
 * in the terminal so the link can be opened; in production nothing is sent and the caller is told.
 */
import nodemailer, { type Transporter } from "nodemailer";
import { DomainError } from "./errors";

let transport: Transporter | null = null;

export function mailConfigured() {
  return Boolean(process.env.SMTP_URL) || process.env.NODE_ENV !== "production";
}

export async function sendMail(to: string, subject: string, text: string) {
  const url = process.env.SMTP_URL;
  if (!url) {
    if (process.env.NODE_ENV === "production") throw new DomainError("mail_unavailable", "L’envoi d’e-mails n’est pas encore configuré. Écrivez à l’équipe KABAD.", 503);
    console.info(`\n[e-mail de développement] À : ${to}\nObjet : ${subject}\n\n${text}\n`);
    return;
  }
  transport ??= nodemailer.createTransport(url);
  await transport.sendMail({ from: process.env.MAIL_FROM ?? "KABAD <no-reply@kabad.app>", to, subject, text });
}
