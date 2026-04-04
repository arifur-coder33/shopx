// The metadata from this layout will be merged with the RootLayout's metadata
export const metadata = {
  title: process.env.NEXT_SHOP_NAME + " - My Account",
  description:
    "My Account - View and manage your account details, orders, and preferences.",
  // No need to preconnect again, but it doesn't hurt
};

// app/account/layout.js
import Link from "next/link";

export default function AccountLayout({ children }) {
  return (
    <div className="theam min-h-screen flex">
      {/* Sidebar (Desktop only) */}
      <aside className="hidden md:flex flex-col w-64 border-r border-slate-200 dark:border-slate-700 p-4 space-y-4">
        <h2 className="text-2xl font-bold text-purple">My Account</h2>

        <nav className="flex flex-col gap-3">
          <Link prefetch={true} href="/my-account/orders" className="nav-hover">
            Orders
          </Link>
          <Link
            prefetch={true}
            href="/my-account/address"
            className="nav-hover"
          >
            Address
          </Link>
          <Link
            prefetch={true}
            href="/my-account/settings"
            className="nav-hover"
          >
            Settings
          </Link>
        </nav>
      </aside>

      {/* Content */}
      <main className="flex-1 p-3 md:p-6">{children}</main>
    </div>
  );
}
