export const sampleOrder = {
  id: "ORD-20251212-00123",

  // Customer Info
  customerName: "Md. Arifur Rahman",
  phone: "01712345678",
  address: "Barishal Sadar, Barishal",

  // Order Amounts
  subtotal: 3500, // item price sum
  deliveryCharge: 120, // delivery fee
  discount: 200, // discount applied
  amount: 3420, // final total (subtotal + delivery - discount)

  // Status & Courier
  status: "DELIVERED",
  courier: "", // SteadFast / RedX / Pathao / Sundarban
  courierTrackingId: "", // after courier order create

  // Order Notes
  note: "Customer prefers evening delivery",

  // Order Items
  items: [
    {
      id: 1,
      name: "Paddy Cutter Machine",
      description: "High quality paddy cutter",
      qty: 1,
      unitPrice: 3000,
      total: 3000,
      image: "https://cdn-icons-png.flaticon.com/512/3448/3448224.png", // sample image
    },
    {
      id: 2,
      name: "Machine Oil 250ml",
      description: "Lubricant for machine",
      qty: 1,
      unitPrice: 500,
      total: 500,
      image: "https://cdn-icons-png.flaticon.com/512/263/263142.png", // sample image
    },
  ],

  // Extra Info
  paymentMethod: "Cash on Delivery",
  createdAt: "2025-12-12T10:30:00Z",
  updatedAt: "2025-12-12T12:15:00Z",
};

('use client";');

import { getOrderById } from "@/backend/serverActions/orderActions";
import LoadingSpinner from "@/components/common/LoadingSpinner";
import { useEffect, useState } from "react";
import OrderDetailsPage from "./OrderDetailsPage";
export default function OrderView({ id }) {
  const [data, setData] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const getData = async () => {
      try {
        const fatchData = await getOrderById(id);
        setData(fatchData.data);
      } catch (error) {
        setError("Failed to load product data.");
        setData(null);
      } finally {
        setLoading(false);
      }
    };
    getData();
  }, [id]);

  if (loading)
    return (
      <div>
        <LoadingSpinner message="Just a second.. " />
      </div>
    );
  if (error) return <div>{error}</div>;
  if (!data) return <div>No Data Found</div>;
  return <OrderDetailsPage order={data} />;
}
