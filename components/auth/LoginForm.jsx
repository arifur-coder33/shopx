// "use client";
// import { signIn, useSession } from "next-auth/react";
// import { useRouter, useSearchParams } from "next/navigation";
// import { useEffect, useState } from "react";
// import Button from "../button";
// import DefaultInput from "../input/DefaultInput";
// export default function LoginForm() {
//   const searchParams = useSearchParams();
//   const callbackUrl = searchParams.get("callbackUrl") || "/";
//   const router = useRouter();
//   const [error, setError] = useState("");
//   const [loading, setLoading] = useState(false);
//   const [loggedIn, setLoggedIn] = useState(false);
//   const { data: session } = useSession();
//   useEffect(() => {
//     if (loggedIn || session) {
//       if (callbackUrl) {
//         console.log("Redirecting to:", callbackUrl);
//         router.push(callbackUrl);
//       } else {
//         router.push("/");
//       }
//     }
//   }, [loggedIn, callbackUrl, router, session]);

//   async function HandleSubmit(e) {
//     e.preventDefault();
//     const form = e.target;
//     const formData = new FormData(form);

//     setError("");
//     setLoading(true);

//     try {
//       const email = formData.get("email");
//       const password = formData.get("password");

//       const result = await signIn("credentials", {
//         redirect: false,
//         email,
//         password,
//       });
//       console.log(result);

//       if (result?.error === undefined) {
//         setLoggedIn(true);
//         // if (callbackUrl) {
//         //   console.log("Redirecting to:", callbackUrl);
//         //   router.push(callbackUrl);
//         // } else {
//         //   router.push("callback /", callbackUrl);
//         //   router.push("/");
//         // }
//       } else if (result?.error === "CredentialsSignin") {
//         console.log(result.error);
//         setLoggedIn(false);
//         setError("Invalid email or password. Please try again.");
//       }
//     } catch (err) {
//       console.error(err);
//       setError("Something went wrong. Please try again.");
//     } finally {
//       setLoading(false);
//     }
//   }

//   return (
//     <form className="mt-6" onSubmit={HandleSubmit}>
//       <h1 className="text-white font-bold text-center text-2xl">Login </h1>
//       {error && (
//         <div className="w-full rounded-md bg-red-200 p-2 text-base text-red-600 overflow-hidden">
//           {error}
//         </div>
//       )}

//       <DefaultInput
//         name="email"
//         label="ইমেইলঃ"
//         placeholder="আপনার ইমেইল দিন।"
//         required
//         type="email"
//       />

//       <DefaultInput
//         name="password"
//         label="পাসওয়ার্ডঃ"
//         placeholder="আপনার পাসওয়ার্ড দিন।"
//         required
//         type="password"
//       />

//       <Button type={"submit"} disabled={loading} className="w-full mt-2 py-2">
//         {loading ? "লগইন হচ্ছে..." : "লগইন করুন"}
//       </Button>
//     </form>
//   );
// }
"use client";

import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import Button from "../button";
import DefaultInput from "../input/DefaultInput";

export default function LoginForm({ googleEnabled = false, facebookEnabled = false }) {
  const searchParams = useSearchParams();
  const router = useRouter();

  const callbackUrl = decodeURIComponent(
    searchParams.get("callbackUrl") || "/",
  );

  const [error, setError] = useState(
    searchParams.get("error") === "OAuthAccountNotLinked"
      ? "এই ইমেইলে আগে থেকেই account আছে। আপনার account-এর সাথে মিলে এমন Google/Facebook account দিয়ে চেষ্টা করুন, অথবা আগের login পদ্ধতি ব্যবহার করুন।"
      : "",
  );
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [facebookLoading, setFacebookLoading] = useState(false);

  async function handleGoogleSignIn() {
    if (!googleEnabled || googleLoading) return;
    setError("");
    setGoogleLoading(true);
    try {
      await signIn("google", { callbackUrl });
    } catch {
      setError("Google দিয়ে লগইন করা যায়নি। আবার চেষ্টা করুন।");
      setGoogleLoading(false);
    }
  }

  async function handleFacebookSignIn() {
    if (!facebookEnabled || facebookLoading) return;
    setError("");
    setFacebookLoading(true);
    try {
      await signIn("facebook", { callbackUrl });
    } catch {
      setError("Facebook দিয়ে লগইন করা যায়নি। আবার চেষ্টা করুন।");
      setFacebookLoading(false);
    }
  }

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

      if (!result?.error) {
        // ✅ MOST reliable redirect (mobile safe)
        window.location.href = callbackUrl || "/";
      } else {
        setError("Invalid email or password. Please try again.");
      }
    } catch (err) {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form className="mt-6" onSubmit={HandleSubmit}>
      <h1 className="text-white font-bold text-center text-2xl">Login</h1>

      {error && (
        <div className="w-full rounded-md bg-red-200 p-2 text-base text-red-600">
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

      <Button type="submit" disabled={loading} className="w-full mt-2 py-2">
        {loading ? "লগইন হচ্ছে..." : "লগইন করুন"}
      </Button>

      {(googleEnabled || facebookEnabled) && <div className="my-4 flex items-center gap-3 text-xs text-white/60">
        <span className="h-px flex-1 bg-white/20" />
        <span>অথবা</span>
        <span className="h-px flex-1 bg-white/20" />
      </div>}
      {googleEnabled && <button
        type="button"
        onClick={handleGoogleSignIn}
        disabled={googleLoading || loading}
        className="flex min-h-11 w-full whitespace-nowrap items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2 py-2.5 text-[13px] font-semibold text-slate-800 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60 sm:gap-2 sm:px-4 sm:text-sm"
      >
        <svg aria-hidden="true" viewBox="0 0 48 48" className="h-5 w-5 shrink-0">
          <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5Z" transform="translate(0 4)" />
          <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.74 7.18l7.62 5.91c4.45-4.11 7.16-10.16 7.16-17.56Z" />
          <path fill="#FBBC05" d="M10.53 28.59a14.4 14.4 0 0 1 0-9.18l-7.98-6.19a23.92 23.92 0 0 0 0 21.56l7.98-6.19Z" transform="translate(0 4)" />
          <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.9-5.8l-7.62-5.91c-2.12 1.42-4.83 2.26-8.28 2.26-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48Z" transform="translate(0 -4)" />
        </svg>
        {googleLoading ? "Google-এ যাচাই হচ্ছে..." : "Google দিয়ে লগইন করুন"}
      </button>}
      {facebookEnabled && <button
        type="button"
        onClick={handleFacebookSignIn}
        disabled={facebookLoading || loading}
        className="mt-2 flex min-h-11 w-full whitespace-nowrap items-center justify-center gap-2 rounded-lg border border-[#0866ff] bg-[#0866ff] px-3 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#075ce5] disabled:cursor-not-allowed disabled:opacity-60"
      >
        <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5 shrink-0 fill-current">
          <path d="M13.5 21v-8.2h2.76l.41-3.2H13.5V7.56c0-.93.26-1.56 1.6-1.56h1.7V3.14A22.7 22.7 0 0 0 14.32 3c-2.46 0-4.15 1.5-4.15 4.27V9.6H7.38v3.2h2.79V21h3.33Z" />
        </svg>
        {facebookLoading ? "Facebook-এ যাচাই হচ্ছে..." : "Facebook দিয়ে লগইন করুন"}
      </button>}
    </form>
  );
}
