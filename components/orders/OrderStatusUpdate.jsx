"use client";
import { updateOrderStatusAction } from "@/backend/serverActions/orderActions";
import SelectInput from "@/components/input/SelectInput";
import { toast } from "react-toastify";

export default function OrderStatusUpdate({ orderId, status }) {
  console.log(status);
  const updateOrderStatusHandler = async (e) => {
    const confirmByUser = confirm(`Do you want to update ${e}`);
    if (confirmByUser) {
      try {
        const data = await updateOrderStatusAction(orderId, e);
        console.log(data);
        if (data?.success) {
          toast.success(data?.message);
        }
        if (!data?.success) {
          toast.warn(error?.message);
        }
      } catch (error) {
        toast.warn(error?.message);
      }
    } else {
      return;
    }
  };

  return (
    <SelectInput
      onChangeEvent={updateOrderStatusHandler}
      value={status}
      data={[
        { id: "PENDING", name: "PENDING" },
        { id: "PROCESSING", name: "PROCESSING" },
        { id: "SHIPPED", name: "SHIPPED" },
        { id: "DELIVERED", name: "DELIVERED" },
        { id: "CANCELED", name: "CANCELED" },
        { id: "RETURNED", name: "RETURNED" },
      ]}
    />
  );
}
