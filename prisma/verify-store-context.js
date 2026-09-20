const assert = require("node:assert/strict");

function createMemoryDatabase() {
  const stores = new Map();
  const domains = new Map();
  let nextId = 1;

  return {
    stores,
    domains,
    store: {
      async upsert({ where, create }) {
        const existing = stores.get(where.slug);
        if (existing) return existing;
        const record = { id: `store-${nextId++}`, ...create };
        stores.set(record.slug, record);
        return record;
      },
      async findUnique({ where }) {
        return stores.get(where.slug) || null;
      },
    },
    storeDomain: {
      async findUnique({ where }) {
        return domains.get(where.domain) || null;
      },
    },
  };
}

async function main() {
  const {
    ensureDefaultStandaloneStore,
    resolveStoreContext,
  } = await import("../backend/services/storeContextService.js");
  const { getDeploymentMode } = await import(
    "../backend/services/deploymentModeService.js"
  );
  const { normalizeHostname } = await import(
    "../backend/utils/hostname.js"
  );

  const originalMode = process.env.DEPLOYMENT_MODE;
  const database = createMemoryDatabase();

  process.env.DEPLOYMENT_MODE = "standalone";
  assert.equal(getDeploymentMode(), "STANDALONE");
  const firstSeed = await ensureDefaultStandaloneStore(database);
  const secondSeed = await ensureDefaultStandaloneStore(database);
  assert.equal(firstSeed.id, secondSeed.id);
  assert.equal(database.stores.size, 1);

  const standalone = await resolveStoreContext({
    mode: "STANDALONE",
    database,
  });
  assert.equal(standalone.type, "STORE");
  assert.equal(standalone.store.slug, "default");

  const saasStore = {
    id: "store-saas",
    name: "Karim Store",
    slug: "karim",
    status: "ACTIVE",
  };
  database.domains.set("karim.com", {
    domain: "karim.com",
    isVerified: true,
    status: "ACTIVE",
    store: saasStore,
  });

  assert.equal(normalizeHostname("WWW.Karim.com.:443"), "karim.com");
  const resolved = await resolveStoreContext({
    mode: "SAAS",
    hostname: "www.karim.com:443",
    platformDomain: "shopz.com",
    database,
  });
  assert.equal(resolved.type, "STORE");
  assert.equal(resolved.store.id, saasStore.id);

  const unknown = await resolveStoreContext({
    mode: "SAAS",
    hostname: "unknown.com",
    platformDomain: "shopz.com",
    database,
    storeId: firstSeed.id,
  });
  assert.equal(unknown.type, "INVALID_STORE");
  assert.equal(unknown.store, null);

  const platform = await resolveStoreContext({
    mode: "SAAS",
    hostname: "www.shopz.com",
    platformDomain: "shopz.com",
    database,
  });
  assert.equal(platform.type, "PLATFORM");
  assert.equal(platform.store, null);

  if (originalMode === undefined) delete process.env.DEPLOYMENT_MODE;
  else process.env.DEPLOYMENT_MODE = originalMode;

  console.log("Store context verification passed.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
