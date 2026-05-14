import pino from "pino";

const isProduction = process.env["NODE_ENV"] === "production";

export const logger = pino({
  level: process.env["LOG_LEVEL"] ?? "info",
  redact: {
    paths: [
      "req.headers.authorization",
      "req.headers.cookie",
      "res.headers['set-cookie']",
      "*.encryptedCredentials",
      "*.passwordHash",
      "*.credential",
      "*.accessUrl",
    ],
    censor: "[REDACTED]",
  },
  ...(isProduction
    ? {}
    : {
        transport: {
          target: "pino-pretty",
          options: { colorize: true },
        },
      }),
});
