"use client";

import Button from "@/components/button";
import { useState } from "react";
import { EmailFlow } from "./_components/EmailFlow";
import { PhoneFlow } from "./_components/PhoneFlow";

export default function ForgotPassword() {
  const [method, setMethod] = useState(null);

  return (
    <div className="max-w-md mx-auto p-6 border rounded-xl">
      <h2 className="text-xl font-semibold text-center mb-4 text-white">
        Forgot Password
      </h2>

      {!method && (
        <div className="flex gap-4 flex-col">
          <Button onClick={() => setMethod("email")} className="w-full ">
            Reset by Email
          </Button>

          <button
            onClick={() => setMethod("phone")}
            className="w-full bg-green-500 text-white py-2 rounded"
          >
            Reset by Phone
          </button>
        </div>
      )}

      {method === "email" && <EmailFlow />}
      {method === "phone" && <PhoneFlow />}
    </div>
  );
}
