const nodemailer = require("nodemailer");

let transporter;

function isSmtpConfigured() {
  return Boolean(
    process.env.SMTP_HOST &&
      process.env.SMTP_USER &&
      process.env.SMTP_PASS
  );
}

function getTransporter() {
  if (!isSmtpConfigured()) {
    return null;
  }

  if (!transporter) {
    const port = Number(process.env.SMTP_PORT || 587);

    if (!Number.isInteger(port) || port < 1 || port > 65535) {
      throw new Error("SMTP_PORT must be a valid TCP port.");
    }

    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port,
      secure: port === 465,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  }

  return transporter;
}

function logSmtpFailure(operation, error) {
  console.error(`SMTP ${operation} failed.`, {
    code: error.code,
    responseCode: error.responseCode,
    command: error.command,
  });
}

async function sendEmail(message) {
  let activeTransporter;

  try {
    activeTransporter = getTransporter();
  } catch (error) {
    logSmtpFailure("configuration", error);
    throw new Error("Email delivery is unavailable.");
  }

  if (!activeTransporter) {
    const error = new Error("SMTP is not configured.");
    error.code = "SMTP_NOT_CONFIGURED";
    throw error;
  }

  try {
    return await activeTransporter.sendMail(message);
  } catch (error) {
    logSmtpFailure("delivery", error);
    throw new Error("Email delivery is unavailable.");
  }
}

async function verifySmtpConnection() {
  let activeTransporter;

  try {
    activeTransporter = getTransporter();
  } catch (error) {
    logSmtpFailure("configuration check", error);
    return false;
  }

  if (!activeTransporter) {
    console.warn("SMTP is not configured; verification emails cannot be sent.");
    return false;
  }

  try {
    await activeTransporter.verify();
    console.log("SMTP connection verified.");
    return true;
  } catch (error) {
    logSmtpFailure("connection check", error);
    return false;
  }
}

module.exports = {
  isSmtpConfigured,
  sendEmail,
  verifySmtpConnection,
};