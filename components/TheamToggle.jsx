// components/ThemeToggle.js
"use client";
import { MoonStar, Sun } from "lucide-react";
import { useEffect, useState } from "react";

export default function ThemeToggle({ className, sun, moon }) {
  const [isDarkMode, setIsDarkMode] = useState(false);

  // Load theme from localStorage or default to light mode
  useEffect(() => {
    const storedTheme = localStorage.getItem("theme");
    if (storedTheme === "dark") {
      document.documentElement.classList.add("dark");
      setIsDarkMode(true);
    } else {
      document.documentElement.classList.remove("dark");
    }
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
      aria-label="them toggle"
      onClick={toggleTheme}
      className={`p-2 rounded-md `}
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
