// src/components/common/ClientNavActions.js

import dynamic from "next/dynamic";

// This is a placeholder that looks like your final icons.
// Make it match the size and layout of your NavActions component.
const NavActionsSkeleton = () => (
  <div className="flex flex-row justify-end gap-1 items-center p-2">
    {/* Placeholder for Login Icon */}
    <div className="nav-hover h-6 w-6 rounded-md bg-slate-300 dark:bg-slate-700 animate-pulse" />
    {/* Placeholder for Logout Icon */}
    <div className="nav-hover h-6 w-6 rounded-md bg-slate-300 dark:bg-slate-700 animate-pulse" />
    {/* Placeholder for Cart Icon */}
    <div className="nav-hover h-6 w-6 rounded-md bg-slate-300 dark:bg-slate-700 animate-pulse" />
    {/* Placeholder for Theme Icon */}
    <div className="nav-hover h-6 w-6 rounded-md bg-slate-300 dark:bg-slate-700 animate-pulse" />
  </div>
);

// The key is here: ssr: false.
// This tells Next.js: "Do not render NavActions on the server.
// Instead, render its 'loading' component (our skeleton)."
const DynamicNavActions = dynamic(
  () => import("./NavActions"), // Import the REAL NavActions component
  {
    ssr: false, // This is the crucial part
    loading: () => <NavActionsSkeleton />,
  }
);

// This component is the new "gatekeeper".
export default function ClientNavActions() {
  return <DynamicNavActions />;
}
