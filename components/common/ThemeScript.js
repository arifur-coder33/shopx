// src/components/common/ThemeScript.js
// src/components/common/ThemeScript.js
// This component injects a script that runs before the page hydrates.
export const ThemeScript = () => {
  const script = `
    (function() {
      try {
        const saved = localStorage.getItem('theme');
        const dark = saved === 'dark';
        document.documentElement.classList.toggle('dark', dark);
      } catch (e) {}
    })();
  `;

  return <script dangerouslySetInnerHTML={{ __html: script }} />;
};
