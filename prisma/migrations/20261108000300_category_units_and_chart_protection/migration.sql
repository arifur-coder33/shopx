CREATE TABLE "CategoryUnit" ("name" TEXT PRIMARY KEY);
INSERT INTO "CategoryUnit" ("name") VALUES
  ('pcs'), ('inch'), ('mm'), ('cm'), ('m'), ('ft'), ('yard'), ('pair'), ('dozen'),
  ('set'), ('pack'), ('box'), ('roll'), ('g'), ('kg'), ('ml'), ('l');
ALTER TABLE "Category" ADD COLUMN "unitName" TEXT REFERENCES "CategoryUnit"("name") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Category" DROP CONSTRAINT "Category_sizeChartId_fkey";
ALTER TABLE "Category" ADD CONSTRAINT "Category_sizeChartId_fkey"
  FOREIGN KEY ("sizeChartId") REFERENCES "SizeChart"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
