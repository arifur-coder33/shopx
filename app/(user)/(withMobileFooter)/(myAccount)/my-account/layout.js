// app/account/layout.js
import { auth } from "@/auth";
import NavItem2 from "@/components/nav/NavItem2";
import { MapPin, Package, Star, User } from "lucide-react";

export default async function AccountLayout({ children }) {
  const session = await auth();

  const user = {
    name: session?.user?.name || "User",
    image:
      session?.user?.image ||
      "https://ui-avatars.com/api/?name=User&background=7c3aed&color=fff",
  };

  const navLinks = [
    {
      name: "Profile",
      href: "/my-account",
      icon: <User size={18} />,
    },
    {
      name: "My Orders",
      href: "/my-account/orders",
      icon: <Package size={18} />,
    },
    {
      name: "Manage Address",
      href: "/my-account/address",
      icon: <MapPin size={18} />,
    },
    {
      name: "My Reviews",
      href: "/my-account/review",
      icon: <Star size={18} />,
    },
  ];

  return (
    <div className="theam min-h-screen flex flex-col">
      <div className="flex flex-1">
        {/* 🔹 Desktop Sidebar */}
        <aside className="hidden md:flex flex-col w-64 border-r border-slate-200 dark:border-slate-700 p-4 gap-2">
          {navLinks.map((link) => {
            const active = false;

            return (
              <div key={link.href}>
                <NavItem2 href={link.href}>
                  {link.icon}
                  <span>{link.name}</span>
                </NavItem2>
              </div>
            );
          })}
        </aside>

        {/* 🔹 Main Content */}
        <main className="flex-1 p-3 md:p-6">
          {/* 🔥 User Card */}
          <div className="p-4 border-b border-slate-200 dark:border-slate-700">
            <div className="flex items-center gap-4 bg-gradient-to-r from-purple-500 to-indigo-500 text-white p-4 rounded-2xl shadow">
              {/* <ImageCustomServer
                w={50}
                h={50}
                src={user.image}
                alt="Avatar"
                className="w-16 h-16 rounded-full object-cover border-2 border-white"
              /> */}
              <div>
                <h2 className="text-lg md:text-xl font-semibold">
                  {user.name}
                </h2>
                <p className="text-sm opacity-80">Welcome back 👋</p>
              </div>
            </div>
          </div>

          {/* 🔥 Mobile Card Nav */}
          <div className="grid grid-cols-2 gap-3 mb-4 md:hidden">
            {navLinks.map((link) => (
              <NavItem2 mobile key={link.href} href={link.href}>
                {link.icon}
                <span>{link.name}</span>
              </NavItem2>
            ))}
          </div>

          {children}
        </main>
      </div>
    </div>
  );
}
