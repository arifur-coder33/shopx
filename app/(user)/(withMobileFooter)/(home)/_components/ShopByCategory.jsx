import ImageCustomServer from "@/components/images/ImageCustomServer";
import Link from "next/link";

export default function ShopByCategory({ categories }) {
  if (!categories?.length) return null;

  return (
    <section className="mt-5 sm:mt-7" aria-labelledby="shop-by-category-title">
      <div className="mb-3 flex items-end justify-between gap-3">
        <div>
          <h2
            id="shop-by-category-title"
            className="text-xl font-bold sm:text-2xl"
          >
            ক্যাটাগরি অনুযায়ী কিনুন
          </h2>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-2 sm:grid-cols-6 sm:gap-3 md:grid-cols-8 lg:grid-cols-10">
        {categories.map((category) => {
          const categoryPath = category.fullPath || category.slug;
          return (
            <Link
              key={category.id}
              href={`/category/${categoryPath
                .split("/")
                .map(encodeURIComponent)
                .join("/")}`}
              className="group min-w-0 rounded-xl border border-border bg-surface p-2 text-center transition-colors hover:border-primary hover:bg-primary-soft"
            >
              <span className="mx-auto block aspect-square w-full max-w-20 overflow-hidden rounded-full bg-surface-muted">
                <ImageCustomServer
                  src={category.thumbnail?.name}
                  alt={category.name}
                  w={96}
                  h={96}
                  className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-105"
                  sizes="(max-width: 640px) 20vw, 96px"
                  quality={75}
                  fetchPriority="low"
                />
              </span>
              <span className="mt-1.5 block truncate text-xs font-semibold sm:text-sm">
                {category.name}
              </span>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
