import Link from "next/link";

function HomeIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-4 w-4 shrink-0"
      aria-hidden="true"
    >
      <path d="m3 11 9-8 9 8" />
      <path d="M5 10v10h14V10" />
      <path d="M9 20v-6h6v6" />
    </svg>
  );
}

function Separator() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-3.5 w-3.5 shrink-0 text-text-muted/60"
      aria-hidden="true"
    >
      <path d="m9 18 6-6-6-6" />
    </svg>
  );
}

export default function Breadcrumb({ items = [], className = "" }) {
  const breadcrumbs = [
    { label: "Home", href: "/", home: true },
    ...items.filter((item) => item?.label),
  ];

  return (
    <nav aria-label="Breadcrumb" className={`min-w-0 py-2 ${className}`}>
      <ol className="flex min-w-0 items-center gap-1.5 overflow-x-auto whitespace-nowrap text-sm [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {breadcrumbs.map((item, index) => {
          const current = index === breadcrumbs.length - 1;
          return (
            <li
              key={`${item.href || "current"}-${item.label}`}
              className="flex min-w-0 items-center gap-1.5"
            >
              {index > 0 && <Separator />}
              {current || !item.href ? (
                <span
                  aria-current={current ? "page" : undefined}
                  className="inline-flex max-w-[13rem] items-center gap-1.5 truncate font-semibold text-text sm:max-w-sm"
                  title={item.label}
                >
                  {item.home && <HomeIcon />}
                  {item.label}
                </span>
              ) : (
                <Link
                  href={encodeURIComponent(item.href)}
                  prefetch={false}
                  className="inline-flex items-center gap-1.5 text-text-muted transition-colors hover:text-primary"
                >
                  {item.home && <HomeIcon />}
                  <span>{item.label}</span>
                </Link>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
