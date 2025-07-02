import { replaceNumbers } from "@/utils/engToBanNumber";
export default function CheckOutSubTotal({
  data,
  productQty,
  deliveryArea,
  discountPrice,
  regularPrice,
}) {
  const { insideDhaka, outSideDhaka, category } = data || {};
  let deliveryCharge = 0;
  deliveryCharge = deliveryArea === "inside-dhaka" ? insideDhaka : outSideDhaka;
  return (
    <>
      <Item
        label={"পণ্যর রেগুলার মোট মুল্যঃ"}
        value={regularPrice * productQty}
      />

      <Item
        label={"ডিস্কাউন্টঃ (-)"}
        value={(regularPrice - discountPrice) * productQty}
      />
      <Item label={"ডেলিভারি চার্জঃ (+)"} value={deliveryCharge} />
      <input
        hidden
        name="orderPrice"
        defaultValue={discountPrice * productQty}
      />
      <Item
        label={"সর্বোমোট মুল্যঃ"}
        value={discountPrice * productQty + deliveryCharge}
        className={
          "font-bold border-t-4 border-t-slate-800 dark:border-t-slate-200"
        }
      />
    </>
  );
}

function Item({ label, value, className }) {
  return (
    <div
      className={`${className} flex flex-row justify-between bg-slate-200 dark:bg-inherit dark:border-2 dark:border-slate-800 rounded-md px-2 py-1 mt-1`}
    >
      <p>{label}</p>
      {/* <p>{ replaceNumbers(value.toString())} টাকা</p> */}
      <p>{replaceNumbers(value?.toString())} টাকা</p>
    </div>
  );
}
