"use client";
import { resolveComboRewards } from "@/components/campaign/resolveComboRewards";
import { Truck } from "lucide-react";
import Button from "../button";
import { useSiteAppearance } from "@/components/common/Providers";
import DeliveryAddress from "./DeliveryAddress";

import { getCheckoutCampaignPreview } from "@/backend/serverActions/checkoutCampaignPreviewAction";
import { createOrder } from "@/backend/serverActions/orderActions";
import { saveAbandonedCheckoutLeadAction } from "@/backend/serverActions/abandonedCheckoutActions";
import { initiateConfiguredPayment } from "@/backend/serverActions/paymentInitiationAction";
import { useCart } from "@/context/CartContext";
import { getCapturedOrderAttribution, getOrderClickIds } from "@/lib/orderAttribution";
import { useSession } from "next-auth/react";
import { flushSync } from "react-dom";
import {
  cloneElement,
  isValidElement,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { calculateCampaignPreviewFallback } from "./campaignPreviewFallback";
import CheckoutProgressOverlay from "./CheckoutProgressOverlay";
import DeliveryAreaSelector from "./DeliveryAreaSelector";
import PaymentMethodSelector from "./PaymentMethodSelector";
const CHECKOUT_DRAFT_KEY = "checkout-customer-draft:v2";
const CHECKOUT_CUSTOMER_FIELDS = [
  "customerName", "phoneNumber", "deliveryAddress", "district", "thana", "email", "note",
];

export default function OrderForm({
  setDeliveryArea,
  children,
  products,
  buyNow,
  deliveryCharge,
  data,
  initialQty,
  variationId,
  deliveryArea,
  deliveryRates,
  totalPrice,
  orderWeight,
  checkoutProviders,
  campaignOffers = [],
}) {
  const appearance = useSiteAppearance() || {};
  const { data: session } = useSession();
  const { clearCart } = useCart();
  const [paymentSelection, setPaymentSelection] = useState(null);
  const formRef = useRef(null);
  const errorMessageRef = useRef(null);
  const checkoutDraftLoaded = useRef(false);
  const [leadDraft, setLeadDraft] = useState(null);
  const [initialLocation, setInitialLocation] = useState(null);
  const leadSaveTimer = useRef(null);
  const leadSaveQueue = useRef(Promise.resolve());
  const invalidSubmitReported = useRef(false);
  const [couponCode, setCouponCode] = useState("");
  const [couponInput, setCouponInput] = useState("");
  const [couponFeedback, setCouponFeedback] = useState("");
  const [campaignPreview, setCampaignPreview] = useState(null);
  const [dismissedComboCampaignIds, setDismissedComboCampaignIds] = useState(
    [],
  );
  const [comboVariationSelections, setComboVariationSelections] = useState({});
  const [error, setError] = useState(null);
  const [confirmedOrderNo, setConfirmedOrderNo] = useState(null);
  const [loadingStep, setLoadingStep] = useState(null);
  const [successHref, setSuccessHref] = useState(null);
  const submittingRef = useRef(false);
  const browserLocationRef = useRef(null);
  const orderOriginCapabilityRef = useRef(null);
  useEffect(() => {
    if (!error || !errorMessageRef.current) return undefined;
    const frame = window.requestAnimationFrame(() => {
      errorMessageRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [error]);

  const sendBrowserLocation = (location, capability) => {
    if (!location || !capability) return;
    fetch("/api/order-origin", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ ...location, capability }),
      keepalive: true,
    }).catch(() => {});
  };

  const comboRewardGroups = useMemo(
    () =>
      resolveComboRewards(
        campaignOffers,
        products,
        dismissedComboCampaignIds,
        comboVariationSelections,
      ),
    [
      campaignOffers,
      products,
      dismissedComboCampaignIds,
      comboVariationSelections,
    ],
  );

  useEffect(() => {
    try {
      const saved = JSON.parse(
        window.localStorage.getItem(CHECKOUT_DRAFT_KEY) || "null",
      );
      const form = formRef.current;
      const fieldNames = [
        "customerName",
        "phoneNumber",
        "deliveryAddress",
        "email",
        "note",
      ];
      if (saved && form) {
        setLeadDraft(saved);
        setInitialLocation({ district: saved.district, thana: saved.thana });
        fieldNames.forEach((name) => {
          const field = form.elements.namedItem(name);
          if (field && typeof saved[name] === "string") {
            field.value = saved[name];
            field.dispatchEvent(new Event("input", { bubbles: true }));
          }
        });
        if (["inside-dhaka", "outside-dhaka"].includes(saved.deliveryArea))
          setDeliveryArea(saved.deliveryArea);
      }
    } catch {
      /* Ignore an invalid or unavailable local checkout draft. */
    }
    checkoutDraftLoaded.current = true;
  }, [setDeliveryArea]);

  const saveCheckoutDraft = (nextDeliveryArea, saveImmediately = false, location = {}) => {
    if (!checkoutDraftLoaded.current || !formRef.current) return;
    try {
      const form = formRef.current;
      const draft = {};
      [
        "customerName",
        "phoneNumber",
        "deliveryAddress",
        "district",
        "thana",
        "email",
        "note",
      ].forEach((name) => {
        const field = form.elements.namedItem(name);
        if (field) draft[name] = field.value;
      });
      Object.assign(draft, location);
      draft.deliveryArea =
        typeof nextDeliveryArea === "string" ? nextDeliveryArea : deliveryArea;
      setLeadDraft(draft);
      try { window.localStorage.setItem(CHECKOUT_DRAFT_KEY, JSON.stringify(draft)); } catch { /* Local browser storage may be unavailable. */ }
      const phoneNumber = String(draft.phoneNumber || "").replace(/\D/g, "").slice(0, 13);
      if (saveImmediately && !submittingRef.current && /^01[3-9]\d{8}$/.test(phoneNumber)) {
        queueLeadSave({ ...draft, phoneNumber });
      }
    } catch {
      /* Checkout remains usable when browser storage is unavailable. */
    }
  };

  const comboRewardItems = comboRewardGroups.items;
  const leadItems = useMemo(() => [...(products || []), ...(comboRewardItems || [])]
    .map((item) => {
      const slug = String(item.slug || "").trim();
      const price = Number(item.price ?? item.discountPrice ?? item.regularPrice);
      return {
        name: item.title || item.productName || "",
        quantity: Number(item.quantity) || 1,
        price: Number.isFinite(price) && price >= 0 ? price : null,
        variationId: item.variation?.id || null,
        bundleSelections: item.bundleSelections || null,
        productUrl: /^[a-zA-Z0-9_-]+$/.test(slug) ? `/product/${slug}` : null,
      };
    })
    .filter((item) => item.name), [products, comboRewardItems]);

  const queueLeadSave = useCallback((draft) => {
    const phoneNumber = String(draft.phoneNumber || "").replace(/\D/g, "").replace(/^880(?=1[3-9]\d{8}$)/u, "0");
    if (!/^01[3-9]\d{8}$/.test(phoneNumber)) return;
    leadSaveQueue.current = leadSaveQueue.current
      .then(() => saveAbandonedCheckoutLeadAction({ ...draft, ...getOrderClickIds(), marketingAttribution: getCapturedOrderAttribution(), phoneNumber, items: leadItems }))
      .catch(() => {});
  }, [leadItems]);

  useEffect(() => {
    if (!leadDraft?.phoneNumber) return undefined;
    leadSaveTimer.current = window.setTimeout(() => {
      if (!submittingRef.current) queueLeadSave(leadDraft);
      leadSaveTimer.current = null;
    }, 900);
    return () => { if (leadSaveTimer.current) window.clearTimeout(leadSaveTimer.current); };
  }, [leadDraft, queueLeadSave]);
  const campaignLineItems = useMemo(
    () =>
      [...(products || []), ...comboRewardItems].map((item) => ({
        variationId: item.variation?.id || item.variationId,
        quantity: Number(item.quantity) || 1,
        shippingOnly: item.comboReward === true,
      })),
    [products, comboRewardItems],
  );
  const campaignRequestKey = JSON.stringify({
    items: campaignLineItems,
    paymentMethod: paymentSelection?.paymentMethod || null,
    paymentGatewayId: paymentSelection?.paymentGatewayId || null,
    couponCode,
    deliveryArea,
  });
  const fallbackCampaignPreview = useMemo(
    () =>
      calculateCampaignPreviewFallback({
        campaigns: campaignOffers,
        items: products || [],
        deliveryCharge,
        deliveryArea,
        deliveryRates,
        paymentMethod:
          paymentSelection?.paymentMethod === "COD"
            ? "COD"
            : checkoutProviders?.gateways?.find(
                (provider) =>
                  provider.id === paymentSelection?.paymentGatewayId,
              )?.code || paymentSelection?.paymentMethod,
        couponCode,
      }),
    [
      campaignOffers,
      products,
      deliveryCharge,
      deliveryArea,
      deliveryRates,
      paymentSelection,
      checkoutProviders,
      couponCode,
    ],
  );
  const visibleCampaignPreview = campaignPreview?.key === campaignRequestKey
    ? campaignPreview.data
    : fallbackCampaignPreview;
  const alreadyFreeDelivery =
    Number(visibleCampaignPreview.originalDeliveryCharge) > 0 &&
    visibleCampaignPreview.deliveryCharge === 0;
  const paymentDeliveryCampaigns = alreadyFreeDelivery
    ? []
    : campaignOffers.filter(
        (campaign) =>
          campaign.type === "PAYMENT_DISCOUNT" &&
          campaign.configuration?.paymentDiscountTarget === "DELIVERY",
      );
  useEffect(() => {
    const request = JSON.parse(campaignRequestKey);
    if (!request.items.length) {
      setCampaignPreview(null);
      return undefined;
    }
    let active = true;
    getCheckoutCampaignPreview(request)
      .then((result) => {
        if (active) setCampaignPreview(result?.success && result.data.deliveryCharge != null ? {
          key: campaignRequestKey,
          data: {
            ...result.data,
            progress: (result.data.cartOffers || []).filter((offer) => !offer.applied && offer.target > 0),
          },
        } : null);
      })
      .catch(() => {
        if (active) setCampaignPreview(null);
      });
    return () => {
      active = false;
    };
  }, [campaignRequestKey]);
  const appliedCouponCampaign = campaignOffers.find(
    (campaign) =>
      campaign.type === "COUPON" &&
      String(campaign.couponCode || "")
        .trim()
        .toUpperCase() === couponCode,
  );
  const couponIsApplied = Boolean(
    appliedCouponCampaign &&
    visibleCampaignPreview.rows?.some(
      (row) => row.id === appliedCouponCampaign.id,
    ),
  );
  const applyCoupon = () => {
    const code = couponInput.trim().toUpperCase();
    const campaign = campaignOffers.find(
      (offer) =>
        offer.type === "COUPON" &&
        String(offer.couponCode || "")
          .trim()
          .toUpperCase() === code,
    );
    if (!code) {
      setCouponFeedback("কুপন কোড লিখুন");
      return;
    }
    if (!campaign) {
      setCouponCode("");
      setCouponFeedback("এই কুপন কোডটি পাওয়া যায়নি বা আর চালু নেই");
      return;
    }
    setCampaignPreview(null);
    setCouponCode(code);
    setCouponFeedback("");
  };
  const removeCoupon = () => {
    setCouponCode("");
    setCouponInput("");
    setCouponFeedback("");
    setCampaignPreview(null);
  };
  const scrollToPaymentMethod = () => {
    const el = document.getElementById("paymentMethod");

    if (!el) return;

    el.scrollIntoView({
      behavior: "smooth",
      block: "center",
    });

    // remove if already exists (re-click safe)
    el.classList.remove("blink-border");

    // force reflow to restart animation
    void el.offsetWidth;

    el.classList.add("blink-border");

    // optional: clean up class after 1s
    setTimeout(() => {
      el.classList.remove("blink-border");
    }, 1000);
  };
  const recordCheckoutError = (formData, message) => {
    const draft = Object.fromEntries(CHECKOUT_CUSTOMER_FIELDS.map((name) => [name, formData.get(name)]));
    queueLeadSave({ ...draft, deliveryArea, checkoutError: message });
  };

  const handleInvalidCheckout = (event) => {
    if (submittingRef.current || invalidSubmitReported.current) return;
    invalidSubmitReported.current = true;
    queueMicrotask(() => { invalidSubmitReported.current = false; });
    const field = event.target;
    const label = field.labels?.[0]?.textContent?.trim();
    const message = field.validationMessage || "প্রয়োজনীয় তথ্য সঠিকভাবে দিন।";
    recordCheckoutError(new FormData(event.currentTarget), label ? `${label} — ${message}` : message);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (submittingRef.current) return;
    const form = event.currentTarget;
    const formData = new FormData(form);
    if (!formData.get("district") || !formData.get("thana")) {
      const message = "জেলা ও থানা/উপজেলার নাম লিখুন।";
      setError(message);
      recordCheckoutError(formData, message);
      return;
    }
    if (!paymentSelection) {
      recordCheckoutError(formData, "পেমেন্ট পদ্ধতি নির্বাচন করুন।");
      scrollToPaymentMethod();
      return;
    }
    submittingRef.current = true;
    if (leadSaveTimer.current) window.clearTimeout(leadSaveTimer.current);
    flushSync(() => {
      setLoadingStep("creating");
      setError(null);
    });

    let createdOrder = null;
    try {
      // Paint the progress modal before starting the server request.
      await new Promise((resolve) => window.requestAnimationFrame(resolve));
      // Ask for device location without placing GPS permission or timeout on
      // the order submission's critical path.
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          ({ coords }) => {
            browserLocationRef.current = {
              latitude: coords.latitude,
              longitude: coords.longitude,
              accuracy: coords.accuracy,
            };
            sendBrowserLocation(browserLocationRef.current, orderOriginCapabilityRef.current);
          },
          () => {},
          { enableHighAccuracy: false, maximumAge: 120000, timeout: 10000 },
        );
      }
      if (session?.user?.id) formData.append("userId", session.user.id);
      formData.append("paymentMethod", paymentSelection.paymentMethod);
      if (paymentSelection.paymentPlan) formData.append("paymentPlan", paymentSelection.paymentPlan);
      if (paymentSelection.paymentGatewayId) formData.append("paymentGatewayId", paymentSelection.paymentGatewayId);
      formData.append("orderPrice", totalPrice);
      formData.append("deliveryCharge", deliveryCharge);
      formData.append("orderWeight", orderWeight);
      const clickIds = getOrderClickIds();
      formData.append("gaClientId", clickIds.gaClientId);
      formData.append("fbp", clickIds.fbp);
      formData.append("fbc", clickIds.fbc);
      formData.append("gclid", clickIds.gclid);
      formData.append("gbraid", clickIds.gbraid);
      formData.append("wbraid", clickIds.wbraid);
      formData.append("ttclid", clickIds.ttclid);
      formData.append("userAgent", navigator.userAgent);
      formData.delete("quantity");
      formData.append("products", JSON.stringify([...(products || []), ...comboRewardItems]));
      formData.append("deliveryArea", deliveryArea);
      formData.append("orderSource", "WEBSITE");

      await leadSaveQueue.current;
      const response = await createOrder(formData);
      if (!response?.success || !response.data?.orderNo) {
        throw new Error(response?.error || "অর্ডার তৈরি করা যায়নি। আবার চেষ্টা করুন।");
      }
      createdOrder = response.data;
      orderOriginCapabilityRef.current = createdOrder.originCapability || null;
      sendBrowserLocation(browserLocationRef.current, orderOriginCapabilityRef.current);
      setConfirmedOrderNo(createdOrder.orderNo);
      const orderTrackingHref = "/tracking/?o=" + encodeURIComponent(createdOrder.orderNo) + "&p=" + encodeURIComponent(createdOrder.phoneNumber);
      setSuccessHref(orderTrackingHref);
      if (leadSaveTimer.current) window.clearTimeout(leadSaveTimer.current);
      setLeadDraft(null);
      try { window.localStorage.removeItem(CHECKOUT_DRAFT_KEY); } catch { /* Draft cleanup is best effort. */ }
      if (!buyNow) clearCart();

      if (paymentSelection.paymentMethod !== "COD") {
        setLoadingStep("order-complete");
        const initiationPromise = initiateConfiguredPayment(createdOrder.paymentId).then(
          (result) => ({ result }),
          (initiationError) => ({ initiationError }),
        );
        await new Promise((resolve) => window.setTimeout(resolve, 650));
        setLoadingStep("preparing-payment");
        const [initiation] = await Promise.all([
          initiationPromise,
          new Promise((resolve) => window.setTimeout(resolve, 500)),
        ]);
        const { result: initiated, initiationError } = initiation;
        if (initiationError) throw initiationError;
        if (initiated?.success && initiated.manualPayment) {
          setLoadingStep("order-complete");
          window.location.replace(`/payment/bangla-qr?o=${encodeURIComponent(createdOrder.orderNo)}&p=${encodeURIComponent(createdOrder.phoneNumber)}`);
          return;
        }
        if (!initiated?.success || !initiated.url) {
          throw new Error(initiated?.message || "অর্ডার নেওয়া হয়েছে, কিন্তু পেমেন্ট পেজ খোলা যায়নি। আবার অর্ডার করবেন না।");
        }
        setLoadingStep("redirecting");
        window.location.assign(initiated.url);
        return;
      }

      const successUrl = "/order-success?p=" + encodeURIComponent(createdOrder.phoneNumber) + "&o=" + encodeURIComponent(createdOrder.orderNo) + "&orderSuccess=true";
      setSuccessHref(successUrl);
      setLoadingStep("success");
      window.location.replace(successUrl);
    } catch (submitError) {
      const message = submitError?.message || "অর্ডার পাঠানো যায়নি। আবার চেষ্টা করুন।";
      setError(message);
      setLoadingStep(null);
      if (!createdOrder) {
        recordCheckoutError(formData, message);
        submittingRef.current = false;
      }
    }
  };
  return (
    <form ref={formRef} onSubmit={handleSubmit} onInvalid={handleInvalidCheckout} onChange={saveCheckoutDraft} onBlurCapture={(event) => { if (event.target?.name === "phoneNumber") saveCheckoutDraft(undefined, true); }}>
      <div className="w-full mb-2">
        {error && (
          <div ref={errorMessageRef} role="alert" className="w-full rounded-md bg-red-200 p-2 text-base text-red-600">
            {" "}
            {error}{" "}
          </div>
        )}
        {error && confirmedOrderNo && (
          <div className="mt-2 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-900">
            <p>অর্ডার #{confirmedOrderNo} তৈরি হয়েছে। আবার Place Order চাপবেন না।</p>
            {successHref && <a href={successHref} className="mt-2 inline-block font-semibold underline">{paymentSelection?.paymentMethod === "COD" ? "কনফার্মেশন দেখুন" : "অর্ডারের তথ্য দেখুন"}</a>}
          </div>
        )}
      </div>
      <div className="flex md:flex-nowrap flex-wrap-reverse md:gap-12 gap-3 text-base ">
        <div className="w-full md:w-1/2">
          {/* <BuyNowProductDetails
              data={data}
              initialQty={initialQty}
              deliveryArea={deliveryArea}
              setPaymentMethod={setPaymentMethod}
            /> */}
          {isValidElement(children)
            ? cloneElement(children, {
                campaignPreview: visibleCampaignPreview,
                comboRewardItems,
                comboRewardGroups,
                onSelectComboVariation: (rewardKey, variationId) =>
                  setComboVariationSelections((current) => ({
                    ...current,
                    [rewardKey]: variationId,
                  })),
                onCancelCombo: (campaignId) =>
                  setDismissedComboCampaignIds((current) => [
                    ...current,
                    campaignId,
                  ]),
              })
            : children}
          <div className="my-3 flex w-full items-center gap-2 rounded-lg border px-2 py-1.5 focus-within:border-primary">
            <input
              id="campaignCode"
              value={couponInput}
              onChange={(event) => {
                setCouponInput(event.target.value);
                setCouponFeedback("");
              }}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  applyCoupon();
                }
              }}
              placeholder="ক্যাম্পেইন কুপন কোড লিখুন"
              className="min-w-0 flex-1 border-0 bg-transparent px-1 py-1.5 uppercase outline-none focus:ring-0"
              maxLength={50}
            />
            <button
              type="button"
              onClick={applyCoupon}
              className="shrink-0 rounded-md bg-primary px-3 py-1.5 text-sm font-semibold text-white"
            >
              Apply
            </button>
          </div>
          <input type="hidden" name="campaignCode" value={couponCode} />
          <PaymentMethodSelector
            className="mt-2"
            setPaymentSelection={setPaymentSelection}
            initialProviders={checkoutProviders}
            paymentDeliveryCampaigns={paymentDeliveryCampaigns}
            cartItems={products || []}
            deliveryCharge={visibleCampaignPreview.deliveryCharge ?? deliveryCharge}
            orderTotal={(visibleCampaignPreview.total ?? totalPrice + deliveryCharge) + comboRewardItems.reduce((sum, item) => sum + Number(item.discountPrice ?? item.price ?? 0) * Number(item.quantity || 1), 0)}
          />
        </div>
        <div className="w-full md:w-1/2">
          <div className=" mx-auto">
            <div className="w-full rounded-sm flex flex-row gap-1 font-bold border-b-slate-400  border-b-2 dark:border-b-2 dark:border-b-slate-600 bg-slate-300 dark:bg-slate-800 p-2">
              <Truck /> <span>ডেলিভারি ঠিকানাঃ</span>
            </div>
            <>
              <DeliveryAddress
                initialLocation={initialLocation}
                setDeliveryArea={setDeliveryArea}
                onLocationChange={(location, area) => saveCheckoutDraft(area, false, location)}
              />
              <DeliveryAreaSelector
                setDeliveryArea={setDeliveryArea}
                selectedArea={deliveryArea}
                onSelectArea={saveCheckoutDraft}
              />
            </>
          </div>
        </div>
      </div>
      <Button
        type={"submit"}
        disabled={Boolean(loadingStep || confirmedOrderNo)}
        style={{ backgroundColor: appearance.placeOrderButtonColor || "#ea580c" }}
        className="w-full z-30 p-2 sticky bottom-2 left-0 border-b-4 border-slate-600 rounded-lg text-center hover:text-white cursor-pointer my-1.5 text-white"
      >
        {confirmedOrderNo ? "অর্ডার নেওয়া হয়েছে" : loadingStep ? "অর্ডার তৈরি হচ্ছে…" : appearance.placeOrderButtonLabel || "Place Order"}
      </Button>
      {loadingStep && !error && (
        <CheckoutProgressOverlay
          step={loadingStep}
          orderNo={confirmedOrderNo}
        />
      )}
    </form>
  );
}
