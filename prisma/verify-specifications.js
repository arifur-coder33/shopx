// Focused development verification. Every temporary record is removed in finally.
require("dotenv/config");
const assert = require("node:assert/strict");
const { randomUUID } = require("node:crypto");
const { PrismaClient } = require("@prisma/client");

async function main() {
  assert.equal(new URL(process.env.DATABASE_URL).pathname, "/shopzy", "Development database shopzy only.");
  const db = new PrismaClient();
  const prefix = `spec-test-${randomUUID()}`;
  const specificationIds = [], categoryIds = [], productIds = [];
  const { categorySpecificationInput, saveProductSpecifications, parseSpecificationRows } = await import("../backend/services/specificationService.js");
  const assignment = (specificationId, options = []) => ({ specificationId, options });
  const nested = (rows) => rows.map(({ specificationId, ...row }) => ({ ...row, specification: { connect: { id: specificationId } } }));
  try {
    const parent = await db.specification.create({ data: { name: `${prefix} Display`, key: `${prefix}:display` } });
    specificationIds.push(parent.id);
    const child = await db.specification.create({ data: { name: `${prefix} Screen size`, key: `${prefix}:screen-size`, parentId: parent.id } });
    specificationIds.push(child.id);
    await assert.rejects(() => db.specification.create({ data: { name: "Duplicate", key: parent.key } }), { code: "P2002" });
    const rows = await categorySpecificationInput(db, [assignment(parent.id, ["AMOLED", "AMOLED"]), assignment(child.id, ["6.7 inch"])]);
    assert.deepEqual(rows[0].options, ["AMOLED"]);
    for (const label of ["phone", "laptop"]) {
      const category = await db.category.create({ data: { name: `${prefix}-${label}`, slug: `${prefix}-${label}`, specifications: { create: nested(rows) } } });
      categoryIds.push(category.id);
      const product = await db.product.create({ data: { title: `${prefix}-${label}`, slug: `${prefix}-${label}`, productCode: `${prefix}-${label}`, categoryId: category.id } });
      productIds.push(product.id);
    }
    console.log("PASS reusable parent/child assigned to Phone and Laptop; nested category create; duplicate key blocked");
    await db.$transaction((tx) => saveProductSpecifications(tx, productIds[0], categoryIds[0], [
      { specificationId: parent.id, value: "AMOLED" }, { specificationId: child.id, value: "6.7 inch" },
    ]));
    await db.$transaction((tx) => saveProductSpecifications(tx, productIds[1], categoryIds[1], [{ specificationId: parent.id, value: "IPS" }]));
    const stored = await db.productSpecificationValue.findMany({ where: { productId: productIds[0] }, orderBy: { sortOrder: "asc" }, include: { specification: { include: { parent: true } } } });
    assert.equal(stored[0].specification.parentId, null);
    assert.equal(stored[1].specification.parent.id, parent.id);
    assert.equal(await db.productSpecificationValue.count({ where: { productId: productIds[1] } }), 1);
    console.log("PASS parent-only values and child values; product edit/display data");
    await assert.rejects(() => categorySpecificationInput(db, [], categoryIds[0]), /used by products/);
    assert.throws(() => parseSpecificationRows([assignment(child.id), assignment(child.id)]), /only once/);
    await assert.rejects(() => categorySpecificationInput(db, [assignment("000000000000000000000001")]), /no longer exists/);
    await assert.rejects(() => db.$transaction(async (tx) => {
      await tx.product.update({ where: { id: productIds[0] }, data: { title: "Must roll back" } });
      await saveProductSpecifications(tx, productIds[0], null, [{ specificationId: child.id, value: "forged" }]);
    }), /selected category/);
    assert.equal((await db.product.findUnique({ where: { id: productIds[0] } })).title, `${prefix}-phone`);
    assert.equal(await db.productSpecificationValue.count({ where: { productId: productIds[0] } }), 2);
    await assert.rejects(() => db.$transaction(async (tx) => {
      await saveProductSpecifications(tx, productIds[0], categoryIds[0], [{ specificationId: parent.id, value: "changed" }]);
      throw new Error("forced rollback");
    }), /forced rollback/);
    assert.equal((await db.productSpecificationValue.findFirst({ where: { productId: productIds[0], specificationId: parent.id } })).value, "AMOLED");
    console.log("PASS invalid reference, duplicate assignment, in-use removal and atomic rollback");
    const revised = await categorySpecificationInput(db, rows.map((row) => ({ ...row, options: ["new option"] })), categoryIds[0]);
    await db.category.update({ where: { id: categoryIds[0] }, data: { specifications: {
      deleteMany: { specificationId: { notIn: revised.map((row) => row.specificationId) } },
      upsert: revised.map(({ specificationId, ...row }) => ({ where: { categoryId_specificationId: { categoryId: categoryIds[0], specificationId } }, update: row, create: { ...row, specification: { connect: { id: specificationId } } } })),
    } } });
    await db.$transaction((tx) => saveProductSpecifications(tx, productIds[0], categoryIds[0], [{ specificationId: child.id, value: "7 inch" }]));
    await db.$transaction((tx) => saveProductSpecifications(tx, productIds[0], categoryIds[0], [{ specificationId: child.id, value: "7 inch" }]));
    assert.equal(await db.productSpecificationValue.count({ where: { productId: productIds[0] } }), 1);
    assert.deepEqual((await db.categorySpecification.findFirst({ where: { categoryId: categoryIds[0] } })).options, ["new option"]);
    console.log("PASS nested category edit, product replacement, repeated save without duplicate values");
  } finally {
    await db.productSpecificationValue.deleteMany({ where: { productId: { in: productIds } } });
    await db.product.deleteMany({ where: { id: { in: productIds } } });
    await db.categorySpecification.deleteMany({ where: { categoryId: { in: categoryIds } } });
    await db.category.deleteMany({ where: { id: { in: categoryIds } } });
    for (const id of [...specificationIds].reverse()) await db.specification.deleteMany({ where: { id } });
    assert.equal(await db.specification.count({ where: { id: { in: specificationIds } } }), 0);
    assert.equal(await db.product.count({ where: { id: { in: productIds } } }), 0);
    assert.equal(await db.category.count({ where: { id: { in: categoryIds } } }), 0);
    console.log("PASS temporary records cleaned");
    await db.$disconnect();
  }
}
main().catch((error) => { console.error(error); process.exitCode = 1; });
