import KalapanaFont from "@/components/KalapanaFont";
import calculateInitialDisplayPrice from "@/utils/calculateInitialDisplayPrice";
import { replaceNumbers } from "@/utils/engToBanNumber";

export default function ProductPrice({ data, selectedVariation = null }) {
  const { priceToDisplay, originalPriceToDisplay } = calculateInitialDisplayPrice(
    selectedVariation ? [selectedVariation] : data.variations,
    selectedVariation ? true : data.allowOutOfStockOrder,
  );
  const campaignPrice = selectedVariation
    ? selectedVariation.campaignPrice
    : (data.variations || [])
        .filter((variation) => variation.campaignPrice != null)
        .map((variation) => Number(variation.campaignPrice))
        .filter(Number.isFinite)
        .sort((a, b) => a - b)[0];
  const price = campaignPrice ?? priceToDisplay;
  const original = campaignPrice != null ? priceToDisplay : originalPriceToDisplay;
  return (
    <KalapanaFont>
      <p className="mt-4 min-h-16 text-2xl leading-tight dark:text-slate-300">
        মূল্যঃ <span className="text-3xl tabular-nums text-purple sm:text-4xl md:text-5xl">{replaceNumbers(String(price || 0))}</span> টাকা
        {original && <del className="price-del ml-2 text-xl">{replaceNumbers(String(original))}</del>}
      </p>
    </KalapanaFont>
  );
}
