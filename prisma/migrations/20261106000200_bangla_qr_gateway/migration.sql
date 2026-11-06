INSERT INTO "PaymentGateway" (
  "id",
  "name",
  "code",
  "adapterKey",
  "isActive",
  "sortOrder",
  "nonSecretConfig",
  "createdAt",
  "updatedAt",
  "createdBy",
  "updatedBy"
)
SELECT
  'bangla_qr_manual_gateway',
  'Bangla QR (Manual confirmation)',
  'BANGLA_QR',
  'BANGLA_QR',
  false,
  40,
  '{"qrImageUrl":"","merchantNumber":"","merchantName":"","instructions":"Bangla QR দিয়ে পেমেন্ট করে TrxID জমা দিন। Admin যাচাই করে payment confirm করবেন।"}'::jsonb,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP,
  'migration',
  'migration'
WHERE NOT EXISTS (
  SELECT 1 FROM "PaymentGateway" WHERE "code" = 'BANGLA_QR'
);
