import prisma from "@/lib/prisma";
import { DEFAULT_DELIVERY_RATES, nonNegativeRate } from "@/lib/deliveryCharge";
import { getProviderRuntimeConfiguration } from "./providerCredentialService";
import { requireCurrentStoreId } from "./storeContextService";

export async function getCheckoutDeliveryRates(database = prisma) {
  const storeId = await requireCurrentStoreId();
  const provider = await database.courierProvider.findFirst({
    where: { storeId, isActive: true },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    select: {
      name: true,
      adapterKey: true,
      isActive: true,
      moneyAccountId: true,
      encryptedCredentials: true,
      nonSecretConfig: true,
    },
  });
  if (!provider) return DEFAULT_DELIVERY_RATES;
  const { config } = getProviderRuntimeConfiguration("courier", provider);
  return {
    insideDhakaCharge: nonNegativeRate(config.insideDhakaCharge, DEFAULT_DELIVERY_RATES.insideDhakaCharge),
    outsideDhakaCharge: nonNegativeRate(config.outsideDhakaCharge, DEFAULT_DELIVERY_RATES.outsideDhakaCharge),
    additionalKgCharge: nonNegativeRate(config.additionalKgCharge, DEFAULT_DELIVERY_RATES.additionalKgCharge),
    providerName: provider.name,
  };
}
