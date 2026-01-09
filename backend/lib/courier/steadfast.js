// utils/steadfast.js

const BASE_URL = "https://portal.packzy.com/api/v1";

const getHeaders = () => ({
  "Api-Key": process.env.STEADFAST_API_KEY,
  "Secret-Key": process.env.STEADFAST_SECRET_KEY,
  "Content-Type": "application/json",
});

// 1. Single Order Create
export const createSteadfastOrder = async (orderData) => {
  try {
    const response = await fetch(`${BASE_URL}/create_order`, {
      method: "POST",
      headers: getHeaders(),
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
export const getSteadfastDeliveryStatus = async (type, value) => {
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
    const response = await fetch(`${BASE_URL}${endpoint}`, {
      method: "GET",
      headers: getHeaders(),
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
export const getBalance = async () => {
  try {
    const response = await fetch(`${BASE_URL}/get_balance`, {
      method: "GET",
      headers: getHeaders(),
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
