// src/components/common/ThemeScript.js
// src/components/common/ThemeScript.js
// This component injects a script that runs before the page hydrates.
export const ThemeScript = () => {
  const script = `
    (function() {
      try {
        const theme = localStorage.getItem('theme');
        if (theme === 'dark') {
          document.documentElement.classList.add('dark');
        }
      } catch (e) {}
    })();
  `;

  return <script dangerouslySetInnerHTML={{ __html: script }} />;
};
