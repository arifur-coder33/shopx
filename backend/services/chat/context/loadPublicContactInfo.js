import { getPublicContentPage } from "@/backend/services/contentPageService";
import { getPublicContactDetails } from "@/backend/services/contactDetailsService";
import { getSiteUrl } from "@/lib/siteUrl";

const contactQuestionPattern = /(?:\b(?:contact|phone|telephone|mobile|email|e-mail|whatsapp|messenger|facebook\s+page|address|location|shop\s+address|office\s+address)\b|\b(?:apnader|apnara|tomader|amader)\b.{0,30}\b(?:jogajog|number|namber|phone|email|whatsapp|messenger|address|location|facebook)\b|\b(?:what(?:'s|\s+is)|give|share|send).{0,24}\b(?:your\s+)?(?:number|phone|email|address|contact)\b|আপনাদের.{0,24}(?:যোগাযোগ|ফোন|মোবাইল|নম্বর|নাম্বার|ইমেইল|মেইল|হোয়াটসঅ্যাপ|হোয়াটসঅ্যাপ|মেসেঞ্জার|ঠিকানা|লোকেশন|অবস্থান)|যোগাযোগের\s*(?:তথ্য|নম্বর|নাম্বার|ঠিকানা)|(?:ফোন|মোবাইল|ইমেইল|মেইল|হোয়াটসঅ্যাপ|হোয়াটসঅ্যাপ|মেসেঞ্জার|ঠিকানা|লোকেশন|অবস্থান).{0,24}(?:কী|কি|কোথায়|কোথায়|কিভাবে|কীভাবে|দেন|দিন|পাব|আছে|জানাবেন)|কিভাবে.{0,20}যোগাযোগ)/iu;

export function isContactInfoQuestion(text) {
  return contactQuestionPattern.test(String(text || ""));
}

export async function loadPublicContactInfo() {
  try {
    const page = await getPublicContentPage("contact");
    if (!page) return { available: false, details: {}, pageContent: null, pageUrl: null };
    const [details, siteUrl] = await Promise.all([
      getPublicContactDetails().catch(() => ({})),
      getSiteUrl().catch(() => null),
    ]);
    const safeDetails = Object.fromEntries(
      Object.entries(details || {}).filter(([, value]) => Boolean(String(value || "").trim())),
    );
    return {
      available: Boolean(Object.keys(safeDetails).length || String(page.content || "").trim()),
      details: safeDetails,
      pageContent: String(page.content || "").slice(0, 12000) || null,
      pageTitle: String(page.title || "Contact").slice(0, 160),
      pageUrl: siteUrl ? new URL("/contact", siteUrl).toString() : "/contact",
    };
  } catch (error) {
    console.warn("Public contact context could not be loaded:", error?.message || error);
    return { available: false, details: {}, pageContent: null, pageUrl: "/contact" };
  }
}
