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

// Search only the first, most-specific term group before visual fallback.
export async function searchImageCatalog(description, findProducts) {
  const queries = imageSearchQueryGroups(description)[0] || [];
  const matches = new Map();
  // Search the most specific AI terms once, then let visual fingerprints take
  // over if the catalog has no textual match.
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
  return [...matches.values()].sort((a, b) => b.searchScore - a.searchScore);
}

export function selectImageSearchProducts(candidates, fingerprints = []) {
  const products = [...new Map(candidates.map((product) => [product.id, product])).values()];
  const scores = new Map(fingerprints.map((match) => [match.id, match.similarity]));
  const ranked = products
    .map((product, index) => ({ ...product, ...(scores.has(product.id) && { similarity: scores.get(product.id) }), _rank: index }))
    .sort((left, right) => (right.similarity ?? -1) - (left.similarity ?? -1) || (right.searchScore || 0) - (left.searchScore || 0) || left._rank - right._rank);
  const highConfidence = ranked.filter((product) => (product.similarity ?? -1) >= 70);
  const selected = highConfidence.length > 1
    ? highConfidence.slice(0, 3)
    : highConfidence.length === 1
      ? highConfidence
      : ranked.slice(0, 1);
  const allProductIds = highConfidence.length > 3
    ? highConfidence.map((product) => product.id).slice(0, 100)
    : selected.map((product) => product.id);
  return {
    products: selected.map(({ _rank, ...product }) => product),
    allProductIds,
    threshold: highConfidence.length > 1 ? 70 : null,
    steps: fingerprints.length ? [{ threshold: 70, count: highConfidence.length }] : [],
  };
}
