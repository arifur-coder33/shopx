import { getPublicContactDetails } from "@/backend/services/contactDetailsService";
import { getPublicContentPage } from "@/backend/services/contentPageService";
import Breadcrumb from "@/components/common/Breadcrumb";
import SocialBrandIcon from "@/components/content/SocialBrandIcon";
import { Mail, MessageCircle, Phone, Send } from "lucide-react";
import { notFound } from "next/navigation";

export async function contentPageMetadata(slug) {
  const page = await getPublicContentPage(slug);
  if (!page) return {};
  return {
    title: page.metaTitle || page.title,
    description: page.metaDescription || undefined,
  };
}

export default async function ContentPageView({ slug }) {
  const [page, contact] = await Promise.all([
    getPublicContentPage(slug),
    slug === "contact" ? getPublicContactDetails() : Promise.resolve(null),
  ]);
  if (!page) notFound();

  const whatsappDigits = contact?.whatsappNumber?.replace(/\D/g, "");
  const contactItems =
    slug === "contact"
      ? [
          contact?.phoneNumber && {
            label: "ফোন",
            value: contact.phoneNumber,
            href: `tel:${contact.phoneNumber.replace(/[^+\d]/g, "")}`,
            icon: Phone,
          },
          contact?.whatsappNumber && {
            label: "WhatsApp",
            value: contact.whatsappNumber,
            href: `https://wa.me/${whatsappDigits}`,
            icon: MessageCircle,
          },
          contact?.email && {
            label: "ইমেইল",
            value: contact.email,
            href: `mailto:${contact.email}`,
            icon: Mail,
          },
          contact?.facebookPage && {
            label: "Facebook",
            value: "Facebook পেজ দেখুন",
            href: contact.facebookPage,
            brand: "facebook",
            external: true,
          },
          contact?.instagram && {
            label: "Instagram",
            value: "Instagram প্রোফাইল দেখুন",
            href: contact.instagram,
            brand: "instagram",
            external: true,
          },
          contact?.tiktok && {
            label: "TikTok",
            value: "TikTok প্রোফাইল দেখুন",
            href: contact.tiktok,
            brand: "tiktok",
            external: true,
          },
          contact?.messenger && {
            label: "Messenger",
            value: "Messenger-এ কথা বলুন",
            href: contact.messenger,
            icon: Send,
            external: true,
          },
        ].filter(Boolean)
      : [];

  return (
    <div className="pb-8">
      <Breadcrumb items={[{ label: page.title }]} className="mb-3" />
      <article className="mx-auto max-w-5xl overflow-hidden rounded-2xl border border-border bg-surface shadow-sm">
        <header className="border-b border-border bg-gradient-to-br from-primary-soft to-surface p-5 sm:p-8">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-primary">
            Information
          </p>
          <h1 className="mt-2 text-2xl font-black text-text sm:text-4xl">
            {page.title}
          </h1>
        </header>
        {contactItems.length > 0 && (
          <div className="grid gap-3 border-b border-border p-5 sm:grid-cols-2 sm:p-8 lg:grid-cols-3">
            {contactItems.map(
              ({ label, value, href, icon: Icon, brand, external }) => (
                <a
                  key={label}
                  href={href}
                  {...(external && {
                    target: "_blank",
                    rel: "noopener noreferrer",
                  })}
                  className="group flex min-h-20 items-center gap-3 rounded-2xl border border-border bg-surface-muted p-4 transition hover:border-primary hover:bg-primary-soft"
                >
                  <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-primary text-white">
                    {brand ? <SocialBrandIcon brand={brand} size={20} /> : <Icon size={20} />}
                  </span>
                  <span className="min-w-0">
                    <strong className="block text-sm text-text-muted">
                      {label}
                    </strong>
                    <span className="block break-words font-semibold text-text group-hover:text-primary">
                      {value}
                    </span>
                  </span>
                </a>
              ),
            )}
          </div>
        )}
        <div
          className="rendered-html break-words p-5 text-base leading-8 text-text sm:p-8 [&_a]:font-semibold [&_a]:text-primary [&_a]:underline [&_blockquote]:my-4 [&_blockquote]:border-l-4 [&_blockquote]:border-primary [&_blockquote]:bg-primary-soft [&_blockquote]:p-4 [&_h1]:mb-4 [&_h1]:mt-7 [&_h1]:text-2xl [&_h1]:font-bold [&_h2]:mb-3 [&_h2]:mt-6 [&_h2]:text-xl [&_h2]:font-bold [&_h3]:mb-2 [&_h3]:mt-5 [&_h3]:text-lg [&_h3]:font-bold [&_li]:mb-1 [&_ol]:my-3 [&_ol]:list-decimal [&_ol]:pl-6 [&_p]:mb-4 [&_table]:my-5 [&_table]:block [&_table]:overflow-x-auto [&_td]:border [&_td]:border-border [&_td]:p-2 [&_th]:border [&_th]:border-border [&_th]:bg-surface-muted [&_th]:p-2 [&_ul]:my-3 [&_ul]:list-disc [&_ul]:pl-6"
          dangerouslySetInnerHTML={{ __html: page.content }}
        />
      </article>
    </div>
  );
}
