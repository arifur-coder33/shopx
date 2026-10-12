// components/ThemeToggle.js
"use client";
import { MoonStar, Sun } from "lucide-react";
import { useEffect, useState } from "react";

export default function ThemeToggle({
  className = "",
  buttonClassName = "",
  showOnMobile = false,
  sun,
  moon,
}) {
  const [isDarkMode, setIsDarkMode] = useState(false);

  useEffect(() => {
    const storedTheme = localStorage.getItem("theme");
    const dark = storedTheme === "dark";
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
      className={`min-h-11 items-center justify-center rounded-brand text-text-muted hover:bg-surface-muted hover:text-text ${showOnMobile ? "flex" : "hidden md:flex"} ${buttonClassName}`}
    >
      {isDarkMode ? (
        <div className="flex flex-row gap-2 items-center">
          <Sun className={`h-5 w-5 shrink-0 ${className}`} /> {sun && "Light Mode"}{" "}
        </div>
      ) : (
        <div className="flex flex-row gap-2 items-center">
          <MoonStar className={`h-5 w-5 shrink-0 ${className}`} />
          {moon && "Dark mode"}
        </div>
      )}
    </button>
  );
}
