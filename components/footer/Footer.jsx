import { getSiteSetting } from "@/backend/serverActions/siteSettingAction";
import { Mail, MapPin, MessageCircleMore, PhoneCall } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

export default async function Footer() {
  const { data } = await getSiteSetting();

  return (
    <footer className="bg-slate-950 text-slate-300 mt-10 border-t border-slate-800">
      {/* Top Section */}
      <div className="max-w-7xl mx-auto px-4 py-10 grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Brand */}
        <div>
          <h2 className="text-2xl font-semibold text-white mb-3">BDMart24</h2>
          <p className="text-sm leading-relaxed">
            আপনার বিশ্বস্ত অনলাইন শপ — মেশিনারি ও ফ্যাশন পণ্যের জন্য একটি
            নির্ভরযোগ্য প্ল্যাটফর্ম।
          </p>
        </div>

        {/* Contact */}
        <div>
          <h3 className="text-lg text-white mb-3">যোগাযোগ</h3>
          <div className="space-y-2 text-sm">
            <p className="flex items-center gap-2">
              <PhoneCall size={16} /> {data?.phoneNumber1}
            </p>
            <p className="flex items-center gap-2">
              <MessageCircleMore size={16} /> WhatsApp: {data?.phoneNumber1}
            </p>
            <p className="flex items-center gap-2">
              <Mail size={16} /> support@bdmart24.com
            </p>
            <p className="flex items-center gap-2">
              <MapPin size={16} /> Bangladesh
            </p>
            <p className="flex items-center gap-2">
              Facebook
              <Link
                href={data?.facebook || "#"}
                target="_blank"
                className="hover:text-white transition"
              >
                ShopX
              </Link>
            </p>
          </div>
        </div>

        {/* Links */}
        <div>
          <h3 className="text-lg text-white mb-3">গুরুত্বপূর্ণ লিংক</h3>
          <ul className="space-y-2 text-sm">
            <li>
              <Link href="/" className="hover:text-white transition">
                হোম
              </Link>
            </li>
            <li>
              <Link href="/products" className="hover:text-white transition">
                প্রোডাক্ট
              </Link>
            </li>
            <li>
              <Link href="/contact" className="hover:text-white transition">
                যোগাযোগ
              </Link>
            </li>
            <li>
              <Link href="/privacy" className="hover:text-white transition">
                প্রাইভেসি পলিসি
              </Link>
            </li>
          </ul>
        </div>
      </div>

      {/* Payment Section */}
      <div className="border-t border-slate-800 py-6 px-4 text-center">
        <div className="w-full max-w-7xl mx-auto mb-3 ">
          <Image
            src="https://securepay.sslcommerz.com/public/image/SSLCommerz-Pay-With-logo-All-Size-01.png"
            alt="payment methods"
            width={800}
            height={200}
            className="w-full h-auto "
            loading="lazy"
          />
        </div>

        <p className="text-xs text-slate-500">
          © {new Date().getFullYear()} BDMart24 — সর্বস্বত্ব সংরক্ষিত
        </p>
      </div>
    </footer>
  );
}
