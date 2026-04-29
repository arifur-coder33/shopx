// /lib/tracking/cookies.js
export function setCookie(name, value, days = 30) {
  if (!value) return;

  const maxAge = days * 24 * 60 * 60;
  document.cookie = `${name}=${value}; path=/; max-age=${maxAge}`;
}

export function getCookie(name) {
  if (typeof document === "undefined") return null;

  const match = document.cookie.match(new RegExp("(^| )" + name + "=([^;]+)"));
  return match ? match[2] : null;
}
