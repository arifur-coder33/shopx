"use client";
import { loginWithCreds } from "@/backend/serverActions/authActions";
import { useRouter } from "next/navigation";
import { useState } from "react";
import Button from "../button";
import DefaultInput from "../input/DefaultInput";

export default function LoginForm() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function HandleSubmit(e) {
    e.preventDefault();
    const form = e.target;
    const formData = new FormData(form);
    setError("");
    setLoading(true);
    try {
      const result = await loginWithCreds(formData);
      console.log(result);
      setLoading(false);
      if (result?.message) {
        setError(result.message);
      }
      if (!result?.message) {
        router.push("/");
      }

      // Redirect or success logic
    } catch (error) {
      console.log("");
    }
  }

  return (
    <form className="mt-6" onSubmit={HandleSubmit}>
      {error && (
        <div className="w-full rounded-md bg-red-200 p-2 text-base text-red-600 overflow-hidden">
          {error}
        </div>
      )}

      <DefaultInput
        name="email"
        label="ইমেইলঃ"
        placeholder="আপনার ইমেইল দিন।"
        required
        type="email"
      />

      <DefaultInput
        name="password"
        label="পাসওয়ার্ডঃ"
        placeholder="আপনার পাসওয়ার্ড দিন।"
        required
        type="password"
      />

      <Button disabled={loading} className="w-full mt-2 py-2">
        {loading ? "লগইন হচ্ছে..." : "লগইন করুন"}
      </Button>
    </form>
  );
}
