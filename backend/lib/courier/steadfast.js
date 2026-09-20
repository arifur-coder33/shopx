// utils/steadfast.js

const getBaseUrl = (providerConfiguration) =>
  providerConfiguration?.config?.baseUrl ||
  "https://portal.packzy.com/api/v1";

const getHeaders = (providerConfiguration) => ({
  "Api-Key": providerConfiguration?.credentials?.apiKey,
  "Secret-Key": providerConfiguration?.credentials?.secretKey,
  "Content-Type": "application/json",
});

// 1. Single Order Create
export const createSteadfastOrder = async (
  orderData,
  providerConfiguration,
) => {
  try {
    const response = await fetch(`${getBaseUrl(providerConfiguration)}/create_order`, {
      method: "POST",
      headers: getHeaders(providerConfiguration),
      body: JSON.stringify(orderData),
    });

    const data = await response.json();

    if (!response.ok || data.status !== 200) {
      throw new Error(data.message || "Order create failed");
    }

    return {
      success: true,
      data: data.consignment,
    };
  } catch (error) {
    return {
      success: false,
      error: error.message || "Network error",
    };
  }
};

// 2. Check Delivery Status (3 ways)
export const getSteadfastDeliveryStatus = async (
  type,
  value,
  providerConfiguration,
) => {
  let endpoint = "";

  if (type === "consignment_id" || type === "cid") {
    endpoint = `/status_by_cid/${value}`;
  } else if (type === "invoice") {
    endpoint = `/status_by_invoice/${value}`;
  } else if (type === "tracking" || type === "tracking_code") {
    endpoint = `/status_by_trackingcode/${value}`;
  } else {
    return {
      success: false,
      error: "Invalid type. Use: cid, invoice, tracking",
    };
  }

  try {
    const response = await fetch(`${getBaseUrl(providerConfiguration)}${endpoint}`, {
      method: "GET",
      headers: getHeaders(providerConfiguration),
      cache: "no-store",
    });

    const data = await response.json();

    if (!response.ok || data.status !== 200) {
      throw new Error(data.message || "Status check failed");
    }

    return {
      success: true,
      status: data.delivery_status,
    };
  } catch (error) {
    return {
      success: false,
      error: error.message || "Network error",
    };
  }
};

// 3. Check Current Balance
export const getBalance = async (providerConfiguration) => {
  try {
    const response = await fetch(`${getBaseUrl(providerConfiguration)}/get_balance`, {
      method: "GET",
      headers: getHeaders(providerConfiguration),
    });

    const data = await response.json();

    if (!response.ok || data.status !== 200) {
      throw new Error(data.message || "Balance fetch failed");
    }

    return {
      success: true,
      balance: data.current_balance,
    };
  } catch (error) {
    return {
      success: false,
      error: error.message || "Network error",
    };
  }
};
