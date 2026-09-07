import { getCourierDeliveryStatusAction } from "@/backend/serverActions/courierAction";
import { useEffect, useState } from "react";

export default function GetCourierStatus({ courierId, courierProviderId }) {
  const [data, setData] = useState(null);

  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const fatchResponse = await getCourierDeliveryStatusAction({
          courierId,
          courierProviderId,
        });

        if (fatchResponse.success) {
          setData(fatchResponse.data);
        }
      } catch (error) {
        setData({ status: "Unknown" });
      }
    };
    fetchStatus();
  }, [courierId, courierProviderId]);
  if (data?.status) {
    return (
      <>
        <span className="bg-green-300 rounded-3xl px-2">{data?.status}</span>;
        <p>Updated at: {new Date(data?.updatedAt).toLocaleString("en-GB")}</p>
      </>
    );
  }
}
