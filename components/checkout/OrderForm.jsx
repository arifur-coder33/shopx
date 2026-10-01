"use client";
import { resolveComboRewards } from "@/components/campaign/resolveComboRewards";
import { Truck } from "lucide-react";
import Button from "../button";
import DeliveryAddress from "./DeliveryAddress";

import { getCheckoutCampaignPreview } from "@/backend/serverActions/checkoutCampaignPreviewAction";
import { createOrder } from "@/backend/serverActions/orderActions";
import { saveAbandonedCheckoutLeadAction } from "@/backend/serverActions/abandonedCheckoutActions";
import { initiateConfiguredPayment } from "@/backend/serverActions/paymentInitiationAction";
import { useCart } from "@/context/CartContext";
import { getCookie } from "@/utils/cookie/cooike";
import { useSession } from "next-auth/react";
import { flushSync } from "react-dom";
import {
  cloneElement,
  isValidElement,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { calculateCampaignPreviewFallback } from "./campaignPreviewFallback";
import CheckoutProgressOverlay from "./CheckoutProgressOverlay";
import DeliveryAreaSelector from "./DeliveryAreaSelector";
import PaymentMethodSelector from "./PaymentMethodSelector";
const CHECKOUT_DRAFT_KEY = "checkout-customer-draft:v1";

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
  totalPrice,
  orderWeight,
  checkoutProviders,
  campaignOffers = [],
}) {
  const { data: session } = useSession();
  const { clearCart } = useCart();
  const [paymentSelection, setPaymentSelection] = useState(null);
  const formRef = useRef(null);
  const checkoutDraftLoaded = useRef(false);
  const [leadDraft, setLeadDraft] = useState(null);
  const leadSaveTimer = useRef(null);
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
        "district",
        "thana",
        "deliveryAddress",
        "email",
        "note",
      ];
      if (saved && form) {
        setLeadDraft(saved);
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

  const saveCheckoutDraft = (nextDeliveryArea, saveImmediately = false) => {
    if (!checkoutDraftLoaded.current || !formRef.current) return;
    try {
      const form = formRef.current;
      const draft = {};
      [
        "customerName",
        "phoneNumber",
        "district",
        "thana",
        "deliveryAddress",
        "email",
        "note",
      ].forEach((name) => {
        const field = form.elements.namedItem(name);
        if (field) draft[name] = field.value;
      });
      draft.deliveryArea =
        typeof nextDeliveryArea === "string" ? nextDeliveryArea : deliveryArea;
      setLeadDraft(draft);
      try { window.localStorage.setItem(CHECKOUT_DRAFT_KEY, JSON.stringify(draft)); } catch { /* Local browser storage may be unavailable. */ }
      const phoneNumber = String(draft.phoneNumber || "").replace(/\D/g, "").slice(0, 13);
      if (saveImmediately && /^01[3-9]\d{8}$/.test(phoneNumber)) {
        saveAbandonedCheckoutLeadAction({ ...draft, phoneNumber, items: leadItems }).catch(() => {});
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
        productUrl: /^[a-zA-Z0-9_-]+$/.test(slug) ? `/product/${slug}` : null,
      };
    })
    .filter((item) => item.name), [products, comboRewardItems]);

  useEffect(() => {
    if (!leadDraft?.phoneNumber) return undefined;
    let phoneNumber = String(leadDraft.phoneNumber).replace(/\D/g, "").slice(0, 13);
    if (/^8801[3-9]\d{8}$/.test(phoneNumber)) phoneNumber = `0${phoneNumber.slice(2)}`;
    if (!/^01[3-9]\d{8}$/.test(phoneNumber)) return undefined;
    leadSaveTimer.current = window.setTimeout(() => {
      saveAbandonedCheckoutLeadAction({ ...leadDraft, phoneNumber, items: leadItems }).catch(() => {});
      leadSaveTimer.current = null;
    }, 900);
    return () => { if (leadSaveTimer.current) window.clearTimeout(leadSaveTimer.current); };
  }, [leadDraft, leadItems]);
  const campaignLineItems = useMemo(
    () =>
      (products || []).map((item) => ({
        variationId: item.variation?.id || item.variationId,
        quantity: Number(item.quantity) || 1,
      })),
    [products],
  );
  const campaignLineKey = JSON.stringify(campaignLineItems);
  const fallbackCampaignPreview = useMemo(
    () =>
      calculateCampaignPreviewFallback({
        campaigns: campaignOffers,
        items: products || [],
        deliveryCharge,
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
      paymentSelection,
      checkoutProviders,
      couponCode,
    ],
  );
  const visibleCampaignPreview = useMemo(() => {
    if (!campaignPreview?.rows?.length) return fallbackCampaignPreview;
    const rows = new Map(
      (fallbackCampaignPreview.rows || []).map((row) => [row.id, row]),
    );
    for (const row of campaignPreview.rows) rows.set(row.id, row);
    return {
      rows: [...rows.values()],
      itemDiscounts: campaignPreview.itemDiscounts?.length
        ? campaignPreview.itemDiscounts
        : fallbackCampaignPreview.itemDiscounts || [],
      progress: fallbackCampaignPreview.progress || [],
      total: fallbackCampaignPreview.rows?.length
        ? fallbackCampaignPreview.total
        : campaignPreview.total,
    };
  }, [campaignPreview, fallbackCampaignPreview]);
  const appliedDeliveryDiscount = (visibleCampaignPreview.rows || []).reduce(
    (sum, row) => {
      const campaign = campaignOffers.find((offer) => offer.id === row.id);
      const isDeliveryCampaign =
        campaign &&
        (["DELIVERY", "DELIVERY_DISCOUNT"].includes(campaign.type) ||
          (campaign.type === "PAYMENT_DISCOUNT" &&
            campaign.configuration?.paymentDiscountTarget === "DELIVERY"));
      return isDeliveryCampaign
        ? sum + Math.max(0, Number(row.discount) || 0)
        : sum;
    },
    0,
  );
  const alreadyFreeDelivery =
    Number(deliveryCharge) > 0 &&
    appliedDeliveryDiscount >= Number(deliveryCharge);
  const paymentDeliveryCampaigns = alreadyFreeDelivery
    ? []
    : campaignOffers.filter(
        (campaign) =>
          campaign.type === "PAYMENT_DISCOUNT" &&
          campaign.configuration?.paymentDiscountTarget === "DELIVERY",
      );
  useEffect(() => {
    if (!campaignLineItems.length) {
      setCampaignPreview(null);
      return undefined;
    }
    let active = true;
    getCheckoutCampaignPreview({
      items: campaignLineItems,
      paymentMethod: paymentSelection?.paymentMethod || null,
      paymentGatewayId: paymentSelection?.paymentGatewayId || null,
      couponCode,
      deliveryArea,
    })
      .then((result) => {
        if (active) setCampaignPreview(result?.success ? result.data : null);
      })
      .catch(() => {
        if (active) setCampaignPreview(null);
      });
    return () => {
      active = false;
    };
  }, [
    campaignLineKey,
    paymentSelection?.paymentMethod,
    paymentSelection?.paymentGatewayId,
    couponCode,
    deliveryArea,
  ]);
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
  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!paymentSelection) {
      scrollToPaymentMethod();
      return;
    }
    if (submittingRef.current) return;
    submittingRef.current = true;
    const form = event.currentTarget;
    flushSync(() => {
      setLoadingStep("creating");
      setError(null);
    });

    let createdOrder = null;
    try {
      // Paint the progress modal before starting the server request.
      await new Promise((resolve) => window.requestAnimationFrame(resolve));
      const formData = new FormData(form);
      // Browser GPS is the only source that can report the customer's actual
      // device location. Keep checkout moving if permission is denied/unavailable.
      if (navigator.geolocation) {
        const browserLocation = await new Promise((resolve) => {
          let settled = false;
          const finish = (value) => {
            if (settled) return;
            settled = true;
            window.clearTimeout(timer);
            resolve(value);
          };
          const timer = window.setTimeout(() => finish(null), 1800);
          navigator.geolocation.getCurrentPosition(
            ({ coords }) => finish({ latitude: coords.latitude, longitude: coords.longitude, accuracy: coords.accuracy }),
            () => finish(null),
            { enableHighAccuracy: false, maximumAge: 120000, timeout: 1600 },
          );
        });
        if (browserLocation) {
          formData.set("browserGeoLatitude", String(browserLocation.latitude));
          formData.set("browserGeoLongitude", String(browserLocation.longitude));
          formData.set("browserGeoAccuracy", String(browserLocation.accuracy));
        }
      }
      if (session?.user?.id) formData.append("userId", session.user.id);
      formData.append("paymentMethod", paymentSelection.paymentMethod);
      if (paymentSelection.paymentPlan) formData.append("paymentPlan", paymentSelection.paymentPlan);
      if (paymentSelection.paymentGatewayId) formData.append("paymentGatewayId", paymentSelection.paymentGatewayId);
      formData.append("orderPrice", totalPrice);
      formData.append("deliveryCharge", deliveryCharge);
      formData.append("orderWeight", orderWeight);
      formData.append("fbp", getCookie("_fbp"));
      formData.append("fbc", getCookie("_fbc"));
      formData.append("gclid", getCookie("gclid"));
      formData.append("ttclid", getCookie("ttclid"));
      formData.append("userAgent", navigator.userAgent);
      formData.delete("quantity");
      formData.append("products", JSON.stringify([...(products || []), ...comboRewardItems]));
      formData.append("deliveryArea", deliveryArea);

      const response = await createOrder(formData);
      if (!response?.success || !response.data?.orderNo) {
        throw new Error(response?.error || "অর্ডার তৈরি করা যায়নি। আবার চেষ্টা করুন।");
      }
      createdOrder = response.data;
      setConfirmedOrderNo(createdOrder.orderNo);
      setSuccessHref("/tracking/?o=" + encodeURIComponent(createdOrder.orderNo) + "&p=" + encodeURIComponent(createdOrder.phoneNumber));
      if (leadSaveTimer.current) window.clearTimeout(leadSaveTimer.current);
      setLeadDraft(null);
      try { window.localStorage.removeItem(CHECKOUT_DRAFT_KEY); } catch { /* Draft cleanup is best effort. */ }
      if (!buyNow) clearCart();

      if (paymentSelection.paymentMethod !== "COD") {
        setLoadingStep("preparing-payment");
        const initiated = await initiateConfiguredPayment(createdOrder.paymentId);
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
      setError(submitError?.message || "অর্ডার পাঠানো যায়নি। আবার চেষ্টা করুন।");
      setLoadingStep(null);
      if (!createdOrder) submittingRef.current = false;
    }
  };
  return (
    <form ref={formRef} onSubmit={handleSubmit} onChange={saveCheckoutDraft} onBlurCapture={(event) => { if (event.target?.name === "phoneNumber") saveCheckoutDraft(undefined, true); }}>
      <div className="w-full mb-2">
        {error && (
          <div className="w-full rounded-md bg-red-200 p-2 text-base text-red-600">
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
            deliveryCharge={deliveryCharge}
            orderTotal={totalPrice}
          />
        </div>
        <div className="w-full md:w-1/2">
          <div className=" mx-auto">
            <div className="w-full rounded-sm flex flex-row gap-1 font-bold border-b-slate-400  border-b-2 dark:border-b-2 dark:border-b-slate-600 bg-slate-300 dark:bg-slate-800 p-2">
              <Truck /> <span>ডেলিভারি ঠিকানাঃ</span>
            </div>
            <>
              <DeliveryAddress setDeliveryArea={setDeliveryArea} />
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
        className="w-full z-30 bg-brand p-2 sticky bottom-2  left-0 border-b-4  border-slate-600 rounded-lg text-center hover:text-white cursor-pointer  my-1.5 text-slate-200 "
      >
        {confirmedOrderNo ? "অর্ডার নেওয়া হয়েছে" : loadingStep ? "অর্ডার তৈরি হচ্ছে…" : "Place Order"}
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
