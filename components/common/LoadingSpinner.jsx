// components/common/LoadingSpinner.jsx

const LoadingSpinner = ({ message = "Loading..." }) => {
  return (
    <div className="flex flex-col items-center justify-center min-h-[240px]  min-w-[240px]  p-6 bg-white rounded-xl shadow-lg hover:shadow-xl transition-shadow duration-300 ease-in-out border border-gray-100 max-w-md mx-auto my-8">
      {/* Spinner */}
      <div className="relative flex items-center justify-center">
        <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-indigo-500"></div>
        {/* Optional: Add a subtle inner circle or icon for more visual interest */}
        <div className="absolute h-8 w-8 rounded-full bg-indigo-100 opacity-50"></div>
      </div>

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
