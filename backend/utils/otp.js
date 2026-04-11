"use server";
import jwt from "jsonwebtoken";

// 🔥 Generate OTP + Token
export async function createOTPToken(phone) {
  const otp = Math.floor(1000 + Math.random() * 9000).toString();

  const token = jwt.sign(
    { phone, otp },
    process.env.JWT_SECRET,
    { expiresIn: "5m" }, // ⏱️ 5 min
  );

  return { otp, token };
}

export async function verifyOTPToken({ token, userOtp }) {
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    if (decoded.otp !== userOtp) {
      return { error: "Invalid OTP" };
    }

    return { success: true, phone: decoded.phone };
  } catch (error) {
    return { error: "OTP expired or invalid" };
  }
}
