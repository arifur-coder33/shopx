'use client";';
import { getProductById } from "@/backend/serverActions/productActions";
import LoadingSpinner from "@/components/common/LoadingSpinner";
import { useEffect, useState } from "react";
import ProductDataView from "./ProductDataView";

export default function ProductQuickView({ id }) {
  const [data, setData] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const getProduct = async () => {
      try {
        const product = await getProductById(id);
        setData(product.data);
      } catch (error) {
        setError("Failed to load product data.");
        setData(null);
      } finally {
        setLoading(false);
      }
    };
    getProduct();
  }, [id]);
  if (loading)
    return (
      <div>
        <LoadingSpinner message="Just a second.. " />
      </div>
    );
  if (error) return <div>{error}</div>;
  if (!data) return <div>No Data Found</div>;
  return <ProductDataView data={data} adminView={true} />;
}
