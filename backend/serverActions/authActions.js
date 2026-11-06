"use server";

import { signIn, signOut } from "@/auth";
import prisma from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { createHmac, randomInt, timingSafeEqual } from "node:crypto";
import jwt from "jsonwebtoken";
import { AuthError } from "next-auth";
import { revalidatePath } from "next/cache";
import { sendMail } from "../lib/mail/email/sendMail";
import { sendOTP } from "../lib/mail/phone/sendOtp";
import { getListCount } from "../utils/getListCount";
import { getListData } from "../utils/getListData";
import { getAuthData } from "../utils/hasPermission";
import { createOTPToken, verifyOTPToken } from "../utils/otp";
import { getSiteUrl } from "@/lib/siteUrl";
export async function GetUserList(params) {
  return getListData({
    prisma,
    model: "user",
    params,
    searchableFields: [
      { field: "name", type: "string", mode: "insensitive" },
      { field: "email", type: "string", mode: "insensitive" },
      { field: "phone", type: "string", mode: "insensitive" },
    ],
    relationSearch: {
      role: {
        relation: "role",
        field: "name",
        type: "string",
        relationType: "single",
        exactMatch: true,
      },
    },
    dateField: "createdAt",
  });
}

export async function getUserCount(params) {
  return getListCount({
    prisma,
    model: "user",
    params,
    searchableFields: [
      { field: "name", type: "string", mode: "insensitive" },
      { field: "email", type: "string", mode: "insensitive" },
      { field: "phone", type: "string", mode: "insensitive" },
    ],
    relationSearch: {
      role: {
        relation: "role",
        field: "name",
        relationType: "single",
        type: "string",
        exactMatch: true,
      },
    },
    dateField: "createdAt",
  });
}
export async function loginWithCreds(formData) {
  try {
    const rawFormData = {
      email: formData.get("email"),
      password: formData.get("password"),
      redirect: false,
    };
    await signIn("credentials", rawFormData);
  } catch (error) {
    if (error instanceof AuthError) {
      switch (error.type) {
        case "CredentialsSignin":
          return {
            message: "Invalid credentials",
          };
        default:
          return {
            message: "Something went wrong.",
          };
      }
    }
    throw error;
  }
}

export async function userregistration(request) {
  try {
    const formData = await request.formData();
    const name = formData.get("name");
    const email = formData.get("email");
    const password = formData.get("password");
    const phone = formData.get("phone");

    if (!email || !password) {
      return new Response(
        JSON.stringify({ message: "Email and password are required" }),
        { status: 400 },
      );
    }

    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return new Response(JSON.stringify({ message: "User already exists" }), {
        status: 400,
      });
    }

    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create the user
    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        name,
        phone,
      },
      select: { id: true, email: true, name: true, phone: true },
    });

    return new Response(
      JSON.stringify({ message: "User registered successfully", user }),
      { status: 201 },
    );
  } catch (error) {
    return new Response(JSON.stringify({ message: "Something went wrong" }), {
      status: 500,
    });
  } finally {
    await prisma.$disconnect();
  }
}

const DEFAULT_ROLE = "USER";

