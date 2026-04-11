"use server";

import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  service: "gmail", // or custom SMTP
  auth: {
    user: process.env.EMAIL,
    pass: process.env.EMAIL_PASS,
  },
});

// 🔥 Reusable Mail Sender
export async function sendMail({ to, subject, html }) {
  try {
    await transporter.sendMail({
      from: `${process.env.NEXT_SHOP_NAME} | <${process.env.EMAIL}>`,
      to,
      subject,
      html,
    });

    return { success: true };
  } catch (error) {
    console.error("Mail Error:", error);
    throw new Error("Failed to send email");
    return { success: false };
  }
}
