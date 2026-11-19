import CartItem from "@/components/cart/CartItem";
import CartItemQtyUpdate from "@/components/cart/CartItemQtyUpdate";
import ComboRewardOrderItem from "@/components/checkout/ComboRewardOrderItem";
import { getComboOfferText } from "@/components/campaign/comboOfferText";
import { Truck, X } from "lucide-react";
import { bundleSelectionKey } from "@/lib/bundleStock";
import CheckOutSubTotal from "./CheckOutSubTotal";

export default function BuyNowProductDetails({
  deliveryArea,
  data,
  productQty = 1,
  setProductQty,
  variationId = null,
  setDeliveryCharge,
  setTotalPrice,
  setOrderWeight,
  deliveryRates,
  campaignPreview,
  comboRewardItems = [],
  comboRewardGroups = { groups: [] },
  onCancelCombo,
  onSelectComboVariation,
}) {
  const itemDiscounts = new Map((campaignPreview?.itemDiscounts || []).map((offer) => [offer.variationId, offer]));
  const isArray = Array.isArray(data);
  const totalPrices = isArray
    ? data.reduce((acc, item) => {
        const qty = item.quantity || 1;
        const offer = itemDiscounts.get(item.variation?.id || item.variationId);
        acc.totalDiscountPrice += Math.max(0, (item.discountPrice || item.regularPrice || 0) - (offer?.discount || 0)) * qty;
        acc.totalRegularPrice += (item.regularPrice || 0) * qty;
        acc.totalWeight += Math.max(0, Number(item.weight ?? item.variation?.weight) || 0) * qty;
        return acc;
      }, { totalDiscountPrice: 0, totalRegularPrice: 0, totalWeight: 0 })
    : {
        totalDiscountPrice: Math.max(0, (data.discountPrice || data.regularPrice || 0) - (itemDiscounts.get(data.variation?.id || data.variationId)?.discount || 0)) * productQty || 0,
        totalRegularPrice: data.regularPrice * productQty || 0,
        totalWeight: Math.max(0, Number(data.weight ?? data.variation?.weight) || 0) * productQty,
      };
  const rewardTotal = comboRewardItems.reduce((sum, item) => sum + Math.max(0, Number(item.discountPrice ?? item.price) || 0) * Math.max(1, Number(item.quantity) || 1), 0);
  const rewardWeight = comboRewardItems.reduce((sum, item) => sum + Math.max(0, Number(item.weight) || 0) * Math.max(1, Number(item.quantity) || 1), 0);
  totalPrices.totalDiscountPrice += rewardTotal;
  totalPrices.totalWeight += rewardWeight;

  return (
    <>
      <div className="w-full rounded-sm flex flex-row gap-1 font-bold border-b-slate-400 border-b-2 dark:border-b-2 dark:border-b-slate-600 bg-slate-300 dark:bg-slate-800 p-2">
        <Truck /> <span>অর্ডার বিস্তারিত</span>
      </div>
      {isArray
        ? data.map((product) => <CartItemQtyUpdate key={`${product?.variation?.id || product?.id}:${bundleSelectionKey(product.bundleSelections)}`} data={product} campaignOffer={itemDiscounts.get(product.variation?.id || product.variationId)} />)
        : <CartItem title={data.title} thumbnail={data?.thumbnail} slug={data.slug} discountPrice={data.discountPrice} regularPrice={data.regularPrice} campaignOffer={itemDiscounts.get(data.variation?.id || data.variationId)} setProductQy={setProductQty} productQty={productQty} removeItem={() => {}} variation={data?.variation} id={data.id} bundleSelectionLabels={data.bundleSelectionLabels} />}
      {comboRewardGroups.groups.map(({ campaign, pairs, rewardItems }) => <section key={campaign.id} className="my-2 rounded-xl border border-primary/20 bg-primary-soft/10 p-2">
        <div className="mb-1 flex items-center justify-between gap-2"><p className="min-w-0 text-xs font-semibold text-primary">কম্বো · {campaign.name}</p><button type="button" aria-label="অফার বাতিল" title="অফার বাতিল" onClick={() => onCancelCombo?.(campaign.id)} className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-border bg-surface text-text-muted transition hover:border-red-300 hover:bg-red-50 hover:text-red-600"><X className="h-4 w-4" aria-hidden="true" /></button></div>
        {pairs.map((pair, index) => <p key={`${campaign.id}-${index}`} className="mb-1 text-[11px] leading-4 text-text-muted">{getComboOfferText(campaign, pair)}</p>)}
        {rewardItems.map((item) => <ComboRewardOrderItem key={item.id} item={item} onVariationChange={onSelectComboVariation} />)}
      </section>)}
      <CheckOutSubTotal
        deliveryArea={deliveryArea}
        discountPrice={totalPrices.totalDiscountPrice}
        regularPrice={totalPrices.totalRegularPrice}
        totalWeight={totalPrices.totalWeight}
        setTotalPrice={setTotalPrice}
        setDeliveryCharge={setDeliveryCharge}
        setOrderWeight={setOrderWeight}
        deliveryRates={deliveryRates}
        campaignPreview={campaignPreview ? { ...campaignPreview, total: Number(campaignPreview.total || 0) + rewardTotal } : campaignPreview}
      />
    </>
  );
}