export async function registrationAction(formData) {
  try {
    const name = formData.get("name")?.trim();
    const email = formData.get("email")?.trim().toLowerCase();
    const password = formData.get("password");
    const phone = formData.get("phone")?.trim();

    // 🔹 Basic validation
    if (!email || !password) {
      throw new Error("সব ফিল্ডে তথ্য দিন।");
    }

    // 🔹 Email already exists check
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      throw new Error("আপনি ইতিমধ্যে নিবন্ধন করেছেন।");
    }

    // 🔹 Get or create default role safely
    const defaultRole = await prisma.role.upsert({
      where: { name: DEFAULT_ROLE },
      update: {},
      create: { name: DEFAULT_ROLE },
    });

    // 🔹 Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // 🔹 Create user with default role
    const user = await prisma.user.create({
      data: {
        name,
        email,
        phone,
        password: hashedPassword,
        roleId: defaultRole.id,
      },
    });

    return { success: true, user };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

export async function logout(params) {
  await signOut();
}

export async function deleteUserById(id) {
  try {
    // Delete the order by its ID
    const deletedOrder = await prisma.user.delete({
      where: {
        id: id,
      },
    });
    revalidatePath("/admin/users");

    return {
      success: true,
      data: " deleted successfully",
    };
  } catch (error) {
    return {
      success: false,
      message: error.message || "Failed to delete ",
    };
  } finally {
    await prisma.$disconnect();
  }
}

export async function updateUserAction({ formData }) {
  try {
    const authData = await getAuthData();
    if (!authData?.id) throw new Error("Unauthenticated");
    const name = String(formData.get("name") || "").trim();
    const phone = String(formData.get("phone") || "").trim() || null;
    const gender = String(formData.get("gender") || "").trim() || null;
    const existingUser = await prisma.user.findUnique({ where: { id: authData.id } });
    if (!existingUser) {
      throw new Error("User not found");
    }
    const phoneChanged = (existingUser.phone || null) !== phone;
    await prisma.user.update({
      where: { id: authData.id },
      data: {
        name: name || null,
        phone,
        gender,
        ...(phoneChanged ? { phoneVerifiedAt: null } : {}),
        tokenVersion: { increment: 1 },
      },
    });
    revalidatePath("/my-account");
    revalidatePath("/admin/profile");
    return { success: true, message: "Profile updated successfully." };
  } catch (error) {
    return { success: false, message: error.message || "Could not update profile." };
  }
}

const emailVerificationOtpSecret = () => process.env.JWT_SECRET || process.env.AUTH_SECRET;
const emailVerificationOtpHash = (userId, email, otp) => {
  const secret = emailVerificationOtpSecret();
  if (!secret) throw new Error("Email verification is not configured.");
  return createHmac("sha256", secret)
    .update(`${userId}:${email}:${otp}`)
    .digest("hex");
};

export async function sendEmailVerificationOTP() {
  const authData = await getAuthData();
  if (!authData?.id) return { success: false, message: "Please sign in again." };
  if (!emailVerificationOtpSecret()) {
    return { success: false, message: "Email verification is not configured." };
  }

  const user = await prisma.user.findUnique({
    where: { id: authData.id },
    select: {
      id: true,
      email: true,
      emailVerifiedAt: true,
      emailVerificationOtpSentAt: true,
    },
  });
  if (!user?.email) return { success: false, message: "Email address not found." };
  if (user.emailVerifiedAt) return { success: true, verified: true, message: "Email is already verified." };
  if (
    user.emailVerificationOtpSentAt &&
    Date.now() - user.emailVerificationOtpSentAt.getTime() < 60_000
  ) {
    return { success: false, message: "Please wait a minute before requesting another code." };
  }

  const otp = String(randomInt(0, 1_000_000)).padStart(6, "0");
  const otpHash = emailVerificationOtpHash(user.id, user.email, otp);
  const expiresAt = new Date(Date.now() + 10 * 60_000);
  await prisma.user.update({
    where: { id: user.id },
    data: {
      emailVerificationOtpHash: otpHash,
      emailVerificationOtpExpiresAt: expiresAt,
      emailVerificationOtpSentAt: new Date(),
      emailVerificationOtpAttempts: 0,
    },
  });

  try {
    await sendMail({
      to: user.email,
      subject: "Verify your email address",
      html: `<p>Your email verification code is:</p><p style="font-size:24px;font-weight:bold;letter-spacing:6px">${otp}</p><p>This code expires in 10 minutes. If you did not request it, you can ignore this email.</p>`,
    });
  } catch (error) {
    await prisma.user.updateMany({
      where: { id: user.id, emailVerificationOtpHash: otpHash },
      data: {
        emailVerificationOtpHash: null,
        emailVerificationOtpExpiresAt: null,
        emailVerificationOtpSentAt: null,
        emailVerificationOtpAttempts: 0,
      },
    });
    return { success: false, message: error.message || "Could not send verification email." };
  }

  return { success: true, message: `Verification code sent to ${user.email}.` };
}

export async function verifyEmailVerificationOTP({ otp }) {
  const authData = await getAuthData();
  if (!authData?.id) return { success: false, message: "Please sign in again." };
  if (!emailVerificationOtpSecret()) {
    return { success: false, message: "Email verification is not configured." };
  }
  const code = String(otp || "").trim();
  if (!/^\d{6}$/.test(code)) return { success: false, message: "Enter the 6-digit code." };

  const user = await prisma.user.findUnique({
    where: { id: authData.id },
    select: {
      id: true,
      email: true,
      emailVerifiedAt: true,
      emailVerificationOtpHash: true,
      emailVerificationOtpExpiresAt: true,
      emailVerificationOtpAttempts: true,
    },
  });
  if (!user) return { success: false, message: "User not found." };
  if (user.emailVerifiedAt) return { success: true, message: "Email is already verified." };
  if (!user.emailVerificationOtpHash || !user.emailVerificationOtpExpiresAt) {
    return { success: false, message: "Request a new verification code." };
  }
  if (user.emailVerificationOtpExpiresAt.getTime() < Date.now()) {
    await prisma.user.updateMany({
      where: { id: user.id, emailVerificationOtpHash: user.emailVerificationOtpHash },
      data: { emailVerificationOtpHash: null, emailVerificationOtpExpiresAt: null, emailVerificationOtpAttempts: 0 },
    });
    return { success: false, message: "The code expired. Request a new one." };
  }
  if (user.emailVerificationOtpAttempts >= 5) {
    return { success: false, message: "Too many attempts. Request a new code." };
  }

  const expected = Buffer.from(user.emailVerificationOtpHash, "hex");
  const received = Buffer.from(emailVerificationOtpHash(user.id, user.email, code), "hex");
  if (expected.length !== received.length || !timingSafeEqual(expected, received)) {
    await prisma.user.updateMany({
      where: {
        id: user.id,
        emailVerificationOtpHash: user.emailVerificationOtpHash,
        emailVerificationOtpAttempts: { lt: 5 },
      },
      data: { emailVerificationOtpAttempts: { increment: 1 } },
    });
    return { success: false, message: "The verification code is incorrect." };
  }

  const verified = await prisma.user.updateMany({
    where: {
      id: user.id,
      emailVerifiedAt: null,
      emailVerificationOtpHash: user.emailVerificationOtpHash,
    },
    data: {
      emailVerifiedAt: new Date(),
      emailVerificationOtpHash: null,
      emailVerificationOtpExpiresAt: null,
      emailVerificationOtpSentAt: null,
      emailVerificationOtpAttempts: 0,
    },
  });
  if (verified.count === 0) {
    const refreshedUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: { emailVerifiedAt: true },
    });
    if (!refreshedUser?.emailVerifiedAt) {
      return { success: false, message: "The code was replaced. Request a new one." };
    }
  }
  revalidatePath("/my-account");
  revalidatePath("/admin/profile");
  return { success: true, message: "Email verified successfully." };
}

