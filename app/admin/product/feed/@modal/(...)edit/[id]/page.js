"use client";

import { getCategory } from "@/backend/serverActions/catagoryActions";
import { getProductById } from "@/backend/serverActions/productActions";
import Modal from "@/components/modal/Modal";
import ProductForm from "@/components/products/ProductForm";
import { useModalContext } from "@/context/ModalContext";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function EditProductModal({ params: { id } }) {
  const { isOpen, closeModal, openModal } = useModalContext();
  const router = useRouter();
  const [product, setProduct] = useState(null);
  const [category, setCategory] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function fetchData() {
      try {
        const { data: productData } = await getProductById(id);
        const getCat = await getCategory();
        const categoryData = getCat?.data;

        setProduct(productData);
        setCategory(categoryData);
        setLoading(false);
        // Open the modal and pass the ProductForm as its content
        openModal(
          <ProductForm
            data={productData}
            category={categoryData}
            actionType="edit"
          />
        );
      } catch (err) {
        setError(err.message || "Failed to load product or category");
        setLoading(false);
      }
    }

    fetchData();

    // Return a cleanup function to close the modal when the component unmounts
    return () => {
      closeModal(); // Close the modal
      router.back(); // Navigate back
    };
  }, [id, openModal, closeModal, router]);

  if (loading) {
    return <div>Loading...</div>;
  }

  if (error) {
    return <div>Error: {error}</div>;
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => {
        closeModal(); // Close the modal
        router.back(); // Navigate back
      }}
    >
      {/* You can optionally render a loading or error message within the modal */}
      {isOpen && useModalContext().content}
    </Modal>
  );
}
