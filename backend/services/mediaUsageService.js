import prisma from "@/lib/prisma";

export async function syncLegacyChatMedia(conversationIds = null) {
  const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
  if (!cloudName) return;
  try {
    const messages = await prisma.chatMessage.findMany({
      where: {
        direction: "OUTBOUND",
        mediaId: null,
        ...(conversationIds?.length ? { conversationId: { in: conversationIds } } : {}),
        metadata: { path: ["type"], equals: "IMAGE" },
      },
      select: { id: true, content: true, metadata: true, createdAt: true, conversationId: true, conversation: { select: { customerName: true } } },
      orderBy: { createdAt: "desc" },
      ...(conversationIds?.length ? {} : { take: 500 }),
    });
    for (const message of messages) {
      const url = message.metadata?.image?.url;
      if (typeof url !== "string") continue;
      let parsed;
      try { parsed = new URL(url); } catch { continue; }
      if (parsed.hostname !== "res.cloudinary.com") continue;
      const parts = parsed.pathname.split("/").filter(Boolean);
      if (parts[0] !== cloudName) continue;
      const uploadIndex = parts.indexOf("upload");
      if (uploadIndex < 0) continue;
      const assetParts = parts.slice(uploadIndex + 1).filter((part) => !/^v\d+$/.test(part));
      const assetName = assetParts.at(-1);
      if (!/\.(jpe?g|png)$/i.test(assetName || "")) continue;
      let media = await prisma.media.findFirst({ where: { url } });
      if (!media) {
        media = await prisma.media.create({
          data: {
            url,
            name: assetName,
            displayName: message.conversation?.customerName || message.content || "Chat photo",
            host: "cloudinary",
          },
        });
      }
      await prisma.chatMessage.updateMany({ where: { id: message.id, mediaId: null }, data: { mediaId: media.id } });
    }
  } catch (error) {
    console.error("Legacy chat media sync failed:", error?.message || error);
  }
}

function addUsage(index, mediaId, usage) {
  if (mediaId) index.get(mediaId)?.push(usage);
}

export async function getMediaUsageIndex(media) {
  const ids = media.map((item) => item.id);
  const names = media.map((item) => item.name);
  const index = new Map(ids.map((id) => [id, []]));
  if (!ids.length) return index;

  const [categories, products, galleries, variations, banners, slides, documents, settings, campaigns, footerPages, photoReviews, chatMessages, paymentGateways] = await Promise.all([
    prisma.category.findMany({ where: { OR: [{ thumbnailId: { in: ids } }, { bannerId: { in: ids } }] }, select: { id: true, name: true, thumbnailId: true, bannerId: true } }),
    prisma.product.findMany({ where: { thumbnailId: { in: ids } }, select: { id: true, title: true, thumbnailId: true } }),
    prisma.productGallery.findMany({ where: { mediaId: { in: ids } }, select: { mediaId: true, product: { select: { id: true, title: true } } } }),
    prisma.productVariation.findMany({ where: { thumbnailId: { in: ids } }, select: { thumbnailId: true, sku: true, product: { select: { id: true, title: true } } } }),
    prisma.banner.findMany({ where: { thumbnailId: { in: ids } }, select: { id: true, name: true, thumbnailId: true } }),
    prisma.heroSlide.findMany({ where: { imageId: { in: ids } }, select: { id: true, title: true, imageId: true } }),
    prisma.supplierDocument.findMany({ where: { mediaId: { in: ids } }, select: { mediaId: true, supplier: { select: { id: true, companyName: true } } } }),
    prisma.siteSetting.findMany({ where: { OR: [{ logo: { in: names } }, { favicon: { in: names } }, { invoicePhoto: { in: names } }] }, select: { id: true, logo: true, favicon: true, invoicePhoto: true } }),
    prisma.campaign.findMany({ where: { bannerUrl: { in: names } }, select: { id: true, name: true, bannerUrl: true } }),
    prisma.contentPage.findMany({ where: { footerLogoId: { in: ids } }, select: { id: true, title: true, footerLogoId: true } }),
    prisma.photoReview.findMany({ where: { imageId: { in: ids } }, select: { id: true, imageId: true, customerName: true, product: { select: { title: true } } } }),
    prisma.chatMessage.findMany({ where: { mediaId: { in: ids } }, select: { mediaId: true, conversationId: true, conversation: { select: { customerName: true, channel: true } } } }),
    prisma.paymentGateway.findMany({ where: { adapterKey: "BANGLA_QR" }, select: { id: true, name: true, nonSecretConfig: true } }),
  ]);

  for (const row of categories) {
    addUsage(index, row.thumbnailId, { section: "Category thumbnail", title: row.name, href: "/admin/categories" });
    addUsage(index, row.bannerId, { section: "Category banner", title: row.name, href: "/admin/categories" });
  }
  for (const row of products) addUsage(index, row.thumbnailId, { section: "Product thumbnail", title: row.title, href: "/admin/products" });
  for (const row of galleries) addUsage(index, row.mediaId, { section: "Product gallery", title: row.product?.title || "Product", href: "/admin/products" });
  for (const row of variations) addUsage(index, row.thumbnailId, { section: "Product variation", title: `${row.product?.title || "Product"}${row.sku ? ` · ${row.sku}` : ""}`, href: "/admin/products" });
  for (const row of banners) addUsage(index, row.thumbnailId, { section: "Home banner", title: row.name || "Home banner", href: "/admin/banner" });
  for (const row of slides) addUsage(index, row.imageId, { section: "Hero slider", title: row.title || "Slider image", href: "/admin/banner" });
  for (const row of documents) addUsage(index, row.mediaId, { section: "Supplier document", title: row.supplier?.companyName || "Supplier", href: "/admin/suppliers" });
  for (const row of settings) {
    if (row.logo) addUsage(index, ids[names.indexOf(row.logo)], { section: "Site logo", title: "Site appearance", href: "/admin/settings/site-appearance" });
    if (row.favicon) addUsage(index, ids[names.indexOf(row.favicon)], { section: "Favicon", title: "Site appearance", href: "/admin/settings/site-appearance" });
    if (row.invoicePhoto) addUsage(index, ids[names.indexOf(row.invoicePhoto)], { section: "Invoice photo", title: "Invoice shop details", href: "/admin/settings/site-appearance" });
  }
  for (const row of campaigns) addUsage(index, ids[names.indexOf(row.bannerUrl)], { section: "Campaign banner", title: row.name, href: `/admin/campaigns/${row.id}/edit` });
  for (const row of footerPages) addUsage(index, row.footerLogoId, { section: "Footer logo", title: row.title || "Footer content", href: "/admin/settings/content-pages" });
  for (const row of photoReviews) addUsage(index, row.imageId, { section: row.product ? "Product review photo" : "Site review photo", title: row.product?.title || row.customerName || "Photo review", href: "/admin/site-reviews" });
  for (const row of chatMessages) addUsage(index, row.mediaId, { section: "Chat message", title: `${row.conversation?.customerName || "Customer"} · ${row.conversation?.channel || "Chat"}`, href: `/admin/chat?conversation=${encodeURIComponent(row.conversationId)}` });
  for (const row of paymentGateways) addUsage(index, row.nonSecretConfig?.qrImageMediaId, { section: "Bangla QR image", title: row.name, href: "/admin/settings/payment-gateways" });
  return index;
}
