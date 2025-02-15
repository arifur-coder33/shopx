/* eslint-disable react-hooks/exhaustive-deps */
"use client";

import { getCategory } from "@/backend/serverActions/catagoryActions";
import { getProductById } from "@/backend/serverActions/productActions";
import Modal from "@/components/modal/Modal";
import ProductForm from "@/components/products/ProductForm";
import { useModalContext } from "@/context/ModalContext";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function EditProductModal() {
  const { isOpen, closeModal, openModal } = useModalContext();
  const [data, setData] = useState(null);
  const [category, setCategory] = useState(null);
  const [isLoaidng, setIsLoading] = useState(true);
  const params = useParams();
  const router = useRouter();
  const id = params?.id;

  useEffect(() => {
    openModal(); // Open modal on mount

    let isMounted = true;

    async function fetchData() {
      try {
        const [{ data: productData }, { data: categoryData }] =
          await Promise.all([getProductById(id), getCategory()]);

        if (isMounted) {
          setData(productData);
          setCategory(categoryData);
          setIsLoading(false);
        }
      } catch (error) {
        console.error("Error fetching data:", error);
      }
    }

    if (id) fetchData();

    return () => {
      isMounted = false; // Prevent state updates if unmounted
    };
  }, [id]);

  return (
    <Modal
      isLoading={isLoaidng}
      isOpen={isOpen}
      onClose={() => {
        closeModal();
        router.back(); // Go back on close
      }}
    >
      {!data || !category ? (
        "Loading..."
      ) : (
        <ProductForm data={data} category={category} actionType="edit" />
      )}
    </Modal>
  );
}
