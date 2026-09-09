import { dateConvertToLocalString } from "@/utils/dateConvert";
import { replaceNumbers } from "@/utils/engToBanNumber";

export default function OrderDeliveryDetails({ data }) {
  return (
    <>
      <div className="sm:col-span-full text-center border-b-2 py-4 font-bold text-xl">
        অর্ডার নংঃ {replaceNumbers(data?.orderNo.toString())}
      </div>
      <div className="">
        <div className="text-xl my-4 font-bold">ডেলিভারি ঠিকানা</div>
        <div>
          <p>তারিখঃ {dateConvertToLocalString(data?.createdAt)} </p>
          <p>নামঃ {data?.customerName} </p>
          <p>মোবাইল নংঃ {data?.phoneNumber}</p>
          <p>ইমেইল {data?.email}</p>
          <p> জেলা: {data?.district}</p>
          <p> থানা: {data?.thana}</p>
          <p> ঠিকানাঃ {data?.deliveryAddress}</p>

          <p> পেমেন্ট মেথড {data?.paymentMethod}</p>
          <p> অর্ডার নোটঃ {data?.orderNotes}</p>
        </div>
      </div>
    </>
  );
}
