export const CONTENT_PAGE_DEFINITIONS = [
  { slug: "contact", label: "Contact", path: "/contact" },
  { slug: "return-policy", label: "Return Policy", path: "/return-policy" },
  { slug: "privacy", label: "Privacy Policy", path: "/privacy" },
];

export const CONTENT_PAGE_SLUGS = new Set(
  CONTENT_PAGE_DEFINITIONS.map((page) => page.slug),
);