export async function updatePassword({ formData }) {
  try {
    const authData = await getAuthData();

    if (!authData) {
      throw new Error("Unauthenticated");
    }
    const formDataObj = Object.fromEntries(formData.entries());

    const { oldPassword, confirmPassword, newPassword } = formDataObj;

    if (newPassword !== confirmPassword) {
      throw new Error("New password and confirm password does not match");
    }
    // ✅ Validation
    if (!oldPassword || !newPassword || !confirmPassword) {
      throw new Error("All fields are required");
    }

    if (newPassword.length < 4) {
      throw new Error("New password must be at least 4 characters long");
    }
    if (newPassword === oldPassword) {
      throw new Error("Old password and new password cannot be the same");
    }
    // ✅ Find user
    const user = await prisma.user.findUnique({
      where: { email: authData.email },
    });

    if (!user) {
      throw new Error("User not found");
    }

    // ✅ Check old password
    const isMatch = await bcrypt.compare(oldPassword, user.password);

    if (!isMatch) {
      throw new Error("Old password is incorrect");
    }

    // ✅ Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // ✅ Update password
    await prisma.user.update({
      where: { email: authData.email },
      data: {
        password: hashedPassword,
        tokenVersion: { increment: 1 }, // Invalidate existing tokens
      },
    });

    return { success: true, message: "Password updated successfully" };
  } catch (error) {
    return { success: false, message: error.message };
  }
}

export async function sendResetEmail({ formData }) {
  const email = formData.get("email");

  const user = await prisma.user.findUnique({ where: { email } });

  if (!user) {
    return { error: "Email not found" };
  }

  // 🔐 Token (no DB needed)
  const token = jwt.sign({ email }, process.env.JWT_SECRET, {
    expiresIn: "15m",
  });

  const link = `${await getSiteUrl()}/reset-password?token=${encodeURIComponent(token)}`;

  const html = `
    <h2>Password Reset</h2>
    <p>Click the link below:</p>
    <a href="${link}">${link}</a>
  `;

  await sendMail({
    to: email,
    subject: "Reset Password",
    html,
  });

  return { success: "Reset link sent to your email. Please check your inbox" };
}

export async function sendPhoneOTP({ formData }) {
  const phone = formData.get("phone");

  const user = await prisma.user.findUnique({ where: { phone } });

  if (!user) {
    return { error: "Phone not found" };
  }

  const { otp, token } = createOTPToken(phone);

  await sendOTP({
    phone,
    message: `Your OTP is ${otp}`,
  });

  return { success: true, token };
}

export async function resetPassword({ password, token, phone, userOtp }) {
  let user;

  // ✅ Email flow
  if (token) {
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      user = await prisma.user.findUnique({
        where: { email: decoded.email },
      });
    } catch {
      return { error: "Invalid or expired token" };
    }
  }

  // ✅ Phone flow
  if (phone) {
    const verify = verifyOTPToken({ token, userOtp: otp });

    if (verify.error) {
      throw new Error(verify.error);
    }
    user = await prisma.user.findUnique({
      where: { phone },
    });
  }

  if (!user) {
    return { error: "User not found" };
  }

  if (password.length < 4) {
    return { error: "Minimum 4 characters required" };
  }

  const hashed = await bcrypt.hash(password, 10);

  await prisma.user.update({
    where: { id: user.id },
    data: { password: hashed },
  });

  return { success: "Password updated" };
}
