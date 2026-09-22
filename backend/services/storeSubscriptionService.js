import prisma from "../../lib/prisma.js";
import { requireCurrentStoreId } from "./storeContextService.js";

// These are server-only reads. Store identity always comes from the existing
// trusted hostname context, never a form field or caller-supplied Store ID.
export async function getStoreSubscription() {
  const storeId = await requireCurrentStoreId();
  const store = await prisma.store.findUnique({ where: { id: storeId }, select: { currentSubscriptionId: true } });
  if (!store?.currentSubscriptionId) return null;
  const subscription = await prisma.subscription.findUnique({
    where: { id: store.currentSubscriptionId, storeId },
    include: { plan: true },
  });
  if (!subscription) throw new Error("Current subscription does not belong to this Store.");
  return subscription;
}

export function subscriptionGrantsPlan(subscription, now = new Date()) {
  if (!subscription) return false;
  const periodStart = new Date(subscription.currentPeriodStart);
  const periodEnd = new Date(subscription.currentPeriodEnd);
  if (Number.isNaN(periodStart.getTime()) || Number.isNaN(periodEnd.getTime()) || periodStart > now || periodEnd <= now) return false;
  switch (subscription.status) {
    case "ACTIVE":
      return true;
    case "TRIALING":
      return Boolean(subscription.trialStartedAt && subscription.trialEndsAt && new Date(subscription.trialStartedAt) <= now && new Date(subscription.trialEndsAt) > now);
    case "CANCELLED":
      // Cancellation stops renewal; paid access remains until period end.
      return true;
    case "PAST_DUE":
    case "EXPIRED":
    case "SUSPENDED":
    default:
      // Safe temporary rule: paid features fall back to FREE while past due.
      return false;
  }
}

export async function hasActiveSubscription() {
  return subscriptionGrantsPlan(await getStoreSubscription());
}

export async function getActiveStorePlan() {
  const subscription = await getStoreSubscription();
  if (subscriptionGrantsPlan(subscription)) return subscription.plan;
  // A Store without a subscription (including pre-Phase-26 Stores) retains
  // the FREE entitlement. No fake billing record is created for it.
  return prisma.plan.findUnique({ where: { slug: "FREE" } });
}

export async function getStorePlanLimits() {
  const plan = await getActiveStorePlan();
  return plan?.limits && typeof plan.limits === "object" && !Array.isArray(plan.limits) ? plan.limits : {};
}

export async function canUseFeature(feature) {
  if (typeof feature !== "string" || !feature) return false;
  const plan = await getActiveStorePlan();
  return plan?.features?.[feature] === true;
}

export async function getPlanLimit(limit) {
  if (typeof limit !== "string" || !limit) return null;
  const limits = await getStorePlanLimits();
  const value = limits[limit];
  return Number.isSafeInteger(value) && value >= 0 ? value : null;
}
