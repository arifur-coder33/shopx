export const scrollToAndHighlight = (selector) => {
  const element = document.querySelector(selector);
  if (!element) return;

  // Scroll the element into view
  element.scrollIntoView({
    behavior: "smooth",
    block: "center",
  });

  // Apply a temporary highlight effect
  element.style.transition = "all 0.2s ease-in-out";
  element.style.boxShadow = "0 0 0 4px rgba(239, 68, 68, 0.7)"; // Red glow
  element.style.borderRadius = "8px";

  // Remove the highlight after a short period
  setTimeout(() => {
    element.style.boxShadow = "";
    element.style.borderRadius = "";
  }, 1500); // Highlight will last for 1.5 seconds
};