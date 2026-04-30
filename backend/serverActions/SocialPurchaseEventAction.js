// /lib/tracking/firePurchaseServer.js

import { fireFacebookCAPI } from "../utils/SocialServerEvent/fireFacebookCAPI";
import { fireGoogleServer } from "../utils/SocialServerEvent/fireGoogleServer";
import { fireTikTokServer } from "../utils/SocialServerEvent/fireTikTokServer";

export async function firePurchaseServer(order) {
  try {
    const eventId = `purchase_${order.id}`;

    const payload = {
      event: "purchase",
      eventId,
      value: order.orderPrice,
      currency: "BDT",

      items: order.items.map((item) => ({
        id: item.productId,
        quantity: item.quantity,
        price: item.price,
        name: item.productName,
      })),

      user: {
        email: order.email,
        phone: order.phoneNumber,
        fbp: order.fbp,
        fbc: order.fbc,
        gclid: order.gclid,
        ttclid: order.ttclid,
        ip: order.ipAddress,
        agent: order.userAgent,
      },
    };

Promise.all([
  fireFacebookCAPI(payload),
  fireGoogleServer(payload),
  fireTikTokServer(payload),
]).catch(console.error);

    return true;
  } catch (err) {
    console.error("Purchase tracking error:", err);
    return false;
  }
}
