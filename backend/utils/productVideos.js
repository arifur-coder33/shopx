const clean = (value) => String(value || "").trim();

export function normalizeProductVideos(videos, legacyVideoUrl) {
  const normalized = Array.isArray(videos)
    ? videos
        .map((video, index) => ({
          ...(video?.id && { id: video.id }),
          header: clean(video?.header) || `পণ্যের ভিডিও ${index + 1}`,
          url: clean(video?.url),
          sortOrder: Number.isFinite(Number(video?.sortOrder))
            ? Number(video.sortOrder)
            : index,
        }))
        .filter((video) => video.url)
    : [];

  if (!normalized.length && clean(legacyVideoUrl)) {
    return [{
      header: "পণ্যের ভিডিও",
      url: clean(legacyVideoUrl),
      sortOrder: 0,
    }];
  }
  return normalized.sort((a, b) => a.sortOrder - b.sortOrder);
}

export function parseProductVideosInput(rawValue, legacyVideoUrl) {
  let rows = [];
  if (clean(rawValue)) {
    try {
      rows = JSON.parse(rawValue);
    } catch {
      throw new Error("Invalid product video data.");
    }
    if (!Array.isArray(rows)) throw new Error("Product videos must be a list.");
  }

  const normalized = normalizeProductVideos(rows, legacyVideoUrl);
  if (normalized.length > 20) throw new Error("A product can have up to 20 videos.");

  const seenUrls = new Set();
  return normalized.map((video, index) => {
    if (!video.header || video.header.length > 120) {
      throw new Error(`Video ${index + 1} header must be between 1 and 120 characters.`);
    }
    let url;
    try {
      url = new URL(video.url);
    } catch {
      throw new Error(`Video ${index + 1} URL is invalid.`);
    }
    if (!new Set(["http:", "https:"]).has(url.protocol)) {
      throw new Error(`Video ${index + 1} URL must use http or https.`);
    }
    const cleanUrl = url.toString();
    if (seenUrls.has(cleanUrl)) throw new Error(`Video ${index + 1} is duplicated.`);
    seenUrls.add(cleanUrl);
    return { header: video.header, url: cleanUrl, sortOrder: index };
  });
}

