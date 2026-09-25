import ImageCustomServer from "@/components/images/ImageCustomServer";
import Link from "next/link";

function gridPosition(index, columns) {
  const pageSize = columns * 2;
  const positionOnPage = index % pageSize;

  return {
    row: positionOnPage < columns ? 1 : 2,
    column:
      Math.floor(index / pageSize) * columns + (positionOnPage % columns) + 1,
  };
}

export default function ShopByCategory({ categories }) {
  // Keep this component defensive even if a caller passes the full tree.
  const rootCategories = categories?.filter(
    (category) => !category.parentCategoryId,
  );
  if (!rootCategories?.length) return null;

  const responsiveRows = [
    rootCategories.length > 4 ? "grid-rows-2" : "grid-rows-1",
    rootCategories.length > 6 ? "sm:grid-rows-2" : "sm:grid-rows-1",
    rootCategories.length > 8 ? "md:grid-rows-2" : "md:grid-rows-1",
    rootCategories.length > 10 ? "lg:grid-rows-2" : "lg:grid-rows-1",
  ].join(" ");

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

      <div
        className={`grid grid-flow-col auto-cols-[calc((100%_-_1.5rem)/4)] gap-2 overflow-x-auto overscroll-x-contain pb-2 [scrollbar-width:none] sm:auto-cols-[calc((100%_-_3.75rem)/6)] sm:gap-3 md:auto-cols-[calc((100%_-_5.25rem)/8)] lg:auto-cols-[calc((100%_-_6.75rem)/10)] [&::-webkit-scrollbar]:hidden ${responsiveRows}`}
        aria-label="মূল ক্যাটাগরি"
      >
        {rootCategories.map((category, index) => {
          console.log("category", category);
          const categoryPath = category.fullPath || category.slug;
          const mobile = gridPosition(index, 4);
          const small = gridPosition(index, 6);
          const medium = gridPosition(index, 8);
          const large = gridPosition(index, 10);
          return (
            <Link
              key={category.id}
              href={`/category/${categoryPath
                .split("/")
                .map(encodeURIComponent)
                .join("/")}`}
              style={{
                "--category-row": mobile.row,
                "--category-column": mobile.column,
                "--category-row-sm": small.row,
                "--category-column-sm": small.column,
                "--category-row-md": medium.row,
                "--category-column-md": medium.column,
                "--category-row-lg": large.row,
                "--category-column-lg": large.column,
              }}
              className="group min-w-0 snap-start rounded-xl border border-border bg-surface p-2 text-center transition-colors [grid-column:var(--category-column)] [grid-row:var(--category-row)] hover:border-primary hover:bg-primary-soft sm:[grid-column:var(--category-column-sm)] sm:[grid-row:var(--category-row-sm)] md:[grid-column:var(--category-column-md)] md:[grid-row:var(--category-row-md)] lg:[grid-column:var(--category-column-lg)] lg:[grid-row:var(--category-row-lg)]"
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
