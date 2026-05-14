import crypto from "crypto";

export function cuid() {
  const timestamp = Date.now().toString(36);
  const random = crypto.randomBytes(16).toString("base64url").slice(0, 24);
  return `c${timestamp}${random}`;
}
