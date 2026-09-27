"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "react-toastify";
import { saveCampaign, searchCampaignTargets } from "@/backend/serverActions/campaignAction";
import FileInput from "@/components/input/FileInput";
import FloatingInput from "@/components/input/FloatingInput";
import ImageCustom from "@/components/images/ImageCustom";
import ComboPairEditor from "./ComboPairEditor";

const inputClass = "w-full rounded-lg border bg-surface p-2";

function CampaignInput({ name, label, type = "text", required = false, ...props }) {
  const numberWheelGuard = type === "number"
    ? { onWheel: (event) => event.currentTarget.blur() }
    : {};
  return <FloatingInput name={name} label={label} inputType={type} required={required} colSpan="1" {...numberWheelGuard} {...props} />;
}
const groups = [
  ["PRODUCT_DISCOUNT", "Product Discount"], ["CART_DISCOUNT", "Cart Discount"],
  ["DELIVERY_DISCOUNT", "Delivery Discount"], ["PAYMENT_DISCOUNT", "Payment Discount"],
  ["COUPON", "Coupon Campaign"], ["COMBO", "Combo Offer"],
];

const campaignRules = {
  PRODUCT_DISCOUNT: { title: "Product Discount", summary: "নির্বাচিত পণ্য বা পণ্যের শ্রেণিতে ছাড় দেওয়া হবে।", bullets: ["পণ্য বা পণ্যের শ্রেণি বেছে দিন।", "শতাংশ বা নির্দিষ্ট টাকার ছাড় দিন।", "ঐচ্ছিকভাবে সর্বোচ্চ ছাড় ও ন্যূনতম quantity সেট করুন।"] },
  CART_DISCOUNT: { title: "Cart Discount", summary: "কার্টের যোগ্য মোট মূল্যের ওপর ছাড় দেওয়া হবে।", bullets: ["শতাংশ বা নির্দিষ্ট টাকার ছাড় বেছে নিন।", "ন্যূনতম কার্ট মূল্য ও সর্বোচ্চ ছাড় নির্ধারণ করতে পারেন।", "পণ্যের ছাড়ের আগে বা পরে এই ছাড় হিসাব হবে, তা বেছে নিন।"] },
  DELIVERY_DISCOUNT: { title: "Delivery Discount", summary: "ডেলিভারি চার্জে ছাড় বা বিনামূল্যে ডেলিভারি দেওয়া হবে।", bullets: ["বিনামূল্যে ডেলিভারি, শতকরা ছাড় অথবা নির্দিষ্ট টাকার ছাড় বেছে নিন।", "ন্যূনতম অর্ডার মূল্য, ডেলিভারি এলাকা ও পাঠানোর পদ্ধতি নির্ধারণ করতে পারেন।"] },
  PAYMENT_DISCOUNT: { title: "Payment Discount", summary: "নির্বাচিত payment method-এ পণ্যের মূল্য বা delivery charge-এ ছাড় দেওয়া হবে।", bullets: ["ছাড়টি পণ্যের মোট মূল্য নাকি delivery charge-এ হবে বেছে নিন।", "শতকরা বা নির্দিষ্ট টাকার ছাড় এবং payment method বেছে নিন।", "চাইলে ন্যূনতম অর্ডার মূল্য ও সর্বোচ্চ ছাড় নির্ধারণ করুন।"] },
  COUPON: { title: "Coupon Campaign", summary: "কুপন কোড দিলে এই প্রচারের শর্ত অনুযায়ী ছাড় দেওয়া হবে।", bullets: ["একটি স্বতন্ত্র কুপন কোড দিন।", "কার্ট ছাড়, শতকরা ছাড়, নির্দিষ্ট টাকার ছাড়, বিনামূল্যে ডেলিভারি, অথবা পেমেন্ট ছাড় বেছে নিন।", "চাইলে ন্যূনতম অর্ডার মূল্য, সর্বোচ্চ ছাড়, পেমেন্ট মাধ্যম, অথবা প্রথম অর্ডারের শর্ত দিন।"] },
  COMBO: { title: "Combo Offer", summary: "প্রতিটি নিয়মে কেনার শর্ত বেছে এক বা একাধিক পুরস্কার পণ্য নির্ধারণ করুন।", bullets: ["শর্ত হতে পারে যেকোনো পণ্য, নির্দিষ্ট পণ্য, অথবা এক/একাধিক পণ্যের শ্রেণি।", "প্রতিটি নিয়মের জন্য এক বা একাধিক পুরস্কার পণ্য বেছে নিন।", "একটি প্রচারে একাধিক আলাদা নিয়ম যোগ করা যায়।"] },
};
function PaymentMethodChoices({ paymentGateways, optional = false, selected = [] }) {
  return <fieldset className="md:col-span-2">
    <legend className="mb-2 text-sm font-medium">{optional ? "Applicable payment methods (optional)" : "Applicable payment methods — choose one or more"}</legend>
    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
      {paymentGateways.map((gateway) => (
        <label key={gateway.code} className="relative flex min-h-14 cursor-pointer items-center gap-3 rounded-xl border border-border bg-surface p-3 transition-colors has-[:checked]:border-primary has-[:checked]:bg-primary-soft has-[:checked]:ring-2 has-[:checked]:ring-primary/20">
          <input type="checkbox" name="paymentMethods" value={gateway.code} defaultChecked={selected.includes(gateway.code)} className="peer sr-only" />
          <span className="min-w-0 flex-1 text-sm font-medium">{gateway.name}</span>
          <span aria-hidden="true" className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-border text-xs text-transparent peer-checked:border-primary peer-checked:bg-primary peer-checked:text-white">✓</span>
        </label>
      ))}
      {!paymentGateways.length && <p className="text-sm text-text-muted">কোনো enabled ও configured payment method পাওয়া যায়নি।</p>}
    </div>
  </fieldset>;
}

