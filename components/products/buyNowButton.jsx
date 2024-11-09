import KalapanaFont from "../KalapanaFont";

export default function BuyNowButton({ className }) {
  return (
    <button className={` button px-2 ${className}`}>
      <KalapanaFont>এখনি কিনুন</KalapanaFont>{" "}
    </button>
  );
}
