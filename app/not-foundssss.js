// app/not-found.js

import NotFoundImage from "@/public/images/404-image.svg"; // Place your SVG in the public folder
import { Link } from "lucide-react";
import Image from "next/image";
import { Suspense } from "react";

function NotFoundContent() {
  return (
    <div className="flex flex-col justify-center items-center min-h-screen bg-slate-900 text-white">
      <div className="mb-4">
        <Image
          src={NotFoundImage}
          alt="404 - Page Not Found"
          width={400} // You can adjust the width as needed
          height={400} // Adjust the height as needed
        />
      </div>
      <h1 className="text-6xl font-bold mb-4">404 - Page Not Found</h1>

      <Link href="/" className="text-blue-500 underline">
        Go back to Home
      </Link>
    </div>
  );
}
export default function NotFound() {
  return (
    <Suspense fallback={<div className="text-white">Loading...</div>}>
      <NotFoundContent />
    </Suspense>
  );
}
