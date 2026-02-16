"use client";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import Button from "../button";
import DefaultInput from "../input/DefaultInput";
export default function LoginForm() {
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || "/";
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
      const email = formData.get("email");
      const password = formData.get("password");

      const result = await signIn("credentials", {
        redirect: false,
        email,
        password,
      });
      console.log(result);

      if (result?.error === null) {
        router.push(callbackUrl);
      } else if (result?.error === "CredentialsSignin") {
        console.log(result.error);
        setError("Invalid email or password. Please try again.");
      }
    } catch (err) {
      console.error(err);
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
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

      <Button type={"submit"} disabled={loading} className="w-full mt-2 py-2">
        {loading ? "লগইন হচ্ছে..." : "লগইন করুন"}
      </Button>
    </form>
  );
}
