UPDATE "PaymentGateway"
SET "nonSecretConfig" =
  COALESCE("nonSecretConfig", '{}'::jsonb)
  || '{"qrImageMediaId":"","bankName":"","bankType":"BANK"}'::jsonb,
    "updatedAt" = CURRENT_TIMESTAMP
WHERE "adapterKey" = 'BANGLA_QR';
