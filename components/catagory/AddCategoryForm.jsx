"use client";

import { createCategoryAction } from "@/backend/serverActions/catagoryActions";
import Button from "@/components/button";
import FloatingInput from "@/components/input/FloatingInput";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
export default function AddCatagoryForm() {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const router = useRouter();

  const handleSubmit = (e) => {
    e.preventDefault(); // Prevent default form submission
    const form = e.target; // Reference to the form element
    const formData = new FormData(form); // Collect form data
    setError(null);
    setSuccess(null);

    startTransition(async () => {
      const response = await createCategoryAction(formData); // Call server action
      console.log(response);
      if (response.success) {
        setSuccess("Category Added successful!");
        form.reset(); // Clear the form on success
      } else {
        console.log(response.error);
        setError(response.error || "Something went wrong");
      }
    });
  };
  return (
    <form onSubmit={handleSubmit}>
      {success && <p style={{ color: "green" }}>{success}</p>}
      {error && (
        <div className="w-full rounded-md bg-red-200 p-2 text-base text-red-600">
          {" "}
          {error}{" "}
        </div>
      )}

      <FloatingInput label={"Category Name"} name={"name"} type={"text"} />

      <Button className="w-full mt-2 py-2">
        {isPending ? "Adding ......" : "save "}
      </Button>
    </form>
  );
}
