import dotenv from "dotenv";
// Put dotenv.config() at the absolute top
dotenv.config({ path: new URL("../.env", import.meta.url) });

import nodemailer from "nodemailer";
import { verifyEmailConfig, sendEmail } from "./email.js";

try {
  await verifyEmailConfig();
  console.log("SMTP connection successful.");

  await sendEmail({
    to: process.env.SMTP_USER,
    subject: "Cafe Khmaoch - Email Test",
    text: "Your Cafe Khmaoch backend can send emails successfully.",
  });

  console.log("Test email sent successfully.");
} catch (error) {
  console.error("Email test failed:", error.message);
  process.exitCode = 1;
}