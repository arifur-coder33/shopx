import { commerceTools, createCommerceToolHandlers, isDhakaDestination } from "./commerceTools";
import { productTools, createProductToolHandlers } from "./productTools";

function publicProduct(product) {
  if (!product) return null;
  return {
    id: product.id,
    title: product.title,
    productCode: product.productCode || null,
    description: String(product.description || product.seoDescription || "").slice(0, 1800) || null,
    features: (product.features || []).slice(0, 8).map((feature) => String(feature).slice(0, 300)),
    questionsAnswers: (product.questionsAnswers || []).slice(0, 4).map((item) => ({
      question: String(item.question || "").slice(0, 300),
      answer: String(item.answer || "").slice(0, 500),
    })),
    url: product.url || null,
    buyNowUrl: product.buyNowUrl || null,
    imageUrls: (product.imageUrls || []).slice(0, 4),
    variants: (product.variants || []).slice(0, 30).map((variant) => ({
      id: variant.id,
      label: (variant.options || []).join(" / ") || "সাধারণ",
      colorLabel: variant.colorLabel || null,
      regularPrice: variant.regularPrice,
      price: variant.currentCampaignPrice || variant.listedPrice || variant.regularPrice,
      availableStock: Number(variant.availableStock) || 0,
      stockState: variant.stockState,
      allowOutOfStockOrder: Boolean(product.allowOutOfStockOrder),
      weightKg: variant.weightKg || null,
    })),
  };
}

export function createChatToolset({
  selectedProductId,
  imageMatches = [],
  verifiedOrders = [],
  knownCampaigns = [],
  searchCatalog,
  loadCatalogProduct,
  loadCampaigns,
  getDeliveryRates,
  calculateDeliveryCharge,
  onProductsFound = () => {},
}) {
  const findProduct = async (productId) => {
    const id = productId || selectedProductId;
    if (!id) return null;
    return loadCatalogProduct(id);
  };
  const productHandlers = createProductToolHandlers({
    searchProducts: async (query) => {
      const result = await searchCatalog(query);
      onProductsFound(result.products || []);
      return (result.products || []).slice(0, 5).map(publicProduct);
    },
    getProductDetails: async (productId) => {
      const product = await findProduct(productId);
      if (product) onProductsFound([product]);
      return publicProduct(product);
    },
    checkProductStock: async (productId, variantLabel) => {
      const product = await findProduct(productId);
      if (!product) return { found: false, clarificationRequired: true };
      onProductsFound([product]);
      const variants = (product.variants || []).filter((variant) =>
        !variantLabel || `${variant.options?.join(" ") || ""} ${variant.colorLabel || ""}`
          .toLocaleLowerCase()
          .includes(String(variantLabel).toLocaleLowerCase()),
      );
      return {
        found: variants.length > 0,
        product: product.title,
        variants: variants.slice(0, 20).map((variant) => ({
          label: (variant.options || []).join(" / ") || "সাধারণ",
          colorLabel: variant.colorLabel || null,
          availableStock: Number(variant.availableStock) || 0,
          stockState: variant.stockState,
          allowOutOfStockOrder: Boolean(product.allowOutOfStockOrder),
        })),
      };
    },
    searchProductByImage: async () => {
      onProductsFound(imageMatches);
      return imageMatches.slice(0, 8).map(publicProduct);
    },
  });

  const commerceHandlers = createCommerceToolHandlers({
    getDeliveryCharge: async ({ destination, productId, variant }) => {
      const [rates, product] = await Promise.all([
        getDeliveryRates(),
        productId ? findProduct(productId) : Promise.resolve(null),
      ]);
      if (!rates) return { available: false, reason: "delivery_rates_unavailable" };
      const variants = (product?.variants || []).filter((item) =>
        !variant || `${item.options?.join(" ") || ""} ${item.colorLabel || ""}`
          .toLocaleLowerCase()
          .includes(String(variant).toLocaleLowerCase()),
      );
      if (variant && !variants.length) return { available: false, clarificationRequired: true };
      const weights = variants.map((item) => Number(item.weightKg) || 1);
      const applicableWeights = weights.length ? weights : [1];
      const calculateRange = (area) => {
        const values = applicableWeights.map((weight) => calculateDeliveryCharge(area, weight, rates));
        return { minimum: Math.min(...values), maximum: Math.max(...values) };
      };
      const dhaka = isDhakaDestination(destination);
      return {
        available: true,
        destination: destination || null,
        product: product?.title || null,
        charges: destination
          ? [{ area: dhaka ? "inside-dhaka" : "outside-dhaka", ...calculateRange(dhaka ? "inside-dhaka" : "outside-dhaka") }]
          : [
              { area: "inside-dhaka", ...calculateRange("inside-dhaka") },
              { area: "outside-dhaka", ...calculateRange("outside-dhaka") },
            ],
      };
    },
    getOrderStatus: async ({ orderNo }) => {
      const matches = verifiedOrders.filter((order) => !orderNo || String(order.orderNo) === String(orderNo));
      return matches.length
        ? { verified: true, orders: matches.slice(0, 2) }
        : { verified: false, needsCustomerVerification: true, orders: [] };
    },
    getCampaigns: async ({ query }) => {
      const result = knownCampaigns.length ? null : await loadCampaigns(query);
      const campaigns = knownCampaigns.length ? knownCampaigns : result?.campaignInfo || [];
      return { available: Boolean(knownCampaigns.length || result?.campaignInfoAvailable), campaigns: campaigns.slice(0, 12) };
    },
    getCheckoutOptions: async ({ productId }) => {
      const product = await findProduct(productId);
      return product
        ? { available: true, product: product.title, buyNowUrl: product.buyNowUrl || null, requiresCustomerConfirmation: true, orderCreated: false }
        : { available: false, needsProductSelection: true, orderCreated: false };
    },
  });

  return {
    tools: [
      ...productTools.filter((tool) => tool.name !== "search_product_by_image" || imageMatches.length > 0),
      ...commerceTools,
    ],
    handlers: { ...productHandlers, ...commerceHandlers },
  };
}
