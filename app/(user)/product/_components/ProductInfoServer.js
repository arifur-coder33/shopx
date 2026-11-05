import ProductPrice from "./ProductPrice";
import BuyNowSection from "./BuyNowSection";

export default function ProductInfoServer({ product }) {
  const options = new Map();
  if (product.hasVariations) {
    for (const variation of product.variations || []) {
      for (const combo of variation.combinations || []) {
        const name = combo.variationName?.name;
        const value = combo.variationValue?.value;
        if (!name || !value) continue;
        if (!options.has(name)) options.set(name, new Set());
        options.get(name).add(value);
      }
    }
  }
  return (
    <>
      <ProductPrice data={product} />
      {/* Match the live stock row's height before its background request finishes. */}
      <div className="mt-1 h-4" aria-hidden="true" />
      <div id="product-variation-list" className="space-y-6">
        <div className="space-y-4">
          {[...options].map(([name, values]) => (
            <div key={name} className="card my-3 mt-4 flex w-fit flex-col gap-x-4 gap-y-2 rounded-xl border-2 p-2 shadow-sm">
              <span className="whitespace-nowrap border-b-2 text-base font-bold">{name} <span className="text-sm font-medium">সিলেক্ট করুনঃ</span></span>
              <div className="flex flex-wrap items-center gap-3">
                {[...values].sort().map((value) => (
                  <button key={value} type="button" data-product-option={name} data-product-value={value} className="relative flex items-center justify-center rounded-md border bg-white px-3 py-2 text-sm font-medium text-gray-900 ring-1 ring-inset ring-gray-300">{value}</button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
      <BuyNowSection data={{ ...product, stockPending: true }} selectedVariation={null} />
    </>
  );
}
