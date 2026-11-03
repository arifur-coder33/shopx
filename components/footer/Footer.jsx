import { getPublicContactDetails } from "@/backend/services/contactDetailsService";
import { getPublicContentPage } from "@/backend/services/contentPageService";
import { getPublicSiteIdentity } from "@/backend/services/siteAppearanceService";
import { cloudinaryMainImage } from "@/utils/cloudinaryUrl";
import { Mail, MessageCircleMore, PhoneCall, Send } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import SocialBrandIcon from "@/components/content/SocialBrandIcon";
import prisma from "@/lib/prisma";

export default async function Footer() {
  const [contact, identity, footerContent] = await Promise.all([
    getPublicContactDetails(),
    getPublicSiteIdentity(),
    getPublicContentPage("footer"),
  ]);
  const whatsappDigits = contact.whatsappNumber.replace(/\D/g, "");
  const footerLogo = footerContent?.footerLogo?.name || identity.logo;
  const fallbackLogoDimensions = footerLogo && !footerContent?.footerLogo
    ? await prisma.media.findFirst({ where: { name: footerLogo }, select: { width: true, height: true } })
    : null;
  const logoWidth = footerContent?.footerLogo?.width || fallbackLogoDimensions?.width || 600;
  const logoHeight = footerContent?.footerLogo?.height || fallbackLogoDimensions?.height || 120;

  return (
    <footer className="bg-slate-950 text-slate-300 mt-10 border-t border-slate-800">
      {/* Top Section */}
      <div className="max-w-7xl mx-auto px-4 py-10 grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Brand */}
        <div className="min-w-0 w-full">
          {footerLogo && (
            <Image
              src={cloudinaryMainImage(footerLogo, 480)}
              width={logoWidth}
              height={logoHeight}
              alt={`${identity.name} logo`}
              unoptimized
              sizes="(max-width: 767px) 100vw, 33vw"
              style={{ height: `${identity.footerImageHeight}px`, width: "auto", maxWidth: "100%" }}
              className="mb-3 block object-contain"
            />
          )}
          <h2 className="text-2xl font-semibold text-white mb-3">
            {!footerLogo && identity.name}
          </h2>
          <p className="whitespace-pre-line text-sm leading-relaxed">
            {footerContent?.content || ""}
          </p>
        </div>

        {/* Contact */}
        <div>
          <h3 className="text-lg text-white mb-3">যোগাযোগ</h3>
          <div className="space-y-2 text-sm">
            {contact.phoneNumber && (
              <a
                href={`tel:${contact.phoneNumber.replace(/[^+\d]/g, "")}`}
                className="flex items-center gap-2 transition hover:text-white"
              >
                <PhoneCall size={16} /> {contact.phoneNumber}
              </a>
            )}
            {contact.whatsappNumber && (
              <a
                href={`https://wa.me/${whatsappDigits}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 transition hover:text-white"
              >
                <MessageCircleMore size={16} /> WhatsApp:{" "}
                {contact.whatsappNumber}
              </a>
            )}
            {contact.email && (
              <a
                href={`mailto:${contact.email}`}
                className="flex items-center gap-2 transition hover:text-white"
              >
                <Mail size={16} /> {contact.email}
              </a>
            )}
            {contact.facebookPage && (
              <a
                href={contact.facebookPage}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 transition hover:text-white"
              >
                <SocialBrandIcon brand="facebook" size={16} /> Facebook
              </a>
            )}
            {contact.instagram && (
              <a href={contact.instagram} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 transition hover:text-white">
                <SocialBrandIcon brand="instagram" size={16} /> Instagram
              </a>
            )}
            {contact.tiktok && (
              <a href={contact.tiktok} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 transition hover:text-white">
                <SocialBrandIcon brand="tiktok" size={16} /> TikTok
              </a>
            )}
            {contact.messenger && (
              <a
                href={contact.messenger}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 transition hover:text-white"
              >
                <Send size={16} /> Messenger
              </a>
            )}
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
            <li>
              <Link
                href="/return-policy"
                className="hover:text-white transition"
              >
                রিটার্ন পলিসি
              </Link>
            </li>
          </ul>
        </div>
      </div>

      {/* Payment Section */}
      <div className="border-t border-slate-800 py-6 px-4 text-center">
        <div className="mx-auto mb-4 w-full max-w-7xl">
          <picture className="block w-full">
            <source
              media="(max-width: 639px)"
              srcSet="/images/payments/sslcommerz-pay-with-384.webp"
            />
            <source
              media="(max-width: 1023px)"
              srcSet="/images/payments/sslcommerz-pay-with-768.webp"
            />
            <img
              src="/images/payments/sslcommerz-pay-with-1280.webp"
              alt="Pay securely with SSLCommerz supported payment methods"
              width="1280"
              height="143"
              loading="lazy"
              decoding="async"
              className="block h-auto w-full"
            />
          </picture>
        </div>

        <p className="text-xs text-slate-400">
          © {new Date().getFullYear()} {identity.name} — সর্বস্বত্ব সংরক্ষিত
        </p>
      </div>
    </footer>
  );
}
