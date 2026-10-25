const uniqueQueries = (values) => [...new Set(values
  .flatMap((value) => String(value || "").split(/[\n|/]+/u))
  .map((value) => value.trim())
  .filter((value) => value.length >= 2 && /\p{L}/u.test(value)))];

export function imageSearchQueryGroups(description = {}) {
  return [
    uniqueQueries([...(description.productNames || []), description.productName, description.brandModel, description.productType]),
    uniqueQueries([...(description.searchTerms || []), description.visibleText]),
    uniqueQueries([...(description.useCases || []), ...(description.visibleFeatures || []), ...(description.materials || [])]),
  ].filter((queries) => queries.length);
}

// Use the same search function as the storefront. Specific product names are
// tried before broad attributes such as color or material.
export async function searchImageCatalog(description, findProducts) {
  for (const queries of imageSearchQueryGroups(description)) {
    const matches = new Map();
    // A short parallel batch keeps image search responsive without letting a
    // verbose vision response fan out into dozens of catalog queries.
    const batch = queries.slice(0, 8);
    const results = await Promise.allSettled(batch.map((query) => findProducts(query)));
    for (const [index, result] of results.entries()) {
      if (result.status === "rejected") throw result.reason;
      for (const product of result.value) {
        if (!product?.id) continue;
        const prior = matches.get(product.id);
        matches.set(product.id, {
          ...product,
          searchScore: (prior?.searchScore || 0) + 100 - index,
        });
      }
    }
    if (matches.size) return [...matches.values()].sort((a, b) => b.searchScore - a.searchScore);
  }
  return [];
}

export function selectImageSearchProducts(candidates, fingerprints = []) {
  const products = [...new Map(candidates.map((product) => [product.id, product])).values()];
  if (products.length <= 1) return { products, threshold: null, steps: [] };
  const scores = new Map(fingerprints.map((match) => [match.id, match.similarity]));
  let remaining = products;
  let threshold = null;
  const steps = [];
  for (const minimum of [50, 60, 70]) {
    const filtered = remaining.filter((product) => (scores.get(product.id) ?? -1) >= minimum);
    steps.push({ threshold: minimum, count: filtered.length });
    // Missing fingerprints or a screenshot crop must not erase textual matches.
    if (!filtered.length) break;
    remaining = filtered;
    threshold = minimum;
    if (remaining.length === 1) break;
  }
  return {
    products: [...remaining].sort((a, b) => (scores.get(b.id) ?? -1) - (scores.get(a.id) ?? -1)).slice(0, 4),
    threshold,
    steps,
  };
}
