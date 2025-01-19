"use client";
import { updateOrderStatusAction } from "@/backend/serverActions/orderActions";
import SelectInput from "@/components/input/SelectInput";
import { toast } from "react-toastify";

export default function OrderStatusUpdate({ orderId, status }) {
  const updateOrderStatusHandler = async (e) => {
    console.log(e.target.value);
    const confirmByUser = confirm(`Do you want to update ${e.target.value}`);
    if (confirmByUser) {
      try {
        const data = await updateOrderStatusAction(orderId, e.target.value);
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
      onChange={updateOrderStatusHandler}
      defaultValue={status}
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
