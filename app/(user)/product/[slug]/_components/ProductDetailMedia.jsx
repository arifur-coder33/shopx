import { cloudinaryDetailImage } from "@/utils/cloudinaryUrl";
import Image from "next/image";

function videoSource(rawUrl) {
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

export default function ProductDetailMedia({ title, videoUrl, images = [] }) {
  const video = videoSource(videoUrl);
  const uniqueImages = [...new Set(images.filter(Boolean))];
  if (!video && uniqueImages.length === 0) return null;

  return (
    <section className="mx-auto mt-6 max-w-5xl space-y-6">
      {video && (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800">
          <h2 className="border-b border-slate-200 px-4 py-3 text-xl font-bold dark:border-slate-700 sm:text-2xl">
            পণ্যের ভিডিও
          </h2>
          <div className="aspect-video w-full bg-black">
            {video.type === "file" ? (
              <video
                className="h-full w-full"
                src={video.src}
                controls
                preload="none"
                playsInline
              />
            ) : (
              <iframe
                className="h-full w-full border-0"
                src={video.src}
                title={`${title} ভিডিও`}
                loading="lazy"
                allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                referrerPolicy="strict-origin-when-cross-origin"
              />
            )}
          </div>
        </div>
      )}

      {uniqueImages.length > 0 && (
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-orange-600">
            বিস্তারিত দেখুন
          </p>
          <h2 className="mb-3 text-xl font-bold sm:text-2xl">পণ্যের ছবিসমূহ</h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {uniqueImages.map((image, index) => (
              <figure
                key={image}
                className="relative aspect-square overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800"
              >
                <Image
                  src={cloudinaryDetailImage(image)}
                  alt={`${title} - ছবি ${index + 1}`}
                  fill
                  sizes="(max-width: 640px) calc(100vw - 2rem), (max-width: 1024px) 50vw, 600px"
                  className="object-contain"
                  loading="lazy"
                  unoptimized
                />
              </figure>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
