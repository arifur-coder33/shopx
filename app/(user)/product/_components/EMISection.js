"use client";

import { useState } from "react";

// 👉 full bank sample
const emiData = [
  {
    name: "Standard Chartered Bank",
    rates: {
      3: 3.63,
      6: 5.82,
      9: 8.7,
      12: 11.73,
      18: 15.61,
      24: 21.21,
      36: 29.03,
    },
  },

  {
    name: "City Bank Limited",
    rates: {
      3: 3.09,
      6: 4.71,
      9: 6.95,
      12: 9.29,
      18: 12.99,
      24: 18.34,
      30: 19.76,
      36: 24.22,
    },
  },

  {
    name: "Eastern Bank Limited",
    rates: {
      3: 3.09,
      6: 4.71,
      9: 6.95,
      12: 9.29,
      18: 12.99,
      24: 18.34,
      30: 19.76,
      36: 24.22,
    },
  },

  {
    name: "BRAC Bank Limited",
    rates: {
      3: 3.09,
      6: 4.71,
      9: 6.95,
      12: 9.29,
      18: 12.99,
      24: 18.34,
    },
  },

  {
    name: "Dutch Bangla Bank Limited",
    rates: {
      3: 3.09,
      6: 4.71,
      9: 6.95,
      12: 9.29,
      18: 12.99,
      24: 18.34,
      36: 24.22,
    },
  },

  {
    name: "Mutual Trust Bank Limited",
    rates: {
      3: 3.09,
      6: 4.71,
      9: 6.95,
      12: 9.29,
      18: 12.99,
      24: 18.34,
      36: 24.22,
    },
  },

  {
    name: "Southeast Bank Limited",
    rates: {
      3: 3.09,
      6: 4.71,
      9: 6.95,
      12: 9.29,
      18: 12.99,
      24: 18.34,
      30: 19.76,
      36: 24.22,
    },
  },

  {
    name: "Standard Bank Limited",
    rates: {
      3: 3.09,
      6: 4.71,
      9: 6.95,
      12: 9.29,
      18: 12.99,
      24: 18.34,
    },
  },

  {
    name: "NCC Bank Limited",
    rates: {
      3: 3.09,
      6: 4.71,
      9: 6.95,
      12: 9.29,
      18: 12.99,
      24: 18.34,
      36: 24.22,
    },
  },

  {
    name: "NRB Bank Limited",
    rates: {
      3: 3.09,
      6: 4.71,
      9: 6.95,
      12: 9.29,
      18: 12.99,
      24: 18.34,
      36: 24.22,
    },
  },

  {
    name: "Meghna Bank Limited",
    rates: {
      3: 3.09,
      6: 4.71,
      9: 6.95,
      12: 9.29,
      18: 12.99,
      24: 18.34,
    },
  },

  {
    name: "Jamuna Bank Limited",
    rates: {
      3: 3.09,
      6: 4.71,
      9: 6.95,
      12: 9.29,
      18: 12.99,
      24: 18.34,
      36: 24.22,
    },
  },

  {
    name: "Midland Bank Limited",
    rates: {
      3: 3.09,
      6: 4.71,
      9: 6.95,
      12: 9.29,
      18: 12.99,
      24: 18.34,
    },
  },

  {
    name: "Bank Asia Limited",
    rates: {
      3: 3.09,
      6: 4.71,
      9: 6.95,
      12: 9.29,
    },
  },

  {
    name: "Dhaka Bank Limited",
    rates: {
      3: 3.09,
      6: 4.71,
      9: 6.95,
      12: 9.29,
    },
  },

  {
    name: "SBAC Bank",
    rates: {
      3: 3.09,
      6: 4.71,
      9: 6.95,
      12: 9.29,
      18: 12.99,
      24: 18.34,
    },
  },

  {
    name: "LankaBangla Financial Limited",
    rates: {
      3: 3.09,
      6: 4.71,
      9: 6.95,
      12: 9.29,
      18: 12.99,
      24: 18.34,
    },
  },

  {
    name: "NRB Commercial Bank",
    rates: {
      3: 3.09,
      6: 4.71,
      9: 6.95,
      12: 9.29,
      18: 12.99,
      24: 18.34,
    },
  },

  {
    name: "Shahjalal Islami Bank Limited (SJIBL)",
    rates: {
      3: 3.09,
      6: 4.71,
      9: 6.95,
      12: 9.29,
    },
  },

  {
    name: "United Commercial Bank (UCB)",
    rates: {
      3: 3.09,
      6: 4.71,
      9: 6.95,
      12: 9.29,
      24: 18.34,
    },
  },

  {
    name: "Exim Bank",
    rates: {
      3: 3.09,
      6: 4.71,
      9: 6.95,
      12: 9.29,
      18: 12.99,
      24: 18.34,
    },
  },

  {
    name: "Prime Bank Limited",
    rates: {
      3: 3.09,
      6: 4.71,
      9: 6.95,
      12: 9.29,
      18: 12.99,
      24: 18.34,
    },
  },

  {
    name: "Al-Arafah Islami Bank Limited",
    rates: {
      3: 3.09,
      6: 4.71,
      9: 6.95,
      12: 9.29,
    },
  },

  {
    name: "Community Bank Bangladesh Limited",
    rates: {
      3: 3.09,
      6: 4.71,
      9: 6.95,
      12: 9.29,
      18: 12.99,
      24: 18.34,
      36: 24.22,
    },
  },

  {
    name: "One Bank Limited",
    rates: {
      3: 3.09,
      6: 4.71,
      9: 6.95,
      12: 9.29,
    },
  },

  {
    name: "Trust Bank Limited",
    rates: {
      3: 3.09,
      6: 4.71,
      9: 6.95,
      12: 9.29,
      18: 12.99,
      24: 18.34,
      36: 24.22,
    },
  },

  {
    name: "Mercantile Bank Limited",
    rates: {
      3: 3.09,
      6: 4.71,
      9: 6.95,
      12: 9.29,
      18: 12.99,
      24: 18.34,
      30: 19.76,
      36: 24.22,
    },
  },

  {
    name: "Premier Bank",
    rates: {
      3: 3.09,
      6: 4.71,
      9: 6.95,
      12: 9.29,
    },
  },

  {
    name: "AB Bank Limited",
    rates: {
      3: 4.16,
      6: 6.38,
      9: 7.52,
      12: 8.69,
    },
  },
];

