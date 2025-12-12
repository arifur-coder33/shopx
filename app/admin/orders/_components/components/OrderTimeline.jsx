import { Check } from "lucide-react";

export default function OrderTimeline({ status }) {
  const steps = ["PENDING", "PROCESSING", "SHIPPED", "DELIVERED"];
  const currentIdx = steps.indexOf(status) === -1 ? 0 : steps.indexOf(status);

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
      <h3 className="font-semibold text-slate-800 mb-6">Order Status</h3>
      <div className="relative flex justify-between">
        {/* Progress Bar Background */}
        <div className="absolute top-1/2 left-0 w-full h-1 bg-slate-100 -translate-y-1/2 rounded-full -z-0"></div>
        {/* Active Progress Bar */}
        <div
          className="absolute top-1/2 left-0 h-1 bg-emerald-500 -translate-y-1/2 rounded-full -z-0 transition-all duration-500"
          style={{ width: `${(currentIdx / (steps.length - 1)) * 100}%` }}
        ></div>

        {steps.map((step, idx) => {
          const isCompleted = idx <= currentIdx;
          return (
            <div
              key={step}
              className="relative z-10 flex flex-col items-center group"
            >
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center border-2 transition-all duration-300 ${
                  isCompleted
                    ? "bg-emerald-500 border-emerald-500 text-white shadow-md"
                    : "bg-white border-slate-200 text-slate-300"
                }`}
              >
                {isCompleted ? (
                  <Check size={14} strokeWidth={3} />
                ) : (
                  <span className="text-xs font-medium">{idx + 1}</span>
                )}
              </div>
              <span
                className={`absolute top-10 text-[10px] font-bold uppercase tracking-wider ${
                  isCompleted ? "text-emerald-600" : "text-slate-400"
                }`}
              >
                {step}
              </span>
            </div>
          );
        })}
      </div>
      {/* Spacer for labels */}
      <div className="h-4"></div>
    </div>
  );
}
