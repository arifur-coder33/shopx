/**
 * Rocket/DBBL Nexus adapter boundary.
 *
 * DBBL publicly exposes a merchant-payment product and a Nexus SOAP service,
 * but the merchant-specific operations, request signing and callback validation
 * contract are issued during onboarding. This adapter intentionally remains
 * disabled until that official WSDL/integration pack and merchant credentials
 * are available. Never mark a Rocket payment paid from browser parameters alone.
 */
export async function createRocketPayment() {
  throw new Error(
    "Rocket requires the official DBBL merchant integration pack before this adapter can be enabled.",
  );
}
