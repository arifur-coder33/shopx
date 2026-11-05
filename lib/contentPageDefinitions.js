export const CONTENT_PAGE_DEFINITIONS = [
  { slug: "footer", label: "Footer", path: "/" },
  { slug: "contact", label: "Contact", path: "/contact" },
  { slug: "return-policy", label: "Return Policy", path: "/return-policy" },
  { slug: "privacy", label: "Privacy Policy", path: "/privacy" },
  { slug: "terms-of-service", label: "Terms of Service", path: "/terms-of-service" },
  { slug: "user-data-deletion", label: "User Data Deletion", path: "/user-data-deletion" },
];

export const CONTENT_PAGE_SLUGS = new Set(
  CONTENT_PAGE_DEFINITIONS.map((page) => page.slug),
);

