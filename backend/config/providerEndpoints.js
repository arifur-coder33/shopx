/**
 * Central endpoint registry for payment and courier providers.
 * Provider credentials stay encrypted in the database; change API hosts here.
 */
export const PROVIDER_ENDPOINTS = Object.freeze({
  BKASH: Object.freeze({
    sandbox: "https://tokenized.sandbox.bka.sh/v1.2.0-beta",
    live: "https://tokenized.pay.bka.sh/v1.2.0-beta",
  }),
  NAGAD: Object.freeze({
    sandbox: "https://sandboxapi.nagad.com.bd/remote-payment-gateway-1.0/api/dfs",
    live: "https://api.nagad.com.bd/remote-payment-gateway-1.0/api/dfs",
  }),
  SSLCOMMERZ: Object.freeze({
    sandbox: "https://sandbox.sslcommerz.com",
    live: "https://securepay.sslcommerz.com",
  }),
  STEADFAST: Object.freeze({
    default: "https://portal.packzy.com/api/v1",
  }),
  PATHAO: Object.freeze({
    sandbox: "https://courier-api-sandbox.pathao.com",
    live: "https://api-hermes.pathao.com",
  }),
});

const isLiveEnvironment = (value) => value === true || String(value) === "true";

export function getProviderEndpointConfiguration(adapterKey, configuration = {}) {
  const key = String(adapterKey || "").toUpperCase();
  const endpoints = PROVIDER_ENDPOINTS[key];
  if (!endpoints) return {};

  if (key === "STEADFAST") return { baseUrl: endpoints.default };

  const environment = isLiveEnvironment(configuration.isLive) ? "live" : "sandbox";
  const baseUrl = endpoints[environment];
  return key === "PATHAO" ? { baseUri: baseUrl } : { baseUrl };
}

export function getProviderBaseUrl(adapterKey, configuration = {}) {
  const endpointConfiguration = getProviderEndpointConfiguration(adapterKey, configuration);
  return endpointConfiguration.baseUrl || endpointConfiguration.baseUri || "";
}
