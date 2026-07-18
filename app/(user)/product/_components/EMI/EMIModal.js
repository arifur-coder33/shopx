"use client";

import { useState } from "react";

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

const sortedEmiData = [...emiData].sort((a, b) => a.name.localeCompare(b.name));

export default function EMIModal({ price, onClose }) {
  const [selectedBank, setSelectedBank] = useState(emiData[0]);
  const [amount, setAmount] = useState(price);

  const calculate = (tenure, rate) => {
    const total = amount + (amount * rate) / 100;
    const monthly = total / tenure;
    return { total, monthly };
  };

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-2">
      <div className="bg-white w-full max-w-4xl rounded-2xl overflow-hidden h-[90vh] flex flex-col">
        {/* HEADER */}
        <div className="flex justify-between items-center px-4 py-3 border-b bg-gray-50">
          <h2 className="text-lg font-semibold">EMI Options</h2>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-200"
          >
            ✕
          </button>
        </div>

        {/* BODY */}
        <div className="flex flex-1 overflow-hidden">
          {/* LEFT BANK LIST (SCROLLABLE) */}
          <div className="w-[220px] border-r overflow-y-auto p-2 space-y-2 bg-gray-50">
            {sortedEmiData.map((bank) => (
              <div
                key={bank.name}
                onClick={() => setSelectedBank(bank)}
                className={`flex items-center gap-2 p-2 rounded-lg cursor-pointer border ${
                  selectedBank.name === bank.name
                    ? "border-orange-400 bg-orange-50"
                    : "bg-white hover:bg-gray-100"
                }`}
              >
                {/* <div className="w-7 h-7 flex items-center justify-center rounded-full bg-red-500 text-white text-xs">
                  {bank.name[0]}
                </div> */}
                <p className="text-xs leading-tight">{bank.name}</p>
              </div>
            ))}
          </div>

          {/* RIGHT SIDE */}
          <div className="flex-1 flex flex-col">
            {/* AMOUNT INPUT */}
            <div className="p-3 border-b">
              <p className="text-xs text-gray-500 mb-1">Enter Amount</p>
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(Number(e.target.value))}
                className="w-full border rounded-lg px-3 py-2 text-sm"
              />
            </div>

            {/* TABLE (SCROLLABLE) */}
            <div className="flex-1 overflow-y-auto">
              <table className="w-full text-xs">
                <thead className="bg-gray-100 sticky top-0 z-10">
                  <tr>
                    <th className="p-2 text-left">Plan (Monthly)</th>
                    <th className="p-2 text-left">EMI</th>
                    <th className="p-2 text-left">Charge</th>
                    <th className="p-2 text-left">Effective Cost</th>
                  </tr>
                </thead>

                <tbody>
                  {Object.entries(selectedBank.rates).map(([month, rate]) => {
                    const { total, monthly } = calculate(Number(month), rate);

                    return (
                      <tr key={month} className="border-t hover:bg-gray-50">
                        <td className="p-2">{month}</td>

                        <td className="p-2">৳ {monthly.toFixed(2)}</td>

                        <td className="p-2">{rate}%</td>

                        <td className="p-2">৳ {total.toFixed(2)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* FOOTER NOTE */}
            <div className="p-2 text-[11px] text-gray-500 text-center border-t">
              EMI সুবিধা ক্রেডিট কার্ড কোম্পানির মাধ্যমে পরিচালিত হয়।
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
