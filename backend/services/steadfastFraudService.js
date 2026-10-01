import prisma from "@/lib/prisma";
import { getProviderRuntimeConfiguration } from "@/backend/services/providerCredentialService";
import { getSteadfastFraudScore } from "@/backend/lib/courier/steadfast";

const inFlightChecks = new Map();
const HISTORY_CODE = "STEADFAST_HISTORY";

function savedHistory(factors) {
  return (Array.isArray(factors) ? factors : []).find((factor) => factor?.code === HISTORY_CODE);
}

async function fetchAndStore(orderId) {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: {
      phoneNumber: true,
      fraudRiskFactors: true,
      shipping: {
        select: {
          courierProviderId: true,
          courierProvider: { select: { adapterKey: true } },
        },
      },
    },
  });
  if (!order) return { success: false, error: "অর্ডার পাওয়া যায়নি।" };

  const factors = Array.isArray(order.fraudRiskFactors) ? order.fraudRiskFactors : [];
  const cached = savedHistory(factors);
  if (cached?.data) return { success: true, data: cached.data, checkedAt: cached.checkedAt, cached: true };

  let provider = null;
  if (order.shipping?.courierProvider?.adapterKey === "STEADFAST" && order.shipping.courierProviderId) {
    provider = await prisma.courierProvider.findUnique({
      where: { id: order.shipping.courierProviderId },
      include: { moneyAccount: true },
    });
  }
  if (!provider) {
    provider = await prisma.courierProvider.findFirst({
      where: { adapterKey: "STEADFAST", isActive: true },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      include: { moneyAccount: true },
    });
  }
  if (!provider) return { success: false, error: "Active Steadfast courier configuration পাওয়া যায়নি।" };

  const configuration = getProviderRuntimeConfiguration("courier", provider);
  if (!configuration.ready) return { success: false, error: "Steadfast API key, secret key ও active COD account যাচাই করুন।" };

  const result = await getSteadfastFraudScore(order.phoneNumber, configuration);
  if (!result.success) return result;

  const record = {
    code: HISTORY_CODE,
    points: 0,
    checkedAt: new Date().toISOString(),
    data: result.data,
  };
  await prisma.order.update({
    where: { id: orderId },
    data: {
      fraudRiskFactors: [
        ...factors.filter((factor) => factor?.code !== HISTORY_CODE),
        record,
      ],
    },
  });
  return { success: true, data: record.data, checkedAt: record.checkedAt, cached: false };
}

export function getOrFetchSteadfastHistory(orderId) {
  if (!orderId) return Promise.resolve({ success: false, error: "অর্ডার পাওয়া যায়নি।" });
  const ongoing = inFlightChecks.get(orderId);
  if (ongoing) return ongoing;

  const request = fetchAndStore(orderId).finally(() => inFlightChecks.delete(orderId));
  inFlightChecks.set(orderId, request);
  return request;
}
