export function orderItemStockLines(item) {
  if (Array.isArray(item.bundleComponents) && item.bundleComponents.length) {
    return item.bundleComponents.map((component) => ({
      ...component,
      quantity: component.quantity * item.quantity,
    }));
  }
  return [{ variationId: item.variationId, sku: item.sku, title: item.productName, quantity: item.quantity }];
}

export function deliveredOrderUnits(item) {
  if (!item.bundleComponents?.length) return item.deliveryItems.reduce((sum, row) => sum + row.quantity, 0);
  return Math.min(...item.bundleComponents.map((component) => {
    const delivered = item.deliveryItems.reduce((sum, row) =>
      sum + (row.variationId === component.variationId ? row.quantity : 0), 0);
    return Math.floor(delivered / component.quantity);
  }));
}

export function bundleWarehouseAvailability(components) {
  if (!components?.length || components.some(({ componentVariation }) =>
    componentVariation.product?.isActive !== true || componentVariation.product.stockMode !== "OWN_STOCK" ||
    componentVariation.product.productType !== "PHYSICAL")) return [];

  const stockByComponent = components.map(({ quantity, componentVariation }) =>
    new Map(componentVariation.stocks.map(({ warehouseId, available }) =>
      [warehouseId, Math.floor(Math.max(0, available) / quantity)])));
  return [...stockByComponent[0]].map(([warehouseId]) => ({
    warehouseId,
    available: Math.min(...stockByComponent.map((stock) => stock.get(warehouseId) || 0)),
  }));
}

export function availableBundleUnits(components) {
  return Math.max(0, ...bundleWarehouseAvailability(components).map(({ available }) => available));
}

export const bundleComponentStockSelect = {
  quantity: true,
  componentVariation: {
    select: {
      id: true, sku: true,
      product: { select: { title: true, isActive: true, stockMode: true, productType: true } },
      stocks: { select: { warehouseId: true, available: true } },
    },
  },
};

export const productBundleItemsSelect = {
  orderBy: [{ position: "asc" }, { id: "asc" }],
  select: {
    id: true, quantity: true,
    componentProduct: {
      select: {
        id: true, title: true, isActive: true, stockMode: true, productType: true, hasVariations: true,
        variations: {
          orderBy: [{ sku: "asc" }, { id: "asc" }],
          select: {
            id: true, sku: true,
            stocks: { select: { warehouseId: true, available: true } },
            combinations: { select: { variationName: { select: { name: true } }, variationValue: { select: { value: true } } } },
          },
        },
      },
    },
  },
};

function eligibleComponent(product) {
  return product.isActive === true && product.productType === "PHYSICAL" && product.stockMode === "OWN_STOCK";
}

function variantOptionLabel(variant) {
  return variant.combinations.map(({ variationName, variationValue }) =>
    `${variationName.name}: ${variationValue.value}`).join(" · ") || variant.sku;
}

export function availableProductBundleUnits(items) {
  if (!items.length || items.some(({ componentProduct }) => !eligibleComponent(componentProduct))) return 0;
  const byProduct = items.map(({ quantity, componentProduct }) => {
    const available = new Map();
    for (const variant of componentProduct.variations) {
      for (const stock of variant.stocks) available.set(stock.warehouseId,
        (available.get(stock.warehouseId) || 0) + Math.floor(Math.max(0, stock.available)));
    }
    return new Map([...available].map(([id, count]) => [id, Math.floor(count / quantity)]));
  });
  return Math.max(0, ...[...byProduct[0].keys()].map((id) => Math.min(...byProduct.map((stock) => stock.get(id) || 0))));
}

export function publicBundleOptions(items) {
  return items.map(({ id, quantity, componentProduct }) => ({
    id, quantity, title: componentProduct.title,
    requiresSelection: Boolean(componentProduct.hasVariations) || componentProduct.variations.length > 1,
    options: eligibleComponent(componentProduct) ? componentProduct.variations.map((variant) => ({
      id: variant.id, sku: variant.sku,
      label: variantOptionLabel(variant),
      combinations: variant.combinations,
      available: variant.stocks.some((stock) => stock.available >= 1),
    })) : [],
  }));
}

export function resolveProductBundle(items, selections) {
  if (!items.length) return null;
  if (selections != null && (typeof selections !== "object" || Array.isArray(selections))) {
    throw new Error("Bundle-এর সব পণ্যের অপশন বেছে নিন।");
  }
  const components = new Map();
  for (const { id, quantity, componentProduct } of items) {
    const variants = componentProduct.variations;
    const picked = selections?.[id] ?? (!componentProduct.hasVariations && variants.length === 1 ? Array(quantity).fill(variants[0].id) : null);
    if (!eligibleComponent(componentProduct) || !Array.isArray(picked) || picked.length !== quantity) {
      throw new Error(`${componentProduct.title}-এর সব অপশন বেছে নিন।`);
    }
    const options = new Map(variants.map((variant) => [variant.id, variant]));
    for (const variantId of picked) {
      const variant = options.get(variantId);
      if (!variant) throw new Error(`${componentProduct.title}-এর নির্বাচন সঠিক নয়।`);
      const existing = components.get(variantId);
      components.set(variantId, {
        variationId: variant.id, sku: variant.sku, title: componentProduct.title,
        label: variantOptionLabel(variant), quantity: (existing?.quantity || 0) + 1,
      });
    }
  }
  return [...components.values()];
}

export function bundleSelectionKey(selections) {
  return selections && typeof selections === "object" ? JSON.stringify(Object.entries(selections).sort(([a], [b]) => a.localeCompare(b))
    .map(([id, variantIds]) => [id, Array.isArray(variantIds) ? [...variantIds].sort() : []])) : "";
}

export function completeBundleSelection(items, draft) {
  const selections = {};
  for (const item of items) {
    const picked = !item.requiresSelection && item.options.length === 1
      ? Array(item.quantity).fill(item.options[0].id)
      : draft?.[item.id];
    if (!Array.isArray(picked) || picked.length !== item.quantity ||
        Array.from(picked).some((id) => !item.options.some((option) => option.id === id && option.available))) return null;
    selections[item.id] = picked;
  }
  return selections;
}

export function bundleSelectionLabels(items, selections) {
  return items.flatMap((item) => (selections?.[item.id] || []).flatMap((id) => {
    const option = item.options.find((entry) => entry.id === id);
    return option ? [`${item.title} · ${option.label}`] : [];
  }));
}
