export const productCardBundleSelection = {
  select: {
    componentProduct: {
      select: {
        hasVariations: true,
        _count: { select: { variations: true } },
      },
    },
  },
};

function productCardBundleRequiresSelection(product) {
  return Boolean(
    product?.bundleProducts?.some((item) =>
      item.componentProduct?.hasVariations || item.componentProduct?._count?.variations > 1,
    ),
  );
}

export function productCardRequiresSelection(product) {
  return Boolean(
    product?.hasVariations ||
      productCardBundleRequiresSelection(product),
  );
}