function PaymentDiscountTargets({ paymentGateways, scope, setScope, specificOnline, setSpecificOnline, selectedMethods, setSelectedMethods }) {
  const onlineGateways = paymentGateways.filter((gateway) => gateway.adapterKey !== "COD");
  const toggleMethod = (code) => setSelectedMethods((current) => current.includes(code) ? current.filter((item) => item !== code) : [...current, code]);
  return <section className="space-y-3 md:col-span-2">
    <fieldset><legend className="mb-2 text-sm font-medium">Applicable payment method</legend>
      <div className="grid gap-2 sm:grid-cols-3">
        {[["ALL", "All payment methods"], ["COD", "COD only"], ["ONLINE", "Online payment"]].map(([value, label]) => <label key={value} className={"flex cursor-pointer items-center gap-2 rounded-lg border p-3 " + (scope === value ? "border-primary bg-primary-soft" : "border-border")}>
          <input type="radio" name="paymentScopeChoice" checked={scope === value} onChange={() => setScope(value)} />{label}
        </label>)}
      </div>
    </fieldset>
    <input type="hidden" name="paymentScope" value={scope} readOnly />
    {scope === "ONLINE" && <div className="space-y-2 rounded-lg border p-3">
      <p className="text-sm font-medium">Online payment methods</p>
      <label className="flex cursor-pointer items-center gap-2 text-sm"><input type="radio" name="onlineMethodScope" value="ALL_ONLINE" checked={!specificOnline} onChange={() => { setSpecificOnline(false); setSelectedMethods([]); }} /> All online payment methods</label>
      <label className="flex cursor-pointer items-center gap-2 text-sm"><input type="radio" name="onlineMethodScope" value="SPECIFIC" checked={specificOnline} onChange={() => setSpecificOnline(true)} /> Select specific methods</label>
      {specificOnline && <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {onlineGateways.map((gateway) => <label key={gateway.code} className="flex cursor-pointer items-center gap-2 rounded-lg border p-3">
          <input type="checkbox" name="paymentMethods" value={gateway.code} checked={selectedMethods.includes(gateway.code)} onChange={() => toggleMethod(gateway.code)} />
          <span className="text-sm">{gateway.name}</span>
        </label>)}
        {!onlineGateways.length && <p className="text-sm text-text-muted">কোনো চালু online payment method পাওয়া যায়নি।</p>}
        {onlineGateways.length > 0 && !selectedMethods.length && <p className="text-xs text-red-600 sm:col-span-2 lg:col-span-3">অন্তত একটি online payment method বেছে নিন।</p>}
      </div>}
    </div>}
  </section>;
}
function CampaignTargetPicker({ products, categories, scope, setScope, selectedProducts, setSelectedProducts, selectedCategories, setSelectedCategories }) {
  const [productQuery, setProductQuery] = useState("");
  const [categoryQuery, setCategoryQuery] = useState("");
  const [productResults, setProductResults] = useState(products);
  const [categoryResults, setCategoryResults] = useState(categories);
  const [searchingProducts, setSearchingProducts] = useState(false);
  const [searchingCategories, setSearchingCategories] = useState(false);
  const [searchError, setSearchError] = useState("");
  useEffect(() => {
    let current = true;
    const query = productQuery.trim();
    if (query.length < 2) { setProductResults(products); setSearchingProducts(false); return () => { current = false; }; }
    setSearchingProducts(true);
    const timer = setTimeout(async () => {
      const result = await searchCampaignTargets("product", query);
      if (current) {
        setProductResults(result.success ? result.data : []);
        setSearchError(result.success ? "" : result.message || "Could not search products.");
        setSearchingProducts(false);
      }
    }, 250);
    return () => { current = false; clearTimeout(timer); };
  }, [productQuery, products]);
  useEffect(() => {
    let current = true;
    const query = categoryQuery.trim();
    if (query.length < 2) { setCategoryResults(categories); setSearchingCategories(false); return () => { current = false; }; }
    setSearchingCategories(true);
    const timer = setTimeout(async () => {
      const result = await searchCampaignTargets("category", query);
      if (current) {
        setCategoryResults(result.success ? result.data : []);
        setSearchError(result.success ? "" : result.message || "Could not search categories.");
        setSearchingCategories(false);
      }
    }, 250);
    return () => { current = false; clearTimeout(timer); };
  }, [categoryQuery, categories]);
  const effectivePrice = (product) => {
    const prices = (product.variations || []).map((variation) => {
      const regular = Number(variation.regularPrice) || 0;
      const sale = Number(variation.discountPrice) || 0;
      return sale > 0 && sale < regular ? sale : regular;
    }).filter((price) => price > 0);
    return prices.length ? Math.min(...prices) : null;
  };
  const toggle = (items, setItems, id) => setItems((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);

  return <section className="space-y-3 rounded-lg border p-3 md:col-span-2">
    <div><h3 className="font-semibold">Apply this campaign to</h3><p className="text-xs text-text-muted">Choose all products, multiple categories, or specific products. You can search before selecting.</p></div>
    <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
      {[{ value: "ALL", label: "All products" }, { value: "CATEGORY", label: "Selected categories" }, { value: "PRODUCT", label: "Specific products" }].map((option) => <label key={option.value} className={`flex cursor-pointer items-center gap-2 rounded-xl border p-3 ${scope === option.value ? "border-primary bg-primary-soft ring-2 ring-primary/20" : "border-border"}`}>
        <input type="radio" name="targetScope" value={option.value} checked={scope === option.value} onChange={() => { setScope(option.value); setSelectedProducts([]); setSelectedCategories([]); }} />
        <span className="text-sm font-medium">{option.label}</span>
      </label>)}
    </div>
    <input type="hidden" name="productIds" value={JSON.stringify(scope === "PRODUCT" ? selectedProducts : [])} readOnly />
    <input type="hidden" name="categoryIds" value={JSON.stringify(scope === "CATEGORY" ? selectedCategories : [])} readOnly />
    {scope === "CATEGORY" && <div className="space-y-2">
      <FloatingInput name="campaign-category-search" label="Search categories" colSpan="1" value={categoryQuery} onChange={(event) => setCategoryQuery(event.target.value)} />
      <p className="text-xs text-text-muted">{categoryQuery.trim().length < 2 ? "Showing the first 10 categories. Search for more categories." : searchingCategories ? "Searching categories…" : "Search results from all categories."}</p>
      {searchError && <p role="alert" className="text-xs text-red-600">{searchError}</p>}
      <div className="grid max-h-60 grid-cols-1 gap-2 overflow-y-auto sm:grid-cols-2 lg:grid-cols-5">
        {categoryResults.map((category) => <label key={category.id} className={`flex cursor-pointer items-center gap-2 rounded-lg border p-3 ${selectedCategories.includes(category.id) ? "border-primary bg-primary-soft" : "border-border"}`}>
          <input type="checkbox" checked={selectedCategories.includes(category.id)} onChange={() => toggle(selectedCategories, setSelectedCategories, category.id)} />
          <span className="text-sm">{category.parentCategory?.name ? `${category.parentCategory.name} / ` : ""}{category.name}</span>
          {selectedCategories.includes(category.id) && <span className="ml-auto text-primary" aria-hidden="true">✓</span>}
        </label>)}
        {!categoryResults.length && <p className="p-3 text-sm text-text-muted">No matching category.</p>}
      </div>
      <p className="text-xs text-text-muted">{selectedCategories.length} categories selected</p>
    </div>}
    {scope === "PRODUCT" && <div className="space-y-2">
      <FloatingInput name="campaign-product-search" label="Search products" colSpan="1" value={productQuery} onChange={(event) => setProductQuery(event.target.value)} />
      <p className="text-xs text-text-muted">{productQuery.trim().length < 2 ? "Showing the first 10 products. Search for more products." : searchingProducts ? "Searching products…" : "Search results from all products."}</p>
      {searchError && <p role="alert" className="text-xs text-red-600">{searchError}</p>}
      <div className="grid max-h-80 grid-cols-1 gap-2 overflow-y-auto sm:grid-cols-2 lg:grid-cols-5">
        {productResults.map((product) => {
          const selected = selectedProducts.includes(product.id);
          const price = effectivePrice(product);
          return <label key={product.id} className={`flex cursor-pointer items-center gap-3 rounded-xl border p-2 transition-colors ${selected ? "border-primary bg-primary-soft ring-2 ring-primary/20" : "border-border hover:border-primary/50"}`}>
            <input type="checkbox" checked={selected} onChange={() => toggle(selectedProducts, setSelectedProducts, product.id)} className="sr-only" />
            <span className="relative h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-surface-muted">
              {product.thumbnail?.name ? <ImageCustom src={product.thumbnail.name} alt={product.title} w={56} h={56} className="h-14 w-14 object-cover" /> : <span className="grid h-full place-items-center text-xs text-text-muted">No image</span>}
            </span>
            <span className="min-w-0 flex-1"><span className="block line-clamp-2 text-sm font-medium">{product.title}</span><span className="mt-1 block text-xs font-semibold text-primary">{price == null ? "Price unavailable" : `৳${price.toLocaleString()}`}</span></span>
            <span aria-hidden="true" className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border text-xs ${selected ? "border-primary bg-primary text-white" : "border-border text-transparent"}`}>✓</span>
          </label>;
        })}
        {!productResults.length && <p className="p-3 text-sm text-text-muted">No matching product.</p>}
      </div>
      <p className="text-xs text-text-muted">{selectedProducts.length} products selected</p>
    </div>}
  </section>;
}

export default function CampaignForm({ products, categories, paymentGateways, initialCampaign = null }) {
  const [busy, setBusy] = useState(false);
  const [showRuleModal, setShowRuleModal] = useState(false);
  const [group, setGroup] = useState(initialCampaign?.group || initialCampaign?.type || "PRODUCT_DISCOUNT");
  const [comboType, setComboType] = useState(initialCampaign?.configuration?.comboType || "BUNDLE_FIXED");
  const [comboDiscountType, setComboDiscountType] = useState(initialCampaign?.discountType || "PERCENT");
  const [offerType, setOfferType] = useState(initialCampaign?.configuration?.offerType || (initialCampaign?.group === "DELIVERY_DISCOUNT" ? "FREE" : "PERCENT"));
  const [paymentScope, setPaymentScope] = useState(initialCampaign?.configuration?.paymentScope || (initialCampaign?.paymentMethods?.includes("COD") ? "COD" : initialCampaign?.paymentMethods?.length ? "ONLINE" : "ALL"));
  const [paymentDiscountTarget, setPaymentDiscountTarget] = useState(initialCampaign?.configuration?.paymentDiscountTarget || "ORDER");
  const [stackable, setStackable] = useState(Boolean(initialCampaign?.stackable) && !initialCampaign?.exclusive);
  const [exclusive, setExclusive] = useState(initialCampaign ? (Boolean(initialCampaign.exclusive) || !initialCampaign.stackable) : true);
  const [cashbackType, setCashbackType] = useState(initialCampaign?.cashbackType || "FIXED");
  const [specificOnlineMethods, setSpecificOnlineMethods] = useState(Boolean(initialCampaign?.paymentMethods?.length && !initialCampaign.paymentMethods.includes("COD")));
  const [selectedPaymentMethods, setSelectedPaymentMethods] = useState(initialCampaign?.paymentMethods?.filter((method) => method !== "COD") || []);
  const [targetScope, setTargetScope] = useState(initialCampaign?.products?.length ? "PRODUCT" : initialCampaign?.categories?.length ? "CATEGORY" : "ALL");
  const [selectedProducts, setSelectedProducts] = useState(initialCampaign?.products?.map((item) => item.productId) || []);
  const [selectedCategories, setSelectedCategories] = useState(initialCampaign?.categories?.map((item) => item.categoryId) || []);
  const [productPairs, setProductPairs] = useState(initialCampaign?.configuration?.productPairs || []);
  const router = useRouter();

  async function submit(event) {
    event.preventDefault();
    setBusy(true);
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    // Multi-select values are serialized explicitly so the server action can validate IDs.
    for (const field of ["paymentMethods"]) {
      const select = formElement.elements.namedItem(field);
      const values = field === "paymentMethods"
        ? [...formElement.querySelectorAll('input[name="paymentMethods"]:checked')].map((input) => input.value)
        : select?.type === "hidden" ? JSON.parse(select.value || "[]")
          : select?.selectedOptions ? [...select.selectedOptions].map((option) => option.value) : [];
      form.set(field, JSON.stringify(values));
    }
    try {
      const result = await saveCampaign(form);
      if (!result.success) { toast.error(result.message || "Unable to save campaign"); return; }
      toast.success("Campaign saved");
      formElement.reset();
      setGroup("PRODUCT_DISCOUNT");
      setOfferType("");
      setTargetScope("ALL");
      setSelectedProducts([]);
      setSelectedCategories([]);
      router.push("/admin/campaigns");
      router.refresh();
    } finally { setBusy(false); }
  }

  const showDiscount = ["PRODUCT_DISCOUNT", "CART_DISCOUNT", "PAYMENT_DISCOUNT", "COUPON", "COMBO"].includes(group);
  const showMinimumOrder = ["CART_DISCOUNT", "DELIVERY_DISCOUNT", "PAYMENT_DISCOUNT", "COUPON"].includes(group);

  return <form onSubmit={submit} className="space-y-5 rounded-xl border bg-surface p-4">
    <h2 className="text-lg font-semibold">Create campaign</h2>

    <section className="grid gap-3 md:grid-cols-2">
      <CampaignInput name="name" label="Campaign name" defaultValue={initialCampaign?.name || ""} required />
      {initialCampaign?.id && <input type="hidden" name="id" value={initialCampaign.id} />}
      <div className="space-y-1">
        <label htmlFor="campaign-group" className="text-sm font-medium">Campaign group</label>
        <div className="flex gap-2">
          <select id="campaign-group" name="group" value={group} onChange={(event) => { const nextGroup = event.target.value; setGroup(nextGroup); setOfferType(nextGroup === "DELIVERY_DISCOUNT" ? "FREE" : nextGroup === "PAYMENT_DISCOUNT" ? "PERCENT" : ""); }} className={inputClass}>
            {groups.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
          <button type="button" onClick={() => setShowRuleModal(true)} className="shrink-0 rounded-lg border border-primary px-3 text-sm font-medium text-primary hover:bg-primary-soft">See rules</button>
        </div>
        <p className="text-xs text-text-muted">{campaignRules[group]?.summary}</p>
      </div>
      <textarea name="description" defaultValue={initialCampaign?.description || ""} placeholder="Campaign description" className={`${inputClass} md:col-span-2`} rows={2} />
      <select name="status" defaultValue={initialCampaign?.status || "DRAFT"} className={inputClass}><option value="DRAFT">Draft</option><option value="PUBLISHED">Active</option><option value="PAUSED">Paused</option><option value="EXPIRED">Expired</option></select>
      <FileInput name="bannerMedia" label="Campaign banner" defaultValue={initialCampaign?.bannerMedia || undefined} w={320} h={120} />
      <CampaignInput name="startAt" label="Starts" type="datetime-local" defaultValue={initialCampaign?.startAt ? new Date(initialCampaign.startAt).toISOString().slice(0, 16) : ""} />
      <CampaignInput name="endAt" label="Ends" type="datetime-local" defaultValue={initialCampaign?.endAt ? new Date(initialCampaign.endAt).toISOString().slice(0, 16) : ""} />
      <CampaignInput name="priority" label="Priority" type="number" defaultValue={initialCampaign?.priority ?? 0} />
      <CampaignInput name="usageLimit" label="Total usage limit" type="number" min="1" defaultValue={initialCampaign?.usageLimit ?? ""} />
      <CampaignInput name="perCustomerLimit" label="Per-customer usage limit" type="number" min="1" defaultValue={initialCampaign?.perCustomerLimit ?? ""} />
      <label className="flex items-start gap-2"><input name="stackable" type="checkbox" checked={stackable} onChange={(event) => { const allowed = event.target.checked; setStackable(allowed); setExclusive(!allowed); }} className="mt-1" /><span><span className="block">Allow stacking with other campaigns</span><span className="block text-xs text-text-muted">টিক দিলে এই প্রচারের ছাড় অন্য প্রচারের ছাড়ের সাথেও যোগ হতে পারবে।</span></span></label>
      <label className="flex items-start gap-2"><input name="exclusive" type="checkbox" checked={exclusive} onChange={(event) => { const locked = event.target.checked; setExclusive(locked); setStackable(!locked); }} className="mt-1" /><span><span className="block">Exclusive campaign</span><span className="block text-xs text-text-muted">টিক দিলে এই প্রচারের ছাড় অন্য প্রচারের সাথে একসাথে চলবে না।</span></span></label>
      <textarea name="terms" defaultValue={initialCampaign?.terms || ""} placeholder="Terms and conditions" className={`${inputClass} md:col-span-2`} rows={2} />
    </section>

    {group === "PRODUCT_DISCOUNT" && <section className="space-y-3 rounded-lg border p-3">
      <h3 className="font-semibold">Product discount settings</h3>
      <p className="text-sm text-text-muted">Discount uses a valid product sale price first; otherwise it uses the regular price.</p>
      <div className="grid gap-3 md:grid-cols-2">
        <select name="discountType" defaultValue={initialCampaign?.discountType || "PERCENT"} className={inputClass}><option value="PERCENT">Percentage discount</option><option value="FIXED">Fixed amount discount</option></select>
        <CampaignInput name="discountValue" label="Discount value" type="number" min="0" step="0.01" defaultValue={initialCampaign?.discountValue ?? ""} required />
        <CampaignInput name="specialPrice" label="Special fixed selling price (optional)" type="number" min="0" step="0.01" defaultValue={initialCampaign?.specialPrice ?? ""} />
        <CampaignInput name="minimumQuantity" label="Minimum quantity" type="number" min="1" defaultValue={initialCampaign?.minimumQuantity ?? ""} />
        <CampaignInput name="maxDiscountAmount" label="Maximum discount amount" type="number" min="0" step="0.01" defaultValue={initialCampaign?.maxDiscountAmount ?? ""} />
      </div>
    </section>}

    {group === "CART_DISCOUNT" && <section className="space-y-3 rounded-lg border p-3">
      <h3 className="font-semibold">Cart discount settings</h3>
      <div className="grid gap-3 md:grid-cols-2">
        <select name="offerType" defaultValue={initialCampaign?.configuration?.offerType || "STANDARD"} className={inputClass}><option value="STANDARD">Percentage or fixed discount</option><option value="TIERED">Tiered discount (configuration JSON later)</option></select>
        <select name="discountType" defaultValue={initialCampaign?.discountType || "PERCENT"} className={inputClass}><option value="PERCENT">Percentage discount</option><option value="FIXED">Fixed amount discount</option></select>
        <CampaignInput name="discountValue" label="Discount value" type="number" min="0" step="0.01" defaultValue={initialCampaign?.discountValue ?? ""} required />
        <CampaignInput name="minimumOrderAmount" label="Minimum cart amount" type="number" min="0" step="0.01" defaultValue={initialCampaign?.minimumOrderAmount ?? ""} />
        <CampaignInput name="minimumQuantity" label="Minimum eligible quantity" type="number" min="1" defaultValue={initialCampaign?.minimumQuantity ?? ""} />
        <CampaignInput name="maxDiscountAmount" label="Maximum discount amount" type="number" min="0" step="0.01" defaultValue={initialCampaign?.maxDiscountAmount ?? ""} />
        <select name="discountBase" defaultValue={initialCampaign?.discountBase || "ELIGIBLE_SUBTOTAL"} className={inputClass}><option value="ELIGIBLE_SUBTOTAL">After product discount (default)</option><option value="PRODUCT_SUBTOTAL">Before product discount</option></select>
      </div>
    </section>}

    {group === "DELIVERY_DISCOUNT" && <section className="space-y-3 rounded-lg border p-3">
      <h3 className="font-semibold">Delivery discount settings</h3>
      <div className="grid gap-3 md:grid-cols-2">
        <select name="offerType" value={offerType || "FREE"} onChange={(event) => setOfferType(event.target.value)} className={inputClass}><option value="FREE">Free delivery</option><option value="PERCENT">Percentage discount</option><option value="FIXED">Fixed amount discount</option></select>
        <CampaignInput name="minimumOrderAmount" label="Minimum order amount" type="number" min="0" step="0.01" defaultValue={initialCampaign?.minimumOrderAmount ?? ""} />
        {offerType === "FREE" ? <><input type="hidden" name="discountType" value="PERCENT" /><input type="hidden" name="discountValue" value="100" /><p className="self-center text-sm text-text-muted">The full delivery charge will be discounted.</p></> : offerType === "PERCENT" ? <><input type="hidden" name="discountType" value="PERCENT" /><CampaignInput name="discountValue" label="Delivery discount %" type="number" min="0" max="100" step="0.01" defaultValue={initialCampaign?.discountValue ?? ""} required /></> : offerType === "FIXED" ? <><input type="hidden" name="discountType" value="FIXED" /><CampaignInput name="discountValue" label="Delivery discount amount" type="number" min="0" step="0.01" defaultValue={initialCampaign?.discountValue ?? ""} required /></> : null}
        <CampaignInput name="maxDiscountAmount" label="Maximum delivery discount" type="number" min="0" step="0.01" defaultValue={initialCampaign?.maxDiscountAmount ?? ""} />
        <CampaignInput name="deliveryZone" label="Applicable delivery zone" defaultValue={initialCampaign?.deliveryZone || ""} />
        <CampaignInput name="shippingMethod" label="Shipping method (optional)" defaultValue={initialCampaign?.shippingMethod || ""} />
      </div>
    </section>}

    {group === "PAYMENT_DISCOUNT" && <section className="space-y-3 rounded-lg border p-3">
      <h3 className="font-semibold">Payment discount settings</h3>
      <div className="grid gap-3 md:grid-cols-2">
        <label className="space-y-1 text-sm font-medium">Discount applies to
          <select name="paymentDiscountTarget" value={paymentDiscountTarget} onChange={(event) => { setPaymentDiscountTarget(event.target.value); if (event.target.value === "DELIVERY" && ["CASHBACK", "ADVANCE"].includes(offerType)) setOfferType("PERCENT"); }} className={inputClass}><option value="ORDER">Product/order amount</option><option value="DELIVERY">Delivery charge</option></select>
        </label>
        <label className="space-y-1 text-sm font-medium">Discount type
          <select name="offerType" value={offerType || "PERCENT"} onChange={(event) => setOfferType(event.target.value)} className={inputClass}><option value="PERCENT">Percentage discount</option><option value="FIXED">Fixed amount discount</option>{paymentDiscountTarget === "ORDER" && <><option value="CASHBACK">Cashback after payment success</option><option value="ADVANCE">Full advance payment discount</option></>}</select>
        </label>
        <PaymentDiscountTargets paymentGateways={paymentGateways} scope={paymentScope} setScope={setPaymentScope} specificOnline={specificOnlineMethods} setSpecificOnline={setSpecificOnlineMethods} selectedMethods={selectedPaymentMethods} setSelectedMethods={setSelectedPaymentMethods} />
        <input type="hidden" name="discountType" value={offerType === "FIXED" ? "FIXED" : offerType === "CASHBACK" ? cashbackType : "PERCENT"} />
        <CampaignInput name="discountValue" label={paymentDiscountTarget === "DELIVERY" ? "Delivery charge discount" : offerType === "CASHBACK" ? "Cashback value" : "Discount value"} type="number" min="0" step="0.01" defaultValue={initialCampaign?.discountValue ?? ""} required />
        {showMinimumOrder && <CampaignInput name="minimumOrderAmount" label="Minimum order amount" type="number" min="0" step="0.01" defaultValue={initialCampaign?.minimumOrderAmount ?? ""} />}
        <CampaignInput name="maxDiscountAmount" label={offerType === "CASHBACK" ? "Maximum cashback" : "Maximum discount"} type="number" min="0" step="0.01" defaultValue={initialCampaign?.maxDiscountAmount ?? ""} />
        {offerType === "CASHBACK" && <select name="cashbackType" value={cashbackType} onChange={(event) => setCashbackType(event.target.value)} className={inputClass}><option value="FIXED">Fixed cashback</option><option value="PERCENT">Percentage cashback</option></select>}
      </div>
    </section>}

    {group === "COUPON" && <section className="space-y-3 rounded-lg border p-3">
      <h3 className="font-semibold">Coupon settings</h3>
      <div className="grid gap-3 md:grid-cols-2">
        <CampaignInput name="couponCode" label="Coupon code (e.g. WELCOME50)" defaultValue={initialCampaign?.couponCode || ""} required />
        <select name="couponType" defaultValue={initialCampaign?.configuration?.couponType || "CART_DISCOUNT"} className={inputClass}><option value="CART_DISCOUNT">Cart discount</option><option value="PERCENT">Percentage discount</option><option value="FIXED">Fixed amount discount</option><option value="FREE_DELIVERY">Free delivery</option><option value="PAYMENT_DISCOUNT">Payment discount</option></select>
        <select name="discountType" defaultValue={initialCampaign?.discountType || "PERCENT"} className={inputClass}><option value="PERCENT">Percentage discount</option><option value="FIXED">Fixed amount discount</option></select>
        <CampaignInput name="discountValue" label="Coupon discount value" type="number" min="0" step="0.01" defaultValue={initialCampaign?.discountValue ?? ""} required />
        <CampaignInput name="minimumOrderAmount" label="Minimum order amount" type="number" min="0" step="0.01" defaultValue={initialCampaign?.minimumOrderAmount ?? ""} />
        <CampaignInput name="maxDiscountAmount" label="Maximum discount amount" type="number" min="0" step="0.01" defaultValue={initialCampaign?.maxDiscountAmount ?? ""} />
        <PaymentMethodChoices paymentGateways={paymentGateways} optional selected={initialCampaign?.paymentMethods || []} />
        <label className="flex items-center gap-2"><input name="firstOrderOnly" type="checkbox" defaultChecked={initialCampaign?.configuration?.firstOrderOnly || false} /> First order only</label>
      </div>
    </section>}

    {group === "COMBO" && <section className="space-y-3 rounded-lg border p-3">
      <h3 className="font-semibold">Combo offer settings</h3>
      <div className="grid gap-3 md:grid-cols-2">
        <label className="space-y-1 text-sm font-medium">Combo offer type
          <select name="comboType" value={comboType} onChange={(event) => setComboType(event.target.value)} className={inputClass}>
            <option value="BUNDLE_FIXED">Bundle fixed price</option><option value="BUNDLE_PERCENT">Bundle percentage discount</option><option value="BUY_X_GET_Y">Buy X get Y free</option><option value="BUY_X_GET_Y_DISCOUNT">Buy X get Y with discount</option><option value="QUANTITY">Quantity based discount</option>
          </select>
        </label>
        <CampaignInput name="requiredQuantity" label={comboType === "BUY_X_GET_Y" || comboType === "BUY_X_GET_Y_DISCOUNT" ? "Buy quantity (X)" : "Qualifying quantity"} type="number" min="1" defaultValue={initialCampaign?.configuration?.requiredQuantity ?? 1} required />
        <ComboPairEditor products={products} categories={categories} initialPairs={productPairs} onChange={setProductPairs} />
        <CampaignInput name="rewardQuantity" label={comboType === "BUY_X_GET_Y" || comboType === "BUY_X_GET_Y_DISCOUNT" ? "Get quantity (Y)" : "Reward quantity"} type="number" min="1" defaultValue={initialCampaign?.configuration?.rewardQuantity ?? 1} required />
        {comboType === "BUNDLE_FIXED" && <>
          <input type="hidden" name="discountType" value="FIXED" />
          <CampaignInput key="bundle-fixed-price" name="discountValue" label="Total bundle price" type="number" min="0" step="0.01" defaultValue={initialCampaign?.discountValue ?? ""} required />
        </>}
        {comboType === "BUNDLE_PERCENT" && <>
          <input type="hidden" name="discountType" value="PERCENT" />
          <CampaignInput key="bundle-percent-discount" name="discountValue" label="Bundle discount (%)" type="number" min="0.01" max="100" step="0.01" defaultValue={initialCampaign?.discountValue ?? ""} required />
        </>}
        {comboType === "BUY_X_GET_Y" && <>
          <input type="hidden" name="discountType" value="PERCENT" /><input type="hidden" name="discountValue" value="100" />
          <p className="self-center text-sm text-text-muted">Reward product is free when the buy condition is met.</p>
        </>}
        {comboType === "BUY_X_GET_Y_DISCOUNT" && <>
          <input type="hidden" name="discountType" value="PERCENT" /><input type="hidden" name="discountValue" value="0" />
          <CampaignInput key="reward-discount-percent" name="rewardDiscountPercent" label="Reward product discount (%)" type="number" min="0.01" max="100" step="0.01" defaultValue={initialCampaign?.configuration?.rewardDiscountPercent ?? ""} required />
        </>}
        {comboType === "QUANTITY" && <>
          <label className="space-y-1 text-sm font-medium">Discount type
            <select name="discountType" value={comboDiscountType} onChange={(event) => setComboDiscountType(event.target.value)} className={inputClass}><option value="PERCENT">Percentage discount</option><option value="FIXED">Fixed amount discount</option></select>
          </label>
          <CampaignInput key={`quantity-discount-${comboDiscountType}`} name="discountValue" label={comboDiscountType === "PERCENT" ? "Quantity discount (%)" : "Quantity discount amount"} type="number" min="0.01" max={comboDiscountType === "PERCENT" ? 100 : undefined} step="0.01" defaultValue={initialCampaign?.discountValue ?? ""} required />
        </>}
      </div>
    </section>}

    {group !== "COMBO" && <CampaignTargetPicker products={products} categories={categories} scope={targetScope} setScope={setTargetScope} selectedProducts={selectedProducts} setSelectedProducts={setSelectedProducts} selectedCategories={selectedCategories} setSelectedCategories={setSelectedCategories} />}
    {showRuleModal && <div className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-black/55 p-3" onClick={() => setShowRuleModal(false)}>
      <section role="dialog" aria-modal="true" aria-labelledby="campaign-rules-title" onClick={(event) => event.stopPropagation()} className="w-full max-w-lg rounded-2xl bg-surface p-5 shadow-2xl">
        <header className="flex items-start justify-between gap-3"><div><h2 id="campaign-rules-title" className="text-lg font-semibold">{campaignRules[group]?.title} — নিয়ম</h2><p className="mt-1 text-sm text-text-muted">{campaignRules[group]?.summary}</p></div><button type="button" onClick={() => setShowRuleModal(false)} aria-label="Close rules" className="rounded-lg border px-3 py-1">✕</button></header>
        <ul className="mt-4 list-disc space-y-2 pl-5 text-sm">{campaignRules[group]?.bullets.map((rule) => <li key={rule}>{rule}</li>)}</ul>
        <button type="button" onClick={() => setShowRuleModal(false)} className="mt-5 w-full rounded-lg bg-primary px-4 py-2 text-white">বন্ধ করুন</button>
      </section>
    </div>}
    <button disabled={busy} className="w-full rounded-lg bg-primary px-4 py-2 text-white disabled:opacity-50">{busy ? "Saving…" : "Save campaign"}</button>
  </form>;
}
