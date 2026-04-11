"use client";

import { sendResetEmail } from "@/backend/serverActions/authActions";
import { useState } from "react";

export function EmailFlow() {
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(formData) {
    setLoading(true);

    const res = await sendResetEmail({ formData });

    setMessage(res?.success || res?.error);
    setLoading(false);
  }

  return (
    <form action={handleSubmit} className="mt-4">
      <input
        type="email"
        name="email"
        placeholder="Enter your email"
        className="w-full p-2 border rounded mb-3"
        required
      />

      <button
        className="w-full bg-blue-500 text-white py-2 rounded"
        disabled={loading}
      >
        {loading ? "Sending..." : "Send Reset Link"}
      </button>

      {message && <p className="mt-2 text-lg text-white">{message}</p>}
    </form>
  );
}
