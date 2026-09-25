// components/ThemeToggle.js
"use client";
import { MoonStar, Sun } from "lucide-react";
import { useEffect, useState } from "react";

export default function ThemeToggle({ className, sun, moon }) {
  const [isDarkMode, setIsDarkMode] = useState(false);

  useEffect(() => {
    const storedTheme = localStorage.getItem("theme");
    const dark =
      storedTheme === "dark" ||
      (!storedTheme &&
        window.matchMedia("(prefers-color-scheme: dark)").matches);
    document.documentElement.classList.toggle("dark", dark);
    setIsDarkMode(dark);
  }, []);

  // Toggle theme and save preference to localStorage
  const toggleTheme = () => {
    if (isDarkMode) {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("theme", "light");
      setIsDarkMode(false);
    } else {
      document.documentElement.classList.add("dark");
      localStorage.setItem("theme", "dark");
      setIsDarkMode(true);
    }
  };

  return (
    <button
      id="toggle"
      aria-label={isDarkMode ? "Use light theme" : "Use dark theme"}
      onClick={toggleTheme}
      className=" h-11 w-11 items-center justify-center rounded-brand text-text-muted hover:bg-surface-muted hover:text-text hidden md:flex"
    >
      {isDarkMode ? (
        <div className="flex flex-row gap-2 items-center">
          <Sun className={`${className}`} /> {sun && "Light Mode"}{" "}
        </div>
      ) : (
        <div className="flex flex-row gap-2 items-center">
          <MoonStar className={`${className}`} />
          {moon && "Dark mode"}
        </div>
      )}
    </button>
  );
}
