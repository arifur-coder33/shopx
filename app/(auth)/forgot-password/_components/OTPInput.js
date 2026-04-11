"use client";

import { useRef } from "react";

export default function OTPInput({ value, onChange }) {
  const inputs = useRef([]);

  const handleChange = (e, index) => {
    const val = e.target.value;

    if (!/^[0-9]?$/.test(val)) return;

    const newOtp = value.split("");
    newOtp[index] = val;
    const finalOtp = newOtp.join("");

    onChange(finalOtp);

    // 🔥 auto move next
    if (val && index < 3) {
      inputs.current[index + 1].focus();
    }
  };

  return (
    <div className="flex gap-2 justify-center">
      {[0, 1, 2, 3].map((i) => (
        <input
          key={i}
          maxLength={1}
          ref={(el) => (inputs.current[i] = el)}
          className="w-12 h-12 text-center border rounded text-xl"
          onChange={(e) => handleChange(e, i)}
        />
      ))}
    </div>
  );
}
