import test from "node:test";
import assert from "node:assert/strict";
import { searchImageCatalog, selectImageSearchProducts } from "./chatImageSelection.mjs";

const candidates = (...ids) => ids.map((id) => ({ id, title: id }));
const hashes = (...scores) => scores.map(([id, similarity]) => ({ id, similarity }));

test("one storefront result is returned even without a fingerprint", () => {
  const result = selectImageSearchProducts(candidates("fan"));
  assert.deepEqual(result.products.map((product) => product.id), ["fan"]);
  assert.deepEqual(result.steps, []);
});

test("50 then 60 percent narrows to a single product and stops", () => {
  const result = selectImageSearchProducts(candidates("a", "b", "c"), hashes(["a", 65], ["b", 55], ["c", 40]));
  assert.deepEqual(result.products.map((product) => product.id), ["a"]);
  assert.deepEqual(result.steps, [{ threshold: 50, count: 2 }, { threshold: 60, count: 1 }]);
});

test("multiple matches after 70 percent return the best four in score order", () => {
  const result = selectImageSearchProducts(candidates("a", "b", "c", "d", "e", "f"), hashes(["a", 73], ["b", 95], ["c", 80], ["d", 76], ["e", 84], ["f", 65]));
  assert.equal(result.threshold, 70);
  assert.deepEqual(result.products.map((product) => product.id), ["b", "e", "c", "d"]);
});

test("missing fingerprints retain up to four storefront results", () => {
  const result = selectImageSearchProducts(candidates("a", "b", "c", "d", "e"));
  assert.deepEqual(result.products.map((product) => product.id), ["a", "b", "c", "d"]);
});

test("a stricter threshold does not erase all previously matching products", () => {
  const result = selectImageSearchProducts(candidates("a", "b"), hashes(["a", 58], ["b", 53]));
  assert.equal(result.threshold, 50);
  assert.deepEqual(result.products.map((product) => product.id), ["a", "b"]);
});

test("a visible product name uses storefront search before broad attributes", async () => {
  const queries = [];
  const products = await searchImageCatalog({ productNames: ["Portable mini fan", "পোর্টেবল মিনি ফ্যান"], productType: "fan", materials: ["plastic"] }, async (query) => {
    queries.push(query);
    return query === "Portable mini fan" ? candidates("fan") : [];
  });
  assert.deepEqual(products.map((product) => product.id), ["fan"]);
  assert.ok(queries.includes("Portable mini fan"));
  assert.ok(!queries.includes("plastic"));
});

test("OCR title can recover a product when the inferred name does not match", async () => {
  const products = await searchImageCatalog({ productName: "handheld cooler", visibleText: "Portable mini fan" }, async (query) => query === "Portable mini fan" ? candidates("fan") : []);
  assert.deepEqual(products.map((product) => product.id), ["fan"]);
});
