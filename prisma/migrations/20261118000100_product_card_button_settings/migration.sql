ALTER TABLE "SiteSetting"
ADD COLUMN "cartButtonLabel" VARCHAR(40) DEFAULT 'Add to Cart',
ADD COLUMN "buyNowButtonLabel" VARCHAR(40) DEFAULT 'Buy Now',
ADD COLUMN "cartButtonColor" VARCHAR(7) DEFAULT '#ea580c',
ADD COLUMN "buyNowButtonColor" VARCHAR(7) DEFAULT '#0f766e';
