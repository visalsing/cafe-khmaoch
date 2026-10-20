require("dotenv").config();

const twilio = require("twilio");

const client = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

async function sendSMS() {
  try {
    const message = await client.messages.create({
      body: "Hello! This is my first JavaScript SMS test.",
      from: process.env.TWILIO_PHONE_NUMBER,
      to: process.env.RECIPIENT_PHONE_NUMBER,
    });

    console.log("SMS submitted successfully!");
    console.log("Message SID:", message.sid);
  } catch (error) {
    console.error("SMS error:", error.message);
  }
}

sendSMS();