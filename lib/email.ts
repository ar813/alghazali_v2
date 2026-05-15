import nodemailer from "nodemailer";

const EMAIL_HOST = process.env.EMAIL_HOST;
const EMAIL_PORT = process.env.EMAIL_PORT ? Number(process.env.EMAIL_PORT) : undefined;
const EMAIL_SECURE = process.env.EMAIL_SECURE === "true";
const EMAIL_USER = process.env.EMAIL_USER;
const EMAIL_PASSWORD = process.env.EMAIL_PASSWORD;
const EMAIL_SERVICE = process.env.EMAIL_SERVICE || "gmail";

export const transporter = nodemailer.createTransport(
  EMAIL_HOST
    ? { host: EMAIL_HOST, port: EMAIL_PORT || 587, secure: EMAIL_SECURE, auth: { user: EMAIL_USER, pass: EMAIL_PASSWORD } }
    : ({ service: EMAIL_SERVICE, auth: { user: EMAIL_USER, pass: EMAIL_PASSWORD } } as any)
);

export const EMAIL_FROM = EMAIL_USER;
