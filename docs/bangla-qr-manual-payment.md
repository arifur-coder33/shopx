# Manual Bangla QR payments

The Prisma migration registers an inactive `BANGLA_QR` gateway. After deploying
the migration, in Settings → Payment Gateways, configure the merchant's
HTTPS QR image URL, merchant number/name and instructions, map its Money Account,
then enable it. It becomes available at checkout only when the setup is ready.

The customer scans the configured static Bangla QR, submits the TrxID from order
tracking, and waits. An order admin can confirm or reject that submitted TrxID;
confirmation uses the standard payment posting and accounting flow. Submission,
confirmation and rejection are written to the order timeline. The app does not
verify the QR transaction automatically; the admin must verify the receipt in
the merchant's banking channel before confirming.

Customer address and Dhaka delivery-area changes are allowed while the order is
pending. The delivery fee and due amount are recalculated and the change is
written to the timeline. Customers may cancel until the order is confirmed; if
payment was already received, the timeline flags it for refund review.

Before confirmation, COD customers can switch to an online payment method.
Failed online payments show Pay now, and order admins can change an unpaid failed
payment to COD. COD orders do not show a payment retry action.
