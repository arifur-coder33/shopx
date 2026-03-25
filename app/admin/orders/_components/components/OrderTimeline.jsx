import {
  AlertTriangle,
  Check,
  Clock,
  DollarSign,
  Package,
  RefreshCcw,
  RotateCcw,
  Truck,
  XCircle,
} from "lucide-react";

export default function OrderTimeline({ status }) {
  const baseSteps = [
    "PENDING",
    "PROCESSING",
    "READY_TO_SHIP",
    "SHIPPED",
    "DELIVERED",
  ];

  let steps = [...baseSteps];

  if (status === "CANCELLED") {
    steps = ["PENDING", "CANCELLED"];
  }

  if (status === "DELIVERY_FAILED") {
    steps = [...baseSteps.slice(0, 4), "DELIVERY_FAILED"];
  }

  if (["RETURNING", "RETURNED", "REFUNDING", "REFUNDED"].includes(status)) {
    steps = [...baseSteps, "RETURNING", "RETURNED", "REFUNDING", "REFUNDED"];
  }

  const currentIdx = steps.indexOf(status);

  const icons = {
    PENDING: Clock,
    PROCESSING: Package,
    READY_TO_SHIP: Package,
    SHIPPED: Truck,
    DELIVERED: Check,

    CANCELLED: XCircle,
    DELIVERY_FAILED: AlertTriangle,

    RETURNING: RotateCcw,
    RETURNED: RotateCcw,

    REFUNDING: RefreshCcw,
    REFUNDED: DollarSign,
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
      <h3 className="font-semibold text-slate-800 mb-6">Order Status</h3>

      <div className="relative">
        {/* line */}
        <div className="absolute left-4 top-0 bottom-0 w-[2px] bg-slate-200 md:hidden"></div>

        {/* desktop line */}
        <div className="hidden md:block absolute top-4 left-0 w-full h-[2px] bg-slate-200"></div>

        <div className="space-y-6 md:space-y-0 md:flex md:justify-between">
          {steps.map((step, idx) => {
            const isCompleted = idx <= currentIdx;
            const Icon = icons[step] || Package;

            return (
              <div
                key={step}
                className="relative flex items-center md:flex-col md:items-center"
              >
                {/* icon */}
                <div
                  className={`z-10 w-8 h-8 flex items-center justify-center rounded-full border-2 
                  ${
                    isCompleted
                      ? "bg-emerald-500 border-emerald-500 text-white"
                      : "bg-white border-slate-300 text-slate-400"
                  }`}
                >
                  <Icon size={16} />
                </div>

                {/* label */}
                <span
                  className={`ml-4 md:ml-0 md:mt-2 text-xs font-semibold uppercase
                  ${isCompleted ? "text-emerald-600" : "text-slate-400"}`}
                >
                  {step.replace("_", " ")}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
