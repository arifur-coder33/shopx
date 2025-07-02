// /lib/pathao.js
const BASE_URL = "https://courier-api-sandbox.pathao.com/aladdin/api/v1";
const CLIENT_ID = process.env.PATHAO_CLIENT_ID;
const CLIENT_SECRET = process.env.PATHAO_CLIENT_SECRET;
const USERNAME = process.env.PATHAO_USERNAME;
const PASSWORD = process.env.PATHAO_PASSWORD;

let cachedToken = null;
let cachedExpiresAt = null;

export async function getAccessToken() {
  const now = Date.now();
  if (cachedToken && cachedExpiresAt && now < cachedExpiresAt) {
    return cachedToken;
  }

  const response = await fetch(`${BASE_URL}/issue-token`, {
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
    throw new Error("Failed to get Pathao access token");
  }

  const data = await response.json();
  cachedToken = data.access_token;
  cachedExpiresAt = now + data.expires_in * 1000 - 60000;
  return cachedToken;
}

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
      item_type: 2,
      delivery_type: 48,
      item_weight: weight,
      recipient_city: city_id,
      recipient_zone: zone_id,
    }),
  });

  const result = await response.json();
  if (!response.ok || result.code !== 200) {
    throw new Error("Failed to fetch delivery charge");
  }

  return result.data.final_price;
}
