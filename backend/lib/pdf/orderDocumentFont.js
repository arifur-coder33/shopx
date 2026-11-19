import { readFileSync } from "node:fs";
import { join } from "node:path";

export function getOrderDocumentFontCss() {
  try {
    const font = readFileSync(join(process.cwd(), "public", "fonts", "SolaimanLipi.ttf"), "base64");
    return `@font-face {
      font-family: BanglaFont;
      src: url(data:font/ttf;base64,${font}) format('truetype');
      font-weight: normal;
      font-style: normal;
    }`;
  } catch (error) {
    console.error("Order document font could not be loaded:", error.message);
    return "";
  }
}

export const escapeDocumentHtml = (value) => String(value ?? "").replace(/[&<>"']/gu, (character) => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
})[character]);
