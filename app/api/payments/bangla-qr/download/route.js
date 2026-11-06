import prisma from "@/lib/prisma";

export async function GET(request) {
  const params = new URL(request.url).searchParams;
  const orderNo = String(params.get("o") || "").trim();
  const phoneNumber = String(params.get("p") || "").trim();
  if (!orderNo || !phoneNumber) return new Response("Not found", { status: 404 });
  const order = await prisma.order.findFirst({
    where: { orderNo, phoneNumber },
    select: { selectedPaymentGateway: { select: { adapterKey: true, nonSecretConfig: true } } },
  });
  if (order?.selectedPaymentGateway?.adapterKey !== "BANGLA_QR") return new Response("Not found", { status: 404 });
  const imageUrl = String(order.selectedPaymentGateway.nonSecretConfig?.qrImageUrl || "");
  let parsed;
  try { parsed = new URL(imageUrl); } catch { parsed = null; }
  if (!parsed || parsed.protocol !== "https:" || parsed.hostname !== "res.cloudinary.com") return new Response("Not found", { status: 404 });
  try {
    const upstream = await fetch(parsed, { redirect: "error", cache: "no-store", signal: AbortSignal.timeout(15000) });
    const contentType = upstream.headers.get("content-type") || "";
    if (!upstream.ok || !contentType.startsWith("image/")) return new Response("QR image unavailable", { status: 502 });
    const extension = contentType.includes("png") ? "png" : contentType.includes("webp") ? "webp" : contentType.includes("jpeg") ? "jpg" : "img";
    return new Response(await upstream.arrayBuffer(), {
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": `attachment; filename="bangla-qr.${extension}"`,
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return new Response("QR image unavailable", { status: 502 });
  }
}
