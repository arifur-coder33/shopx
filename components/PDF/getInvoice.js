"use client";

import { generateInvoiceAction } from "@/backend/serverActions/pdfAction";
import { FileText } from "lucide-react";
import { useState } from "react";

export default function InvoiceButton({ orderData, actionType }) {
  const [isLoading, setIsLoading] = useState(false);
  // Base64 থেকে Blob এ কনভার্ট করার হেল্পার ফাংশন
  const base64ToBlob = (base64, type = "application/pdf") => {
    const binStr = atob(base64);
    const len = binStr.length;
    const arr = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      arr[i] = binStr.charCodeAt(i);
    }
    return new Blob([arr], { type: type });
  };
  const handleDownloadAPI = async () => {
    if (actionType === "view" && orderData?.orderNo && orderData?.phoneNumber) {
      const params = new URLSearchParams({ o: String(orderData.orderNo), p: String(orderData.phoneNumber) });
      window.open(`/api/pdf/invoice?${params.toString()}`, "_blank", "noopener,noreferrer");
      return;
    }
    try {
      setIsLoading(true);

      // ১. API রাউটে রিকোয়েস্ট পাঠানো
      const response = await fetch("/api/pdf/invoice", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ orderData }),
      });

      if (!response.ok) {
        throw new Error("Failed to generate PDF");
      }

      // ২. রেসপন্স থেকে Blob তৈরি করা
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);

      // ৩. লজিক আলাদা করা
      if (actionType === "view") {
        // শুধুমাত্র নতুন ট্যাবে ওপেন হবে
        window.open(url, "_blank");
      } else if (actionType === "print") {
        const printWindow = window.open(url, "_blank");

        if (printWindow) {
          printWindow.onload = () => {
            printWindow.focus();
            printWindow.print();
          };
        }
      } else {
        // শুধুমাত্র ডাউনলোড হবে
        const a = document.createElement("a");
        a.href = url;
        a.download = `Invoice-${orderData.orderNo}.pdf`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      }

      // ৪. ক্লিনআপ (একটু সময় নিয়ে করা ভালো যাতে ব্রাউজার লোড করতে পারে)
      setTimeout(() => window.URL.revokeObjectURL(url), 100);
    } catch (error) {
      console.error("Error downloading invoice:", error);
      alert("Something went wrong while generating the PDF.");
    } finally {
      setIsLoading(false);
    }
  };
  const handleDownload = async () => {
    try {
      setIsLoading(true);

      // ১. সার্ভার অ্যাকশন কল
      const response = await generateInvoiceAction(orderData);

      if (!response.success) {
        throw new Error(response.error || "Failed to fetch PDF data");
      }

      // ২. Base64 স্ট্রিং চেক করা
      const base64String = response.data;
      if (!base64String) {
        throw new Error("No PDF data received");
      }

      // ৩. ⭐ ফিক্স: Fetch API ব্যবহার করে Blob তৈরি (atob এর ঝামেলা নেই)
      // এটি অটোমেটিক্যালি সঠিক এনকোডিং হ্যান্ডেল করে
      const blob = await fetch(
        `data:application/pdf;base64,${base64String}`,
      ).then((res) => res.blob());

      const url = window.URL.createObjectURL(blob);

      // ৪. ভিউ অথবা ডাউনলোড
      if (actionType === "view") {
        window.open(url, "_blank");
      } else {
        const a = document.createElement("a");
        a.href = url;
        a.download = `Invoice-${orderData.orderNo}.pdf`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      }

      // ক্লিনআপ
      setTimeout(() => window.URL.revokeObjectURL(url), 100);
    } catch (error) {
      console.error("Error:", error);
      alert("PDF জেনারেট করতে সমস্যা হয়েছে: " + error.message);
    } finally {
      setIsLoading(false);
    }
  };
  return (
    // <button
    //   onClick={handleDownloadAPI}
    //   disabled={isLoading}
    //   className={`
    //     flex items-center gap-2 px-4 py-2 rounded text-white font-medium transition-all
    //     ${
    //       isLoading
    //         ? "bg-gray-400 cursor-not-allowed"
    //         : "bg-blue-600 hover:bg-blue-700"
    //     }
    //   `}
    // >
    //   {isLoading ? (
    //     <>
    //       <svg
    //         className="animate-spin h-5 w-5 text-white"
    //         xmlns="http://www.w3.org/2000/svg"
    //         fill="none"
    //         viewBox="0 0 24 24"
    //       >
    //         <circle
    //           className="opacity-25"
    //           cx="12"
    //           cy="12"
    //           r="10"
    //           stroke="currentColor"
    //           strokeWidth="4"
    //         ></circle>
    //         <path
    //           className="opacity-75"
    //           fill="currentColor"
    //           d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
    //         ></path>
    //       </svg>
    //       Generating...
    //     </>
    //   ) : (
    //     <>

    //       <svg
    //         className="w-5 h-5"
    //         fill="none"
    //         stroke="currentColor"
    //         viewBox="0 0 24 24"
    //       >
    //         {actionType === "view" ? (
    //           // View Icon (Eye)
    //           <path
    //             strokeLinecap="round"
    //             strokeLinejoin="round"
    //             strokeWidth="2"
    //             d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
    //           />
    //         ) : (
    //           // Download Icon
    //           <path
    //             strokeLinecap="round"
    //             strokeLinejoin="round"
    //             strokeWidth="2"
    //             d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
    //           />
    //         )}

    //         {/* View Icon এর বাইরের অংশ (যদি View মোড হয়) */}
    //         {actionType === "view" && (
    //           <path
    //             strokeLinecap="round"
    //             strokeLinejoin="round"
    //             strokeWidth="2"
    //             d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
    //           />
    //         )}
    //       </svg>
    //       {actionType === "view" ? "View Invoice" : "Download Invoice"}
    //     </>
    //   )}
    // </button>

    <button
      onClick={handleDownloadAPI}
      disabled={isLoading}
      className="flex items-center justify-center gap-2 w-full py-2.5 bg-gray-900 text-white rounded-xl hover:bg-gray-800 transition text-sm font-medium"
    >
      {isLoading && <>Loading....</>}
      {!isLoading && (
        <>
          <FileText size={16} />{" "}
          {actionType === "view"
            ? "View Invoice"
            : actionType === "print"
              ? "Print Invoice"
              : "Download Invoice"}{" "}
        </>
      )}
    </button>
  );
}
