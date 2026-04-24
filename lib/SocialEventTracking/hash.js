import crypto from "crypto";

export const hash = (value = "") => {
  if (!value) return undefined;

  return crypto
    .createHash("sha256")
    .update(value.trim().toLowerCase())
    .digest("hex");
};
