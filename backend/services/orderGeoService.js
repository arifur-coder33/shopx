import { isIP } from "node:net";
import prisma from "@/lib/prisma";

function isPublicIp(ip) {
  const kind = isIP(ip);
  if (kind === 4) {
    const [a, b, c, d] = ip.split(".").map(Number);
    if ([a, b, c, d].some((part) => !Number.isInteger(part) || part < 0 || part > 255)) return false;
    return !(a === 0 || a === 10 || a === 127 || a >= 224 ||
      (a === 100 && b >= 64 && b <= 127) || (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168));
  }
  if (kind !== 6) return false;
  const normalized = ip.toLowerCase();
  return normalized !== "::" && normalized !== "::1" && !normalized.startsWith("fc") &&
    !normalized.startsWith("fd") && !normalized.startsWith("fe80:");
}

function coordinate(value, min, max) {
  if (value == null || value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= min && parsed <= max ? parsed : null;
}

export async function enrichOrderOrigin({ orderId, ipAddress }) {
  try {
    const ip = String(ipAddress || "").trim();
    if (!orderId || !isPublicIp(ip)) return;

    const order = await prisma.order.findUnique({
      where: { id: orderId },
      select: { fraudRiskFactors: true },
    });
    if (!order) return;
    const factors = Array.isArray(order.fraudRiskFactors) ? order.fraudRiskFactors : [];
    const currentOrigin = factors.find((factor) => factor?.code === "ORDER_ORIGIN")?.origin;
    if (currentOrigin?.city || (currentOrigin?.latitude && currentOrigin?.longitude)) return;

    const url = new URL("https://api.ipapi.is/");
    url.searchParams.set("q", ip);
    const response = await fetch(url, {
      cache: "no-store",
      signal: AbortSignal.timeout(2500),
    });
    if (!response.ok) return;
    const result = await response.json();
    if (result?.is_bogon) return;

    const origin = {
      city: typeof result.city === "string" && result.city.trim() ? result.city.trim() : null,
      region: typeof result.region === "string" && result.region.trim() ? result.region.trim() : null,
      country: typeof result.country === "string" && result.country.trim() ? result.country.trim() : null,
      latitude: coordinate(result.lat, -90, 90),
      longitude: coordinate(result.lon, -180, 180),
      source: "ipapi.is",
    };
    if (!origin.city && !(origin.latitude != null && origin.longitude != null)) return;

    await prisma.order.update({
      where: { id: orderId },
      data: {
        fraudRiskFactors: [
          ...factors.filter((factor) => factor?.code !== "ORDER_ORIGIN"),
          { code: "ORDER_ORIGIN", points: 0, origin },
        ],
      },
    });
  } catch (error) {
    console.warn("Could not resolve order IP location:", error?.message || error);
  }
}
