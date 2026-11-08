INSERT INTO "VariationName" ("id", "name", "createdAt", "updatedAt")
SELECT 'default_size_variation', 'Size', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM "VariationName" WHERE lower("name") = 'size')
ON CONFLICT ("name") DO NOTHING;

CREATE TABLE "SizeChart" (
  "id" TEXT PRIMARY KEY,
  "name" TEXT NOT NULL UNIQUE,
  "imageId" TEXT REFERENCES "Media"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  "unit" TEXT NOT NULL,
  "sizes" TEXT[] NOT NULL,
  "rows" JSONB NOT NULL
);
ALTER TABLE "Category" ADD COLUMN "sizeChartId" TEXT REFERENCES "SizeChart"("id") ON DELETE SET NULL ON UPDATE CASCADE;
CREATE INDEX "Category_sizeChartId_idx" ON "Category"("sizeChartId");
