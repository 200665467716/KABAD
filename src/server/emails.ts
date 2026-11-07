/*
 * Text of the account e-mails, in the member's language (User.locale, set at sign-up from the page
 * language and changed by the language switch). The French text uses "tu", like the interface.
 */
export type MailLocale = "fr" | "en";
type Mail = { subject: string; text: string };

const appUrl = () => (process.env.APP_URL ?? "http://localhost:3000").replace(/\/$/, "");
/** The page in the same language as the e-mail: English pages live under /en. */
const page = (locale: MailLocale, path: string) => `${appUrl()}${locale === "en" ? "/en" : ""}${path}`;
const firstName = (name: string) => name.split(" ")[0];
export const mailLocale = (locale: string | null | undefined): MailLocale => (locale === "en" ? "en" : "fr");

export function verificationMail(locale: MailLocale, name: string, code: string, token: string): Mail {
  const link = page(locale, `/verifier-email?jeton=${token}`);
  return locale === "en"
    ? {
        subject: `${code} is your KABAD confirmation code`,
        text: `Hello ${firstName(name)},\n\nYour confirmation code: ${code}\n\nYou can also open this link:\n${link}\n\nThis code is valid for 10 minutes. If you did not create an account, ignore this message.\n\nThe KABAD team`,
      }
    : {
        subject: `${code} : ton code de confirmation KABAD`,
        text: `Bonjour ${firstName(name)},\n\nTon code de confirmation : ${code}\n\nTu peux aussi ouvrir ce lien :\n${link}\n\nCe code est valable 10 minutes. Si tu n’as pas créé de compte, ignore ce message.\n\nL’équipe KABAD`,
      };
}

export function passwordResetMail(locale: MailLocale, name: string, token: string): Mail {
  const link = page(locale, `/reinitialiser?jeton=${token}`);
  return locale === "en"
    ? {
        subject: "Reset your KABAD password",
        text: `Hello ${firstName(name)},\n\nTo choose a new password, open this link:\n${link}\n\nIt is valid for one hour. If you did not ask for anything, ignore this message: your password does not change.\n\nThe KABAD team`,
      }
    : {
        subject: "Réinitialise ton mot de passe KABAD",
        text: `Bonjour ${firstName(name)},\n\nPour choisir un nouveau mot de passe, ouvre ce lien :\n${link}\n\nIl est valable une heure. Si tu n’as rien demandé, ignore ce message : ton mot de passe ne change pas.\n\nL’équipe KABAD`,
      };
}
