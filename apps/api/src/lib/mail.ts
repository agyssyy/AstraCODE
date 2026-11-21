import nodemailer from "nodemailer";
import { env, smtp } from "../env.js";

export type MailSender = {
  email: string;
  appPassword: string;
};

export type MailDelivery = {
  sender: MailSender;
  to: string;
};

export function systemSender(): MailSender | null {
  if (!smtp.configured) return null;
  return { email: smtp.user, appPassword: smtp.pass };
}

export function maskEmail(email: string): string {
  const [name, domain] = email.split("@");
  if (!name || !domain) return email;
  const visible = name.slice(0, Math.min(2, name.length));
  return `${visible}${"•".repeat(Math.max(1, name.length - visible.length))}@${domain}`;
}

function transport(delivery: MailDelivery) {
  return nodemailer.createTransport({
    host: env.nodeEnv === "test" ? "smtp.gmail.com" : smtp.host,
    port: smtp.port,
    secure: smtp.port === 465,
    auth: { user: delivery.sender.email, pass: delivery.sender.appPassword },
    connectionTimeout: 12_000,
    greetingTimeout: 12_000,
    socketTimeout: 20_000,
  });
}

function fromHeader(delivery: MailDelivery): string {
  const sender = delivery.sender.email;
  const configured = smtp.from || sender;
  if (configured.includes("<")) return configured;
  return `"AstraCode" <${configured}>`;
}

export async function sendVerificationCode(
  delivery: MailDelivery,
  code: string,
  expiresMinutes: number,
): Promise<void> {
  const transporter = transport(delivery);

  await transporter.sendMail({
    from: fromHeader(delivery),
    to: delivery.to,
    subject: `Your AstraCode verification code: ${code}`,
    text: [
      `Your AstraCode verification code is ${code}.`,
      "",
      `It expires in ${expiresMinutes} minutes.`,
      "If you did not try to sign in, change your password immediately.",
    ].join("\n"),
    html: `
      <div style="font-family:Inter,Arial,sans-serif;max-width:480px;margin:0 auto;padding:32px;color:#0f172a">
        <h2 style="margin:0 0 8px;font-size:20px">Sign in to AstraCode</h2>
        <p style="margin:0 0 24px;color:#64748b;font-size:14px">Use this one-time code to finish signing in.</p>
        <div style="font-size:34px;font-weight:700;letter-spacing:10px;padding:18px 20px;border-radius:12px;background:#f1f5f9;text-align:center">${code}</div>
        <p style="margin:20px 0 0;color:#64748b;font-size:12px">The code expires in ${expiresMinutes} minutes. If you didn't try to sign in, change your password immediately.</p>
      </div>
    `,
  });

  transporter.close();
}

export async function sendPasswordReset(
  delivery: MailDelivery,
  resetUrl: string,
  expiresMinutes: number,
): Promise<void> {
  const transporter = transport(delivery);

  await transporter.sendMail({
    from: fromHeader(delivery),
    to: delivery.to,
    subject: "Reset your AstraCode password",
    text: [
      "Someone requested a password reset for your AstraCode account.",
      "",
      `Open this link to choose a new password: ${resetUrl}`,
      `The link expires in ${expiresMinutes} minutes and can be used once.`,
      "",
      "If you did not request this, you can ignore this email.",
    ].join("\n"),
    html: `
      <div style="font-family:Inter,Arial,sans-serif;max-width:480px;margin:0 auto;padding:32px;color:#0f172a">
        <h2 style="margin:0 0 8px;font-size:20px">Reset your password</h2>
        <p style="margin:0 0 24px;color:#64748b;font-size:14px">Choose a new password for your AstraCode account.</p>
        <a href="${resetUrl}" style="display:inline-block;padding:12px 20px;border-radius:10px;background:#4f46e5;color:#fff;text-decoration:none;font-weight:600;font-size:14px">Choose a new password</a>
        <p style="margin:20px 0 0;color:#64748b;font-size:12px">The link expires in ${expiresMinutes} minutes and can be used once. If you didn't request this, ignore this email.</p>
        <p style="margin:12px 0 0;color:#94a3b8;font-size:11px;word-break:break-all">${resetUrl}</p>
      </div>
    `,
  });

  transporter.close();
}

export async function sendSetupEmail(delivery: MailDelivery): Promise<void> {
  const transporter = transport(delivery);

  await transporter.sendMail({
    from: fromHeader(delivery),
    to: delivery.to,
    subject: "Two-step verification is on for AstraCode",
    text: "Two-step verification is now enabled for your AstraCode account. Login codes will arrive at this email address.",
    html: `
      <div style="font-family:Inter,Arial,sans-serif;max-width:480px;margin:0 auto;padding:32px;color:#0f172a">
        <h2 style="margin:0 0 8px;font-size:20px">Two-step verification is on</h2>
        <p style="margin:0;color:#64748b;font-size:14px">Login codes for AstraCode will now arrive at this email address.</p>
      </div>
    `,
  });

  transporter.close();
}
