const minutes = (value) => value * 60 * 1000;

export function assessOrderRisk({
  paymentMethod,
  orderAmount,
  phoneNumber,
  ipAddress,
  userAgent,
  deliveryAddress,
  city,
  thana,
  history = [],
  now = Date.now(),
  orderCreatedAt = now,
}) {
  const factors = [];
  const add = (code, points, label, detail) => factors.push({ code, points, label, detail });

  if (paymentMethod === "COD") {
    const phoneOrders = history.filter((order) => order.phoneNumber === phoneNumber);
    const recentPhoneOrders = phoneOrders.filter((order) => Math.abs(now - new Date(order.createdAt).getTime()) <= minutes(10));
    if (recentPhoneOrders.length >= 4) add("PHONE_VELOCITY", 35, "একই নম্বরে দ্রুত অনেক অর্ডার", "১০ মিনিটে এই নম্বরে আরও " + recentPhoneOrders.length + "টি অর্ডার হয়েছে।");
    else if (recentPhoneOrders.length >= 1) add("PHONE_VELOCITY", 25, "একই নম্বরে দ্রুত অর্ডার", "১০ মিনিটে এই নম্বরে আরও " + recentPhoneOrders.length + "টি অর্ডার হয়েছে।");

    const failedCodOrders = phoneOrders.filter((order) =>
      order.paymentMethod === "COD" && ["DELIVERY_FAILED", "FAILED_RETURNING", "FAILED_RETURN_RECEIVED", "RETURNING", "RETURNED"].includes(order.status),
    );
    if (failedCodOrders.length >= 4) add("COD_FAILURE_HISTORY", 30, "আগের COD অর্ডার ফেরত/ব্যর্থ", failedCodOrders.length + "টি আগের COD অর্ডার সফলভাবে সম্পন্ন হয়নি।");
    else if (failedCodOrders.length >= 2) add("COD_FAILURE_HISTORY", 20, "আগের COD অর্ডার ফেরত/ব্যর্থ", failedCodOrders.length + "টি আগের COD অর্ডার সফলভাবে সম্পন্ন হয়নি।");
    else if (failedCodOrders.length === 1) add("COD_FAILURE_HISTORY", 10, "একটি আগের COD অর্ডার ফেরত/ব্যর্থ", "একটি আগের COD অর্ডার সফলভাবে সম্পন্ন হয়নি।");

    const sameDevice = history.filter((order) =>
      ipAddress && userAgent && order.ipAddress === ipAddress && order.userAgent === userAgent &&
      Math.abs(now - new Date(order.createdAt).getTime()) <= minutes(10),
    );
    if (sameDevice.length >= 5) add("DEVICE_VELOCITY", 30, "একই নেটওয়ার্ক ও ব্রাউজার থেকে দ্রুত অর্ডার", "১০ মিনিটে এই IP ও browser থেকে আরও " + sameDevice.length + "টি অর্ডার হয়েছে।");
    else if (sameDevice.length >= 2) add("DEVICE_VELOCITY", 20, "একই নেটওয়ার্ক ও ব্রাউজার থেকে দ্রুত অর্ডার", "১০ মিনিটে এই IP ও browser থেকে আরও " + sameDevice.length + "টি অর্ডার হয়েছে।");

    if (!String(deliveryAddress || "").trim() || String(deliveryAddress).trim().length < 10 || !city || !thana) {
      add("INCOMPLETE_ADDRESS", 15, "ঠিকানা অসম্পূর্ণ", "ঠিকানা, জেলা বা থানা আবার যাচাই করুন।");
    }
    const phoneOrdersBefore = phoneOrders.filter((order) => new Date(order.createdAt).getTime() < new Date(orderCreatedAt).getTime());
    if (phoneOrdersBefore.length === 0 && Number(orderAmount) >= 10000) {
      add("NEW_CUSTOMER_HIGH_COD", 10, "নতুন নম্বরে বড় COD অর্ডার", "এই নম্বরে আগের অর্ডার নেই এবং COD অর্ডারের পরিমাণ ৳১০,০০০ বা বেশি।");
    }
  }

  const score = Math.min(100, factors.reduce((sum, factor) => sum + factor.points, 0));
  const level = score >= 80 ? "VERY_HIGH" : score >= 60 ? "HIGH" : score >= 30 ? "MEDIUM" : "LOW";
  return { score, level, factors };
}
