"use server";

import { createHash } from "node:crypto";

const tokenCache = new Map();

const pathaoSettings = (providerConfiguration) => {
  const credentials = providerConfiguration?.credentials || {};
  const baseUrl = providerConfiguration?.config?.baseUri;
  const required = [
    credentials.clientId,
    credentials.clientSecret,
    credentials.username,
    credentials.password,
  ];
  if (!baseUrl || required.some((value) => !value)) {
    throw new Error("Pathao credentials are not configured on the server.");
  }
  return { baseUrl, ...credentials };
};

async function readPathaoResponse(response, operation) {
  const result = await response.json().catch(() => null);
  const code = Number(result?.code);
  if (!response.ok || code !== 200) {
    const detail = result?.message || result?.data?.message || result?.errors?.message;
    throw new Error(
      `Pathao ${operation} failed (${response.status}${Number.isFinite(code) ? `, code ${code}` : ""})${detail ? `: ${detail}` : "."}`,
    );
  }
  return result;
}

/**
 * ✅ Issue Access Token (OAuth 2.0)
 */
export async function getAccessToken(providerConfiguration) {
  const now = Date.now();
  const settings = pathaoSettings(providerConfiguration);
  const cacheKey = createHash("sha256")
    .update(`${settings.baseUrl}:${settings.clientId}:${settings.username}`)
    .digest("hex");
  const cached = tokenCache.get(cacheKey);

  // ✅ Use cached token if not expired
  if (cached?.token && now < cached.expiresAt) {
    return cached.token;
  }

  const response = await fetch(`${settings.baseUrl}/aladdin/api/v1/issue-token`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: settings.clientId,
      client_secret: settings.clientSecret,
      grant_type: "password",
      username: settings.username,
      password: settings.password,
    }),
  });

  const data = await readPathaoResponse(response, "token request");
  if (!data?.access_token) {
    throw new Error("Pathao token request succeeded without an access token.");
  }
  tokenCache.set(cacheKey, {
    token: data.access_token,
    expiresAt: now + data.expires_in * 1000 - 60000,
  });
  return data.access_token;
}

/**
 * ✅ Calculate Delivery Charge
 */
export async function calculateDeliveryCharge(
  { store_id, city_id, zone_id, weight = 0.5 },
  providerConfiguration,
) {
  const token = await getAccessToken(providerConfiguration);
  const { baseUrl } = pathaoSettings(providerConfiguration);

  const response = await fetch(`${baseUrl}/merchant/price-plan`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      store_id,
      item_type: 2, // 1=Document, 2=Parcel
      delivery_type: 48, // 48=Normal Delivery
      item_weight: weight,
      recipient_city: city_id,
      recipient_zone: zone_id,
    }),
  });

  const result = await response.json();
  if (!response.ok || result.code !== 200) {
    throw new Error("❌ Failed to fetch delivery charge");
  }

  return result.data.final_price;
}

/**
 * ✅ Get All Cities
 */
export async function getCities_Pathao(providerConfiguration) {
  const token = await getAccessToken(providerConfiguration);
  const { baseUrl } = pathaoSettings(providerConfiguration);

  const response = await fetch(`${baseUrl}/city-list`, {
    method: "GET",
    headers: { Authorization: `Bearer ${token}` },
  });

  const result = await response.json();
  if (!response.ok || result.code !== 200) {
    throw new Error("❌ Failed to fetch cities");
  }

  return result.data.data; // ✅ Returns array [{ city_id, city_name }]
}

/**
 * ✅ Get Zones for a City
 */
export async function getZones(city_id, providerConfiguration) {
  const token = await getAccessToken(providerConfiguration);
  const { baseUrl } = pathaoSettings(providerConfiguration);

  const response = await fetch(`${baseUrl}/cities/${city_id}/zone-list`, {
    method: "GET",
    headers: { Authorization: `Bearer ${token}` },
  });

  const result = await response.json();
  if (!response.ok || result.code !== 200) {
    throw new Error("❌ Failed to fetch zones");
  }

  return result.data.data; // ✅ Returns array [{ zone_id, zone_name }]
}

/**
 * ✅ Get Areas for a Zone (Optional but useful for checkout forms)
 */
export async function getAreas(zone_id, providerConfiguration) {
  const token = await getAccessToken(providerConfiguration);
  const { baseUrl } = pathaoSettings(providerConfiguration);

  const response = await fetch(`${baseUrl}/zones/${zone_id}/area-list`, {
    method: "GET",
    headers: { Authorization: `Bearer ${token}` },
  });

  const result = await response.json();
  if (!response.ok || result.code !== 200) {
    throw new Error("❌ Failed to fetch areas");
  }

  return result.data.data; // ✅ Returns array [{ area_id, area_name, home_delivery_available, pickup_available }]
}

/**
 * ✅ Get Merchant Stores (to find store_id)
 */
export async function getStores(providerConfiguration) {
  const token = await getAccessToken(providerConfiguration);
  const { baseUrl } = pathaoSettings(providerConfiguration);

  const response = await fetch(`${baseUrl}/stores`, {
    method: "GET",
    headers: { Authorization: `Bearer ${token}` },
  });

  const result = await response.json();
  if (!response.ok || result.code !== 200) {
    throw new Error("❌ Failed to fetch stores");
  }

  return result.data.data; // ✅ Returns array of stores [{ store_id, store_name, city_id, zone_id }]
}

/**
 * ✅ Create a Single Order
 */
export async function createPathaoOrder(orderData, providerConfiguration) {
  const token = await getAccessToken(providerConfiguration);
  const { baseUrl } = pathaoSettings(providerConfiguration);
  const response = await fetch(`${baseUrl}/aladdin/api/v1/orders`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(orderData),
  });

  const result = await readPathaoResponse(response, "order booking");

  return result; // ✅ Returns order info (consignment_id, delivery_fee, etc.)
}

/**
 * ✅ Create Bulk Orders
 */
export async function createBulkOrder(ordersArray, providerConfiguration) {
  const token = await getAccessToken(providerConfiguration);
  const { baseUrl } = pathaoSettings(providerConfiguration);

  const response = await fetch(`${baseUrl}/orders/bulk`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ orders: ordersArray }),
  });

  const result = await response.json();
  if (!response.ok || result.code !== 202) {
    throw new Error("❌ Failed to create bulk orders");
  }

  return result; // ✅ Returns confirmation
}

/**
 * ✅ Get Order Info by Consignment ID
 */
export async function getPathaoOrderInfo(consignment_id, providerConfiguration) {
  const token = await getAccessToken(providerConfiguration);
  const { baseUrl } = pathaoSettings(providerConfiguration);

  const response = await fetch(
    `${baseUrl}/aladdin/api/v1/orders/${consignment_id}/info`,
    {
      method: "GET",
      headers: { Authorization: `Bearer ${token}` },
    }
  );

  const result = await response.json();
  if (!response.ok || result.code !== 200) {
    throw new Error("❌ Failed to fetch order info");
  }

  return result.data;
}
