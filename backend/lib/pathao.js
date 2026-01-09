"use server";

const BASE_URL = process.env.PATHAO_BASE_URI || "https://api-hermes.pathao.com";
const CLIENT_ID = process.env.PATHAO_CLIENT_ID;
const CLIENT_SECRET = process.env.PATHAO_CLIENT_SECRET;
const USERNAME = process.env.PATHAO_USERNAME;
const PASSWORD = process.env.PATHAO_PASSWORD;

let cachedToken = null;
let cachedExpiresAt = null;

/**
 * ✅ Issue Access Token (OAuth 2.0)
 */
export async function getAccessToken() {
  const now = Date.now();

  // ✅ Use cached token if not expired
  if (cachedToken && cachedExpiresAt && now < cachedExpiresAt) {
    return cachedToken;
  }

  const response = await fetch(`${BASE_URL}/aladdin/api/v1/issue-token`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      grant_type: "password",
      username: USERNAME,
      password: PASSWORD,
    }),
  });

  if (!response.ok) {
    throw new Error("❌ Failed to get Pathao access token");
  }

  const data = await response.json();
  cachedToken = data.access_token;
  console.log("token", cachedToken);
  cachedExpiresAt = now + data.expires_in * 1000 - 60000; // expire 1 min early for safety
  console.log("tokem", cachedToken);
  return cachedToken;
}

/**
 * ✅ Calculate Delivery Charge
 */
export async function calculateDeliveryCharge({
  store_id,
  city_id,
  zone_id,
  weight = 0.5,
}) {
  const token = await getAccessToken();

  const response = await fetch(`${BASE_URL}/merchant/price-plan`, {
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
export async function getCities_Pathao() {
  const token = await getAccessToken();

  const response = await fetch(`${BASE_URL}/city-list`, {
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
export async function getZones(city_id) {
  const token = await getAccessToken();

  const response = await fetch(`${BASE_URL}/cities/${city_id}/zone-list`, {
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
export async function getAreas(zone_id) {
  const token = await getAccessToken();

  const response = await fetch(`${BASE_URL}/zones/${zone_id}/area-list`, {
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
export async function getStores() {
  const token = await getAccessToken();

  const response = await fetch(`${BASE_URL}/stores`, {
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
export async function createPathaoOrder(orderData) {
  const token = await getAccessToken();
  console.log("Creating Pathao order with data:", orderData);
  const response = await fetch(`${BASE_URL}/aladdin/api/v1/orders`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(orderData),
  });

  const result = await response.json();
  console.log("Pathao Order Response:", result);
  if (result.code !== 200) {
    throw new Error("❌ Failed to create order");
  }

  return result; // ✅ Returns order info (consignment_id, delivery_fee, etc.)
}

/**
 * ✅ Create Bulk Orders
 */
export async function createBulkOrder(ordersArray) {
  const token = await getAccessToken();

  const response = await fetch(`${BASE_URL}/orders/bulk`, {
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
export async function getPathaoOrderInfo(consignment_id) {
  const token = await getAccessToken();

  const response = await fetch(
    `${BASE_URL}/aladdin/api/v1/orders/${consignment_id}/info`,
    {
      method: "GET",
      headers: { Authorization: `Bearer ${token}` },
    }
  );

  const result = await response.json();
  console.log("Pathao Order Info Response:", result);
  if (!response.ok || result.code !== 200) {
    throw new Error("❌ Failed to fetch order info");
  }

  return result.data;
}