export default function EMISection({ price = 132000 }) {
  const [open, setOpen] = useState(false);
  const [selectedBank, setSelectedBank] = useState(emiData[0]);
  const [amount, setAmount] = useState(price);

  const calculate = (tenure, rate) => {
    const total = amount + (amount * rate) / 100;
    const monthly = total / tenure;
    return { total, monthly };
  };

  const preview = calculate(6, selectedBank.rates[6] || 5);

  return (
    <>
      {/* EMI SUMMARY BAR */}
      <div className="flex items-center justify-between bg-orange-50 p-3 rounded-xl mt-4 shadow-sm">
        <div>
          <p className="text-xs text-gray-600">
            💳 EMI সুবিধা (Installment Available)
          </p>

          <div className="flex items-end gap-2 mt-1">
            <p className="text-sm text-gray-500">EMI</p>
            <p className="text-xl font-bold text-indigo-600">
              ৳ {preview.monthly.toFixed(0)}
            </p>
            <span className="text-xs text-gray-400 mb-1">/month</span>
          </div>

          <p className="text-[11px] text-gray-500 mt-1">
            *Bank card EMI applicable
          </p>
        </div>

        <button
          onClick={() => setOpen(true)}
          className="text-blue-600 text-sm font-medium underline"
        >
          Check Plan
        </button>
      </div>

      {/* MODAL */}
      {open && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white w-full max-w-5xl rounded-2xl overflow-hidden max-h-[90vh] flex flex-col">
            {/* HEADER */}
            <div className="flex justify-between items-center p-4 border-b">
              <h2 className="text-lg font-semibold">EMI Options</h2>
              <button onClick={() => setOpen(false)} className="text-xl">
                ✕
              </button>
            </div>

            {/* BODY */}
            <div className="flex flex-1 overflow-hidden">
              {/* LEFT BANK LIST */}
              <div className="w-1/3 border-r overflow-y-auto p-3 space-y-2">
                {emiData.map((bank) => (
                  <div
                    key={bank.name}
                    onClick={() => setSelectedBank(bank)}
                    className={`p-3 rounded-xl cursor-pointer border flex items-center gap-3 transition ${
                      selectedBank.name === bank.name
                        ? "border-indigo-500 bg-indigo-50"
                        : "hover:bg-gray-100"
                    }`}
                  >
                    <div className="w-8 h-8 rounded-full bg-indigo-500 text-white flex items-center justify-center text-sm">
                      {bank.name[0]}
                    </div>
                    <p className="text-sm">{bank.name}</p>
                  </div>
                ))}
              </div>

              {/* RIGHT CONTENT */}
              <div className="flex-1 p-4 overflow-y-auto">
                {/* AMOUNT INPUT */}
                <div className="mb-4">
                  <p className="text-sm text-gray-500 mb-1">Enter Amount</p>
                  <input
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(Number(e.target.value))}
                    className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-400"
                  />
                </div>

                {/* TABLE */}
                <div className="border rounded-lg overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-100">
                      <tr>
                        <th className="p-2 text-left">Plan</th>
                        <th className="p-2 text-left">Monthly</th>
                        <th className="p-2 text-left">Charge</th>
                        <th className="p-2 text-left">Total</th>
                      </tr>
                    </thead>

                    <tbody>
                      {Object.entries(selectedBank.rates).map(
                        ([month, rate]) => {
                          const { total, monthly } = calculate(
                            Number(month),
                            rate,
                          );

                          return (
                            <tr
                              key={month}
                              className="border-t hover:bg-gray-50"
                            >
                              <td className="p-2 font-medium">
                                {month} months
                              </td>
                              <td className="p-2">৳ {monthly.toFixed(0)}</td>
                              <td className="p-2">{rate}%</td>
                              <td className="p-2">৳ {total.toFixed(0)}</td>
                            </tr>
                          );
                        },
                      )}
                    </tbody>
                  </table>
                </div>

                {/* NOTE */}
                <p className="text-xs text-center text-gray-500 mt-4">
                  EMI সুবিধা ব্যাংক/কার্ড কোম্পানির মাধ্যমে পরিচালিত হয়। আমরা
                  কোনো অতিরিক্ত সুদ নেই না।
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
