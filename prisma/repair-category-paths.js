// Preview by default. Apply only to an explicitly named database.
require("dotenv/config");
const { PrismaClient } = require("@prisma/client");

async function main() {
  const apply = process.argv.includes("--apply");
  const databaseName = new URL(process.env.DATABASE_URL).pathname.slice(1);
  const expectedDatabase = process.argv.find((arg) => arg.startsWith("--database="))?.slice(11);
  if (apply && (!expectedDatabase || expectedDatabase !== databaseName)) {
    throw new Error("Use --apply --database=<configured database name> after reviewing the preview.");
  }
  const db = new PrismaClient();
  try {
    const { buildCategoryPath } = await import("../backend/utils/buildCategoryPath.js");
    const categories = await db.category.findMany({
      select: { id: true, slug: true, parentCategoryId: true, fullPath: true },
    });
    const byId = new Map(categories.map((category) => [category.id, category]));
    const snapshot = { category: { findUnique: async ({ where }) => byId.get(where.id) || null } };
    const changes = [];
    for (const category of categories) {
      // Do not silently change an existing slug: it would break existing URLs.
      if (category.slug !== category.slug.toLowerCase()) {
        throw new Error(`Category ${category.id} has an uppercase slug; review its URL migration first.`);
      }
      const fullPath = await buildCategoryPath(category.id, snapshot);
      if (category.fullPath !== fullPath) changes.push({ id: category.id, before: category.fullPath, after: fullPath });
    }
    console.log(JSON.stringify({ database: databaseName, mode: apply ? "apply" : "preview", changes }, null, 2));
    if (apply && changes.length) {
      await db.$transaction(async (tx) => {
        const current = await tx.category.findMany({
          select: { id: true, slug: true, parentCategoryId: true, fullPath: true },
        });
        if (current.length !== categories.length || current.some((record) => {
          const original = byId.get(record.id);
          return !original || original.slug !== record.slug || original.parentCategoryId !== record.parentCategoryId || original.fullPath !== record.fullPath;
        })) throw new Error("Categories changed during repair. Preview again.");
        for (const change of changes) {
          await tx.category.update({
            where: { id: change.id },
            data: { fullPath: change.after },
          });
        }
      }, { timeout: 30000 });
      console.log(`Updated ${changes.length} category paths. Rebuild/revalidate cached category pages before serving the updated URLs.`);
    }
  } finally {
    await db.$disconnect();
  }
}

main().catch((error) => { console.error(error.message); process.exitCode = 1; });
