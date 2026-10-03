import { cloudinaryDetailImage } from "@/utils/cloudinaryUrl";
import DeferredVideo from "./DeferredVideo";

function getVideoSource(rawUrl) {
  if (!rawUrl) return null;

  try {
    const url = new URL(rawUrl);
    const host = url.hostname.replace(/^www\./, "");
    if (host === "youtu.be" || host.endsWith("youtube.com")) {
      const id =
        host === "youtu.be"
          ? url.pathname.split("/").filter(Boolean)[0]
          : url.searchParams.get("v") ||
            url.pathname.split("/").filter(Boolean).pop();
      return id
        ? {
            type: "embed",
            src: `https://www.youtube-nocookie.com/embed/${id}?rel=0`,
          }
        : null;
    }
    if (host.endsWith("vimeo.com")) {
      const id = url.pathname.split("/").filter(Boolean).pop();
      return id
        ? { type: "embed", src: `https://player.vimeo.com/video/${id}?dnt=1` }
        : null;
    }
    if (/\.(mp4|webm|ogg)$/i.test(url.pathname)) {
      return { type: "file", src: rawUrl };
    }
    return { type: "embed", src: rawUrl };
  } catch {
    return null;
  }
}

export default function ProductDetailMedia({ title, videoUrl, videos = [], gallery = [], only = "all", sectionId }) {
  const videoItems = (videos.length
    ? videos
    : videoUrl
      ? [{ header: "পণ্যের ভিডিও", url: videoUrl }]
      : [])
    .map((item, index) => ({
      ...item,
      header: item.header || `পণ্যের ভিডিও ${index + 1}`,
      source: getVideoSource(item.url),
    }))
    .filter((item) => item.source);
  const photos = Array.from(
    new Map(
      gallery
        .filter((photo) => photo?.name)
        .map((photo) => [photo.id || photo.name, photo]),
    ).values(),
  );
  const poster = photos[0]?.name
    ? cloudinaryDetailImage(photos[0].name, 640)
    : undefined;
  const posterSrcSet = photos[0]?.name
    ? [320, 480, 640, 960, 1200].map((width) => `${cloudinaryDetailImage(photos[0].name, width)} ${width}w`).join(", ")
    : undefined;

  const showVideos = only !== "photos" && videoItems.length > 0;
  const showPhotos = only !== "videos" && photos.length > 0;
  if (!showVideos && !showPhotos) return null;

  return (
    <section id={sectionId} className="mx-auto mt-6 max-w-5xl space-y-6" aria-label={only === "videos" ? "পণ্যের ভিডিও" : only === "photos" ? "পণ্যের ছবি" : "পণ্যের ভিডিও ও ছবি"}>
      {showVideos && videoItems.map((video, index) => (
        <div key={video.id || video.url} className="overflow-hidden rounded-2xl border border-border bg-surface shadow-sm">
          <div className="border-b border-border px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-primary-hover">ভিডিও {index + 1}</p>
            <h2 className="text-xl font-bold sm:text-2xl">{video.header}</h2>
          </div>
          <div className="aspect-video w-full bg-black">
            <DeferredVideo
              source={video.source}
              title={`${title} — ${video.header}`}
              poster={poster}
              posterSrcSet={posterSrcSet}
            />
          </div>
        </div>
      ))}

      {showPhotos && (
        <div>
          <div className="mb-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-primary-hover">
              বিস্তারিত দেখুন
            </p>
            <h2 className="text-xl font-bold sm:text-2xl">পণ্যের ছবিসমূহ</h2>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {photos.map((photo, index) => (
              <figure
                key={photo.id || photo.name}
                className="relative aspect-square overflow-hidden rounded-2xl border border-border bg-surface-muted"
              >
                <img
                  src={cloudinaryDetailImage(photo.name, 640)}
                  srcSet={[320, 480, 640, 960, 1200].map((width) => `${cloudinaryDetailImage(photo.name, width)} ${width}w`).join(", ")}
                  alt={photo.seoAlt || `${title} - বিস্তারিত ছবি ${index + 1}`}
                  width={1200}
                  height={1200}
                  sizes="(max-width: 640px) calc(100vw - 2rem), (max-width: 1024px) 50vw, 600px"
                  className="absolute inset-0 h-full w-full object-contain"
                  loading="lazy"
                  decoding="async"
                  fetchPriority="low"
                />
              </figure>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
