// utils/steadfast.js

const getBaseUrl = (providerConfiguration) => providerConfiguration?.config?.baseUrl;

const getHeaders = (providerConfiguration) => ({
  "Api-Key": providerConfiguration?.credentials?.apiKey,
  "Secret-Key": providerConfiguration?.credentials?.secretKey,
  "Content-Type": "application/json",
});

export const normalizeSteadfastPhone = (value) => {
  const digits = String(value || "").replace(/\D/g, "");
  return digits.startsWith("8801") && digits.length === 13
    ? `0${digits.slice(3)}`
    : digits;
};

const getSteadfastBookingPayload = (orderData) => {
  const invoice = String(orderData.invoice || "").trim();
  const recipientName = String(orderData.recipient_name || "").trim();
  const recipientPhone = normalizeSteadfastPhone(orderData.recipient_phone);
  const recipientAddress = String(orderData.recipient_address || "").trim();
  const codAmount = Number(orderData.cod_amount);
  const errors = [];

  if (!invoice || invoice.length > 100 || !/^[A-Za-z0-9_-]+$/.test(invoice)) errors.push("invoice: letters, digits, hyphens or underscores only (max 100 characters)");
  if (!recipientName || recipientName.length > 100) errors.push("recipient_name: required, maximum 100 characters");
  if (!/^01\d{9}$/.test(recipientPhone)) errors.push("recipient_phone: must be 11 digits beginning with 01");
  if (!recipientAddress || recipientAddress.length > 490) errors.push("recipient_address: required, maximum 490 characters");
  if (!Number.isFinite(codAmount) || codAmount < 0 || codAmount > 1000000) errors.push("cod_amount: must be between 0 and 1,000,000 BDT");

  const note = String(orderData.note || "").trim();
  if (note.length > 480) errors.push("note: maximum 480 characters");
  const alternativePhone = orderData.alternative_phone
    ? normalizeSteadfastPhone(orderData.alternative_phone)
    : "";
  if (alternativePhone && !/^01\d{9}$/.test(alternativePhone)) errors.push("alternative_phone: must be 11 digits beginning with 01");
  const itemDescription = String(orderData.item_description || "").trim();
  if (itemDescription.length > 255) errors.push("item_description: maximum 255 characters");
  const totalLot = orderData.total_lot == null || orderData.total_lot === "" ? 1 : Number(orderData.total_lot);
  if (!Number.isFinite(totalLot) || totalLot <= 0) errors.push("total_lot: must be greater than 0");
  const deliveryType = orderData.delivery_type == null ? 0 : Number(orderData.delivery_type);
  if (![0, 1].includes(deliveryType)) errors.push("delivery_type: must be 0 or 1");
  if (errors.length) throw new Error(errors.join("; "));

  return {
    invoice,
    recipient_name: recipientName,
    recipient_phone: recipientPhone,
    recipient_address: recipientAddress,
    cod_amount: codAmount,
    ...(note ? { note } : {}),
    ...(alternativePhone ? { alternative_phone: alternativePhone } : {}),
    ...(orderData.recipient_email ? { recipient_email: String(orderData.recipient_email).trim() } : {}),
    ...(itemDescription ? { item_description: itemDescription } : {}),
    ...(orderData.total_lot != null ? { total_lot: totalLot } : {}),
    ...(orderData.delivery_type != null ? { delivery_type: deliveryType } : {}),
  };
};

// 1. Single Order Create
export const createSteadfastOrder = async (
  orderData,
  providerConfiguration,
) => {
  try {
    const payload = getSteadfastBookingPayload(orderData);
    const baseUrl = getBaseUrl(providerConfiguration).replace(/\/+$/, "");
    const response = await fetch(`${baseUrl}/create_order`, {
      method: "POST",
      headers: getHeaders(providerConfiguration),
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(15000),
    });

    const data = await response.json().catch(() => null);

    if (!response.ok || data?.status !== 200) {
      const fieldErrors = data?.errors && typeof data.errors === "object"
        ? Object.entries(data.errors).map(([field, message]) => `${field}: ${Array.isArray(message) ? message.join(", ") : String(message)}`).join(" · ")
        : "";
      throw new Error(fieldErrors || data?.message || `Steadfast order create failed (${response.status}).`);
    }

    const consignment = data.consignment;
    if (!consignment?.consignment_id || !consignment?.tracking_code) {
      throw new Error("Steadfast booking response is missing consignment_id or tracking_code. Check the invoice in Steadfast before retrying.");
    }

    return {
      success: true,
      data: consignment,
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

export const getSteadfastFraudScore = async (phoneNumber, providerConfiguration) => {
  const digits = String(phoneNumber || "").replace(/\D/g, "");
  const phone = digits.startsWith("8801") && digits.length === 13
    ? `0${digits.slice(3)}`
    : digits;
  if (phone.length < 8 || phone.length > 15) {
    return { success: false, error: "সঠিক customer phone number পাওয়া যায়নি।" };
  }

  try {
    const baseUrl = getBaseUrl(providerConfiguration).replace(/\/+$/, "");
    const response = await fetch(`${baseUrl}/fraud_check/score/${encodeURIComponent(phone)}`, {
      method: "GET",
      headers: getHeaders(providerConfiguration),
      cache: "no-store",
      signal: AbortSignal.timeout(10000),
    });
    const result = await response.json().catch(() => null);
    if (response.status === 429) {
      throw new Error("Steadfast fraud-check rate limit হয়েছে। কিছুক্ষণ পর আবার চেষ্টা করুন।");
    }
    if (!response.ok || result?.status !== 200) {
      throw new Error(result?.message || "Steadfast customer history পাওয়া যায়নি।");
    }

    return {
      success: true,
      data: {
        phone: result.phone || phone,
        deliveryRatio: Number.isFinite(result.delivery_ratio) ? result.delivery_ratio : null,
        cancellationRatio: Number.isFinite(result.cancellation_ratio) ? result.cancellation_ratio : null,
        volumeBand: result.volume_band || "none",
        totalReports: Number.isFinite(result.total_reports) ? result.total_reports : 0,
        fraudCategories: result.fraud_categories && typeof result.fraud_categories === "object"
          ? result.fraud_categories
          : {},
        scoringDisabled: result.scoring_disabled === true,
        doubtfulReports: result.doubtful_reports === true,
      },
    };
  } catch (error) {
    return { success: false, error: error.message || "Steadfast fraud-check request failed." };
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
