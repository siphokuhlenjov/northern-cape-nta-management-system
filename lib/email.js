"use strict";

const nodemailer = require("nodemailer");

function smtpConfig(env = process.env) {
  const host = String(env.SMTP_HOST || "").trim();
  const from = String(env.SMTP_FROM || "").trim();
  const port = Number(env.SMTP_PORT || 587);
  const secure = String(env.SMTP_SECURE || "").toLowerCase() === "true";
  const configuredUser = String(env.SMTP_USER || "");
  const pass = String(env.SMTP_PASS || "");
  const isGmail = host.toLowerCase() === "smtp.gmail.com";
  const user = configuredUser || (isGmail ? from : "");

  if (!host && !from && !configuredUser && !pass) return null;
  if (!host || !from) throw new Error("SMTP_HOST and SMTP_FROM must both be configured.");
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error("SMTP_PORT must be a valid port number.");
  if (isGmail && !pass) return null;
  if ((configuredUser && !pass) || (!configuredUser && pass && !isGmail)) throw new Error("Configure both SMTP_USER and SMTP_PASS, or leave both empty.");

  return {
    host,
    port,
    secure,
    requireTLS: !secure,
    ...(pass ? { auth: { user, pass } } : {})
  };
}

function emailConfigured(env = process.env) {
  return Boolean(smtpConfig(env));
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, char => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  }[char]));
}

async function sendPasswordResetEmail({ to, link, env = process.env }) {
  const config = smtpConfig(env);
  if (!config) throw new Error("Email delivery is not configured.");

  const transporter = nodemailer.createTransport(config);
  const from = String(env.SMTP_FROM).trim();
  const appName = String(env.MAIL_FROM_NAME || "Northern Cape NTA").trim();
  const safeLink = escapeHtml(link);

  await transporter.sendMail({
    from: { name: appName, address: from },
    to,
    subject: "Reset your Northern Cape NTA password",
    text: [
      "A password reset was requested for your Northern Cape NTA account.",
      "",
      "Use the one-time link below to choose a new password. It expires in 30 minutes:",
      link,
      "",
      "If you did not request this, you can ignore this email. Your password will not change."
    ].join("\n"),
    html: `<!doctype html><html><body style="margin:0;padding:24px;background:#f4f7f3;font-family:Arial,sans-serif;color:#1e2b27"><main style="max-width:560px;margin:0 auto;padding:28px;background:#fff;border:1px solid #e3e8e0;border-radius:12px"><p style="font-size:12px;font-weight:bold;letter-spacing:.12em;color:#527365">ACCOUNT ACCESS</p><h1 style="font-size:24px;color:#123b32">Reset your password</h1><p>A password reset was requested for your Northern Cape NTA account.</p><p><a href="${safeLink}" style="display:inline-block;padding:13px 18px;border-radius:6px;background:#123b32;color:#fff;text-decoration:none;font-weight:bold">Create a new password</a></p><p>This one-time link expires in 30 minutes. If the button does not work, copy this link into your browser:</p><p style="overflow-wrap:anywhere"><a href="${safeLink}">${safeLink}</a></p><p style="font-size:13px;color:#62736b">If you did not request this, ignore this email. Your password will not change.</p></main></body></html>`
  });
}

module.exports = { emailConfigured, sendPasswordResetEmail };
