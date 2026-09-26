"use client";

import { getCheckoutProviders } from "@/backend/serverActions/providerConfigurationAction";
import Image from "next/image";
import CampaignCountdown from "@/app/(user)/(withMobileFooter)/campaign/CampaignCountdown";
import { getCampaignRuleText } from "@/components/campaign/campaignRuleText";
import { replaceNumbers } from "@/utils/engToBanNumber";
import { useEffect, useState } from "react";

const EMPTY_PROVIDERS = { codEnabled: false, gateways: [] };

const logoByCode = {
  COD: "/images/payments/cod.svg",
  ONLINE: "/images/payments/card.svg",
  SSLCOMMERZ: "/images/payments/sslcommerz.svg",
  BKASH: "/images/payments/bkash.svg",
  NAGAD: "/images/payments/nagad.svg",
  ROCKET: "/images/payments/rocket.svg",
  EMI: "/images/payments/emi.svg",
};

function PaymentCard({ id, title, description, logo, selected, onSelect }) {
  return (
    <label
      htmlFor={id}
      className={`relative flex min-h-20 cursor-pointer items-center gap-3 rounded-2xl border p-3 transition-colors ${
        selected
          ? "border-primary bg-primary-soft ring-2 ring-primary/20"
          : "border-border bg-surface hover:border-primary/50 hover:bg-surface-muted"
      }`}
    >
      <input
        id={id}
        type="radio"
        checked={selected}
        onChange={onSelect}
        className="sr-only"
      />
      <span className="flex h-12 w-16 shrink-0 items-center justify-center rounded-xl border border-border bg-white p-1.5">
        <Image
          src={logo}
          width={60}
          height={38}
          alt=""
          unoptimized
          className="h-full w-full object-contain"
        />
      </span>
      <span className="min-w-0 flex-1">
        <strong className="block text-sm text-text">{title}</strong>
        {description && (
          <span className="mt-0.5 block text-xs font-normal leading-5 text-text-muted">
            {description}
          </span>
        )}
      </span>
      <span
        className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border text-xs ${
          selected ? "border-primary bg-primary text-white" : "border-border"
        }`}
        aria-hidden="true"
      >
        {selected ? "✓" : ""}
      </span>
    </label>
  );
}

export default function PaymentMethodSelector({
  setPaymentSelection,
  className = "",
  initialProviders,
  paymentDeliveryCampaigns = [],
  cartItems = [],
}) {
  const [mode, setMode] = useState("");
  const [selectedKey, setSelectedKey] = useState("");
  const [providers, setProviders] = useState(
    initialProviders || EMPTY_PROVIDERS,
  );
  const [loading, setLoading] = useState(initialProviders === undefined);
  const [error, setError] = useState("");

  useEffect(() => {
    if (initialProviders !== undefined) return undefined;
    let active = true;
    getCheckoutProviders()
      .then((data) => active && setProviders(data))
      .catch(() => active && setError("Payment options could not be loaded."))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [initialProviders]);

  const visiblePaymentDeliveryCampaigns = paymentDeliveryCampaigns.filter((campaign) => {
    const productTargets = campaign.products || [];
    const categoryTargets = campaign.categories || [];
    const itemMatch = (!productTargets.length && !categoryTargets.length) || cartItems.some((item) =>
      productTargets.includes(item.productId || item.id) ||
      Boolean(item.categoryId && categoryTargets.includes(item.categoryId))
    );
    if (!itemMatch) return false;

    const scope = campaign.configuration?.paymentScope;
    const onlineCodes = providers.gateways.map((provider) => String(provider.code || provider.adapterKey || "").toUpperCase());
    const selectedMethods = campaign.paymentMethods || [];
    if (scope === "COD") return providers.codEnabled;
    if (scope === "ONLINE") return onlineCodes.length > 0 && (!selectedMethods.length || selectedMethods.some((code) => onlineCodes.includes(code)));
    if (!selectedMethods.length) return providers.codEnabled || onlineCodes.length > 0;
    return (providers.codEnabled && selectedMethods.includes("COD")) || selectedMethods.some((code) => onlineCodes.includes(code));
  });

  const selectMode = (nextMode) => {
    setMode(nextMode);
    setSelectedKey("");
    setPaymentSelection(nextMode === "COD" ? { paymentMethod: "COD" } : null);
  };

  const selectProvider = (provider, paymentMethod = "ONLINE") => {
    const key = `${provider.id}:${paymentMethod}`;
    setSelectedKey(key);
    setPaymentSelection({
      paymentMethod,
      paymentGatewayId: provider.id,
    });
  };

  return (
    <section
      id="paymentMethod"
      className={`rounded-2xl border border-border bg-surface p-4 shadow-sm ${className}`}
    >
      <div className="mb-3 flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
        <div className="shrink-0">
          <h2 className="font-bold text-text">পেমেন্ট মেথড</h2>
          <p className="text-xs font-normal text-text-muted">
            আপনার সুবিধামতো পেমেন্ট নির্বাচন করুন
          </p>
        </div>
        {visiblePaymentDeliveryCampaigns.length > 0 && <div className="min-w-0 space-y-1 sm:text-right">
          {visiblePaymentDeliveryCampaigns.map((campaign) => <div key={campaign.id} className="flex flex-wrap items-center gap-x-2 gap-y-0.5 rounded-lg bg-primary-soft px-2 py-1.5 text-xs sm:justify-end">
            <span className="font-semibold text-primary">ক্যাম্পেইন {replaceNumbers(campaign.name)}: {replaceNumbers(getCampaignRuleText(campaign))}</span>
            <CampaignCountdown compact showCompactLabel startAt={campaign.startAt} endAt={campaign.endAt} className="text-xs text-text-muted" />
          </div>)}
        </div>}
      </div>

      {loading ? (
        <div
          className="grid grid-cols-2 gap-2"
          aria-label="পেমেন্ট মেথড লোড হচ্ছে"
        >
          <div className="h-20 animate-pulse rounded-2xl bg-surface-muted" />
          <div className="h-20 animate-pulse rounded-2xl bg-surface-muted" />
        </div>
      ) : (
        <div className="grid gap-2 sm:grid-cols-2">
          {providers.codEnabled && (
            <PaymentCard
              id="payment-mode-cod"
              title="ক্যাশ অন ডেলিভারি"
              description="পণ্য হাতে পেয়ে টাকা দিন"
              logo={logoByCode.COD}
              selected={mode === "COD"}
              onSelect={() => selectMode("COD")}
            />
          )}
          {providers.gateways.length > 0 && (
            <PaymentCard
              id="payment-mode-online"
              title="অনলাইন পেমেন্ট"
              description="কার্ড বা মোবাইল ব্যাংকিং"
              logo={logoByCode.ONLINE}
              selected={mode === "ONLINE"}
              onSelect={() => selectMode("ONLINE")}
            />
          )}
        </div>
      )}

      {!loading && !providers.codEnabled && !providers.gateways.length && (
        <p className="mt-2 rounded-xl bg-red-50 p-3 text-sm font-normal text-red-600">
          কোনো পেমেন্ট মেথড বর্তমানে চালু নেই।
        </p>
      )}

      {mode === "COD" && (
        <p className="mt-3 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm font-normal text-emerald-800">
          পণ্য হাতে পেয়ে রাইডারকে টাকা পরিশোধ করুন।
        </p>
      )}

      {mode === "ONLINE" && (
        <div className="mt-4 border-t border-border pt-4">
          <p className="mb-2 text-sm font-semibold text-text">
            গেটওয়ে নির্বাচন করুন
          </p>
          {error ? (
            <p className="text-sm font-normal text-red-600">{error}</p>
          ) : (
            <div className="grid gap-2 sm:grid-cols-2">
              {providers.gateways.map((provider) => {
                const code = String(
                  provider.adapterKey || provider.code || "ONLINE",
                ).toUpperCase();
                const regularKey = `${provider.id}:ONLINE`;
                const supportsEmi = code === "SSLCOMMERZ";
                return (
                  <div key={provider.id} className="contents">
                    <PaymentCard
                      id={`gateway-${provider.id}`}
                      title={provider.name}
                      description={
                        supportsEmi
                          ? "কার্ড ও অন্যান্য অনলাইন পেমেন্ট"
                          : "নিরাপদ অনলাইন পেমেন্ট"
                      }
                      logo={logoByCode[code] || logoByCode.ONLINE}
                      selected={selectedKey === regularKey}
                      onSelect={() => selectProvider(provider)}
                    />
                    {supportsEmi && (
                      <PaymentCard
                        id={`gateway-${provider.id}-emi`}
                        title="Installment / EMI"
                        description=" Credit card ও কিস্তির মেয়াদ নির্বাচন করুন"
                        logo={logoByCode.EMI}
                        selected={selectedKey === `${provider.id}:EMI`}
                        onSelect={() => selectProvider(provider, "EMI")}
                      />
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </section>
  );
}
