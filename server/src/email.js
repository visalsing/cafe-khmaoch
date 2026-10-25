import dotenv from "dotenv";
import nodemailer from "nodemailer";

// Optional: you can also ensure email.js loads .env safely if run standalone
dotenv.config({ path: new URL("../.env", import.meta.url) });

function createTransporter() {
  // Read process.env HERE (at runtime), not at the top level of the file
  const { SMTP_USER, SMTP_PASS, SMTP_FROM } = process.env;

  if (!SMTP_USER || !SMTP_PASS || !SMTP_FROM) {
    throw new Error(
      "Missing SMTP_USER, SMTP_PASS, or SMTP_FROM in the server environment."
    );
  }

  return nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: SMTP_USER,
      pass: SMTP_PASS,
    },
  });
}

export async function verifyEmailConfig() {
  const transporter = createTransporter();
  await transporter.verify();
  return true;
}

export async function sendEmail({ to, subject, text, html, replyTo, headers }) {
  const transporter = createTransporter();
  return transporter.sendMail({
    from: process.env.SMTP_FROM,
    replyTo: replyTo || process.env.SMTP_REPLY_TO || undefined, // a mailbox you read (optional)
    to,
    subject,
    text,
    html,
    headers: { "X-Auto-Response-Suppress": "All", ...headers },
  });
}