import bcrypt from "bcryptjs";

export async function hashPassword(plainPassword) {
  if (
    typeof plainPassword !== "string" ||
    plainPassword.length < 8 ||
    plainPassword.length > 1024
  ) {
    throw new Error("Password must be between 8 and 1024 characters.");
  }
  return bcrypt.hash(plainPassword, 10);
}

export async function verifyPassword(plainPassword, passwordHash) {
  if (
    typeof plainPassword !== "string" ||
    typeof passwordHash !== "string" ||
    !plainPassword ||
    !passwordHash ||
    plainPassword.length > 1024
  ) {
    return false;
  }

  try {
    return await bcrypt.compare(plainPassword, passwordHash);
  } catch {
    return false;
  }
}
