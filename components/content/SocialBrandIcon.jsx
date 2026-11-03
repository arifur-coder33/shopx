export default function SocialBrandIcon({ brand, size = 20 }) {
  const common = {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "currentColor",
    "aria-hidden": true,
    focusable: "false",
  };

  if (brand === "facebook") {
    return <svg {...common}><path d="M13.5 21v-8h2.7l.4-3.1h-3.1v-2c0-.9.3-1.5 1.6-1.5h1.7V3.6c-.3 0-1.3-.1-2.5-.1-2.5 0-4.2 1.5-4.2 4.3v2.1H7.3V13h2.8v8h3.4Z" /></svg>;
  }

  if (brand === "instagram") {
    return <svg {...common} fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="5" /><circle cx="12" cy="12" r="4" /><circle cx="17.5" cy="6.8" r=".8" fill="currentColor" stroke="none" /></svg>;
  }

  if (brand === "tiktok") {
    return <svg {...common}><path d="M19.6 8.1a7.2 7.2 0 0 1-4.4-1.5v8.1a5.5 5.5 0 1 1-5.5-5.5c.4 0 .8 0 1.1.1v3.1a2.5 2.5 0 1 0 1.7 2.3V3h3.1c.2 2 1.6 3.6 4 4v1.1Z" /></svg>;
  }

  return null;
}
