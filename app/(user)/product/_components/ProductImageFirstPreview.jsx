import Breadcrumb from "@/components/common/Breadcrumb";
import ProductInitialImage from "./ProductInitialImage";
import styles from "./ProductImageGallery.module.css";

// Stream the actual product photo while campaign/SEO data is still resolving.
// Keep the final gallery dimensions so the photo does not jump when it arrives.
export default function ProductImageFirstPreview({ product }) {
  return (
    <div className="mb-16 pb-20 sm:pb-0">
      <Breadcrumb items={[
        ...(product.category?.name ? [{
          label: product.category.name,
          href: `/category/${product.category.fullPath || product.category.slug}`,
        }] : []),
        { label: product.title },
      ]} />
      <section className="grid grid-cols-1 gap-4 overflow-hidden rounded-2xl border border-border bg-surface p-2 shadow-sm sm:p-4 md:grid-cols-2 md:gap-6">
        <div className="min-w-0 md:col-span-1">
          <div className={styles.mainImageContainer}>
            <ProductInitialImage imageId={product.thumbnail?.name || product.mainImage} alt={product.title} />
          </div>
        </div>
        <div className="min-w-0 rounded-2xl bg-surface p-3 sm:p-5 md:col-span-1" aria-busy="true">
          <h1 className="border-b border-border pb-3 text-2xl font-bold leading-tight sm:text-3xl lg:text-4xl">{product.title}</h1>
          <div className="mt-4 h-16 w-40 rounded-lg bg-surface-muted" aria-hidden="true" />
          <span className="sr-only">পণ্যের বিস্তারিত লোড হচ্ছে</span>
        </div>
      </section>
    </div>
  );
}
