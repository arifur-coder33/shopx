import Script from "next/script";

// Set the saved theme before hydration without rendering a raw React script tag.
export const ThemeScript = () => {
  const script = `
    (function() {
      try {
        const saved = localStorage.getItem('theme');
        const dark = saved === 'dark' || (!saved && matchMedia('(prefers-color-scheme: dark)').matches);
        document.documentElement.classList.toggle('dark', dark);
      } catch (e) {}
    })();
  `;

  return (
    <Script
      id="theme-init"
      strategy="beforeInteractive"
      dangerouslySetInnerHTML={{ __html: script }}
    />
  );
};
