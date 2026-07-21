// components/common/LoadingSpinner.jsx

import { Check, CreditCard, Smartphone } from "lucide-react";
const LoadingSpinner = ({ message = "Loading...", status = "loading" }) => {
  return (
    <div className="flex flex-col items-center justify-center min-h-[240px]  min-w-[240px]  p-6 bg-white rounded-xl shadow-lg hover:shadow-xl transition-shadow duration-300 ease-in-out border border-gray-100 max-w-md mx-auto my-8">
      {/* Spinner */}
      {status === "loading" && (
        <div className="relative flex items-center justify-center">
          <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-indigo-500"></div>
          {/* Optional: Add a subtle inner circle or icon for more visual interest */}
          <div className="absolute h-8 w-8 rounded-full bg-indigo-100 opacity-50"></div>
        </div>
      )}
      {/* Success */}
      {status === "success" && (
        <div className="flex items-center justify-center">
          <div className="h-20 w-20 rounded-full bg-green-100 flex items-center justify-center animate-pulse">
            <Check
              size={42}
              className="text-green-600 animate-[pop_.4s_ease-out]"
              strokeWidth={3}
            />
          </div>
        </div>
      )}

      {/* Redirecting */}
      {status === "redirecting" && (
        <div className="relative flex items-center justify-center gap-10 h-20 w-56">
          <div className="animate-bounce">
            <Smartphone size={46} className="text-indigo-600" />
          </div>

          <div className="absolute left-[42%] text-2xl animate-[moneyMove_1.5s_linear_infinite]">
            💸
          </div>

          <div className="animate-pulse">
            <CreditCard size={46} className="text-green-600" />
          </div>
        </div>
      )}

      {/* Message */}
      <p className="mt-8 text-xl font-semibold text-gray-800 tracking-wide text-center">
        {message}
      </p>

      {/* Optional: Add a subtle loading indicator below the text */}
      <div className="w-24 h-2 bg-gray-200 rounded-full mt-4 overflow-hidden">
        <div className="animate-pulse w-1/2 h-full bg-indigo-300 rounded-full"></div>
      </div>
    </div>
  );
};

export default LoadingSpinner;
