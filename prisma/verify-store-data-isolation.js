import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const schema = read("prisma/schema.prisma");
const failures = [];

const expect = (condition, message) => {
  if (!condition) failures.push(message);
};

const modelBlock = (name) => {
  const match = schema.match(new RegExp(`model ${name} \\{([\\s\\S]*?)\\n\\}`, "m"));
  expect(match, `Prisma model ${name} is missing.`);
  return match?.[1] || "";
};

const phaseModels = {
  configuration: [
    "PaymentGateway", "CourierProvider", "SocialTrackingSetting", "MoneyAccount",
    "CourierPickupPoint", "SiteSetting", "ContentPage", "Notice", "banner", "HeroSlide",
  ],
  catalog: ["Category", "VariationName", "ProductCodeCounter", "Media", "Product"],
  commerce: ["Order", "OrderCounter", "Shipping", "Payment", "Refund"],
  procurement: [
    "Supplier", "PurchaseOrder", "Warehouse", "GoodsReceipt", "Delivery",
    "InventoryTransaction", "Stock", "SupplierPayment",
  ],
};

for (const [phase, models] of Object.entries(phaseModels)) {
  for (const name of models) {
    expect(/\bstoreId\s+String\b/.test(modelBlock(name)), `${phase}: ${name} is not Store-owned.`);
  }
}

for (const [name, key] of [
  ["Category", "slug"], ["Product", "slug"], ["Order", "orderNo"],
  ["PaymentGateway", "code"], ["CourierProvider", "code"],
  ["PurchaseOrder", "poNo"], ["Warehouse", "code"],
  ["Stock", "warehouseId, variationId"],
]) {
  expect(
    modelBlock(name).includes(`@@unique([storeId, ${key}])`),
    `${name} does not use the expected Store-scoped unique key.`,
  );
}

const trustedFiles = [
  "backend/serverActions/providerConfigurationAction.js",
  "backend/serverActions/productActions.js",
  "backend/serverActions/orderActions.js",
  "backend/serverActions/paymentAction.js",
  "backend/serverActions/courierAction.js",
  "backend/serverActions/inventoryAction.js",
  "backend/serverActions/purchaseAction.js",
  "backend/serverActions/goodsReceiptAction.js",
  "backend/serverActions/deliveryAction.js",
];
for (const file of trustedFiles) {
  const source = read(file);
  expect(source.includes("requireCurrentStoreId"), `${file} does not resolve trusted Store context.`);
  expect(source.includes("storeId"), `${file} does not apply Store ownership.`);
}

for (const file of [
  "app/(user)/(withMobileFooter)/(home)/page.js",
  "app/(user)/(withMobileFooter)/category/[...slug]/page.js",
  "app/(user)/product/[slug]/page.js",
  "app/(user)/buynow/[slug]/page.js",
]) {
  const source = read(file);
  expect(source.includes('dynamic = "force-dynamic"'), `${file} is not hostname-dynamic.`);
  expect(!source.includes("generateStaticParams"), `${file} still generates global static paths.`);
}

const cacheSources = [
  read("backend/services/siteAppearanceService.js"),
  read("backend/services/socialTrackingService.js"),
  read("backend/services/contentPageService.js"),
];
for (const [index, source] of cacheSources.entries()) {
  expect(
    /unstable_cache[\s\S]*storeId/.test(source),
    `Store-specific cache source ${index + 1} lacks Store identity.`,
  );
}

const publicTracking = read("backend/services/socialTrackingService.js");
const publicQuery = publicTracking.match(/async function queryPublicSettings[\s\S]*?\n\}/)?.[0] || "";
expect(!publicQuery.includes("encryptedSecrets: true"), "Public tracking cache selects encrypted secrets.");

const storefront = read("backend/services/storefrontProductService.js");
expect(storefront.includes("storeId_slug"), "Product detail lookup is not Store-scoped.");
expect(storefront.includes("stocks: { where: { storeId }"), "Product stock aggregation is not Store-scoped.");

if (failures.length) {
  console.error(`Store data isolation verification failed:\n- ${failures.join("\n- ")}`);
  process.exitCode = 1;
} else {
  console.log("Phase 3 configuration isolation: PASS");
  console.log("Phase 4 catalog isolation: PASS");
  console.log("Phase 5 commerce isolation: PASS");
  console.log("Phase 6 inventory/procurement isolation: PASS");
  console.log("Credential exposure and Store-aware cache checks: PASS");
}
