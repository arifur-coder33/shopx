import { revalidatePath } from "next/cache";

// These pages read Prisma directly. Tag invalidation alone cannot refresh
// their rendered output; invalidate the routes as well (including old slugs).
export function revalidateCatalogPages() {
  revalidatePath("/product/[slug]", "page");
  revalidatePath("/buynow/[slug]", "page");
  revalidatePath("/category/[...slug]", "page");
  revalidatePath("/campaign/[id]", "page");
}
